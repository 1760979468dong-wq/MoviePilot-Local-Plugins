"""DDNSTO 免费套餐自动续期插件。

在浏览器登录 web.kooldns.cn 后，把会话 Cookie 填入插件，插件按设定间隔检查
各设备的 DDNSTO 免费体验套餐（4Mbps 7天试用），到期后自动重新下单并绑定到
设备，最后通过通知渠道汇报执行结果。

登录页的图形验证码无法自动通过，因此插件不保存账号密码，只复用用户提供的 Cookie。
"""

import base64
import io
import json
import re
import time
import uuid as uuid_lib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import requests
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings
from app.log import logger
from app.plugins import _PluginBase
from app.schemas.types import NotificationType
from app.utils.http import RequestUtils

try:
    # 插件目录下的常量文件，保证前端产物路径两侧一致
    from .frontend_dist import FRONTEND_DIST_DIR
except ImportError:  # pragma: no cover - 运行环境缺失时的兜底
    FRONTEND_DIST_DIR = "dist/v1_4_3/assets"


class DdnstoRenew(_PluginBase):
    """DDNSTO 免费套餐自动续期插件。"""

    plugin_name = "DDNSTO 自动续期"
    plugin_desc = "定时检查 DDNSTO 免费体验套餐，到期后自动重新领取并绑定到指定设备。"
    plugin_icon = "ddnsto.png"
    plugin_version = "1.4.3"
    plugin_label = "工具"
    plugin_author = "小罗"
    author_url = "https://github.com/xiaoluo-mp/MoviePilot-Local-Plugins"
    plugin_config_prefix = "ddnstorenew_"
    plugin_order = 32
    auth_level = 1

    # 默认站点与请求参数
    _DEFAULT_BASE_URL = "https://web.kooldns.cn"
    _TIMEOUT = 30
    _UA = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
    # 免费试用最多可绑定 2 台设备，超过后站点会拒绝发放
    _MAX_FREE_DEVICES = 2
    # 下单后轮询支付状态的次数与间隔
    _PAID_POLL_TIMES = 10
    _PAID_POLL_INTERVAL = 2
    # 数据键
    _DATA_LAST_RESULT = "last_result"
    _DATA_LAST_CHECK = "last_check"
    _DATA_QR_DEBUG = "qr_debug"
    # 微信扫码登录：长轮询单次等待时间（秒）
    _QR_POLL_TIMEOUT = 8
    # 扫码登录会话有效期（秒）
    _QR_SESSION_TTL = 300
    # 扫码确认后校验登录态的重试次数与间隔（秒），站点侧存在短暂延迟
    _QR_PROFILE_RETRY = 8
    _QR_PROFILE_INTERVAL = 0.6

    # 运行态
    _enabled: bool = False
    _base_url: str = _DEFAULT_BASE_URL
    _cookie: str = ""
    _device_ids: List[int] = []
    _check_hours: int = 6
    _renew_before_days: int = 1
    _notify_enabled: bool = True
    _notify_on_error: bool = True
    # 微信扫码登录会话：登录令牌 -> {session, state, event_id, since_time, created_at}
    _login_sessions: Dict[str, Dict[str, Any]] = {}

    def init_plugin(self, config: dict = None) -> None:
        """根据插件配置初始化运行状态。"""
        self.stop_service()
        cfg = {**self._default_config(), **(config or {})}
        self._enabled = bool(cfg.get("enabled"))
        self._base_url = self._normalize_base_url(cfg.get("base_url"))
        self._cookie = str(cfg.get("cookie") or "").strip()
        self._device_ids = self._normalize_device_ids(cfg.get("device_ids"))
        self._check_hours = self._clamp_int(cfg.get("check_hours"), 6, 1, 24)
        self._renew_before_days = self._clamp_int(cfg.get("renew_before_days"), 1, 0, 7)
        self._notify_enabled = bool(cfg.get("notify_enabled", True))
        self._notify_on_error = bool(cfg.get("notify_on_error", True))
        logger.info(
            f"DDNSTO 自动续期已初始化：启用={self._enabled}，站点={self._base_url}，"
            f"检查间隔={self._check_hours} 小时，剩余不足 {self._renew_before_days} 天时续期，"
            f"指定设备={self._device_ids or '全部'}"
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
        """注册定时检查并自动续期的后台服务。"""
        if not self.get_state():
            return []
        return [
            {
                "id": f"{self.__class__.__name__}.Renew",
                "name": "DDNSTO 免费套餐自动续期",
                "trigger": CronTrigger.from_crontab(self._cron(), timezone=self._tz()),
                "func": self._scheduled_run,
                "kwargs": {},
            }
        ]

    def get_api(self) -> List[Dict[str, Any]]:
        """注册配置读写、状态查询与手动续期 API。"""
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
                "path": "/status",
                "endpoint": self.api_status,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "读取账号、设备与套餐状态",
            },
            {
                "path": "/probe",
                "endpoint": self.api_probe,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "用临时 Cookie 探测登录状态并返回设备列表",
            },
            {
                "path": "/domain/save",
                "endpoint": self.api_domain_save,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "新增或修改穿透域名",
            },
            {
                "path": "/domain/delete",
                "endpoint": self.api_domain_delete,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "删除穿透域名",
            },
            {
                "path": "/login/qr",
                "endpoint": self.api_login_qr_start,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "开始微信扫码登录并返回二维码",
            },
            {
                "path": "/login/qr/poll",
                "endpoint": self.api_login_qr_poll,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "轮询微信扫码登录状态，成功后自动保存 Cookie",
            },
            {
                "path": "/renew",
                "endpoint": self.api_renew,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "立即检查并续期指定设备或全部设备",
            },
        ]

    def stop_service(self) -> None:
        """停止插件后台服务并释放资源。"""
        return None

    # ------------------------------------------------------------------ 配置

    def _default_config(self) -> Dict[str, Any]:
        """返回插件默认配置。"""
        return {
            "enabled": False,
            "base_url": self._DEFAULT_BASE_URL,
            "cookie": "",
            "device_ids": [],
            "check_hours": 6,
            "renew_before_days": 1,
            "notify_enabled": True,
            "notify_on_error": True,
        }

    def _current_config(self) -> Dict[str, Any]:
        """返回当前运行配置。"""
        return {
            "enabled": self._enabled,
            "base_url": self._base_url,
            "cookie": self._cookie,
            "device_ids": list(self._device_ids),
            "check_hours": self._check_hours,
            "renew_before_days": self._renew_before_days,
            "notify_enabled": self._notify_enabled,
            "notify_on_error": self._notify_on_error,
        }

    @staticmethod
    def _clamp_int(value: Any, default: int, minimum: int, maximum: int) -> int:
        """把配置值转成指定范围内的整数。"""
        try:
            number = int(value)
        except (TypeError, ValueError):
            return default
        return max(minimum, min(number, maximum))

    @staticmethod
    def _normalize_base_url(value: Any) -> str:
        """规范化站点根地址。"""
        text = str(value or "").strip().rstrip("/")
        if not text:
            return DdnstoRenew._DEFAULT_BASE_URL
        if not text.startswith(("http://", "https://")):
            text = f"https://{text}"
        return text

    @staticmethod
    def _normalize_device_ids(value: Any) -> List[int]:
        """把配置中的设备 ID 列表规范为去重后的整数列表。"""
        if isinstance(value, str):
            value = re.split(r"[,\s]+", value)
        if not isinstance(value, (list, tuple, set)):
            return []
        result: List[int] = []
        for item in value:
            try:
                number = int(str(item).strip())
            except (TypeError, ValueError):
                continue
            if number > 0 and number not in result:
                result.append(number)
        return result

    def _cron(self) -> str:
        """根据检查间隔生成 Cron 表达式。"""
        if self._check_hours >= 24:
            return "0 9 * * *"
        return f"0 */{self._check_hours} * * *"

    @staticmethod
    def _tz() -> ZoneInfo:
        """返回系统配置的时区对象。"""
        try:
            return ZoneInfo(str(settings.TZ or "Asia/Shanghai"))
        except Exception:
            return ZoneInfo("Asia/Shanghai")

    def _next_run_text(self) -> str:
        """计算下一次计划检查时间。"""
        try:
            trigger = CronTrigger.from_crontab(self._cron(), timezone=self._tz())
            fire_time = trigger.get_next_fire_time(None, datetime.now(tz=self._tz()))
            return fire_time.strftime("%Y-%m-%d %H:%M") if fire_time else "-"
        except Exception:
            return "-"

    def _next_renew(self, devices: List[Dict[str, Any]]) -> Tuple[str, str]:
        """根据套餐到期时间推算下一次自动续期时间。

        :param devices: 设备列表
        :return: (时间文本, 设备名称)
        """
        if not self._enabled:
            return "自动续期未启用", ""
        try:
            trigger = CronTrigger.from_crontab(self._cron(), timezone=self._tz())
        except Exception:
            return "-", ""
        now = datetime.now()
        candidates: List[Tuple[datetime, str]] = []
        for device in devices or []:
            if self._renew_blocked_reason(device):
                continue
            expiry = self._device_expiry(device)
            # 到期时间往前推 N 天即为最早可续期时刻；没有套餐则下次检查就领
            renew_at = expiry - timedelta(days=self._renew_before_days) if expiry else now
            fire_time = trigger.get_next_fire_time(None, max(renew_at, now))
            if fire_time:
                candidates.append((fire_time.replace(tzinfo=None),
                                   device.get("name") or "设备"))
        if not candidates:
            return "无需续期", ""
        fire_time, name = min(candidates, key=lambda item: item[0])
        return fire_time.strftime("%Y-%m-%d %H:%M"), name

    # -------------------------------------------------------------- HTTP 层

    def _csrf_token(self) -> str:
        """从 Cookie 字符串中提取 csrftoken。"""
        for part in re.split(r"[;\s]+", self._cookie or ""):
            if part.startswith("csrftoken="):
                return part.split("=", 1)[1].strip()
        return ""

    def _client(self) -> RequestUtils:
        """构造携带会话 Cookie 与 CSRF 头的 HTTP 客户端。"""
        headers = {
            "User-Agent": self._UA,
            "Accept": "application/json",
            "Referer": f"{self._base_url}/app/mobile/",
            "Origin": self._base_url,
        }
        csrf = self._csrf_token()
        if csrf:
            headers["X-CSRFToken"] = csrf
        return RequestUtils(cookies=self._cookie, headers=headers, timeout=self._TIMEOUT)

    def _call(self, method: str, path: str, params: dict = None,
              payload: dict = None) -> Any:
        """调用 DDNSTO 接口并返回解析后的 JSON 数据。

        :param method: HTTP 方法（get / post / patch）
        :param path: 接口路径，例如 /api/user/routers/
        :param params: 查询参数
        :param payload: JSON 请求体
        """
        url = f"{self._base_url}{path}"
        kwargs: Dict[str, Any] = {}
        if params:
            kwargs["params"] = params
        if payload is not None:
            kwargs["json"] = payload
        res = self._client().request(method=method, url=url, **kwargs)
        if res is None:
            raise RuntimeError("请求失败：无响应（请检查网络或代理设置）")
        try:
            if res.status_code in (401, 403):
                raise RuntimeError("登录态已失效，请重新登录站点并更新 Cookie")
            if res.status_code >= 400:
                raise RuntimeError(f"HTTP {res.status_code}：{self._error_detail(res)}")
            try:
                return res.json()
            except ValueError:
                raise RuntimeError("接口返回内容不是合法 JSON")
        finally:
            try:
                res.close()
            except Exception:
                pass

    @staticmethod
    def _error_detail(res) -> str:
        """从错误响应中提取可读的错误描述。"""
        try:
            body = res.json()
        except Exception:
            return (getattr(res, "text", "") or "")[:200]
        if isinstance(body, dict):
            detail = body.get("detail") or body.get("message") or body.get("error")
            if detail:
                return str(detail)
            return json.dumps(body, ensure_ascii=False)[:200]
        return str(body)[:200]

    def _fetch_profile(self) -> Dict[str, Any]:
        """读取当前登录账号信息，用于校验 Cookie 是否有效。"""
        data = self._call("get", "/api/profile/")
        if isinstance(data, list):
            return data[0] if data else {}
        if isinstance(data, dict):
            return data
        return {}

    def _fetch_devices(self) -> List[Dict[str, Any]]:
        """读取账号下的设备列表。"""
        data = self._call("get", "/api/user/routers/")
        if isinstance(data, dict):
            return data.get("results") or []
        return data if isinstance(data, list) else []

    def _fetch_products(self) -> List[Dict[str, Any]]:
        """读取套餐商品列表。"""
        data = self._call("get", "/api/user/product/products/")
        return data if isinstance(data, list) else []

    def _fetch_orders(self) -> List[Dict[str, Any]]:
        """读取账号下已绑定的套餐订单。"""
        data = self._call(
            "get", "/api/user/product/orders/",
            params={"is_bind": "true", "limit": 100, "offset": 0},
        )
        if isinstance(data, dict):
            return data.get("results") or []
        return data if isinstance(data, list) else []

    def _fetch_router_info(self, uid: str) -> Optional[Dict[str, Any]]:
        """读取单台设备的实时路由信息（含在线状态）。

        设备在线状态不在 /api/user/routers/ 的 status 字段里，必须查
        /api/router_info/?router_id=<uid> 返回的 Router.Online。
        """
        uid = str(uid or "").strip()
        if not uid:
            return None
        data = self._call("get", "/api/router_info/", params={"router_id": uid})
        if isinstance(data, dict):
            router = data.get("Router")
            return router if isinstance(router, dict) else None
        return None

    def _fetch_router_infos(self, devices: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """批量读取设备的实时路由信息，单台失败不影响整体。"""
        result: Dict[str, Dict[str, Any]] = {}
        for device in devices or []:
            uid = str(device.get("uid") or "").strip()
            if not uid or uid in result:
                continue
            try:
                info = self._fetch_router_info(uid)
            except Exception as err:
                logger.debug(f"DDNSTO 自动续期：读取设备 {uid} 实时信息失败：{err}")
                continue
            if info:
                result[uid] = info
        return result

    @staticmethod
    def _router_online(info: Optional[Dict[str, Any]]) -> Optional[bool]:
        """从路由信息中解析在线状态，无法判断时返回 None。"""
        if not isinstance(info, dict):
            return None
        for key in ("Online", "online", "is_online"):
            value = info.get(key)
            if isinstance(value, bool):
                return value
            if value is not None and str(value).strip() != "":
                return str(value).strip().lower() in ("1", "true", "online")
        return None

    @staticmethod
    def _find_free_product(products: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """在商品列表中定位 0 元的免费试用套餐。"""
        free_items: List[Dict[str, Any]] = []
        for item in products or []:
            try:
                price = float(item.get("price") or 0)
            except (TypeError, ValueError):
                continue
            if price <= 0 and not item.get("disabled"):
                free_items.append(item)
        if not free_items:
            return None
        # 优先选名称含「试用」的商品，其次选时长最长的
        trial = [i for i in free_items if "试用" in str(i.get("name") or "")]
        pool = trial or free_items
        return max(pool, key=lambda i: int(i.get("due_days") or 0))

    # ---------------------------------------------------------------- 业务

    @staticmethod
    def _parse_dt(value: Any) -> Optional[datetime]:
        """解析接口返回的时间字符串为本地朴素时间。"""
        if not value or not isinstance(value, str):
            return None
        text = value.strip().replace("/", "-")
        if not text:
            return None
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            parsed = None
        if parsed is None:
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
                try:
                    return datetime.strptime(text[:19], fmt)
                except ValueError:
                    continue
            return None
        if parsed.tzinfo is not None:
            parsed = parsed.astimezone().replace(tzinfo=None)
        return parsed

    def _device_expiry(self, device: Dict[str, Any]) -> Optional[datetime]:
        """返回设备当前所有套餐中最晚的到期时间。"""
        candidates: List[datetime] = []
        active = device.get("active_plan") or {}
        if isinstance(active, dict):
            for value in (active.get("product_expired_at"),
                          active.get("product_expired_at_date")):
                parsed = self._parse_dt(value)
                if parsed:
                    candidates.append(parsed)
        parsed = self._parse_dt(device.get("longest_plan_due_date"))
        if parsed:
            candidates.append(parsed)
        for plan in device.get("plans") or []:
            if not isinstance(plan, dict):
                continue
            for value in (plan.get("product_expired_at"),
                          plan.get("product_expired_at_date")):
                parsed = self._parse_dt(value)
                if parsed:
                    candidates.append(parsed)
        return max(candidates) if candidates else None

    @staticmethod
    def _device_status_label(device: Dict[str, Any],
                             online: Optional[bool] = None) -> str:
        """把设备的在线状态转为中文标签。

        :param device: 设备数据
        :param online: 来自 /api/router_info/ 的实时在线状态，优先使用。
        """
        if online is True:
            return "在线"
        if online is False:
            return "离线"
        raw = str(device.get("status") or "").strip().lower()
        if raw in ("1", "online", "true"):
            return "在线"
        if raw in ("3", "expired"):
            return "套餐过期"
        return "离线"

    @staticmethod
    def _device_domains(device: Dict[str, Any]) -> List[Dict[str, Any]]:
        """解析设备下已配置的穿透域名（外网地址、内网地址与备注）。"""
        result: List[Dict[str, Any]] = []
        for record in device.get("records") or []:
            if not isinstance(record, dict):
                continue
            host = record.get("host") or {}
            http_url = ""
            https_url = ""
            if isinstance(host, dict):
                http_url = str(host.get("http") or "").strip()
                https_url = str(host.get("https") or "").strip()
            prefix = str(record.get("prefix") or "").strip()
            target = str(record.get("target") or "").strip()
            if not (prefix or http_url or https_url or target):
                continue
            result.append({
                "id": record.get("id"),
                "prefix": prefix,
                "note": str(record.get("note") or "").strip(),
                "target": target,
                "url": https_url or http_url,
                "http": http_url,
                "https": https_url,
                "device_id": (record.get("router_detail") or {}).get("id"),
                "device_name": str((record.get("router_detail") or {}).get("name") or ""),
            })
        return result

    def _device_view(self, device: Dict[str, Any],
                     online: Optional[bool] = None) -> Dict[str, Any]:
        """构造用于前端展示的设备信息。

        :param device: 设备数据
        :param online: 实时在线状态，缺省时回退到设备自身的 status 字段。
        """
        active = device.get("active_plan") or {}
        product = (active.get("product") or {}) if isinstance(active, dict) else {}
        expiry = self._device_expiry(device)
        needs_renew, reason = self._renew_decision(device)
        return {
            "id": device.get("id"),
            "name": device.get("name") or "未命名设备",
            "uid": device.get("uid") or "",
            "status": self._device_status_label(device, online),
            "plan_name": (active.get("product_name")
                          or product.get("name")
                          or ("免费体验" if device.get("has_active_plan") else "未绑定套餐")),
            "plan_category": (product.get("category") or "").strip(),
            "expires_at": expiry.strftime("%Y-%m-%d %H:%M") if expiry else "",
            "remaining_days": (expiry - datetime.now()).days if expiry else None,
            "domains": self._device_domains(device),
            "needs_renew": needs_renew,
            "reason": reason,
        }

    @staticmethod
    def _renew_blocked_reason(device: Dict[str, Any]) -> Optional[str]:
        """返回设备不可重新领取免费套餐的原因，可以领取时返回 None。"""
        if device.get("has_active_non_free_plan") or device.get("has_active_premier_plan"):
            return "已有生效中的付费套餐"
        active = device.get("active_plan") or {}
        try:
            paid_price = float(active.get("deal_price") or 0)
        except (TypeError, ValueError):
            paid_price = 0
        expiry = DdnstoRenew._parse_dt(
            active.get("product_expired_at") or active.get("product_expired_at_date")
        )
        if paid_price > 0 and expiry and expiry > datetime.now():
            return f"已有生效中的付费套餐（至 {expiry:%Y-%m-%d %H:%M}）"
        return None

    def _renew_decision(self, device: Dict[str, Any]) -> Tuple[bool, str]:
        """判断设备是否需要重新领取免费试用套餐。

        免费套餐不可叠加，但未到期也能重新领取，且新套餐有效期从购买时刻重新计算，
        因此只要剩余时间不足配置的天数就可以续期；仍持有付费套餐的设备直接跳过。
        """
        blocked = self._renew_blocked_reason(device)
        if blocked:
            return False, blocked
        expiry = self._device_expiry(device)
        if expiry is None:
            return True, "未绑定任何套餐"
        deadline = datetime.now() + timedelta(days=self._renew_before_days)
        if expiry <= deadline:
            return True, f"套餐到期时间 {expiry:%Y-%m-%d %H:%M}"
        return False, f"套餐有效期至 {expiry:%Y-%m-%d %H:%M}"

    def _create_order(self, product_id: int) -> Dict[str, Any]:
        """创建免费套餐订单。"""
        payload = {"product_id": product_id, "uuid_from_client": uuid_lib.uuid4().hex}
        data = self._call("post", "/api/user/product/orders/", payload=payload)
        if not isinstance(data, dict):
            raise RuntimeError("下单失败：接口未返回订单信息")
        if data.get("success") is False:
            raise RuntimeError(str(data.get("message") or "下单失败"))
        if not data.get("id"):
            raise RuntimeError(str(data.get("message") or "下单失败：订单号缺失"))
        return data

    def _wait_order_paid(self, order_id: Any) -> Dict[str, Any]:
        """轮询订单直到确认已支付。"""
        latest: Dict[str, Any] = {}
        for _ in range(self._PAID_POLL_TIMES):
            data = self._call("get", f"/api/user/product/orders/{order_id}/")
            if isinstance(data, dict):
                latest = data
                if data.get("payed") is True:
                    return data
            time.sleep(self._PAID_POLL_INTERVAL)
        raise RuntimeError(
            f"订单 {order_id} 未在预期时间内确认支付"
            f"（当前状态：{latest.get('status') or '未知'}）"
        )

    def _bind_plan(self, device_id: Any, order_id: Any) -> None:
        """把套餐订单绑定到指定设备。"""
        data = self._call(
            "patch", f"/api/user/routers/{device_id}/",
            payload={"plan_ids_to_add": [order_id]},
        )
        if isinstance(data, dict) and data.get("success") is False:
            raise RuntimeError(str(data.get("message") or "绑定失败"))

    def _renew_device(self, device: Dict[str, Any],
                      product: Dict[str, Any]) -> Dict[str, Any]:
        """对单台设备执行一次免费套餐续期。"""
        base = {
            "device_id": device.get("id"),
            "device_name": device.get("name") or "未命名设备",
            "product_id": product.get("id"),
            "product_name": product.get("name"),
        }
        try:
            order = self._create_order(int(product.get("id")))
            order_id = order.get("id")
            paid = self._wait_order_paid(order_id)
            self._bind_plan(device.get("id"), order_id)
            expiry = self._parse_dt(paid.get("product_expired_at")
                                    or paid.get("product_expired_at_date"))
            return {
                **base,
                "success": True,
                "order_id": order_id,
                "expires_at": expiry.strftime("%Y-%m-%d %H:%M") if expiry else "",
                "message": "续期成功",
            }
        except Exception as err:
            logger.error(f"DDNSTO 自动续期：设备 {base['device_name']} 续期失败：{err}")
            return {**base, "success": False, "order_id": None, "expires_at": "",
                    "message": str(err)}

    def _do_renew(self, device_ids: Optional[List[int]] = None,
                  force: bool = False) -> Dict[str, Any]:
        """检查目标设备并在需要时续期。

        :param device_ids: 指定要处理的设备 ID；为空时按配置或全部符合条件的设备处理。
        :param force: 为 True 时忽略「续期时机」直接重新领取，用于手动触发。
        """
        if not self._cookie:
            return self._result(False, "未配置 Cookie，请先在插件设置中填入登录后的会话 Cookie")
        try:
            profile = self._fetch_profile()
        except Exception as err:
            return self._result(False, f"Cookie 校验失败：{err}")
        if not profile:
            return self._result(False, "Cookie 无效或已过期，请重新登录站点并更新 Cookie")
        try:
            devices = self._fetch_devices()
            products = self._fetch_products()
        except Exception as err:
            return self._result(False, f"读取站点数据失败：{err}")
        product = self._find_free_product(products)
        if product is None:
            return self._result(False, "未在商品列表中找到 0 元的免费试用套餐")

        targets = device_ids if device_ids else self._device_ids
        if targets:
            devices = [d for d in devices if d.get("id") in targets]
            if not devices:
                return self._result(False, "配置的设备在账号下不存在，请重新选择设备")
        elif not devices:
            return self._result(False, "账号下没有可用设备")

        if force:
            # 手动触发时忽略续期时机，只跳过持有付费套餐的设备
            pending = [d for d in devices if not self._renew_blocked_reason(d)]
        else:
            pending = [d for d in devices if self._renew_decision(d)[0]]
        results: List[Dict[str, Any]] = []
        for device in pending:
            results.append(self._renew_device(device, product))

        warnings: List[str] = []
        try:
            all_devices = self._fetch_devices()
            if len(all_devices) > self._MAX_FREE_DEVICES:
                warnings.append(
                    f"账号下有 {len(all_devices)} 台设备，站点规定免费试用最多绑定 "
                    f"{self._MAX_FREE_DEVICES} 台，超出后可能无法领取"
                )
        except Exception:
            pass

        router_infos = self._fetch_router_infos(devices)

        if not pending:
            if force:
                summary = "；".join(
                    f"{d.get('name') or '设备'}：{self._renew_blocked_reason(d)}"
                    for d in devices
                ) or "无符合条件的设备"
            else:
                summary = "；".join(
                    f"{d.get('name') or '设备'}：{self._renew_decision(d)[1]}"
                    for d in devices
                ) or "无符合条件的设备"
                summary = f"未到续期时机（剩余不足 {self._renew_before_days} 天才领取）。{summary}"
            return self._result(True, summary, devices, results, warnings, product,
                                router_infos)

        summary = "；".join(
            f"{r['device_name']}：{'成功' if r['success'] else r['message']}" for r in results
        )
        return self._result(all(r["success"] for r in results), summary,
                            devices, results, warnings, product, router_infos)

    def _result(self, success: bool, message: str,
                devices: Optional[List[Dict[str, Any]]] = None,
                renew_results: Optional[List[Dict[str, Any]]] = None,
                warnings: Optional[List[str]] = None,
                product: Optional[Dict[str, Any]] = None,
                router_infos: Optional[Dict[str, Dict[str, Any]]] = None) -> Dict[str, Any]:
        """构造统一的执行结果结构。

        :param router_infos: 设备 uid 到实时路由信息的映射，用于展示真实在线状态。
        """
        infos = router_infos or {}
        return {
            "success": bool(success),
            "message": message,
            "devices": [
                self._device_view(d, self._router_online(infos.get(str(d.get("uid") or ""))))
                for d in (devices or [])
            ],
            "renew_results": renew_results or [],
            "warnings": warnings or [],
            "product": product or {},
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "next_run": self._next_run_text(),
            "next_check": self._next_run_text(),
            "next_renew": self._next_renew(devices or [])[0],
        }

    def _push_notification(self, result: Dict[str, Any], prefix: str = "") -> None:
        """按通知开关推送一次执行结果。"""
        text = f"{prefix}{result.get('message') or ''}".strip()
        if not text:
            return
        if result.get("success"):
            if self._notify_enabled:
                self.post_message(mtype=NotificationType.SiteMessage,
                                  title="DDNSTO 自动续期", text=text)
        elif self._notify_on_error:
            self.post_message(mtype=NotificationType.SiteMessage,
                              title="DDNSTO 自动续期", text=f"执行失败：{text}")

    def _scheduled_run(self) -> None:
        """定时任务入口：检查并自动续期，然后推送结果。"""
        result = self._do_renew()
        self.save_data(self._DATA_LAST_RESULT, result)
        self.save_data(self._DATA_LAST_CHECK, result.get("time"))
        self._push_notification(result)

    # ----------------------------------------------------------------- API

    def api_get_config(self) -> Dict[str, Any]:
        """读取当前插件配置。"""
        return self._current_config()

    def api_save_config(self, payload: Dict[str, Any] = None) -> Dict[str, Any]:
        """保存插件配置并重新初始化。"""
        data = dict(payload or {})
        data["device_ids"] = self._normalize_device_ids(data.get("device_ids"))
        self.update_config(data)
        self.init_plugin(data)
        return {"success": True, "config": self._current_config()}

    def api_status(self) -> Dict[str, Any]:
        """读取账号、设备与套餐的实时状态。"""
        if not self._cookie:
            return {"success": False, "logged_in": False,
                    "message": "未配置 Cookie，请先在插件设置中填入登录后的会话 Cookie"}
        try:
            profile = self._fetch_profile()
        except Exception as err:
            return {"success": False, "logged_in": False, "message": str(err)}
        if not profile:
            return {"success": False, "logged_in": False,
                    "message": "Cookie 无效或已过期，请重新登录站点并更新 Cookie"}
        try:
            devices = self._fetch_devices()
            products = self._fetch_products()
            orders = self._fetch_orders()
        except Exception as err:
            return {"success": False, "logged_in": True,
                    "user": {"id": profile.get("id"), "username": profile.get("username")},
                    "message": f"读取站点数据失败：{err}"}
        router_infos = self._fetch_router_infos(devices)
        product = self._find_free_product(products) or {}
        next_renew, next_renew_device = self._next_renew(devices)
        free_orders = [
            {
                "id": order.get("id"),
                "product_name": order.get("product_name")
                                or ((order.get("product") or {}).get("name")),
                "expires_at": order.get("product_expired_at")
                              or order.get("product_expired_at_date"),
                "device": (order.get("bind_device") or {}).get("name"),
            }
            for order in orders
            if not order.get("expired")
        ]
        return {
            "success": True,
            "logged_in": True,
            "user": {"id": profile.get("id"), "username": profile.get("username") or ""},
            "product": {
                "id": product.get("id"),
                "name": product.get("name") or "",
                "due_days": product.get("due_days"),
            },
            "devices": [
                self._device_view(d, self._router_online(router_infos.get(
                    str(d.get("uid") or ""))))
                for d in devices
            ],
            "device_count": len(devices),
            "max_free_devices": self._MAX_FREE_DEVICES,
            "free_orders": free_orders,
            "last_result": self.get_data(self._DATA_LAST_RESULT) or {},
            "last_check": self.get_data(self._DATA_LAST_CHECK) or "",
            "next_run": self._next_run_text(),
            "next_check": self._next_run_text(),
            "next_renew": next_renew,
            "next_renew_device": next_renew_device,
            "config": self._current_config(),
        }

    def api_probe(self, payload: Dict[str, Any] = None) -> Dict[str, Any]:
        """用前端临时提交的 Cookie 探测登录状态并返回设备列表，不写入配置。

        :param payload: 需包含 cookie，可选 base_url。
        """
        data = payload or {}
        cookie = str(data.get("cookie") or "").strip()
        if not cookie:
            return {"success": False, "message": "请先填写 Cookie"}
        saved_cookie, saved_base = self._cookie, self._base_url
        try:
            self._cookie = cookie
            self._base_url = self._normalize_base_url(data.get("base_url"))
            profile = self._fetch_profile()
            if not profile:
                return {"success": False,
                        "message": "Cookie 无效或已过期，请重新登录站点后复制 Cookie"}
            devices = self._fetch_devices()
            router_infos = self._fetch_router_infos(devices)
            return {
                "success": True,
                "message": "连接成功",
                "user": {"id": profile.get("id"),
                         "username": profile.get("username") or ""},
                "devices": [
                    self._device_view(d, self._router_online(router_infos.get(
                        str(d.get("uid") or ""))))
                    for d in devices
                ],
                "device_count": len(devices),
            }
        except Exception as err:
            return {"success": False, "message": str(err)}
        finally:
            self._cookie, self._base_url = saved_cookie, saved_base

    def api_renew(self, payload: Dict[str, Any] = None) -> Dict[str, Any]:
        """立即重新领取免费套餐（忽略「续期时机」）。

        :param payload: 可包含 device_id，缺省时按配置处理；无请求体时同样可用。
        """
        data = payload or {}
        device_ids: List[int] = []
        if data.get("device_id") not in (None, "", 0, "0"):
            device_ids = self._normalize_device_ids([data.get("device_id")])
        result = self._do_renew(device_ids or None, force=True)
        self.save_data(self._DATA_LAST_RESULT, result)
        self.save_data(self._DATA_LAST_CHECK, result.get("time"))
        self._push_notification(result, prefix="手动触发：")
        return result

    # ------------------------------------------------------------- 域名管理

    def _domain_payload(self, device_id: Any, prefix: str, target: str,
                        note: str) -> Dict[str, Any]:
        """构造域名新增/修改请求体。"""
        payload: Dict[str, Any] = {
            "prefix": str(prefix or "").strip(),
            "target": str(target or "").strip(),
            "note": str(note or "").strip(),
        }
        if device_id not in (None, "", 0, "0"):
            payload["router"] = f"/api/user/routers/{int(device_id)}/"
        return payload

    def api_domain_save(self, payload: Dict[str, Any] = None) -> Dict[str, Any]:
        """新增或修改一条穿透域名。

        :param payload: 需包含 prefix 与 target；新增时提供 device_id，修改时提供 record_id。
        """
        data = payload or {}
        prefix = str(data.get("prefix") or "").strip()
        target = str(data.get("target") or "").strip()
        note = str(data.get("note") or "").strip()
        if not prefix:
            return {"success": False, "message": "请填写域名前缀"}
        if not target:
            return {"success": False, "message": "请填写内网地址（含 http/https 与端口）"}
        record_id = data.get("record_id")
        try:
            if record_id not in (None, "", 0, "0"):
                body = self._domain_payload(None, prefix, target, note)
                result = self._call("patch", f"/api/user/records/{int(record_id)}/",
                                    payload=body)
                message = "域名已更新"
            else:
                body = self._domain_payload(data.get("device_id"), prefix, target, note)
                result = self._call("post", "/api/user/records/", payload=body)
                message = "域名已添加"
        except Exception as err:
            return {"success": False, "message": str(err)}
        if isinstance(result, dict) and result.get("success") is False:
            return {"success": False,
                    "message": str(result.get("message") or "操作失败")}
        return {"success": True, "message": message, "domain": result}

    def api_domain_delete(self, payload: Dict[str, Any] = None) -> Dict[str, Any]:
        """删除一条穿透域名。

        :param payload: 需包含 record_id。
        """
        data = payload or {}
        record_id = data.get("record_id")
        if record_id in (None, "", 0, "0"):
            return {"success": False, "message": "缺少域名记录 ID"}
        try:
            self._call("delete", f"/api/user/records/{int(record_id)}")
        except Exception as err:
            return {"success": False, "message": str(err)}
        return {"success": True, "message": "域名已删除"}

    # --------------------------------------------------------- 微信扫码登录

    @staticmethod
    def _qr_data_url(text: str) -> str:
        """把文本渲染成二维码 PNG 的 data URL，失败时返回空串。"""
        try:
            import qrcode

            image = qrcode.make(text)
            buffer = io.BytesIO()
            image.save(buffer, format="PNG")
            return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()
        except Exception as err:
            logger.warn(f"DDNSTO 自动续期：生成二维码失败：{err}")
            return ""

    def _saved_config(self) -> Dict[str, Any]:
        """读取插件已保存的配置，避免用运行态默认值覆盖用户设置。"""
        try:
            saved = self.systemconfig.get(f"plugin.{self.__class__.__name__}") or {}
        except Exception as err:
            logger.debug(f"DDNSTO 自动续期：读取已保存配置失败：{err}")
            return {}
        return {k: v for k, v in saved.items() if v is not None}

    def _site_cookie(self, session: requests.Session) -> str:
        """只取属于站点域的 Cookie，排除 sso.ddnsto.com 等同名 Cookie。"""
        host = urlparse(self._base_url).hostname or ""
        pairs: List[str] = []
        for cookie in session.cookies:
            domain = (cookie.domain or "").lstrip(".")
            if host and not (domain == host or host.endswith(f".{domain}")):
                continue
            pairs.append(f"{cookie.name}={cookie.value}")
        return "; ".join(pairs)

    def _sso_base(self) -> str:
        """推导扫码登录使用的 SSO 站点地址，与网页前端的解析规则保持一致。

        前端把二维码与长轮询请求发往 sso.ddnsto.com，而登录确认仍回到当前站点，
        两边必须严格照搬，否则站点会返回 sync failed。
        """
        host = urlparse(self._base_url).hostname or ""
        for suffix in ("ddnsto.com", "kooldns.cn", "tocmcc.cn", "webdav.top"):
            if host == suffix or host.endswith(f".{suffix}"):
                return "https://sso.ddnsto.com"
        return self._base_url

    def _login_client(self, session: requests.Session,
                      base: str = None) -> RequestUtils:
        """构造用于扫码登录流程的 HTTP 客户端（共享同一个会话）。

        :param session: 复用的 requests 会话
        :param base: 站点根地址，缺省使用插件配置的站点
        """
        base = base or self._base_url
        headers = {
            "User-Agent": self._UA,
            "Accept": "application/json",
            "Referer": f"{base}/app/mobile/",
            "Origin": base,
        }
        return RequestUtils(session=session, headers=headers, timeout=self._TIMEOUT)

    def _login_get(self, client: RequestUtils, path: str,
                   params: dict = None, base: str = None) -> Any:
        """扫码登录流程的 GET 请求，直接返回 JSON。

        :param client: HTTP 客户端
        :param path: 接口路径
        :param params: 查询参数
        :param base: 站点根地址，缺省使用插件配置的站点
        """
        res = client.get_res(f"{base or self._base_url}{path}", params=params)
        if res is None:
            raise RuntimeError("请求失败：无响应")
        try:
            if res.status_code >= 400:
                raise RuntimeError(f"HTTP {res.status_code}：{self._error_detail(res)}")
            return res.json()
        finally:
            try:
                res.close()
            except Exception:
                pass

    def _save_qr_debug(self, payload: Dict[str, Any]) -> None:
        """记录最近一次扫码登录的诊断信息，便于排查问题。"""
        try:
            self.save_data(self._DATA_QR_DEBUG, {
                **payload,
                "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            })
        except Exception as err:
            logger.debug(f"DDNSTO 自动续期：写入扫码诊断信息失败：{err}")

    def _cleanup_login_sessions(self) -> None:
        """清理过期的扫码登录会话。"""
        deadline = time.time() - self._QR_SESSION_TTL
        for key in [k for k, v in self._login_sessions.items()
                    if float(v.get("created_at") or 0) < deadline]:
            self._login_sessions.pop(key, None)

    @staticmethod
    def _extract_login_token(events: Any) -> str:
        """从长轮询事件中提取登录 token。"""
        if not isinstance(events, list):
            return ""
        for event in events:
            payload = event.get("data") if isinstance(event, dict) and "data" in event else event
            token = DdnstoRenew._dig_token(payload)
            if token:
                return token
        return ""

    @staticmethod
    def _dig_token(value: Any) -> str:
        """递归解析事件数据中的 token，与网页前端的解析逻辑保持一致。

        字符串先尝试按 JSON 解析；解析失败时原样返回，因此既支持
        `{"token": "..."}` 结构，也支持事件 data 直接就是 token 字符串。
        """
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return ""
            try:
                parsed = json.loads(text)
            except ValueError:
                return text
            return DdnstoRenew._dig_token(parsed) or text
        if isinstance(value, dict):
            token = value.get("token")
            if isinstance(token, str) and token.strip():
                return token.strip()
        return ""

    def api_login_qr_start(self) -> Dict[str, Any]:
        """开始一次微信扫码登录，返回二维码图片与轮询令牌。"""
        self._cleanup_login_sessions()
        # 站点域与 SSO 域分开两个会话，避免两个域的 sessionid 互相覆盖
        web_session = requests.Session()
        sso_session = requests.Session()
        client = self._login_client(web_session)
        sso_base = self._sso_base()
        sso_client = self._login_client(sso_session, base=sso_base)
        try:
            status = self._login_get(client, "/api/login_status/")
            state = str((status or {}).get("state") or "").strip()
            if not state:
                return {"success": False, "message": "获取登录状态失败，请稍后重试"}
            info = self._login_get(sso_client, "/wechat/oauth/login/sso/",
                                   params={"from": "ddnsto", "state": state},
                                   base=sso_base)
            image = str((info or {}).get("image") or "").strip()
            event_id = str((info or {}).get("event_id") or "").strip()
            if not image or not event_id:
                return {"success": False, "message": "二维码数据不完整，请稍后重试"}
            token = uuid_lib.uuid4().hex
            self._login_sessions[token] = {
                "session": web_session,
                "client": client,
                "sso_client": sso_client,
                "sso_base": sso_base,
                "state": state,
                "event_id": event_id,
                "since_time": 0,
                "created_at": time.time(),
            }
            return {
                "success": True,
                "token": token,
                "qr_image": self._qr_data_url(image),
                "qr_value": image,
                "message": "请使用微信扫描二维码并在手机上确认",
            }
        except Exception as err:
            return {"success": False, "message": f"二维码获取失败：{err}"}

    def api_login_qr_poll(self, token: str = "") -> Dict[str, Any]:
        """轮询微信扫码登录状态，成功后自动把 Cookie 写入插件配置。

        :param token: api_login_qr_start 返回的登录令牌。
        """
        self._cleanup_login_sessions()
        session_info = self._login_sessions.get(str(token or "").strip())
        if not session_info:
            return {"status": "expired", "message": "登录会话已失效，请刷新二维码"}
        client: RequestUtils = session_info["client"]
        try:
            status = self._login_get(client, "/api/login_status/")
            login_status = str((status or {}).get("status") or "")
            if login_status == "logined":
                return self._finish_qr_login(token, session_info)
            if session_info.get("signaled"):
                # 已经确认过登录令牌，避免并发轮询重复提交
                return self._finish_qr_login(token, session_info)
            sso_base = session_info.get("sso_base") or self._sso_base()
            sso_client = session_info.get("sso_client") or client
            events = self._login_get(
                sso_client, "/longpoll/events",
                params={
                    "category": f"weixinoauth-{session_info['event_id']}",
                    "since_time": str(session_info.get("since_time") or 0),
                    "timeout": str(self._QR_POLL_TIMEOUT),
                },
                base=sso_base,
            )
            raw_events = (events or {}).get("events")
            login_token = self._extract_login_token(raw_events)
            if not login_token and raw_events:
                self._save_qr_debug({
                    "stage": "scanned_no_token",
                    "login_status": login_status,
                    "events": str(raw_events)[:500],
                })
                return {"status": "scanned", "message": "已扫码，请在手机上确认登录"}
            if not login_token:
                self._save_qr_debug({
                    "stage": "waiting",
                    "login_status": login_status,
                    "events": str(raw_events)[:200],
                })
                return {"status": "pending", "message": "等待扫码…"}
            session_info["signaled"] = True
            try:
                signal_body = self._signal_login(client, session_info["session"],
                                                 session_info["state"], login_token)
            except Exception as signal_err:
                # 确认失败时允许下一轮重新提交，并保留轮询以便重试
                session_info["signaled"] = False
                self._save_qr_debug({"stage": "signal_failed",
                                     "message": str(signal_err)[:300]})
                return {"status": "pending",
                        "message": f"确认登录失败：{signal_err}，正在重试…"}
            self._save_qr_debug({
                "stage": "signaled",
                "login_status": login_status,
                "token_len": len(login_token),
                "signal_body": str(signal_body)[:300],
                "cookies": sorted(session_info["session"].cookies.get_dict().keys()),
            })
            return self._finish_qr_login(token, session_info)
        except Exception as err:
            logger.error(f"DDNSTO 自动续期：扫码登录轮询失败：{err}")
            self._save_qr_debug({"stage": "error", "message": str(err)[:300]})
            return {"status": "error", "message": str(err)}

    def _signal_login(self, client: RequestUtils, session: requests.Session,
                      state: str, login_token: str) -> Dict[str, Any]:
        """向站点确认微信登录令牌，返回接口响应内容。"""
        headers = {
            "User-Agent": self._UA,
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Referer": f"{self._base_url}/app/mobile/",
            "Origin": self._base_url,
            "KSERVERAUTH": "koolshare",
        }
        csrf = session.cookies.get("csrftoken") if session is not None else None
        if csrf:
            headers["X-CSRFToken"] = csrf
        res = client.request(
            method="post",
            url=f"{self._base_url}/api/signal_login/",
            params={"state": state},
            json={"openid": "frontend-fallback", "token": login_token},
            headers=headers,
        )
        if res is None:
            raise RuntimeError("确认登录失败：无响应")
        try:
            status_code = res.status_code
            try:
                body = res.json()
            except ValueError:
                body = {}
            logger.info(f"DDNSTO 自动续期：signal_login HTTP {status_code} -> "
                        f"{str(body)[:300]}")
            if status_code >= 400:
                raise RuntimeError(f"确认登录失败：HTTP {status_code} {str(body)[:120]}")
            if isinstance(body, dict) and body.get("success") is False:
                raise RuntimeError(str(body.get("message") or "确认登录失败"))
            if isinstance(body, dict) and str(body.get("status") or "") == "sync failed":
                raise RuntimeError("站点返回 sync failed（登录令牌未被接受）")
            return body if isinstance(body, dict) else {}
        finally:
            try:
                res.close()
            except Exception:
                pass

    def _finish_qr_login(self, token: str,
                         session_info: Dict[str, Any]) -> Dict[str, Any]:
        """扫码成功后校验登录态并把 Cookie 写入插件配置。"""
        session: requests.Session = session_info["session"]
        client: RequestUtils = session_info["client"]
        # 站点侧登录态存在短暂延迟，与前端一致做多次重试
        user: Any = None
        login_status = ""
        for _ in range(self._QR_PROFILE_RETRY):
            try:
                login_status = str(
                    (self._login_get(client, "/api/login_status/") or {}).get("status") or ""
                )
            except Exception:
                login_status = ""
            profile = self._login_get(client, "/api/profile/")
            candidate = profile[0] if isinstance(profile, list) and profile else profile
            if isinstance(candidate, dict) and candidate.get("id"):
                user = candidate
                break
            time.sleep(self._QR_PROFILE_INTERVAL)
        cookie = self._site_cookie(session)
        self._save_qr_debug({
            "stage": "finish",
            "has_user": bool(user),
            "login_status": login_status,
            "cookies": [f"{c.domain}|{c.name}" for c in session.cookies],
            "saved_cookie_keys": [p.split("=")[0] for p in cookie.split("; ") if p],
        })
        if not user:
            # 允许下一轮重新提取令牌并再次确认，避免站点侧写入延迟导致一次失败
            session_info["signaled"] = False
            return {"status": "pending",
                    "message": f"登录态同步中（站点状态：{login_status or '未知'}），请稍候…"}
        if not cookie:
            return {"status": "error", "message": "登录成功但未获取到站点 Cookie"}
        self._login_sessions.pop(token, None)
        self._cookie = cookie
        # 必须基于已保存配置合并，否则会用运行态默认值覆盖用户设置
        config = {**self._saved_config(), "cookie": cookie}
        self.update_config(config)
        self.init_plugin(config)
        logger.info(f"DDNSTO 自动续期：微信扫码登录成功，账号 {user.get('username')}")
        return {
            "status": "success",
            "message": "登录成功，Cookie 已自动保存",
            "cookie": cookie,
            "user": {"id": user.get("id"), "username": user.get("username") or ""},
        }
