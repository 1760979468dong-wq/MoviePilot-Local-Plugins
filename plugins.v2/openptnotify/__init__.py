"""PT 开注提醒插件。

定时抓取开放注册提醒页面（默认 bfjy2024/openpt），解析当前开放注册的 PT 站点，
按配置的 Cron 表达式通过 MoviePilot 通知渠道推送，并支持查看最近一次抓取结果。
"""

import json
import re
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings
from app.db.site_oper import SiteOper
from app.log import logger
from app.plugins import _PluginBase
from app.schemas.types import NotificationType
from app.utils.http import RequestUtils


class OpenPTNotify(_PluginBase):
    """PT 开注提醒插件。"""

    plugin_name = "PT开注提醒"
    plugin_desc = "定时抓取开放注册页面，推送当前开放注册的 PT 站点。"
    plugin_icon = "openpt.png"
    plugin_version = "1.0.0"
    plugin_label = "站点管理"
    plugin_author = "小罗"
    author_url = "https://github.com/xiaoluo-mp/MoviePilot-Local-Plugins"
    plugin_config_prefix = "openptnotify_"
    plugin_order = 30
    auth_level = 1

    # 默认值
    _DEFAULT_SOURCE_URL = "https://bfjy2024.github.io/openpt/"
    _DEFAULT_CRON = "0 9 * * *"
    # 源站响应较慢且偶发失败，单次超时与重试次数
    _FETCH_TIMEOUT = 60
    _FETCH_RETRIES = 3
    # 页面内联数据形如：const sites = [ {...}, ... ];
    _SITES_PATTERN = re.compile(r"const\s+sites\s*=\s*(\[.*?\])\s*;", re.S)
    _DATA_LAST_RESULT = "last_result"
    _DATA_SEEN_DOMAINS = "seen_domains"

    # 运行态
    _enabled: bool = False
    _cron: str = _DEFAULT_CRON
    _source_url: str = _DEFAULT_SOURCE_URL
    _notify_mode: str = "all"
    _notify_enabled: bool = True
    _only_open: bool = True
    _mark_owned: bool = True
    _notify_on_error: bool = True

    def init_plugin(self, config: dict = None) -> None:
        """根据插件配置初始化运行状态。"""
        self.stop_service()
        cfg = {**self._default_config(), **(config or {})}
        self._enabled = bool(cfg.get("enabled"))
        self._cron = str(cfg.get("cron") or self._DEFAULT_CRON).strip() or self._DEFAULT_CRON
        self._source_url = str(cfg.get("source_url") or self._DEFAULT_SOURCE_URL).strip() \
            or self._DEFAULT_SOURCE_URL
        mode = str(cfg.get("notify_mode") or "all").strip()
        self._notify_mode = mode if mode in ("all", "new") else "all"
        self._notify_enabled = bool(cfg.get("notify_enabled", True))
        self._only_open = bool(cfg.get("only_open", True))
        self._mark_owned = bool(cfg.get("mark_owned", True))
        self._notify_on_error = bool(cfg.get("notify_on_error", True))
        try:
            CronTrigger.from_crontab(self._cron, timezone=settings.TZ)
        except Exception as err:
            logger.warn(f"PT开注提醒：Cron 表达式无效（{self._cron}），已回退默认值：{err}")
            self._cron = self._DEFAULT_CRON
        logger.info(
            f"PT开注提醒已初始化：启用={self._enabled}，Cron={self._cron}，模式={self._notify_mode}"
        )

    def get_state(self) -> bool:
        """返回插件启用状态。"""
        return bool(self._enabled)

    @staticmethod
    def get_render_mode() -> Tuple[str, str]:
        """使用 Vue 模块联邦渲染配置与详情组件。"""
        return "vue", "dist/assets"

    @staticmethod
    def get_command() -> List[Dict[str, Any]]:
        """当前插件不注册远程命令。"""
        return []

    def get_form(self) -> Tuple[List[dict], Dict[str, Any]]:
        """Vue 配置组件读取当前配置模型。"""
        return [], self._current_config()

    @staticmethod
    def get_page() -> List[dict]:
        """Vue 详情组件通过插件 API 加载数据。"""
        return []

    def get_service(self) -> List[Dict[str, Any]]:
        """注册定时抓取与推送服务。"""
        if not self.get_state():
            return []
        return [
            {
                "id": f"{self.__class__.__name__}.Notify",
                "name": "PT开注提醒定时推送",
                "trigger": CronTrigger.from_crontab(self._cron, timezone=settings.TZ),
                "func": self._scheduled_run,
                "kwargs": {},
            }
        ]

    def get_api(self) -> List[Dict[str, Any]]:
        """注册配置读写、最近结果查询与手动触发 API。"""
        return [
            {
                "path": "/config",
                "endpoint": self.api_get_config,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "读取插件配置",
            },
            {
                "path": "/config",
                "endpoint": self.api_save_config,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "保存插件配置",
            },
            {
                "path": "/latest",
                "endpoint": self.api_latest,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "读取最近一次抓取结果",
            },
            {
                "path": "/run",
                "endpoint": self.api_run,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "立即抓取并推送",
            },
        ]

    def stop_service(self) -> None:
        """停止插件后台服务并释放资源。"""
        return None

    def _default_config(self) -> Dict[str, Any]:
        """返回插件默认配置。"""
        return {
            "enabled": False,
            "cron": self._DEFAULT_CRON,
            "source_url": self._DEFAULT_SOURCE_URL,
            "notify_mode": "all",
            "notify_enabled": True,
            "only_open": True,
            "mark_owned": True,
            "notify_on_error": True,
        }

    def _current_config(self) -> Dict[str, Any]:
        """返回当前运行配置。"""
        return {
            "enabled": self._enabled,
            "cron": self._cron,
            "source_url": self._source_url,
            "notify_mode": self._notify_mode,
            "notify_enabled": self._notify_enabled,
            "only_open": self._only_open,
            "mark_owned": self._mark_owned,
            "notify_on_error": self._notify_on_error,
        }

    def _fetch_sites(self) -> List[Dict[str, Any]]:
        """抓取并解析开放注册站点列表。源站偶发响应缓慢，做多次重试。"""
        last_error = "未知错误"
        text = ""
        for attempt in range(1, self._FETCH_RETRIES + 1):
            try:
                res = RequestUtils(
                    timeout=self._FETCH_TIMEOUT,
                    headers={
                        "User-Agent": "Mozilla/5.0 (compatible; MoviePilot-OpenPTNotify/1.0)"
                    },
                ).get_res(self._source_url)
            except Exception as err:
                last_error = str(err)
            else:
                if res is not None and res.status_code == 200:
                    text = res.text or ""
                    break
                last_error = f"HTTP {getattr(res, 'status_code', 'N/A')}"
            if attempt < self._FETCH_RETRIES:
                logger.warn(
                    f"PT开注提醒：第 {attempt}/{self._FETCH_RETRIES} 次抓取失败（{last_error}），2 秒后重试"
                )
                time.sleep(2)
        if not text:
            raise RuntimeError(f"页面请求失败：{last_error}")

        match = self._SITES_PATTERN.search(text)
        if not match:
            raise RuntimeError("未在页面中找到站点数据（页面结构可能已变更）")
        try:
            raw = json.loads(match.group(1))
        except json.JSONDecodeError as err:
            raise RuntimeError(f"站点数据解析失败：{err}") from err
        sites: List[Dict[str, Any]] = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            invite_type = str(item.get("inviteType") or "").strip().lower()
            if self._only_open and invite_type != "open":
                continue
            name = str(item.get("name") or "").strip()
            domain = str(item.get("domain") or "").strip()
            if not name and not domain:
                continue
            sites.append({
                "name": name or domain,
                "domain": domain,
                "engine": str(item.get("engine") or "").strip(),
                "logo": str(item.get("logo") or "").strip(),
                "register_url": str(item.get("registerUrl") or "").strip(),
                "invite": str(item.get("invite") or "").strip(),
                "invite_type": invite_type,
            })
        return sites

    @staticmethod
    def _host_of(value: Any) -> str:
        """从域名或 URL 中提取主机名（去掉协议、路径、端口、认证信息）。"""
        text = str(value or "").strip().lower()
        if not text:
            return ""
        if "//" in text:
            text = text.split("//", 1)[1]
        text = text.split("/", 1)[0].split("?", 1)[0].split("#", 1)[0]
        text = text.rsplit("@", 1)[-1]
        text = text.split(":", 1)[0]
        return text.strip(".")

    def _owned_hosts(self) -> set:
        """获取当前 MoviePilot 已配置站点的主机名集合（同时取 domain 与 url）。"""
        hosts = set()
        try:
            for site in SiteOper().list_order_by_pri() or []:
                for raw in (getattr(site, "domain", ""), getattr(site, "url", "")):
                    host = self._host_of(raw)
                    if host and "." in host:
                        hosts.add(host)
        except Exception as err:
            logger.warn(f"PT开注提醒：读取已配置站点失败：{err}")
        return hosts

    @staticmethod
    def _is_owned(host: str, owned_hosts: set) -> bool:
        """判断站点是否已配置。

        MoviePilot 里存的是主域名（如 itzmx.com、mypt.cc），而开注页给的是完整主机名
        （如 pt.itzmx.com、cc.mypt.cc），因此除精确比对外还需做子域名的双向后缀匹配。
        """
        if not host:
            return False
        if host in owned_hosts:
            return True
        return any(
            host.endswith("." + owned) or owned.endswith("." + host)
            for owned in owned_hosts
        )

    def _build_message(
        self,
        sites: List[Dict[str, Any]],
        owned_hosts: set,
        new_domains: set,
        fetched_at: str,
    ) -> str:
        """构建推送正文。"""
        lines = [f"共 {len(sites)} 个站点开放注册：", ""]
        for idx, site in enumerate(sites, 1):
            key = self._host_of(site.get("domain"))
            marks = []
            if self._mark_owned and self._is_owned(key, owned_hosts):
                marks.append("已拥有")
            if key in new_domains:
                marks.append("新增")
            suffix = f"　[{' / '.join(marks)}]" if marks else ""
            lines.append(f"{idx}. {site.get('name')}{suffix}")
            if site.get("domain"):
                lines.append(f"   域名：{site['domain']}")
            if site.get("register_url"):
                lines.append(f"   注册：{site['register_url']}")
        lines.append("")
        lines.append(f"抓取时间：{fetched_at}")
        return "\n".join(lines)

    def _run(self, manual: bool = False) -> Dict[str, Any]:
        """抓取开放注册站点并按配置推送，返回本次结果。"""
        fetched_at = datetime.now(ZoneInfo(settings.TZ)).strftime("%Y-%m-%d %H:%M:%S")
        result: Dict[str, Any] = {
            "fetched_at": fetched_at,
            "error": None,
            "sites": [],
            "new_count": 0,
            "pushed": False,
            "manual": manual,
        }
        try:
            sites = self._fetch_sites()
        except Exception as err:
            message = str(err)
            logger.error(f"PT开注提醒：抓取失败：{message}")
            result["error"] = message
            self.save_data(self._DATA_LAST_RESULT, result)
            if self._notify_on_error:
                self.post_message(
                    mtype=NotificationType.Plugin,
                    title="【PT开注提醒】抓取失败",
                    text=f"时间：{fetched_at}\n错误：{message}\n\n请检查抓取地址或网络。",
                )
            return result

        # 始终计算已拥有站点，保证页面与通知数据一致；_mark_owned 仅控制通知正文是否带该标记
        owned_hosts = self._owned_hosts()
        seen = set(self.get_data(self._DATA_SEEN_DOMAINS) or [])
        current = {self._host_of(site.get("domain")) for site in sites if self._host_of(site.get("domain"))}
        new_domains = current - seen

        push_sites = sites
        if self._notify_mode == "new":
            push_sites = [
                site for site in sites if self._host_of(site.get("domain")) in new_domains
            ]

        decorated: List[Dict[str, Any]] = []
        for site in sites:
            key = self._host_of(site.get("domain"))
            decorated.append({
                **site,
                "owned": self._is_owned(key, owned_hosts),
                "is_new": bool(key in new_domains),
            })
        result["sites"] = decorated
        result["new_count"] = len(new_domains)

        if not self._notify_enabled:
            logger.info("PT开注提醒：通知开关已关闭，本次仅抓取不推送")
        elif push_sites:
            title = f"【PT开注提醒】{len(push_sites)} 个站点开放注册"
            if self._notify_mode == "new":
                title = f"【PT开注提醒】新增 {len(push_sites)} 个开注站点"
            self.post_message(
                mtype=NotificationType.Plugin,
                title=title,
                text=self._build_message(push_sites, owned_hosts, new_domains, fetched_at),
            )
            result["pushed"] = True
        else:
            logger.info("PT开注提醒：本次没有需要推送的站点")

        if self._notify_enabled:
            self.save_data(self._DATA_SEEN_DOMAINS, sorted(current))
        self.save_data(self._DATA_LAST_RESULT, result)
        logger.info(
            f"PT开注提醒：抓取完成，当前 {len(sites)} 个开注站点，推送 {len(push_sites)} 个"
        )
        return result

    def _scheduled_run(self) -> None:
        """定时任务入口。"""
        self._run(manual=False)

    async def api_get_config(self) -> Dict[str, Any]:
        """返回当前插件配置。"""
        return {"success": True, "config": self._current_config()}

    async def api_save_config(self, payload: dict) -> Dict[str, Any]:
        """保存插件配置并重新初始化。"""
        merged = {**self._current_config(), **(payload or {})}
        self.update_config(merged)
        self.init_plugin(merged)
        # 同步刷新宿主侧定时服务，确保新的通知时间立即生效
        try:
            from app.scheduler import Scheduler

            Scheduler().update_plugin_job(self.__class__.__name__)
        except Exception as err:
            logger.warn(f"PT开注提醒：刷新定时服务失败：{err}")
        return {"success": True, "config": self._current_config()}

    async def api_latest(self) -> Dict[str, Any]:
        """返回最近一次抓取结果与当前配置。"""
        result = self.get_data(self._DATA_LAST_RESULT)
        if not isinstance(result, dict):
            result = {}
        return {"success": True, "result": result, "config": self._current_config()}

    async def api_run(self) -> Dict[str, Any]:
        """立即执行一次抓取并推送。"""
        result = self._run(manual=True)
        return {"success": result.get("error") is None, "result": result}
