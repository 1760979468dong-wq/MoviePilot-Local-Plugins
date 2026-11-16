"""MoviePilot PT管家插件。

把 MoviePilot 已采集的站点账号数据（上传、下载、分享率、魔力、做种等）与站点
用户详情页的扩展字段（UID、邀请人、邀请名额、H&R、认领、做种积分、时魔等）
汇总到同一张看板，并给出全部站点的总量合计。
"""

from __future__ import annotations

import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Any, Mapping
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import HTTPException, Query

from app.core.config import settings
from app.db.oper.site import SiteOper
from app.log import logger
from app.plugins import _PluginBase
from app.scheduler import Scheduler
from app.schemas.types import NotificationType

from .api_models import (
    CollectResponse,
    CollectStatusResponse,
    OverviewResponse,
    RetirementProgressData,
    SettingsData,
    SettingsResponse,
    SiteDetailResponse,
    SiteOrderRequest,
    SiteOrderResponse,
    ColumnOrderRequest,
    ColumnOrderResponse,
    ViewStateRequest,
    ViewStateResponse,
    SiteRecord,
    SummaryData,
    TwelveProgressData,
    InviteMemberData,
    InviteOverviewData,
    InviteSiteData,
    TrendPoint,
)
from .collector import SitePageCollector
from .invite import InviteCollector
from .core import (
    as_float,
    as_int,
    as_text,
    build_site_records,
    build_trend,
    summarize_sites,
)
from .retirement import (
    DEFAULT_RETIREMENT_RULES,
    TWELVE_SITES,
    build_retirement_progress,
    build_twelve_progress,
    match_twelve_site,
    normalize_identity,
)


class PTManager(_PluginBase):
    """汇总所有 PT 站点账号数据并展示总量合计。"""

    plugin_name = "PT管家"
    plugin_desc = (
        "一站式查看所有 PT 站点的详细数据：上传、下载、分享率、魔力、做种体积、"
        "UID、邀请人、邀请名额、H&R、认领、做种积分、时魔等，并给出总量合计。"
    )
    plugin_icon = "ptmanager.png"
    plugin_version = "1.6.0"
    plugin_author = "小罗"
    author_url = "https://github.com/xiaoluo-mp/MoviePilot-Local-Plugins"
    plugin_config_prefix = "ptmanager_"
    plugin_order = 21
    auth_level = 1

    # 扩展字段数据键
    DATA_EXTENDED = "extended_v1"
    # 采集状态数据键
    DATA_COLLECT_STATE = "collect_state_v1"
    # 后宫（邀请）数据键
    DATA_INVITE = "invite_v1"

    _enabled = False
    _collect_enabled = False
    _collect_mode = "custom"
    _collect_cron = "0 7 * * *"
    _collect_timeout = 25
    _collect_concurrency = 4
    _trend_days = 30
    _collect_domains: list[str] = []
    _notify_enabled = False
    _refresh_before_collect = True
    _notify_cron = "0 9 * * *"
    _site_order: list[str] = []
    _column_order: list[str] = []
    _visible_columns: list[str] = []
    _sort_key = "seeding_size"
    _sort_desc = True
    _overview_view = "table"
    _wealthy_retirement_sites: list[str] = []
    _custom_retirement_rules: list[dict[str, Any]] = []

    def init_plugin(self, config: dict | None = None) -> None:
        """读取插件配置并准备采集状态。"""

        try:
            normalized = SettingsData.model_validate(config or {})
        except ValueError as error:
            logger.warning(f"PT管家配置无效，已回退安全默认值：{error}")
            normalized = SettingsData()
        self._apply_settings(normalized)
        self._retirement_rules = self._load_retirement_rules()
        if self._custom_retirement_rules:
            names = [as_text(rule.get("site")) for rule in self._custom_retirement_rules]
            logger.info(f"PT管家自定义等级规则已加载：{len(names)} 个站点（{'、'.join(names)}）")
        self._collect_lock = threading.RLock()
        self._collect_running = False
        try:
            self._collect_state = self.get_data(self.DATA_COLLECT_STATE) or {}
        except Exception as error:  # noqa: BLE001 - 读取历史状态失败不影响启动
            logger.warning(f"PT管家读取采集状态失败：{error}")
            self._collect_state = {}

    def _apply_settings(self, value: SettingsData) -> None:
        """把已校验设置投影为插件运行属性。"""

        self._enabled = value.enabled
        self._collect_enabled = value.collect_enabled
        self._collect_mode = value.collect_mode
        self._collect_cron = value.collect_cron
        self._collect_timeout = value.collect_timeout
        self._collect_concurrency = value.collect_concurrency
        self._trend_days = value.trend_days
        self._collect_domains = list(value.collect_domains)
        self._notify_enabled = value.notify_enabled
        self._refresh_before_collect = value.refresh_before_collect
        self._notify_cron = value.notify_cron
        self._wealthy_retirement_sites = list(value.wealthy_retirement_sites)
        self._custom_retirement_rules = [rule.model_dump() for rule in value.custom_retirement_rules]
        # 只有调用方显式带上 site_order 时才覆盖，避免其它保存入口清空自定义顺序
        if "site_order" in value.model_fields_set:
            self._site_order = [as_text(item).casefold() for item in value.site_order if as_text(item)]
        if "overview_view" in value.model_fields_set:
            self._overview_view = value.overview_view
        # 列顺序同样只在显式提供时覆盖，避免其它保存入口清空自定义顺序
        if "column_order" in value.model_fields_set:
            self._column_order = [as_text(item) for item in value.column_order if as_text(item)]
        # 排序与可见列同样只在显式提供时覆盖
        if "visible_columns" in value.model_fields_set:
            self._visible_columns = [as_text(item) for item in value.visible_columns if as_text(item)]
        if "sort_key" in value.model_fields_set:
            self._sort_key = as_text(value.sort_key) or "seeding_size"
        if "sort_desc" in value.model_fields_set:
            self._sort_desc = bool(value.sort_desc)

    def _load_retirement_rules(self) -> dict[str, Any]:
        """合并内置与自定义等级规则，自定义规则整体覆盖同名内置规则。"""

        rules: dict[str, Any] = dict(DEFAULT_RETIREMENT_RULES)
        for uploaded in self._custom_retirement_rules:
            name = as_text(uploaded.get("site"))
            if not name:
                continue
            rule = dict(uploaded)
            rule["_custom_rule"] = True
            rule["source_key"] = name
            rules[name] = rule
        return rules

    def _settings(self) -> SettingsData:
        """返回当前设置模型。"""

        return SettingsData(
            enabled=self._enabled,
            collect_enabled=self._collect_enabled,
            collect_mode=self._collect_mode,
            collect_cron=self._collect_cron,
            collect_timeout=self._collect_timeout,
            collect_concurrency=self._collect_concurrency,
            trend_days=self._trend_days,
            collect_domains=list(self._collect_domains),
            notify_enabled=self._notify_enabled,
            refresh_before_collect=self._refresh_before_collect,
            notify_cron=self._notify_cron,
            site_order=list(self._site_order),
            overview_view=self._overview_view,
            column_order=list(self._column_order),
            visible_columns=list(self._visible_columns),
            sort_key=self._sort_key,
            sort_desc=self._sort_desc,
            wealthy_retirement_sites=list(self._wealthy_retirement_sites),
            custom_retirement_rules=list(self._custom_retirement_rules),
        )

    def get_state(self) -> bool:
        """返回插件启用状态。"""

        return bool(self._enabled)

    @staticmethod
    def get_render_mode() -> tuple[str, str]:
        """使用 Vue 模块联邦渲染侧栏、详情、配置与仪表盘。"""

        return "vue", "dist/v1_5_2/assets"

    def get_sidebar_nav(self) -> list[dict[str, Any]]:
        """在 MoviePilot 侧栏发现分组注册 PT管家入口。"""

        if not self.get_state():
            return []
        return [
            {
                "nav_key": "main",
                "title": "PT管家",
                "icon": "mdi-view-dashboard-variant-outline",
                "section": "discovery",
                "permission": "discovery",
                "order": 26,
            }
        ]

    @staticmethod
    def get_command() -> list[dict[str, Any]]:
        """PT管家不提供远程命令。"""

        return []

    def get_form(self) -> tuple[list[dict], dict[str, Any]]:
        """Vue 配置组件读取当前配置模型。"""

        return [], self._settings().model_dump()

    @staticmethod
    def get_page() -> list[dict]:
        """Vue 详情组件通过插件 API 加载数据。"""

        return []

    def get_dashboard_meta(self) -> list[dict[str, str]]:
        """声明唯一的站点总览仪表盘组件。"""

        return [{"key": "overview", "name": "PT管家总览"}]

    def get_dashboard(
        self,
        key: str = "overview",
        **_: Any,
    ) -> tuple[dict[str, Any], dict[str, Any], None] | None:
        """返回 Vue 仪表盘布局元数据。"""

        if not self.get_state() or key not in ("", "overview"):
            return None
        return (
            {"cols": 12, "sm": 12, "md": 8, "lg": 8},
            {
                "title": "PT管家",
                "subtitle": "站点总量合计与做种体积排行",
                "refresh": 120,
                "border": True,
            },
            None,
        )

    def get_service(self) -> list[dict[str, Any]]:
        """注册站点采集与通知两个独立定时服务。

        采集按用户设定（自定义 Cron 或跟随 MoviePilot）执行；
        通知按独立的 notify_cron 执行，默认每天一次，避免采集频繁时刷屏。
        """

        if not self.get_state():
            return []
        services: list[dict[str, Any]] = []
        if self._collect_enabled:
            services.append(
                {
                    "id": f"{self.__class__.__name__}.Collect",
                    "name": "PT管家站点数据采集",
                    "trigger": self._build_trigger(),
                    "func": self.scheduled_collect,
                    "kwargs": {},
                }
            )
        if self._notify_enabled:
            services.append(
                {
                    "id": f"{self.__class__.__name__}.Notify",
                    "name": "PT管家采集结果通知",
                    "trigger": CronTrigger.from_crontab(self._notify_cron, timezone=self._tz()),
                    "func": self.scheduled_notify,
                    "kwargs": {},
                }
            )
        return services

    def _mp_refresh_interval_hours(self) -> int | None:
        """读取 MoviePilot 的站点数据刷新间隔（小时），未启用时返回 None。"""

        try:
            from app.core.config import settings as mp_settings

            raw = getattr(mp_settings, "SITEDATA_REFRESH_INTERVAL", None)
            hours = int(float(raw)) if raw not in (None, "", 0, "0") else 0
        except Exception:  # noqa: BLE001 - 读取宿主配置失败时退回自定义计划
            return None
        return hours or None

    def _build_trigger(self) -> Any:
        """构建采集触发器：跟随 MoviePilot 或使用自定义 Cron。"""

        if self._collect_mode == "follow_mp":
            hours = self._mp_refresh_interval_hours()
            if hours:
                # 与 MoviePilot 的站点数据刷新同频，错后 2 分钟等宿主先写入数据库。
                return IntervalTrigger(hours=hours, jitter=60, timezone=self._tz())
            logger.warning("未读取到 MoviePilot 站点数据刷新间隔，采集计划退回自定义 Cron")
        return CronTrigger.from_crontab(self._collect_cron, timezone=self._tz())

    def get_api(self) -> list[dict[str, Any]]:
        """注册总览、详情、设置与采集 API。"""

        return [
            {
                "path": "/overview",
                "endpoint": self.api_overview,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "获取站点总览",
                "description": "返回全部站点的账号数据、扩展字段与总量合计。",
                "response_model": OverviewResponse,
            },
            {
                "path": "/site",
                "endpoint": self.api_site,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "获取单个站点详情",
                "description": "返回指定站点的完整数据与历史趋势。",
                "response_model": SiteDetailResponse,
            },
            {
                "path": "/settings",
                "endpoint": self.api_settings,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "读取插件设置",
                "description": "返回当前设置与可参与采集的站点选项。",
                "response_model": SettingsResponse,
            },
            {
                "path": "/settings",
                "endpoint": self.api_update_settings,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "保存插件设置",
                "description": "保存设置并让宿主重建插件定时任务。",
                "response_model": SettingsResponse,
            },
            {
                "path": "/collect",
                "endpoint": self.api_collect,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "触发站点数据采集",
                "description": "指定域名时同步采集单个站点，未指定时后台采集全部站点。",
                "response_model": CollectResponse,
            },
            {
                "path": "/collect/status",
                "endpoint": self.api_collect_status,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "查询采集状态",
                "description": "返回最近一次采集的进度与结果。",
                "response_model": CollectStatusResponse,
            },
            {
                "path": "/order",
                "endpoint": self.api_order,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "保存站点自定义顺序",
                "description": "保存用户在总览页拖拽调整后的站点展示顺序。",
                "response_model": SiteOrderResponse,
            },
            {
                "path": "/columns",
                "endpoint": self.api_columns,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "保存总览列顺序",
                "description": "保存用户调整后的总览列展示顺序。",
                "response_model": ColumnOrderResponse,
            },
            {
                "path": "/view",
                "endpoint": self.api_view,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "保存总览视图状态",
                "description": "保存排序字段、方向、可见列与列顺序。",
                "response_model": ViewStateResponse,
            },
            {
                "path": "/invite/collect",
                "endpoint": self.api_invite_collect,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "抓取后宫（邀请）数据",
                "description": "抓取站点邀请页的被邀者列表；指定域名时只抓该站。",
                "response_model": CollectResponse,
            },
        ]

    def stop_service(self) -> None:
        """停止插件并释放运行状态。"""

        self._enabled = False
        self._collect_running = False

    def _tz(self) -> ZoneInfo:
        """返回 MoviePilot 配置时区。"""

        try:
            return ZoneInfo(settings.TZ)
        except Exception:  # noqa: BLE001 - 时区异常时退回系统本地时区
            return ZoneInfo("Asia/Shanghai")

    def _now(self) -> datetime:
        """返回配置时区中的当前时间。"""

        return datetime.now(self._tz())

    # ------------------------------------------------------------------
    # 数据来源
    # ------------------------------------------------------------------

    @staticmethod
    def _site_entry(site: Any) -> dict[str, Any]:
        """把宿主站点对象投影为内部字典（仅后端使用，不返回 Cookie）。"""

        url = as_text(getattr(site, "url", ""))
        host = urlparse(url).netloc if url else ""
        return {
            "site_id": getattr(site, "id", None),
            "name": as_text(getattr(site, "name", "")),
            "domain": as_text(getattr(site, "domain", "")).casefold(),
            "url": url,
            "host": (host or as_text(getattr(site, "domain", ""))).casefold(),
            "is_active": bool(getattr(site, "is_active", False)),
            "site_priority": as_int(getattr(site, "pri", 0)) or None,
            "cookie": as_text(getattr(site, "cookie", "")),
            "ua": as_text(getattr(site, "ua", "")),
            "proxy": bool(getattr(site, "proxy", False)),
        }

    def _site_entries(self) -> list[dict[str, Any]]:
        """读取宿主当前全部站点，仅后端使用。"""

        return [self._site_entry(site) for site in (SiteOper().list() or [])]

    @staticmethod
    def _snapshot(row: Any) -> dict[str, Any]:
        """把宿主 SiteUserData 行转换为插件内部快照字典。"""

        day = as_text(getattr(row, "updated_day", ""))[:10]
        moment = as_text(getattr(row, "updated_time", ""))[:8]
        return {
            "domain": as_text(getattr(row, "domain", "")).casefold(),
            "username": as_text(getattr(row, "username", "")),
            "uid": as_text(getattr(row, "userid", "")),
            "user_level": as_text(getattr(row, "user_level", "")),
            "join_at": as_text(getattr(row, "join_at", "")),
            "upload": as_int(getattr(row, "upload", 0)),
            "download": as_int(getattr(row, "download", 0)),
            "ratio": as_float(getattr(row, "ratio", None)),
            "bonus": as_float(getattr(row, "bonus", None)),
            "seeding": as_int(getattr(row, "seeding", 0)),
            "seeding_size": as_int(getattr(row, "seeding_size", 0)),
            "leeching": as_int(getattr(row, "leeching", 0)),
            "leeching_size": as_int(getattr(row, "leeching_size", 0)),
            "message_unread": as_int(getattr(row, "message_unread", 0)),
            "err_msg": as_text(getattr(row, "err_msg", "")),
            "updated_day": day,
            "updated_time": moment,
            "source_updated_at": " ".join(part for part in (day, moment) if part),
        }

    def _snapshots_by_domain(self) -> dict[str, list[dict[str, Any]]]:
        """按域名整理宿主站点历史快照，按时间升序排列。"""

        grouped: dict[str, list[dict[str, Any]]] = {}
        for row in SiteOper().get_userdata() or []:
            item = self._snapshot(row)
            if not item["domain"]:
                continue
            grouped.setdefault(item["domain"], []).append(item)
        for items in grouped.values():
            items.sort(key=lambda item: (item["updated_day"], item["updated_time"]))
        return grouped

    def _extended_map(self) -> dict[str, dict[str, Any]]:
        """读取已保存的站点页面扩展字段。"""

        try:
            data = self.get_data(self.DATA_EXTENDED)
        except Exception as error:  # noqa: BLE001 - 读取失败按无扩展数据处理
            logger.warning(f"PT管家读取扩展字段失败：{error}")
            return {}
        if not isinstance(data, dict):
            return {}
        result: dict[str, dict[str, Any]] = {}
        for key, value in data.items():
            if not isinstance(value, dict):
                continue
            # 兼容早期版本把采集器的嵌套结果直接落盘的记录
            if isinstance(value.get("fields"), dict):
                flattened = {
                    name: item
                    for name, item in value.items()
                    if name not in ("fields",)
                }
                flattened.update(value["fields"])
                result[as_text(key).casefold()] = flattened
                continue
            result[as_text(key).casefold()] = value
        return result

    def _build_records(
        self,
    ) -> tuple[list[SiteRecord], str, str]:
        """构建全部站点记录，并返回数据时间信息。"""

        raw_records, mp_data_at, extended_at = build_site_records(
            self._site_entries(),
            self._snapshots_by_domain(),
            self._extended_map(),
            self._now(),
        )
        self._apply_invite_quota(raw_records)
        records = [SiteRecord.model_validate(item) for item in raw_records]
        return records, mp_data_at, extended_at

    def _apply_invite_quota(self, raw_records: list[dict[str, Any]]) -> None:
        """用邀请页解析到的名额补齐用户详情页缺失的邀请数据。

        用户详情页（userdetails.php）经常因超时或被站点改版而拿不到邀请名额，
        而邀请页（invite.php）能正常访问。这里在构建记录前做一次覆盖式补齐，
        让总览的「邀请」列不再大面积显示占位符。
        """

        try:
            invite_map = self._invite_map()
        except Exception:  # noqa: BLE001 - 后宫数据异常不影响总览
            return
        if not invite_map:
            return
        for item in raw_records:
            entry = invite_map.get(item.get("domain") or "") or {}
            extended = item.get("extended")
            if not isinstance(extended, dict) or not entry:
                continue
            available = entry.get("invites_available")
            sent = entry.get("invites_sent")
            if extended.get("invites_available") is None and isinstance(available, int):
                extended["invites_available"] = available
            if extended.get("invites_sent") is None and isinstance(sent, int):
                extended["invites_sent"] = sent

    def _site_options(self) -> list[dict[str, Any]]:
        """返回设置页使用的站点选项，仅包含非敏感字段。"""

        return [
            {
                "domain": site["domain"],
                "name": site["name"] or site["domain"],
                "is_active": site["is_active"],
                "has_cookie": bool(site["cookie"]),
            }
            for site in self._site_entries()
        ]

    # ------------------------------------------------------------------
    # 养老进度
    # ------------------------------------------------------------------

    def _retirement_snapshots(
        self, records: list[SiteRecord]
    ) -> list[dict[str, Any]]:
        """把站点记录转换为养老进度计算所需的快照。"""

        snapshots: list[dict[str, Any]] = []
        for record in records:
            extended = record.extended
            seeding_points = (
                float(extended.seeding_points)
                if extended is not None and extended.seeding_points is not None
                else None
            )
            snapshots.append(
                {
                    "site_id": record.site_id,
                    "domain": record.domain,
                    "site_name": record.name,
                    "site_priority": record.site_priority,
                    # 站点页面解析到的等级优先，退回 MoviePilot 快照等级
                    "user_level": (
                        as_text(extended.user_level)
                        if extended is not None and as_text(extended.user_level)
                        else as_text(record.user_level)
                    ),
                    "join_at": as_text(record.join_at),
                    "upload": int(record.upload or 0),
                    "download": int(record.download or 0),
                    "ratio": record.ratio,
                    "bonus": record.bonus,
                    "seeding_points": seeding_points,
                    "seeding_points_hourly": None,
                    "estimated_bonus_hourly": record.hourly_bonus,
                    "seeding": int(record.seeding or 0),
                    "seeding_size": int(record.seeding_size or 0),
                    "torrent_uploads": None,
                    "average_seeding_time_days": None,
                    "updated_day": as_text(record.updated_at)[:10],
                }
            )
        return snapshots

    def _build_retirement(self, records: list[SiteRecord]) -> RetirementProgressData:
        """计算全部站点的养老进度。"""

        rules = getattr(self, "_retirement_rules", None) or self._load_retirement_rules()
        snapshots = self._retirement_snapshots(records)
        result = build_retirement_progress(
            snapshots,
            rules_by_name=rules,
            wealthy_retirement_sites=self._wealthy_retirement_sites,
        )
        return RetirementProgressData.model_validate(result)

    def _build_twelve(self, records: list[SiteRecord]) -> TwelveProgressData:
        """计算十二大站点加入进度。"""

        # build_twelve_progress 用站点行的 ``id`` 关联快照，这里补上同义键
        configured = [
            {**entry, "id": entry.get("site_id")}
            for entry in self._site_entries()
        ]
        # 站点记录可能缺少 site_id（无快照时回填不完整），这里用域名兜底关联
        by_domain = {record.domain: record for record in records}
        latest_by_site_id: dict[int, dict[str, Any]] = {}
        for entry in configured:
            site_id = entry.get("site_id")
            if not isinstance(site_id, int):
                continue
            record = by_domain.get(entry.get("domain") or "")
            latest_by_site_id[site_id] = {
                "join_at": as_text(record.join_at) if record else "",
                "err_msg": as_text(record.err_msg) if record else "尚无 MoviePilot 站点数据",
            }
        result = build_twelve_progress(configured, latest_by_site_id)
        return TwelveProgressData.model_validate(result)

    def _invite_map(self) -> dict[str, Any]:
        """读取已保存的后宫数据（按域名）。"""

        try:
            data = self.get_data(self.DATA_INVITE) or {}
        except Exception:  # noqa: BLE001 - 读取失败按无数据处理
            return {}
        return data if isinstance(data, dict) else {}

    def _build_invite(self, records: list[SiteRecord]) -> InviteOverviewData:
        """汇总后宫数据：成员数、风险成员与邀请名额。"""

        saved = self._invite_map()
        sites: list[InviteSiteData] = []
        invitee_total = 0
        danger_total = 0
        warning_total = 0
        available_total = 0
        sent_total = 0
        quota_site_count = 0
        for record in records:
            entry = saved.get(record.domain) or {}
            if not entry:
                continue
            invitees = [
                InviteMemberData.model_validate(item)
                for item in (entry.get("invitees") or [])
                if isinstance(item, dict)
            ]
            danger = sum(1 for item in invitees if item.ratio_health == "danger")
            warning = sum(1 for item in invitees if item.ratio_health == "warning")
            disabled = sum(1 for item in invitees if item.disabled)
            extended = record.extended.model_dump() if record.extended else {}
            available = extended.get("invites_available")
            if not isinstance(available, int):
                available = entry.get("invites_available")
            sent = extended.get("invites_sent")
            if not isinstance(sent, int):
                sent = entry.get("invites_sent")
            site = InviteSiteData(
                domain=record.domain,
                site_name=record.name or record.domain,
                ok=bool(entry.get("ok")),
                error=as_text(entry.get("error")),
                url=as_text(entry.get("url")),
                collected_at=as_text(entry.get("collected_at")),
                invitee_count=len(invitees),
                danger_count=danger,
                warning_count=warning,
                disabled_count=disabled,
                invites_available=available if isinstance(available, int) else None,
                invites_sent=sent if isinstance(sent, int) else None,
                invitees=invitees,
            )
            sites.append(site)
            invitee_total += len(invitees)
            danger_total += danger
            warning_total += warning
            if site.invites_available:
                available_total += site.invites_available
                quota_site_count += 1
            if site.invites_sent:
                sent_total += site.invites_sent
        # 先按「有名额」排前，再按成员数，方便一眼看到哪里还能邀请
        sites.sort(
            key=lambda item: (
                -int(bool(item.invites_available)),
                -item.invitee_count,
                item.site_name,
            )
        )
        return InviteOverviewData(
            generated_at=self._now().strftime("%Y-%m-%d %H:%M:%S"),
            site_count=len(sites),
            invitee_total=invitee_total,
            danger_total=danger_total,
            warning_total=warning_total,
            available_total=available_total,
            sent_total=sent_total,
            quota_site_count=quota_site_count,
            sites=sites,
        )

    def _run_invite_collect(self, domains: list[str] | None = None) -> dict[str, Any]:
        """抓取站点邀请页，更新后宫成员列表。"""

        targets = self._collect_targets(domains)
        saved = dict(self._invite_map())
        snapshots = self._snapshots_by_domain()
        collector = InviteCollector(
            timeout=self._collect_timeout,
            proxy_host=as_text(getattr(settings, "PROXY_HOST", "")),
        )
        ok_count = 0
        fail_count = 0

        def work(site: Mapping[str, Any]) -> tuple[str, dict[str, Any], bool]:
            """抓取单个站点，返回域名、记录与是否成功。"""

            items = snapshots.get(site["domain"], [])
            uid = as_text(items[-1].get("uid")) if items else ""
            payload = {
                "domain": site["domain"],
                "host": site.get("host") or site["domain"],
                "uid": uid,
                "cookie": site.get("cookie", ""),
                "ua": site.get("ua", ""),
                "proxy": site.get("proxy"),
                "collected_at": self._now().strftime("%Y-%m-%d %H:%M:%S"),
            }
            result = collector.fetch(payload)
            record = {
                "ok": bool(result.get("ok")),
                "error": as_text(result.get("error")),
                "url": as_text(result.get("url")),
                "collected_at": as_text(payload["collected_at"]),
                "invitees": list(result.get("invitees") or []),
                "invites_available": result.get("invites_available"),
                "invites_sent": result.get("invites_sent"),
            }
            return site["domain"], record, bool(result.get("ok"))

        # 与站点采集一致的并发度：后宫要遍历全部站点，串行会非常慢
        with ThreadPoolExecutor(max_workers=self._collect_concurrency) as executor:
            futures = [executor.submit(work, site) for site in targets]
            for future in as_completed(futures):
                try:
                    domain, record, ok = future.result()
                except Exception as error:  # noqa: BLE001 - 单站异常不影响其它站点
                    logger.warning(f"PT管家后宫采集单站异常：{error}")
                    fail_count += 1
                    continue
                saved[domain] = record
                if ok:
                    ok_count += 1
                else:
                    fail_count += 1
        self.save_data(self.DATA_INVITE, saved)
        logger.info(f"PT管家后宫采集完成：成功 {ok_count} 个，失败 {fail_count} 个")
        return {"ok_count": ok_count, "fail_count": fail_count}

    # ------------------------------------------------------------------
    # 采集
    # ------------------------------------------------------------------

    def _collect_targets(self, domains: list[str] | None = None) -> list[dict[str, Any]]:
        """整理参与采集的站点，缺失 UID 或 Cookie 的站点直接跳过。"""

        selected = {as_text(item).casefold() for item in (domains or []) if as_text(item)}
        if not selected and self._collect_domains:
            selected = {as_text(item).casefold() for item in self._collect_domains}
        targets: list[dict[str, Any]] = []
        for site in self._site_entries():
            if selected and site["domain"] not in selected:
                continue
            if not site["cookie"]:
                continue
            targets.append(site)
        return targets

    def _collect_one(
        self,
        collector: SitePageCollector,
        site: dict[str, Any],
        uid: str,
    ) -> tuple[str, dict[str, Any]]:
        """采集单个站点并补齐时间戳与站点名称。"""

        payload = {
            "domain": site["domain"],
            "host": site.get("host") or site["domain"],
            "uid": uid,
            "cookie": site["cookie"],
            "ua": site.get("ua", ""),
            "proxy": site["proxy"],
        }
        result = collector.collect(payload)
        # 采集器返回 {fields, raw, ok, error}，落盘时摊平为可直接校验的字段模型
        record: dict[str, Any] = {
            "ok": bool(result.get("ok")),
            "error": as_text(result.get("error")),
            "url": as_text(result.get("url")),
            "raw": list(result.get("raw") or []),
            "collected_at": self._now().strftime("%Y-%m-%d %H:%M:%S"),
            "site_name": site["name"] or site["domain"],
        }
        record.update(result.get("fields") or {})
        return site["domain"], record

    def _refresh_all_userdata(self) -> None:
        """让 MoviePilot 刷新全部站点的账号数据（上传/下载/魔力/做种等）。

        全量采集若不先做这一步，用户点「采集全部」仍看不到基础数据变化——
        插件采集只补扩展字段，基础数字始终来自 MoviePilot 快照。

        宿主自带的 ``refresh_userdatas`` 逐站串行请求，47 个站点要几十分钟，
        用户会以为按钮没反应。这里按采集并发度分站并行，并同步推进进度。
        """
        try:
            from app.helper.sites import SitesHelper
            from app.chain.site import SiteChain

            chain = SiteChain()
            helper = SitesHelper()
            indexers = []
            for site in self._site_entries():
                indexer = helper.get_indexer(site["domain"])
                if indexer:
                    indexers.append(indexer)
            if not indexers:
                return
            self._bump_progress(phase="refresh", total=len(indexers))

            def refresh(indexer: Any) -> None:
                """刷新单个站点的账号数据，异常不影响其它站点。"""

                try:
                    chain.refresh_userdata(site=indexer)
                except Exception as error:  # noqa: BLE001 - 单站失败继续
                    logger.debug(f"PT管家刷新站点数据失败（{getattr(indexer, 'name', '')}）：{error}")
                finally:
                    self._bump_progress(phase="refresh", advance=1)

            with ThreadPoolExecutor(max_workers=self._collect_concurrency) as executor:
                list(executor.map(refresh, indexers))
            logger.info(f"PT管家已刷新 MoviePilot 站点数据：{len(indexers)} 个站点")
        except Exception as error:  # noqa: BLE001 - 宿主刷新失败不影响扩展字段采集
            logger.warning(f"PT管家刷新 MoviePilot 站点数据异常：{error}")

    def _bump_progress(self, *, phase: str, total: int = 0, advance: int = 0) -> None:
        """推进采集进度，供前端轮询显示「抓取中 x/y」。

        只在内存中更新（``_collect_state``），落库仍由采集结束时统一完成。
        """

        state = getattr(self, "_collect_state", None)
        if not isinstance(state, dict):
            return
        state["phase"] = phase
        if total:
            state["total"] = total
            state["done"] = 0
        if advance:
            state["done"] = int(state.get("done") or 0) + advance

    def _refresh_site_userdata(self, domain: str) -> bool:
        """让 MoviePilot 重新抓取该站点的账号数据（上传/下载/魔力/做种等）。

        插件自身的采集只补充站点页面的扩展字段，上传下载等基础数据始终来自 MoviePilot
        的 ``siteuserdata`` 快照。不同步刷新这一步，用户改完上传量后点抓取仍看不到变化。
        """

        try:
            from app.helper.sites import SitesHelper
            from app.chain.site import SiteChain

            site = SitesHelper().get_indexer(domain)
            if not site:
                logger.warning(f"PT管家刷新站点数据失败：MoviePilot 未找到站点 {domain}")
                return False
            userdata = SiteChain().refresh_userdata(site=site)
            if userdata:
                logger.info(f"PT管家已刷新站点账号数据：{domain}")
                return True
            logger.warning(f"PT管家刷新站点账号数据未返回结果：{domain}")
        except Exception as error:  # noqa: BLE001 - 宿主刷新失败不影响扩展字段采集
            logger.warning(f"PT管家刷新站点账号数据异常（{domain}）：{error}")
        return False

    def _run_collect(self, domains: list[str] | None = None) -> CollectResponse:
        """执行采集并保存扩展字段，返回采集结果。"""

        targets = self._collect_targets(domains)
        if not targets:
            return CollectResponse(
                ok=False,
                mode="none",
                message="没有可采集的站点：请先为站点配置 Cookie 并等待 MoviePilot 采集到 UID",
            )
        snapshots = self._snapshots_by_domain()
        collector = SitePageCollector(
            timeout=self._collect_timeout,
            proxy_host=as_text(getattr(settings, "PROXY_HOST", "")),
        )
        self._bump_progress(phase="collect", total=len(targets))
        extended_map = dict(self._extended_map())
        ok_count = 0
        fail_count = 0
        errors: list[str] = []
        started_at = self._now().strftime("%Y-%m-%d %H:%M:%S")
        with ThreadPoolExecutor(max_workers=self._collect_concurrency) as executor:
            futures = {}
            for site in targets:
                items = snapshots.get(site["domain"], [])
                uid = as_text(items[-1].get("uid")) if items else ""
                if not uid:
                    fail_count += 1
                    errors.append(f"{site['name'] or site['domain']}：MoviePilot 尚无 UID 数据")
                    self._bump_progress(phase="collect", advance=1)
                    continue
                futures[executor.submit(self._collect_one, collector, site, uid)] = site
            for future in as_completed(futures):
                site = futures[future]
                label = site["name"] or site["domain"]
                try:
                    domain, result = future.result()
                except Exception as error:  # noqa: BLE001 - 单站异常不影响其它站点
                    fail_count += 1
                    errors.append(f"{label}：{type(error).__name__}")
                    self._bump_progress(phase="collect", advance=1)
                    continue
                extended_map[domain] = result
                if result.get("ok"):
                    ok_count += 1
                else:
                    fail_count += 1
                    errors.append(f"{label}：{result.get('error') or '未解析到字段'}")
                self._bump_progress(phase="collect", advance=1)
                state = getattr(self, "_collect_state", None)
                if isinstance(state, dict):
                    state["ok_count"] = ok_count
                    state["fail_count"] = fail_count
        self.save_data(self.DATA_EXTENDED, extended_map)
        finished_at = self._now().strftime("%Y-%m-%d %H:%M:%S")
        state = {
            "running": False,
            "started_at": started_at,
            "finished_at": finished_at,
            "total": len(targets),
            "done": len(targets),
            "ok_count": ok_count,
            "fail_count": fail_count,
            "errors": errors[:30],
        }
        self._collect_state = state
        try:
            self.save_data(self.DATA_COLLECT_STATE, state)
        except Exception as error:  # noqa: BLE001 - 状态写入失败不影响数据
            logger.warning(f"PT管家保存采集状态失败：{error}")
        logger.info(
            f"PT管家采集完成：成功 {ok_count} 个，失败 {fail_count} 个，共 {len(targets)} 个站点"
        )
        return CollectResponse(
            ok=ok_count > 0,
            mode="sync" if domains else "background",
            ok_count=ok_count,
            fail_count=fail_count,
            errors=errors[:30],
            message=f"采集完成：成功 {ok_count} 个，失败 {fail_count} 个",
        )

    def _notify_collect(self, state: dict[str, Any]) -> None:
        """按配置发送采集结果通知。"""

        text = (
            f"采集站点：{state.get('total', 0)} 个\n"
            f"成功：{state.get('ok_count', 0)} 个\n"
            f"失败：{state.get('fail_count', 0)} 个"
        )
        errors = state.get("errors") or []
        if errors:
            text += "\n\n失败明细（最多 10 条）：\n" + "\n".join(f"- {item}" for item in errors[:10])
        try:
            self.post_message(
                mtype=NotificationType.SiteMessage,
                title="PT管家站点数据采集",
                text=text,
            )
        except Exception as error:  # noqa: BLE001 - 通知失败不影响采集结果
            logger.warning(f"PT管家发送通知失败：{error}")

    def scheduled_notify(self) -> None:
        """定时任务入口：按 notify_cron 汇总发送最近一次采集结果。

        通知与采集频率解耦，采集可以每小时跑，通知默认每天一次。
        """

        if not self.get_state() or not self._notify_enabled:
            return
        state = getattr(self, "_collect_state", None) or {}
        if not state:
            try:
                state = self.get_data(self.DATA_COLLECT_STATE) or {}
            except Exception:  # noqa: BLE001 - 读取失败按无数据处理
                state = {}
        if not state:
            logger.info("PT管家暂无采集记录，跳过本次通知")
            return
        if state.get("running"):
            logger.info("PT管家采集仍在进行，跳过本次通知")
            return
        self._notify_collect(state)

    def scheduled_collect(self) -> None:
        """定时任务入口：采集全部站点。"""

        if not self.get_state() or not self._collect_enabled:
            return
        with self._collect_lock:
            if self._collect_running:
                logger.info("PT管家采集任务已在进行中，跳过本次触发")
                return
            self._collect_running = True
        try:
            # 跟随 MoviePilot 刷新时，宿主通常刚更新过快照，这里再刷一次保证同步；
            # 自定义计划则依赖这一步补上基础数据。
            if self._refresh_before_collect:
                self._refresh_all_userdata()
            self._run_collect(None)
        except Exception as error:  # noqa: BLE001 - 定时任务异常需记录后结束
            logger.error(f"PT管家定时采集失败：{error}")
        finally:
            self._collect_running = False

    def _background_collect(self, domains: list[str] | None = None) -> None:
        """后台线程入口：采集完成后写入状态。"""

        try:
            if self._refresh_before_collect:
                self._refresh_all_userdata()
            self._run_collect(domains)
        except Exception as error:  # noqa: BLE001 - 后台采集异常需记录后结束
            logger.error(f"PT管家后台采集失败：{error}")
        finally:
            self._collect_running = False

    # ------------------------------------------------------------------
    # API
    # ------------------------------------------------------------------

    def api_overview(self) -> OverviewResponse:
        """返回站点总览与总量合计。"""

        records, mp_data_at, extended_at = self._build_records()
        summary = SummaryData.model_validate(
            summarize_sites([record.model_dump() for record in records])
        )
        try:
            retirement = self._build_retirement(records)
        except Exception as error:  # noqa: BLE001 - 养老计算失败不影响主看板
            logger.warning(f"PT管家计算养老进度失败：{error}")
            retirement = None
        try:
            twelve = self._build_twelve(records)
        except Exception as error:  # noqa: BLE001 - 十二大统计失败不影响主看板
            logger.warning(f"PT管家计算十二大站点失败：{error}")
            twelve = None
        try:
            invite = self._build_invite(records)
        except Exception as error:  # noqa: BLE001 - 后宫统计失败不影响主看板
            logger.warning(f"PT管家计算后宫数据失败：{error}")
            invite = None
        return OverviewResponse(
            summary=summary,
            sites=records,
            retirement=retirement,
            twelve=twelve,
            invite=invite,
            generated_at=self._now().strftime("%Y-%m-%d %H:%M:%S"),
            mp_data_at=mp_data_at,
            extended_at=extended_at,
            collecting=bool(getattr(self, "_collect_running", False)),
        )

    def api_site(self, domain: str = Query(...)) -> SiteDetailResponse:
        """返回单个站点的完整数据与历史趋势。"""

        target = as_text(domain).casefold()
        if not target:
            raise HTTPException(status_code=422, detail="缺少站点域名")
        records, _, _ = self._build_records()
        record = next((item for item in records if item.domain == target), None)
        if record is None:
            raise HTTPException(status_code=404, detail="未找到该站点")
        items = self._snapshots_by_domain().get(target, [])
        trend = [
            TrendPoint.model_validate(point)
            for point in build_trend(items, days=self._trend_days, today=self._now().date())
        ]
        return SiteDetailResponse(site=record, trend=trend)

    def api_settings(self) -> SettingsResponse:
        """返回当前设置与站点选项。"""

        return SettingsResponse(settings=self._settings(), site_options=self._site_options())

    def api_update_settings(self, payload: SettingsData) -> SettingsResponse:
        """保存设置并让宿主重建插件定时任务。"""

        self._apply_settings(payload)
        self.update_config(payload.model_dump())
        try:
            Scheduler().update_plugin_job(self.__class__.__name__)
        except Exception as error:  # noqa: BLE001 - 保存设置本身仍然有效
            logger.warning(f"PT管家更新定时任务失败，将在插件重载后生效：{error}")
        logger.info(
            f"PT管家设置已保存：启用={self._enabled}，深度采集={self._collect_enabled}，"
            f"计划={self._collect_cron}"
        )
        return self.api_settings()

    def api_collect(self, domain: str | None = Query(default=None)) -> CollectResponse:
        """触发采集：指定域名时同步采集单站，否则后台采集全部站点。"""

        if not self.get_state():
            raise HTTPException(status_code=409, detail="插件未启用")
        target = as_text(domain)
        if target:
            # 单站抓取先让 MoviePilot 刷新该站账号数据（上传/下载/魔力/做种等），
            # 再抓站点页面的扩展字段，否则用户改了上传量也看不到变化。
            if self._refresh_before_collect:
                self._refresh_site_userdata(target)
            result = self._run_collect([target])
            return result
        with self._collect_lock:
            if self._collect_running:
                return CollectResponse(ok=False, mode="background", message="采集已在进行中")
            self._collect_running = True
        state = {
            "running": True,
            "started_at": self._now().strftime("%Y-%m-%d %H:%M:%S"),
            "finished_at": "",
            "total": len(self._collect_targets(None)),
            "done": 0,
            "ok_count": 0,
            "fail_count": 0,
            "errors": [],
        }
        self._collect_state = state
        thread = threading.Thread(
            target=self._background_collect,
            name=f"{self.__class__.__name__}Collect",
            daemon=True,
        )
        thread.start()
        return CollectResponse(
            ok=True,
            mode="background",
            message=f"已开始后台采集 {state['total']} 个站点",
        )

    def api_collect_status(self) -> CollectStatusResponse:
        """返回最近一次采集的进度与结果。"""

        state = dict(getattr(self, "_collect_state", {}) or {})
        state["running"] = bool(getattr(self, "_collect_running", False))
        return CollectStatusResponse.model_validate(state)

    def api_invite_collect(self, domain: str | None = Query(default=None)) -> CollectResponse:
        """抓取站点邀请页，刷新后宫成员列表（指定域名时只抓该站）。"""

        if not self.get_state():
            raise HTTPException(status_code=409, detail="插件未启用")
        target = as_text(domain)
        result = self._run_invite_collect([target] if target else None)
        return CollectResponse(
            ok=result["ok_count"] > 0,
            mode="sync" if target else "background",
            ok_count=result["ok_count"],
            fail_count=result["fail_count"],
            errors=[],
            message=f"后宫采集完成：成功 {result['ok_count']} 个，失败 {result['fail_count']} 个",
        )

    def api_order(self, payload: SiteOrderRequest) -> SiteOrderResponse:
        """保存站点自定义展示顺序。

        顺序与站点配置分开存储：只合并 ``site_order`` 一个键，
        不会覆盖启用状态、采集计划等其它设置。
        """

        if not self.get_state():
            raise HTTPException(status_code=409, detail="插件未启用")
        known = {site["domain"] for site in self._site_entries()}
        order = [as_text(item).casefold() for item in payload.order if as_text(item)]
        # 去重并剔除已不存在的站点，避免顺序里混入脏数据
        order = [domain for domain in dict.fromkeys(order) if domain in known]
        saved = dict(self.get_config() or {})
        if not saved:
            # 从未保存过配置时用当前设置补齐，防止只写入顺序字段而丢掉其它设置
            saved = self._settings().model_dump()
        saved["site_order"] = order
        self.update_config(saved)
        self._site_order = order
        logger.info(f"PT管家自定义站点顺序已保存：{len(order)} 个站点")
        return SiteOrderResponse(ok=True, message=f"已保存 {len(order)} 个站点的自定义顺序", order=order)

    def api_columns(self, payload: ColumnOrderRequest) -> ColumnOrderResponse:
        """保存总览列的自定义展示顺序。

        与站点顺序同理，只合并 ``column_order`` 一个键。
        """

        if not self.get_state():
            raise HTTPException(status_code=409, detail="插件未启用")
        order = [as_text(item) for item in payload.order if as_text(item)]
        order = list(dict.fromkeys(order))
        saved = dict(self.get_config() or {})
        if not saved:
            saved = self._settings().model_dump()
        saved["column_order"] = order
        self.update_config(saved)
        self._column_order = order
        logger.info(f"PT管家自定义列顺序已保存：{len(order)} 列")
        return ColumnOrderResponse(ok=True, message="列顺序已保存", order=order)

    def api_view(self, payload: ViewStateRequest) -> ViewStateResponse:
        """保存总览视图状态（排序字段、方向、可见列、列顺序）。

        只合并请求中显式给出的键，其余设置保持不变。
        """

        if not self.get_state():
            raise HTTPException(status_code=409, detail="插件未启用")
        saved = dict(self.get_config() or {})
        if not saved:
            saved = self._settings().model_dump()
        if payload.sort_key is not None:
            saved["sort_key"] = as_text(payload.sort_key) or "seeding_size"
        if payload.sort_desc is not None:
            saved["sort_desc"] = bool(payload.sort_desc)
        if payload.visible_columns is not None:
            saved["visible_columns"] = [as_text(item) for item in payload.visible_columns if as_text(item)]
        if payload.column_order is not None:
            saved["column_order"] = [as_text(item) for item in payload.column_order if as_text(item)]
        self.update_config(saved)
        # 同步运行时属性：直接用刚写入的值，避免再读运行态拿到旧数据
        self._sort_key = as_text(saved.get("sort_key")) or "seeding_size"
        self._sort_desc = bool(saved.get("sort_desc", True))
        self._visible_columns = [as_text(item) for item in (saved.get("visible_columns") or []) if as_text(item)]
        self._column_order = [as_text(item) for item in (saved.get("column_order") or []) if as_text(item)]
        return ViewStateResponse(
            ok=True,
            message="视图状态已保存",
            sort_key=self._sort_key,
            sort_desc=self._sort_desc,
            visible_columns=list(self._visible_columns),
            column_order=list(self._column_order),
        )
