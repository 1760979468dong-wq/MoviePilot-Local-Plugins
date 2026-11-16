"""青蛙蝌蚪福利插件。

每日在设定的时间段内随机选择一个时刻，调用青蛙站点蝌蚪商店接口购买已开启的商品，
并记录最近一次购买结果。支持在详情页对任意商品单独指定数量购买。
"""

import random
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse
from zoneinfo import ZoneInfo

from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings
from app.db.site_oper import SiteOper
from app.log import logger
from app.plugins import _PluginBase
from app.schemas.types import EventType, NotificationType
from app.utils.http import RequestUtils

try:
    # 插件目录下的常量文件，保证前端产物路径两侧一致
    from .frontend_dist import FRONTEND_DIST_DIR
except ImportError:  # pragma: no cover - 运行环境缺失时的兜底
    FRONTEND_DIST_DIR = "dist/v1_3_6/assets"


class QingwaBonus(_PluginBase):
    """青蛙蝌蚪福利插件。"""

    plugin_name = "青蛙蝌蚪福利"
    plugin_desc = "手动购买与自动定时购买分离：自动购买可在设置中选择参与商品，详情页支持任意商品指定数量立即购买。"
    plugin_icon = "qingwa.png"
    plugin_version = "1.3.6"
    plugin_label = "站点管理"
    plugin_author = "小罗"
    author_url = "https://github.com/xiaoluo-mp/MoviePilot-Local-Plugins"
    plugin_config_prefix = "qingwabonus_"
    plugin_order = 31
    auth_level = 1

    # 默认值
    _DEFAULT_SITE_NAME = "青蛙"
    _DEFAULT_START_TIME = "09:00"
    _DEFAULT_END_TIME = "10:00"
    # 失败自动重试默认值
    _DEFAULT_RETRY_INTERVAL = 5
    _DEFAULT_RETRY_MAX = 3
    # 接口路径
    _API_ITEMS = "/api/bonus-shop/getItems"
    _API_EXCHANGE = "/api/bonus-shop/exchange"
    # 站点余额所在页面（NexusPHP 页面头部 #qingwa-bonus）
    _BALANCE_PAGE = "/bonusshop.php"
    # 单次请求超时
    _TIMEOUT = 30
    # 商品列表缓存有效期（秒），避免每次打开页面都请求站点
    _ITEMS_CACHE_TTL = 6 * 3600
    # 已购买（超过限购）的返回文案
    _ALREADY_BOUGHT_HINTS = ("超过限购", "限购")
    # 已购/成功的统一提示文案，用于区分「已买过」与「本次买成功」
    _SUCCESS_HINTS = ("成功",)
    # 受支持的商品定义：开关字段 -> (匹配关键词, 默认数量)
    _GOODS = [
        ("item_bonus", "每日福利", 1),
        ("item_upload", "上传量", 1),
        ("item_download", "下载量", 1),
    ]
    _DATA_LAST_RESULT = "last_result"
    _DATA_NEXT_RUN = "next_run"
    _DATA_CRON = "cron"
    _DATA_ITEMS_CACHE = "items_cache"
    _DATA_RETRY = "retry_state"
    _DATA_PURCHASE_HISTORY = "purchase_history"
    # 最近购买明细最多保留的条数
    _HISTORY_MAX = 20

    # 运行态
    _enabled: bool = False
    _site_name: str = _DEFAULT_SITE_NAME
    _start_time: str = _DEFAULT_START_TIME
    _end_time: str = _DEFAULT_END_TIME
    _goods_enabled: Dict[str, bool] = {}
    _goods_amount: Dict[str, int] = {}
    _notify_enabled: bool = True
    _notify_on_error: bool = True
    _retry_enabled: bool = True
    _retry_interval: int = _DEFAULT_RETRY_INTERVAL
    _retry_max: int = _DEFAULT_RETRY_MAX
    _site_oper: Optional[SiteOper] = None

    def init_plugin(self, config: dict = None) -> None:
        """根据插件配置初始化运行状态。"""
        self.stop_service()
        cfg = {**self._default_config(), **(config or {})}
        self._enabled = bool(cfg.get("enabled"))
        self._site_name = str(cfg.get("site_name") or self._DEFAULT_SITE_NAME).strip() \
            or self._DEFAULT_SITE_NAME
        self._start_time = self._normalize_time(cfg.get("start_time"), self._DEFAULT_START_TIME)
        self._end_time = self._normalize_time(cfg.get("end_time"), self._DEFAULT_END_TIME)
        self._start_time, self._end_time = self._ensure_order(self._start_time, self._end_time)
        self._goods_enabled = {key: bool(cfg.get(key)) for key, _kw, _amt in self._GOODS}
        self._goods_amount = {}
        for key, _kw, default_amount in self._GOODS:
            try:
                amount = int(cfg.get(f"{key}_amount") or default_amount)
            except (TypeError, ValueError):
                amount = default_amount
            self._goods_amount[key] = max(1, min(amount, 999))
        self._notify_enabled = bool(cfg.get("notify_enabled", True))
        self._notify_on_error = bool(cfg.get("notify_on_error", True))
        self._retry_enabled = bool(cfg.get("retry_enabled", True))
        self._retry_interval = self._clamp_int(
            cfg.get("retry_interval"), self._DEFAULT_RETRY_INTERVAL, 1, 120)
        self._retry_max = self._clamp_int(cfg.get("retry_max"), self._DEFAULT_RETRY_MAX, 1, 20)
        self._site_oper = SiteOper()
        retry_desc = (
            f"每 {self._retry_interval} 分钟最多 {self._retry_max} 次"
            if self._retry_enabled else "关闭"
        )
        logger.info(
            f"青蛙蝌蚪福利已初始化：启用={self._enabled}，站点={self._site_name}，"
            f"时间段={self._start_time}-{self._end_time}，商品={self._enabled_goods_desc()}，"
            f"失败重试={retry_desc}"
        )

    def get_state(self) -> bool:
        """返回插件启用状态。"""
        return bool(self._enabled)

    def get_render_mode(self) -> Tuple[str, str]:
        """使用 Vue 模块联邦渲染配置与详情组件。

        产物目录与 vite.config.js 的 outDir 必须一致，否则联邦入口会 404。
        """
        return "vue", FRONTEND_DIST_DIR

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
        """注册每日随机时刻的自动购买服务。"""
        if not self.get_state():
            return []
        return [
            {
                "id": f"{self.__class__.__name__}.Buy",
                "name": "青蛙蝌蚪福利自动购买",
                "trigger": CronTrigger.from_crontab(self._current_cron(), timezone=self._tz()),
                "func": self._scheduled_run,
                "kwargs": {},
            }
        ]

    def get_api(self) -> List[Dict[str, Any]]:
        """注册配置读写、商品列表、购买与最近结果查询 API。"""
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
                "path": "/items",
                "endpoint": self.api_items,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "读取蝌蚪商店商品列表（带缓存）",
            },
            {
                "path": "/balance",
                "endpoint": self.api_balance,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "读取站点实时蝌蚪余额",
            },
            {
                "path": "/latest",
                "endpoint": self.api_latest,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "读取最近一次购买结果",
            },
            {
                "path": "/buy",
                "endpoint": self.api_buy_once,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "按商品 ID 指定数量立即购买",
            },
            {
                "path": "/run",
                "endpoint": self.api_run,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "立即购买已开启的商品",
            },
        ]

    def stop_service(self) -> None:
        """停止插件后台服务并释放资源。"""
        return None

    def _default_config(self) -> Dict[str, Any]:
        """返回插件默认配置。"""
        config = {
            "enabled": False,
            "site_name": self._DEFAULT_SITE_NAME,
            "start_time": self._DEFAULT_START_TIME,
            "end_time": self._DEFAULT_END_TIME,
            "notify_enabled": True,
            "notify_on_error": True,
            "retry_enabled": True,
            "retry_interval": self._DEFAULT_RETRY_INTERVAL,
            "retry_max": self._DEFAULT_RETRY_MAX,
        }
        # 默认只开启每日福利，上传/下载量涉及较大蝌蚪开销，需用户显式开启
        for index, (key, _kw, default_amount) in enumerate(self._GOODS):
            config[key] = index == 0
            config[f"{key}_amount"] = default_amount
        return config

    def _current_config(self) -> Dict[str, Any]:
        """返回当前运行配置。"""
        config = {
            "enabled": self._enabled,
            "site_name": self._site_name,
            "start_time": self._start_time,
            "end_time": self._end_time,
            "notify_enabled": self._notify_enabled,
            "notify_on_error": self._notify_on_error,
            "retry_enabled": self._retry_enabled,
            "retry_interval": self._retry_interval,
            "retry_max": self._retry_max,
        }
        config.update(self._goods_enabled)
        for key, amount in self._goods_amount.items():
            config[f"{key}_amount"] = amount
        return config

    def _enabled_goods(self) -> List[Tuple[str, str]]:
        """返回已开启的商品键名与关键词。"""
        return [(key, kw) for key, kw, _amt in self._GOODS if self._goods_enabled.get(key)]

    def _enabled_goods_desc(self) -> str:
        """返回已开启商品描述，用于日志输出。"""
        desc = [f"{kw}x{self._goods_amount.get(key)}" for key, kw in self._enabled_goods()]
        return "、".join(desc) or "无"

    @staticmethod
    def _tz():
        """返回系统配置的时区对象。"""
        try:
            return ZoneInfo(str(settings.TZ or "Asia/Shanghai"))
        except Exception:
            return ZoneInfo("Asia/Shanghai")

    @staticmethod
    def _clamp_int(value: Any, default: int, low: int, high: int) -> int:
        """将配置值转换为 [low, high] 区间内的整数。"""
        try:
            number = int(value)
        except (TypeError, ValueError):
            return default
        return max(low, min(number, high))

    @staticmethod
    def _normalize_time(value: Any, default: str) -> str:
        """将配置值规范为 HH:MM 格式。"""
        text = str(value or "").strip()
        try:
            parts = text.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            if 0 <= hour <= 23 and 0 <= minute <= 59:
                return f"{hour:02d}:{minute:02d}"
        except (ValueError, IndexError, AttributeError):
            pass
        return default

    @staticmethod
    def _ensure_order(start: str, end: str) -> Tuple[str, str]:
        """保证开始时间早于结束时间。"""
        start_dt = datetime.strptime(start, "%H:%M")
        end_dt = datetime.strptime(end, "%H:%M")
        if end_dt <= start_dt:
            end_dt = start_dt + timedelta(minutes=1)
            if end_dt.day != start_dt.day:
                end_dt = start_dt
        return start, end_dt.strftime("%H:%M")

    def _current_cron(self) -> str:
        """返回当前生效的执行 Cron，未生成过或已偏离时间段则重新随机。"""
        cron = str(self.get_data(self._DATA_CRON) or "").strip()
        if cron and self._cron_matches_window(cron):
            return cron
        return self._random_cron()

    def _cron_matches_window(self, cron: str) -> bool:
        """判断已保存的 Cron 是否仍落在当前配置的时间段内。"""
        parts = cron.split()
        if len(parts) < 2:
            return False
        try:
            target = f"{int(parts[1]):02d}:{int(parts[0]):02d}"
        except (ValueError, IndexError):
            return False
        return self._start_time <= target <= self._end_time

    def _reschedule(self) -> None:
        """重新随机下次执行时刻，并通知调度器注册新触发器。"""
        self._random_cron()
        self.eventmanager.send_event(
            EventType.PluginReload, {"plugin_id": self.__class__.__name__}
        )

    def _random_cron(self) -> str:
        """在配置时间段内生成随机时刻的每日 Cron 表达式并持久化。"""
        now = datetime.now(tz=self._tz())
        start_dt = datetime.strptime(self._start_time, "%H:%M")
        end_dt = datetime.strptime(self._end_time, "%H:%M")
        span = int((end_dt - start_dt).total_seconds() // 60)
        offset = random.randint(0, max(span, 0))
        target = start_dt + timedelta(minutes=offset)
        cron = f"{target.minute} {target.hour} * * *"
        self.save_data(self._DATA_CRON, cron)
        run_at = now.replace(hour=target.hour, minute=target.minute, second=0, microsecond=0)
        if run_at < now:
            run_at = run_at + timedelta(days=1)
        self.save_data(self._DATA_NEXT_RUN, run_at.strftime("%Y-%m-%d %H:%M"))
        logger.info(f"青蛙蝌蚪福利：下次计划执行时间 {run_at.strftime('%Y-%m-%d %H:%M')}（{cron}）")
        return cron

    def _get_site_oper(self) -> SiteOper:
        """获取站点数据操作对象，必要时重新创建。"""
        if self._site_oper is None:
            self._site_oper = SiteOper()
        return self._site_oper

    def _match_site(self):
        """按名称或域名匹配已配置的青蛙站点。"""
        try:
            sites = self._get_site_oper().list() or []
        except Exception as err:
            logger.warn(f"青蛙蝌蚪福利：读取站点列表失败：{err}")
            return None
        keyword = self._site_name.strip().lower()
        for site in sites:
            name = (getattr(site, "name", "") or "").strip().lower()
            domain = (getattr(site, "domain", "") or "").strip().lower()
            if keyword and (keyword in name or keyword in domain or name in keyword):
                return site
        return None

    @staticmethod
    def _build_base_url(site) -> str:
        """根据站点配置推导可访问的站点根地址。"""
        raw = (getattr(site, "url", "") or "").strip()
        if not raw:
            return ""
        if not raw.startswith(("http://", "https://")):
            raw = f"https://{raw}"
        parsed = urlparse(raw)
        return f"{parsed.scheme}://{parsed.netloc}"

    def _build_client(self, site) -> RequestUtils:
        """构造携带站点 Cookie 与 UA 的 HTTP 客户端。"""
        headers = {"User-Agent": (getattr(site, "ua", "") or "").strip()
                   or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"}
        headers["X-Requested-With"] = "XMLHttpRequest"
        base_url = self._build_base_url(site)
        if base_url:
            headers["Referer"] = f"{base_url}/bonusshop.php"
            headers["Origin"] = base_url
        return RequestUtils(
            cookies=(getattr(site, "cookie", "") or "").strip(),
            headers=headers,
            timeout=self._TIMEOUT,
        )

    def _fetch_items(self, client: RequestUtils, base_url: str) -> Tuple[bool, Any]:
        """读取蝌蚪商店商品列表（原始数组）。"""
        res = client.get_res(urljoin(base_url, self._API_ITEMS))
        if res is None:
            return False, "请求商品列表失败：无响应"
        if res.status_code != 200:
            return False, f"请求商品列表失败：HTTP {res.status_code}"
        try:
            return True, res.json()
        except Exception as err:
            return False, f"解析商品列表失败：{err}"

    @staticmethod
    def _locate_item(items: List[Dict[str, Any]], keyword: str) -> Optional[Dict[str, Any]]:
        """按关键词在商品列表中定位商品。"""
        for item in items or []:
            if keyword and keyword in str(item.get("name") or ""):
                return item
        return None

    @staticmethod
    def _price_text(item: Optional[Dict[str, Any]]) -> str:
        """将商品价格转换为可读文本。"""
        if not item:
            return "未知"
        amount = item.get("a_amount")
        kind = item.get("a_type")
        if kind == "bonus":
            return f"{amount} 蝌蚪"
        if kind == "invites":
            return f"{amount} 个永久邀请"
        if kind == "attendance_card":
            return f"{amount} 张补签卡"
        return str(amount)

    @staticmethod
    def _item_limit(item: Optional[Dict[str, Any]]) -> int:
        """返回商品限购数量，0 表示不限购。"""
        try:
            return int((item or {}).get("limit_amount") or 0)
        except (TypeError, ValueError):
            return 0

    def _fetch_live_balance(self, client: Optional[RequestUtils],
                            base_url: str) -> Optional[str]:
        """直接访问站点页面解析实时蝌蚪余额，失败返回 None。"""
        if client is None or not base_url:
            return None
        try:
            res = client.get_res(urljoin(base_url, self._BALANCE_PAGE))
        except Exception as err:
            logger.warn(f"青蛙蝌蚪福利：读取实时余额失败：{err}")
            return None
        if res is None or res.status_code != 200:
            return None
        match = re.search(r'id="qingwa-bonus"[^>]*>([^<]+)<', res.text or "")
        if not match:
            return None
        raw = match.group(1).strip().replace(",", "").replace(" ", "")
        try:
            return f"{float(raw):.1f} 蝌蚪"
        except ValueError:
            return None

    def _read_balance(self, site, client: Optional[RequestUtils] = None,
                      base_url: str = "") -> Optional[str]:
        """优先读取站点实时余额，失败时回退到本地账户快照。"""
        live = self._fetch_live_balance(client, base_url)
        if live:
            return live
        try:
            records = self._get_site_oper().get_userdata_by_domain(
                getattr(site, "domain", "") or ""
            ) or []
        except Exception as err:
            logger.warn(f"青蛙蝌蚪福利：读取账户数据失败：{err}")
            return None
        if not records:
            return None
        latest = sorted(records, key=lambda r: str(getattr(r, "updated_day", "") or ""))[-1]
        bonus = getattr(latest, "bonus", None)
        return f"{bonus:.1f} 蝌蚪" if isinstance(bonus, (int, float)) else None

    def _buy_item(self, client: RequestUtils, base_url: str, item: Dict[str, Any],
                  amount: int) -> Dict[str, Any]:
        """按指定数量购买单个商品并返回结果。"""
        limit = self._item_limit(item)
        base = {
            "name": item.get("name") or "未知商品",
            "item_id": item.get("id"),
            "price": self._price_text(item),
            "amount": amount,
            "limit": limit,
        }
        # 超出限购上限时直接拦截，避免发出无效请求
        if limit > 0 and amount > limit:
            return {**base, "success": False, "skipped": False, "bought": False,
                    "message": f"数量超出限购上限（限购 {limit} 件）"}
        res = client.post_res(
            url=urljoin(base_url, self._API_EXCHANGE),
            data={"id": item.get("id"), "amount": amount},
        )
        if res is None:
            return {**base, "success": False, "skipped": False, "bought": False,
                    "message": "请求失败：无响应"}
        if res.status_code != 200:
            return {**base, "success": False, "skipped": False, "bought": False,
                    "message": f"请求失败：HTTP {res.status_code}"}
        try:
            data = res.json()
        except Exception as err:
            return {**base, "success": False, "skipped": False, "bought": False,
                    "message": f"解析结果失败：{err}"}
        success = bool(data.get("success"))
        msg = str(data.get("msg") or "")
        if not success and any(hint in msg for hint in self._ALREADY_BOUGHT_HINTS):
            # 已达限购额度：视为正常状态，但明确区分于本次买成功
            return {**base, "success": True, "skipped": True, "bought": False,
                    "message": f"今日已购买过，本次未扣费：{msg}"}
        bought = success
        return {**base, "success": success, "skipped": False, "bought": bought,
                "message": msg or ("购买成功" if success else "购买失败")}

    def _load_items(self, force: bool = False) -> Tuple[bool, Any]:
        """读取商品列表，优先使用缓存，force=True 时强制刷新站点。"""
        cache = self.get_data(self._DATA_ITEMS_CACHE) or {}
        cached_items = cache.get("items")
        cached_at = float(cache.get("cached_at") or 0)
        if not force and cached_items and (datetime.now().timestamp() - cached_at) < self._ITEMS_CACHE_TTL:
            return True, cached_items
        site = self._match_site()
        if site is None:
            return False, f"未找到匹配站点：{self._site_name}"
        base_url = self._build_base_url(site)
        if not base_url:
            return False, "站点地址为空，无法请求商店接口"
        client = self._build_client(site)
        ok, payload = self._fetch_items(client, base_url)
        if not ok:
            return False, str(payload)
        # 图标为内联 base64，体积大且与界面无关，剔除后再缓存
        slim = [{k: v for k, v in item.items() if k != "icon"} for item in (payload or [])]
        self.save_data(self._DATA_ITEMS_CACHE,
                       {"items": slim, "cached_at": datetime.now().timestamp()})
        return True, slim

    def _do_buy(self) -> Dict[str, Any]:
        """按开关依次购买已开启的商品，返回聚合结果。"""
        enabled = self._enabled_goods()
        if not enabled:
            return self._result(False, "未开启任何商品，请在插件配置中选择要购买的商品", [],
                                retryable=False)
        site = self._match_site()
        if site is None:
            return self._result(False, f"未找到匹配站点：{self._site_name}", [], retryable=False)
        base_url = self._build_base_url(site)
        if not base_url:
            return self._result(False, "站点地址为空，无法请求商店接口", [], retryable=False)
        ok, payload = self._load_items()
        if not ok:
            return self._result(False, str(payload), [])
        client = self._build_client(site)
        results: List[Dict[str, Any]] = []
        for key, keyword in enabled:
            item = self._locate_item(payload, keyword)
            if item is None:
                results.append({"key": key, "name": keyword, "item_id": None, "price": "未知",
                                "amount": 0, "limit": 0, "success": False, "skipped": False,
                                "bought": False, "message": f"未找到商品：{keyword}"})
                continue
            amount = self._goods_amount.get(key, 1)
            results.append({**self._buy_item(client, base_url, item, amount), "key": key})
        overall = all(r.get("success") for r in results)
        return self._result(overall, self._summarize(results), results,
                            balance=self._read_balance(site, client=client,
                                                       base_url=base_url))

    @staticmethod
    def _state_label(result: Dict[str, Any]) -> str:
        """给出单个商品的中文状态标签。"""
        if not result.get("success"):
            return "失败"
        if result.get("skipped"):
            return "已购买过"
        return "购买成功"

    def _summarize(self, results: List[Dict[str, Any]]) -> str:
        """汇总多个商品的购买结果文本。"""
        return "；".join(f"{r.get('name')}：{self._state_label(r)}" for r in results) or "无执行项"

    def _result(self, success: bool, message: str, results: List[Dict[str, Any]],
                balance: Optional[str] = None, retryable: bool = True) -> Dict[str, Any]:
        """构造统一的购买结果结构。

        :param retryable: 失败时是否值得重试（配置类错误不重试）
        """
        return {
            "success": bool(success),
            "message": message,
            "summary": message,
            "results": results,
            "balance": balance,
            "retryable": bool(retryable),
            "site": self._site_name,
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "next_plan": self.get_data(self._DATA_NEXT_RUN) or "-",
        }

    def _push_result_notification(self, result: Dict[str, Any],
                                  prefix: str = "", suffix: str = "") -> None:
        """按通知开关推送一次批量购买结果。"""
        text = result.get("message") or ""
        if result.get("balance"):
            text = f"{text}（余额：{result.get('balance')}）"
        if prefix:
            text = f"{prefix}{text}"
        if suffix:
            text = f"{text}{suffix}"
        if result.get("success"):
            if self._notify_enabled:
                self.post_message(mtype=NotificationType.SiteMessage,
                                  title="青蛙蝌蚪福利", text=text)
        elif self._notify_on_error:
            self.post_message(mtype=NotificationType.SiteMessage,
                              title="青蛙蝌蚪福利", text=f"购买失败：{text}")

    def _apply_cron(self) -> None:
        """通知调度器按当前持久化的 Cron 重新注册插件服务。"""
        self.eventmanager.send_event(
            EventType.PluginReload, {"plugin_id": self.__class__.__name__}
        )

    def _time_in_window(self, hhmm: str) -> bool:
        """判断 HH:MM 是否落在配置的执行时间段内。"""
        return self._start_time <= hhmm <= self._end_time

    def _retry_state(self) -> Dict[str, Any]:
        """返回当天的失败重试计数状态，跨天自动归零。"""
        today = datetime.now(tz=self._tz()).strftime("%Y-%m-%d")
        state = self.get_data(self._DATA_RETRY) or {}
        if str(state.get("date") or "") != today:
            return {"date": today, "count": 0}
        try:
            count = int(state.get("count") or 0)
        except (TypeError, ValueError):
            count = 0
        return {"date": today, "count": max(0, count)}

    def _schedule_retry(self) -> Optional[str]:
        """失败后在时间段内安排一次重试。

        :return: 重试时刻 HH:MM；未启用、次数用尽或超出时间段时返回 None
        """
        if not self._retry_enabled:
            return None
        state = self._retry_state()
        if state["count"] >= self._retry_max:
            logger.info(f"青蛙蝌蚪福利：已达最大重试次数 {self._retry_max}，不再重试")
            return None
        now = datetime.now(tz=self._tz())
        retry_at = (now + timedelta(minutes=max(1, self._retry_interval))).replace(
            second=0, microsecond=0)
        if retry_at <= now:
            retry_at = retry_at + timedelta(minutes=1)
        if not self._time_in_window(retry_at.strftime("%H:%M")):
            logger.info(
                f"青蛙蝌蚪福利：下次重试时间 {retry_at.strftime('%H:%M')} 已超出时间段 "
                f"{self._start_time}-{self._end_time}，不再重试"
            )
            return None
        state["count"] += 1
        self.save_data(self._DATA_RETRY, state)
        cron = f"{retry_at.minute} {retry_at.hour} * * *"
        self.save_data(self._DATA_CRON, cron)
        self.save_data(self._DATA_NEXT_RUN, retry_at.strftime("%Y-%m-%d %H:%M"))
        logger.info(
            f"青蛙蝌蚪福利：本次购买失败，将于 {retry_at.strftime('%H:%M')} 重试"
            f"（第 {state['count']}/{self._retry_max} 次）"
        )
        self._apply_cron()
        return retry_at.strftime("%H:%M")

    def _scheduled_run(self) -> None:
        """定时任务入口：购买已开启商品，失败时在时间段内自动重试。"""
        result = self._do_buy()
        self.save_data(self._DATA_LAST_RESULT, result)
        self._record_purchases("自动", result.get("results"), result.get("balance"),
                               result.get("time"))
        if result.get("success"):
            # 成功：清空重试计数并安排下一次随机时刻
            self._random_cron()
            self._apply_cron()
            self._push_result_notification(result)
            return
        retry_at = self._schedule_retry() if result.get("retryable") else None
        if retry_at:
            self._push_result_notification(result, suffix=f"，将于 {retry_at} 自动重试")
        else:
            # 无法重试：安排下一次随机时刻
            self._random_cron()
            self._apply_cron()
            self._push_result_notification(result)

    def api_get_config(self) -> Dict[str, Any]:
        """读取当前插件配置。"""
        return self._current_config()

    def api_save_config(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """保存插件配置并重新初始化。"""
        data = dict(payload or {})
        self.update_config(data)
        self.init_plugin(data)
        # 时间段可能变化，让定时任务重新落在新的随机时刻
        self._reschedule()
        return {"success": True, "config": self._current_config()}

    def api_items(self, refresh: str = "") -> Dict[str, Any]:
        """读取蝌蚪商店商品列表，默认走缓存以避免每次打开都请求站点。

        :param refresh: 传入真值（如 1 / true）时强制向站点重新拉取商品数据。
        """
        force = str(refresh).strip().lower() in ("1", "true", "yes", "y")
        ok, payload = self._load_items(force=force)
        if not ok:
            return {"success": False, "message": str(payload), "items": [], "cached": False}
        cache = self.get_data(self._DATA_ITEMS_CACHE) or {}
        return {"success": True, "message": "", "items": payload,
                "cached_at": cache.get("cached_at"), "cached": not refresh}

    def api_balance(self) -> Dict[str, Any]:
        """读取站点实时蝌蚪余额。"""
        site = self._match_site()
        if site is None:
            return {"success": False, "message": f"未找到匹配站点：{self._site_name}",
                    "balance": None}
        base_url = self._build_base_url(site)
        if not base_url:
            return {"success": False, "message": "站点地址为空，无法读取余额", "balance": None}
        client = self._build_client(site)
        balance = self._read_balance(site, client=client, base_url=base_url)
        return {"success": balance is not None, "balance": balance}

    def api_latest(self) -> Dict[str, Any]:
        """读取最近一次购买结果与「最近购买明细」。"""
        data = dict(self.get_data(self._DATA_LAST_RESULT) or {})
        history = self.get_data(self._DATA_PURCHASE_HISTORY) or []
        data["history"] = history if isinstance(history, list) else []
        return data

    def api_buy_once(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """按商品 ID 与数量立即购买单个商品。"""
        data = payload or {}
        item_id = data.get("item_id")
        try:
            amount = int(data.get("amount") or 1)
        except (TypeError, ValueError):
            amount = 1
        amount = max(1, min(amount, 999))
        site = self._match_site()
        if site is None:
            return {"success": False, "message": f"未找到匹配站点：{self._site_name}"}
        base_url = self._build_base_url(site)
        if not base_url:
            return {"success": False, "message": "站点地址为空，无法请求商店接口"}
        ok, payload_items = self._load_items()
        if not ok:
            return {"success": False, "message": str(payload_items)}
        item = None
        for candidate in payload_items or []:
            if str(candidate.get("id")) == str(item_id):
                item = candidate
                break
        if item is None:
            return {"success": False, "message": f"未找到商品 ID：{item_id}"}
        client = self._build_client(site)
        result = self._buy_item(client, base_url, item, amount)
        # 购买后刷新商品缓存，并直接读取站点实时余额
        self._load_items(force=True)
        balance = self._read_balance(site, client=client, base_url=base_url)
        now_text = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"青蛙蝌蚪福利：手动购买 {result.get('name')} x{amount} -> "
                    f"{self._state_label(result)}（余额：{balance}）")
        self._push_manual_notification(result, amount, balance)
        # 记入「最近购买明细」，并同步最近一次结果的时间与余额
        self._record_purchases("手动", [result], balance, now_text)
        last = dict(self.get_data(self._DATA_LAST_RESULT) or {})
        last.update({"time": now_text, "balance": balance, "site": self._site_name})
        self.save_data(self._DATA_LAST_RESULT, last)
        return {
            "success": bool(result.get("success")),
            "message": result.get("message") or "",
            "state": self._state_label(result),
            "result": result,
            "balance": balance,
            "time": now_text,
        }

    def _push_manual_notification(self, result: Dict[str, Any], amount: int,
                                  balance: Optional[str] = None) -> None:
        """手动购买后按通知开关推送结果。"""
        name = result.get("name") or "商品"
        state = self._state_label(result)
        detail = (result.get("message") or "").strip()
        text = f"手动购买 {name} x{amount}：{state}"
        if detail and detail not in state:
            text = f"{text}（{detail}）"
        if balance:
            text = f"{text}（余额：{balance}）"
        if result.get("success"):
            # 涵盖「购买成功」与「已购买过（未扣费）」
            if self._notify_enabled:
                self.post_message(mtype=NotificationType.SiteMessage,
                                  title="青蛙蝌蚪福利", text=text)
        elif self._notify_on_error:
            self.post_message(mtype=NotificationType.SiteMessage,
                              title="青蛙蝌蚪福利", text=text)

    def _record_purchases(self, source: str, results: List[Dict[str, Any]],
                          balance: Optional[str] = None,
                          time_text: str = "") -> None:
        """把一次购买的各商品结果追加到「最近购买明细」（新的在前）。

        :param source: 来源标记，如「手动」或「自动」
        """
        if not results:
            return
        history = self.get_data(self._DATA_PURCHASE_HISTORY) or []
        if not isinstance(history, list):
            history = []
        stamp = time_text or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for item in results:
            history.insert(0, {
                "time": stamp,
                "source": source,
                "name": item.get("name") or "未知商品",
                "amount": item.get("amount"),
                "state": self._state_label(item),
                "success": bool(item.get("success")),
                "skipped": bool(item.get("skipped")),
                "message": item.get("message") or "",
                "balance": balance,
            })
        self.save_data(self._DATA_PURCHASE_HISTORY, history[:self._HISTORY_MAX])

    def api_run(self) -> Dict[str, Any]:
        """立即购买已开启的商品并返回结果。"""
        result = self._do_buy()
        self.save_data(self._DATA_LAST_RESULT, result)
        self._record_purchases("手动触发", result.get("results"), result.get("balance"),
                               result.get("time"))
        # 购买成功后刷新商品缓存，使库存等数据保持最新
        self._load_items(force=True)
        self._push_result_notification(result, prefix="手动触发：")
        return result
