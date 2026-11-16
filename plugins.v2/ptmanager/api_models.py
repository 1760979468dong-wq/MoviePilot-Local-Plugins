"""PT管家插件的请求与响应数据模型。"""

from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

_CRON_RE = re.compile(r"^\S+\s+\S+\s+\S+\s+\S+\s+\S+$")

# 站点标识归一化，用于等级名称与站点名称的跨展示差异匹配
_IDENTITY_RE = re.compile(r"[^a-z0-9\u4e00-\u9fff]+")


def normalize_identity(value: Any) -> str:
    """移除展示差异，生成用于匹配的标识字符串。"""

    return _IDENTITY_RE.sub("", str(value or "").casefold())


class ExtendedData(BaseModel):
    """站点用户详情页采集到的扩展字段。"""

    model_config = ConfigDict(extra="ignore")

    # 采集时间
    collected_at: str = ""
    # 采集是否成功
    ok: bool = False
    # 采集失败原因
    error: str = ""
    # 用户 UID
    uid: str = ""
    # 邀请人
    inviter: str = ""
    # 邀请状态的原始文本
    invite_raw: str = ""
    # 可用邀请名额
    invites_available: int | None = None
    # 已发送邀请
    invites_sent: int | None = None
    # H&R 未完成数量
    hr: int | None = None
    # H&R 原始文本
    hr_raw: str = ""
    # 已认领数量
    claims_used: int | None = None
    # 认领上限
    claims_total: int | None = None
    # 做种积分
    seeding_points: float | None = None
    # 站点页面显示的魔力值
    bonus: float | None = None
    # 站点页面显示的时魔
    hourly_bonus: float | None = None
    # 累计做种时间
    seeding_time: str = ""
    # 累计下载时间
    leeching_time: str = ""
    # 做种/下载时间比率
    time_ratio: float | None = None
    # 站点页面显示的等级
    user_level: str = ""
    # 站点页面显示的加入日期
    join_at: str = ""
    # BT 客户端
    client: str = ""
    # 站点页面显示的做种中数量
    seeding_now: int | None = None
    # 站点页面显示的下载中数量
    leeching_now: int | None = None
    # 原始字段文本，供界面展示未映射信息
    raw: list[str] = Field(default_factory=list)


class SiteRecord(BaseModel):
    """单个站点的完整数据记录。"""

    model_config = ConfigDict(extra="ignore")

    # MoviePilot 站点 ID
    site_id: int | None = None
    # 站点名称
    name: str = ""
    # 站点域名
    domain: str = ""
    # 站点地址
    url: str = ""
    # 站点是否启用
    is_active: bool = False
    # 站点优先级
    site_priority: int | None = None
    # 用户名
    username: str = ""
    # 用户 UID
    uid: str = ""
    # 用户等级
    user_level: str = ""
    # 加入日期
    join_at: str = ""
    # 在册天数
    career_days: int | None = None
    # 上传量（字节）
    upload: int = 0
    # 下载量（字节）
    download: int = 0
    # 分享率
    ratio: float | None = None
    # 魔力值
    bonus: float | None = None
    # 做种数
    seeding: int = 0
    # 做种体积（字节）
    seeding_size: int = 0
    # 下载中数量
    leeching: int = 0
    # 下载中体积（字节）
    leeching_size: int = 0
    # 未读消息
    message_unread: int = 0
    # 站点数据更新时间
    updated_at: str = ""
    # 站点数据采集错误
    err_msg: str = ""
    # 时魔（站点页面真实值优先，缺失时为相邻快照估算）
    hourly_bonus: float | None = None
    # 时魔来源：page=站点页面，estimate=快照估算
    hourly_bonus_source: str = ""
    # 每小时魔力估算值（仅估算口径，供排查参考）
    hourly_bonus_estimate: float | None = None
    # 日均上传
    daily_upload: float | None = None
    # 日均下载
    daily_download: float | None = None
    # 日均魔力
    daily_bonus: float | None = None
    # 扩展字段
    extended: ExtendedData | None = None


class SummaryData(BaseModel):
    """全部站点的总量合计。"""

    model_config = ConfigDict(extra="ignore")

    # 站点总数
    site_count: int = 0
    # 启用站点数
    active_site_count: int = 0
    # 数据异常站点数
    error_site_count: int = 0
    # 上传合计
    upload: int = 0
    # 下载合计
    download: int = 0
    # 综合分享率
    ratio: float | None = None
    # 魔力合计
    bonus: float = 0.0
    # 做种数合计
    seeding: int = 0
    # 做种体积合计
    seeding_size: int = 0
    # 下载中数量合计
    leeching: int = 0
    # 下载中体积合计
    leeching_size: int = 0
    # 做种积分合计
    seeding_points: float = 0.0
    # 时魔合计
    hourly_bonus: float = 0.0
    # 时魔取自站点页面的站点数
    hourly_bonus_page_count: int = 0
    # 时魔取自快照估算的站点数
    hourly_bonus_estimate_count: int = 0
    # 时魔取自历史日均推算的站点数
    hourly_bonus_daily_count: int = 0
    # H&R 合计
    hr: int = 0
    # 认领已用合计
    claims_used: int = 0
    # 认领上限合计
    claims_total: int = 0
    # 可用邀请合计
    invites_available: int = 0
    # 已发送邀请合计
    invites_sent: int = 0
    # 已采集扩展数据的站点数
    extended_site_count: int = 0
    # 扩展数据采集成功的站点数
    extended_ok_count: int = 0
    # 是否存在做种积分数据
    has_seeding_points: bool = False
    # 是否存在时魔数据
    has_hourly_bonus: bool = False
    # 是否存在 H&R 数据
    has_hr: bool = False
    # 是否存在认领数据
    has_claims: bool = False
    # 是否存在邀请数据
    has_invites: bool = False


class OverviewResponse(BaseModel):
    """站点总览响应。"""

    # 总量合计
    summary: SummaryData
    # 站点明细
    sites: list[SiteRecord]
    # 养老进度汇总
    retirement: RetirementProgressData | None = None
    # 十二大站点加入进度
    twelve: TwelveProgressData | None = None
    # 后宫（邀请）总览
    invite: InviteOverviewData | None = None
    # 数据生成时间
    generated_at: str = ""
    # MoviePilot 站点数据最新时间
    mp_data_at: str = ""
    # 扩展数据最近采集时间
    extended_at: str = ""
    # 是否正在采集
    collecting: bool = False


class LevelRequirementData(BaseModel):
    """养老进度中的一个等级及其门槛。"""

    model_config = ConfigDict(extra="ignore")

    name: str = ""
    aliases: list[str] = Field(default_factory=list)
    description: str = ""
    min_join_days: int = 0
    min_join_days_strict: bool = False
    min_upload: int = 0
    min_upload_strict: bool = False
    min_download: int = 0
    min_download_strict: bool = False
    min_ratio: float | None = None
    min_ratio_strict: bool = False
    min_bonus: float | None = None
    min_bonus_strict: bool = False
    min_seeding_points: float | None = None
    min_seeding_points_strict: bool = False
    seeding_points_eta_hours: int | None = None
    seeding_points_eta_days: int | None = None
    seeding_points_eta_date: str = ""
    min_seeding: int = 0
    min_seeding_strict: bool = False
    min_seeding_size: int = 0
    min_seeding_size_strict: bool = False
    min_torrent_uploads: int = 0
    min_torrent_uploads_strict: bool = False
    min_average_seeding_time_days: float | None = None
    min_average_seeding_time_days_strict: bool = False
    alternatives: list[dict[str, Any]] = Field(default_factory=list)
    unsupported_requirements: list[dict[str, Any]] = Field(default_factory=list)
    eligible_date: str = ""
    reached: bool = False
    is_current: bool = False
    is_retirement: bool = False
    missing: list[str] = Field(default_factory=list)


class RetirementSiteData(BaseModel):
    """单站升级路线与达到保号等级的进度。"""

    model_config = ConfigDict(extra="ignore")

    site_id: int | None = None
    domain: str = ""
    site_name: str = ""
    site_priority: int | None = None
    current_level: str = ""
    next_level: str = ""
    retirement_level: str = ""
    status: str = "rule_missing"
    is_vip: bool = False
    wealthy_retirement_manual: bool = False
    join_at: str = ""
    upload: int = 0
    download: int = 0
    ratio: float | None = None
    bonus: float | None = None
    seeding_points: float | None = None
    estimated_bonus_hourly: float | None = None
    seeding_points_hourly: float | None = None
    seeding: int = 0
    seeding_size: int = 0
    torrent_uploads: float | None = None
    average_seeding_time_days: float | None = None
    updated_day: str = ""
    levels_remaining: int | None = None
    route: list[LevelRequirementData] = Field(default_factory=list)


class RetirementProgressData(BaseModel):
    """全部站点养老进度汇总。"""

    total: int = 0
    retired: int = 0
    wealthy_retired: int = 0
    upgrading: int = 0
    rule_missing: int = 0
    sites: list[RetirementSiteData] = Field(default_factory=list)


class TwelveSiteData(BaseModel):
    """十二大站点中的一个站点状态。"""

    key: str = ""
    name: str = ""
    state: str = "missing"
    # MoviePilot 站点 ID，供前端加载站点图标
    site_id: int | None = None
    join_at: str = ""


class TwelveProgressData(BaseModel):
    """十二大站点加入进度。"""

    joined: int = 0
    total: int = 0
    percent: int = 0
    items: list[TwelveSiteData] = Field(default_factory=list)


class InviteMemberData(BaseModel):
    """后宫（被邀者）成员。"""

    username: str = ""
    email: str = ""
    uploaded: float | None = None
    downloaded: float | None = None
    ratio: float | None = None
    seeding_count: int = 0
    seeding_size: float | None = None
    last_seen: str = ""
    status: str = ""
    disabled: bool = False
    ratio_health: str = "neutral"
    ratio_label: str = "无数据"
    profile_url: str = ""


class InviteSiteData(BaseModel):
    """单个站点的后宫概况。"""

    domain: str = ""
    site_name: str = ""
    ok: bool = False
    error: str = ""
    url: str = ""
    collected_at: str = ""
    invitee_count: int = 0
    danger_count: int = 0
    warning_count: int = 0
    disabled_count: int = 0
    invites_available: int | None = None
    invites_sent: int | None = None
    invitees: list[InviteMemberData] = Field(default_factory=list)


class InviteOverviewData(BaseModel):
    """后宫总览。"""

    generated_at: str = ""
    site_count: int = 0
    invitee_total: int = 0
    danger_total: int = 0
    warning_total: int = 0
    available_total: int = 0
    # 已发送邀请合计
    sent_total: int = 0
    # 仍有可用名额的站点数
    quota_site_count: int = 0
    sites: list[InviteSiteData] = Field(default_factory=list)


class InviteDetailResponse(BaseModel):
    """单站后宫成员明细。"""

    site: InviteSiteData | None = None


class UploadedRequirementData(BaseModel):
    """用户上传规则中的等级门槛。"""

    model_config = ConfigDict(extra="forbid")

    min_join_days: int = Field(default=0, ge=0)
    min_join_days_strict: bool = False
    min_upload: int = Field(default=0, ge=0)
    min_upload_strict: bool = False
    min_download: int = Field(default=0, ge=0)
    min_download_strict: bool = False
    min_ratio: float | None = Field(default=None, ge=0)
    min_ratio_strict: bool = False
    min_bonus: float | None = Field(default=None, ge=0)
    min_bonus_strict: bool = False
    min_seeding_points: float | None = Field(default=None, ge=0)
    min_seeding_points_strict: bool = False
    min_seeding: int = Field(default=0, ge=0)
    min_seeding_strict: bool = False
    min_seeding_size: int = Field(default=0, ge=0)
    min_seeding_size_strict: bool = False
    min_torrent_uploads: int = Field(default=0, ge=0)
    min_torrent_uploads_strict: bool = False
    min_average_seeding_time_days: float | None = Field(default=None, ge=0)
    min_average_seeding_time_days_strict: bool = False
    unsupported_requirements: list[dict[str, Any]] = Field(default_factory=list, max_length=50)


class UploadedLevelRuleData(UploadedRequirementData):
    """用户上传规则中的单个等级。"""

    name: str = Field(min_length=1, max_length=128)
    aliases: list[str] = Field(default_factory=list)
    description: str = Field(default="", max_length=2000)
    alternatives: list[UploadedRequirementData] = Field(default_factory=list, max_length=20)

    @field_validator("name", "description")
    @classmethod
    def strip_level_text(cls, value: str) -> str:
        """去除等级名与说明的首尾空白。"""

        return str(value or "").strip()

    @field_validator("aliases")
    @classmethod
    def normalize_level_aliases(cls, value: list[str]) -> list[str]:
        """去重并清理等级别名。"""

        return list(dict.fromkeys(str(item).strip() for item in value if str(item).strip()))


class UploadedRetirementRuleData(BaseModel):
    """用户上传的单站完整等级规则。"""

    model_config = ConfigDict(extra="forbid")

    site: str = Field(min_length=1, max_length=128)
    aliases: list[str] = Field(default_factory=list)
    domains: list[str] = Field(default_factory=list)
    retirement_level: str = Field(min_length=1, max_length=128)
    levels: list[UploadedLevelRuleData] = Field(min_length=1, max_length=100)
    vip_levels: list[UploadedLevelRuleData] = Field(default_factory=list, max_length=100)

    @field_validator("site", "retirement_level")
    @classmethod
    def strip_rule_text(cls, value: str) -> str:
        """去除站点名与保号等级的首尾空白。"""

        return str(value or "").strip()

    @field_validator("aliases", "domains")
    @classmethod
    def normalize_site_aliases(cls, value: list[str]) -> list[str]:
        """去重并清理站点别名与域名。"""

        return list(dict.fromkeys(str(item).strip() for item in value if str(item).strip()))

    @model_validator(mode="after")
    def validate_level_route(self) -> UploadedRetirementRuleData:
        """等级名不可重复，保号等级必须存在于完整路线。"""

        identities: set[str] = set()
        retirement_identity = normalize_identity(self.retirement_level)
        retirement_found = False
        for level in self.levels:
            level_identities = {
                normalize_identity(value) for value in (level.name, *level.aliases)
            }
            if not level_identities or "" in level_identities:
                raise ValueError("等级名称不能为空")
            if identities.intersection(level_identities):
                raise ValueError(f"等级名称或别名重复：{level.name}")
            identities.update(level_identities)
            retirement_found = retirement_found or retirement_identity in level_identities
        if not retirement_found:
            raise ValueError(f"保号等级 {self.retirement_level} 不在等级路线中")
        return self


class TrendPoint(BaseModel):
    """站点历史趋势中的一个自然日数据点。"""

    # 日期
    day: str = ""
    # 上传量
    upload: int = 0
    # 下载量
    download: int = 0
    # 魔力值
    bonus: float | None = None
    # 做种数
    seeding: int = 0
    # 做种体积
    seeding_size: int = 0
    # 分享率
    ratio: float | None = None


class SiteDetailResponse(BaseModel):
    """单站点详情响应。"""

    # 站点数据
    site: SiteRecord
    # 趋势数据
    trend: list[TrendPoint] = Field(default_factory=list)


class SettingsData(BaseModel):
    """插件设置。"""

    model_config = ConfigDict(extra="ignore")

    # 启用插件
    enabled: bool = False
    # 启用站点页面深度采集
    collect_enabled: bool = False
    # 采集时机：custom 自定义 Cron / follow_mp 跟随 MoviePilot 站点数据刷新
    collect_mode: str = "custom"
    # 深度采集计划（五段式 Cron）
    collect_cron: str = "0 7 * * *"
    # 单站点采集超时（秒）
    collect_timeout: int = 25
    # 采集并发数
    collect_concurrency: int = 4
    # 趋势展示天数
    trend_days: int = 30
    # 参与采集的站点域名，留空表示全部站点
    collect_domains: list[str] = Field(default_factory=list)
    # 是否发送采集结果通知（按 notify_cron 的计划发送，与采集频率解耦）
    notify_enabled: bool = False
    # 采集前是否先让 MoviePilot 刷新站点账号数据（上传/下载/魔力等基础字段）
    refresh_before_collect: bool = True
    # 通知发送计划（五段式 Cron），默认每天 09:00 一次
    notify_cron: str = "0 9 * * *"
    # 站点自定义排序（按域名顺序，空表示未自定义）
    site_order: list[str] = Field(default_factory=list)
    # 总览列的自定义顺序（按列 key 排列，空表示使用默认顺序）
    column_order: list[str] = Field(default_factory=list)
    # 总览当前显示哪些列（按列 key，空表示使用默认集合）
    visible_columns: list[str] = Field(default_factory=list)
    # 总览当前排序字段（列 key 或 custom）
    sort_key: str = "seeding_size"
    # 总览排序方向：true 降序 / false 升序
    sort_desc: bool = True
    # 总览视图：table 表格 / cards 紧凑卡片（一排多个）
    overview_view: str = "table"
    # 手动标记为富贵养老的站点标识（站点 ID、域名或站点名）
    wealthy_retirement_sites: list[str] = Field(default_factory=list, max_length=500)
    # 用户自定义等级规则，覆盖同名内置规则
    custom_retirement_rules: list[UploadedRetirementRuleData] = Field(default_factory=list, max_length=100)

    @field_validator("wealthy_retirement_sites")
    @classmethod
    def normalize_wealthy_retirement_sites(cls, value: list[str]) -> list[str]:
        """去重并清理富贵养老站点标识。"""

        return list(dict.fromkeys(str(item).strip() for item in value if str(item).strip()))

    @field_validator("collect_cron")
    @classmethod
    def _validate_cron(cls, value: str) -> str:
        """校验采集计划为五段式 Cron 表达式。"""

        text = (value or "").strip()
        if not _CRON_RE.match(text):
            raise ValueError("采集计划必须为五段式 Cron 表达式")
        return text

    @field_validator("notify_cron")
    @classmethod
    def _validate_notify_cron(cls, value: str) -> str:
        """校验通知计划为五段式 Cron 表达式。"""

        text = (value or "").strip()
        if not _CRON_RE.match(text):
            raise ValueError("通知计划必须为五段式 Cron 表达式")
        return text

    @field_validator("collect_mode")
    @classmethod
    def _validate_collect_mode(cls, value: str) -> str:
        """采集时机只允许自定义或跟随 MoviePilot。"""

        text = (value or "custom").strip().lower()
        return text if text in {"custom", "follow_mp"} else "custom"

    @field_validator("overview_view")
    @classmethod
    def _validate_overview_view(cls, value: str) -> str:
        """总览视图只允许表格或卡片。"""

        text = (value or "table").strip().lower()
        return text if text in {"table", "cards"} else "table"

    @field_validator("collect_timeout")
    @classmethod
    def _validate_timeout(cls, value: int) -> int:
        """约束单站采集超时范围。"""

        return min(max(int(value or 25), 5), 120)

    @field_validator("collect_concurrency")
    @classmethod
    def _validate_concurrency(cls, value: int) -> int:
        """约束采集并发数范围。"""

        return min(max(int(value or 4), 1), 8)

    @field_validator("trend_days")
    @classmethod
    def _validate_trend_days(cls, value: int) -> int:
        """约束趋势天数范围。"""

        return min(max(int(value or 30), 7), 365)


class SettingsResponse(BaseModel):
    """设置查询与保存响应。"""

    # 当前设置
    settings: SettingsData
    # 可参与采集的站点选项
    site_options: list[dict[str, Any]] = Field(default_factory=list)


class CollectResponse(BaseModel):
    """手动采集响应。"""

    # 是否已受理
    ok: bool = False
    # 采集模式：single 为单站同步采集，background 为后台全量采集
    mode: str = ""
    # 成功站点数
    ok_count: int = 0
    # 失败站点数
    fail_count: int = 0
    # 失败明细
    errors: list[str] = Field(default_factory=list)
    # 提示信息
    message: str = ""


class CollectStatusResponse(BaseModel):
    """采集状态响应。"""

    # 是否正在采集
    running: bool = False
    # 当前阶段：refresh（刷新账号数据）/ collect（抓取页面扩展字段）
    phase: str = ""
    # 开始时间
    started_at: str = ""
    # 结束时间
    finished_at: str = ""
    # 已完成站点数
    done: int = 0
    # 待采集站点总数
    total: int = 0
    # 成功站点数
    ok_count: int = 0
    # 失败站点数
    fail_count: int = 0
    # 失败明细
    errors: list[str] = Field(default_factory=list)


class SiteOrderRequest(BaseModel):
    """站点自定义排序请求。"""

    # 按期望展示顺序排列的站点域名
    order: list[str] = Field(default_factory=list)


class SiteOrderResponse(BaseModel):
    """站点自定义排序响应。"""

    # 是否保存成功
    ok: bool = False
    # 提示信息
    message: str = ""
    # 保存后的顺序
    order: list[str] = Field(default_factory=list)


class ColumnOrderRequest(BaseModel):
    """总览列自定义排序请求。"""

    # 按期望展示顺序排列的列 key
    order: list[str] = Field(default_factory=list)


class ColumnOrderResponse(BaseModel):
    """总览列自定义排序响应。"""

    # 是否保存成功
    ok: bool = False
    # 提示信息
    message: str = ""
    # 保存后的顺序
    order: list[str] = Field(default_factory=list)


class ViewStateRequest(BaseModel):
    """总览视图状态（排序、可见列、列顺序）。"""

    model_config = ConfigDict(extra="ignore")

    # 排序字段（列 key 或 custom）
    sort_key: str | None = None
    # 排序方向
    sort_desc: bool | None = None
    # 可见列
    visible_columns: list[str] | None = None
    # 列顺序
    column_order: list[str] | None = None


class ViewStateResponse(BaseModel):
    """总览视图状态响应。"""

    ok: bool = False
    message: str = ""
    sort_key: str = "seeding_size"
    sort_desc: bool = True
    visible_columns: list[str] = Field(default_factory=list)
    column_order: list[str] = Field(default_factory=list)
