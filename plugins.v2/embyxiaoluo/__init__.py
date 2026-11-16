#!/usr/bin/python3
# -*- coding: UTF-8 -*-
import json
import re
import html
import tempfile
from pathlib import Path
from urllib.parse import quote
import requests
import traceback
import threading
import time
import ipaddress
from datetime import datetime
from typing import Any, List, Dict, Tuple, Optional

from starlette.requests import Request

from app.core.config import settings
from app.log import logger
from app.plugins import _PluginBase
from app.schemas import WebhookEventInfo
from app.schemas.types import SystemConfigKey


def _truncate(text: str, limit: int) -> str:
    if not text:
        return ""
    return text[:limit] + "..." if len(text) > limit else text


GENRE_MAP = {
    "Action": "动作", "Adventure": "冒险", "Animation": "动画",
    "Comedy": "喜剧", "Crime": "犯罪", "Documentary": "纪录",
    "Drama": "剧情", "Family": "家庭", "Fantasy": "奇幻",
    "History": "历史", "Horror": "恐怖", "Music": "音乐",
    "Mystery": "悬疑", "Romance": "爱情", "Science Fiction": "科幻",
    "TV Movie": "电视电影", "Thriller": "惊悚", "War": "战争",
    "Western": "西部", "Action & Adventure": "动作冒险",
    "Kids": "儿童", "News": "新闻", "Reality": "真人秀",
    "Sci-Fi & Fantasy": "科幻奇幻", "Soap": "肥皂剧",
    "Talk": "脱口秀", "War & Politics": "战争政治",
}


class _EpisodeCache:
    CACHE_TIMEOUT = 30
    SEND_DEDUP_WINDOW = 300

    def __init__(self, send_callback):
        self.cache: Dict[str, List[dict]] = {}
        self.timers: Dict[str, threading.Timer] = {}
        self.lock = threading.Lock()
        self._sent_records: Dict[str, float] = {}
        self._send = send_callback

    def _cache_key(self, media: dict) -> Optional[str]:
        if not media.get("is_ep"):
            return None
        tmdb_id = media.get("tmdb_id") or media.get("item_name", "")
        return f"{tmdb_id}_{media.get('season_id', '')}"

    def _send_key(self, media: dict) -> str:
        if media.get("is_ep"):
            return f"ep_{media.get('tmdb_id', '')}_{media.get('season_id', '')}_{media.get('episode_id', '')}"
        return f"mov_{media.get('tmdb_id', '')}"

    def _is_recently_sent(self, key: str) -> bool:
        now = time.time()
        expired = [k for k, v in self._sent_records.items() if now - v > self.SEND_DEDUP_WINDOW]
        for k in expired:
            del self._sent_records[k]
        return key in self._sent_records

    def _record_sent(self, key: str):
        self._sent_records[key] = time.time()

    def add(self, media: dict):
        if not media.get("is_ep"):
            sk = self._send_key(media)
            if self._is_recently_sent(sk):
                logger.info(f"Emby入库通知 发送层拦截重复推送（电影）：{media.get('item_name')}")
                return
            self._send(media)
            self._record_sent(sk)
            return
        ck = self._cache_key(media)
        if not ck:
            self._send(media)
            return
        with self.lock:
            if ck in self.timers:
                self.timers[ck].cancel()
            if ck not in self.cache:
                self.cache[ck] = []
            existing_eps = [ep.get("episode_id") for ep in self.cache[ck]]
            if media.get("episode_id") in existing_eps:
                logger.info(
                    f"Emby入库通知 剧集已在缓存中：{media.get('item_name')} "
                    f"{media.get('episode_text') or ''}"
                )
            else:
                self.cache[ck].append(media)
                logger.info(
                    f"Emby入库通知 缓存剧集：{media.get('item_name')} "
                    f"{media.get('episode_text') or ''} "
                    f"(当前缓存 {len(self.cache[ck])} 集)"
                )
            timer = threading.Timer(self.CACHE_TIMEOUT, self._flush, args=[ck])
            timer.daemon = True
            timer.start()
            self.timers[ck] = timer

    def _flush(self, ck: str):
        with self.lock:
            episodes = self.cache.pop(ck, [])
            self.timers.pop(ck, None)
        if not episodes:
            return
        unique = {}
        for ep in episodes:
            ep_id = ep.get("episode_id")
            if ep_id not in unique:
                unique[ep_id] = ep
        episodes = sorted(unique.values(), key=lambda x: int(x.get("episode_id") or 0))
        if len(episodes) == 1:
            sk = self._send_key(episodes[0])
            if self._is_recently_sent(sk):
                logger.info(f"Emby入库通知 发送层拦截重复推送：{episodes[0].get('item_name')}")
                return
            self._send(episodes[0])
            self._record_sent(sk)
            return
        ep_ids = [int(ep.get("episode_id") or 0) for ep in episodes]
        is_continuous = all(ep_ids[i] + 1 == ep_ids[i + 1] for i in range(len(ep_ids) - 1))
        if is_continuous:
            ep_range = f"{ep_ids[0]}-{ep_ids[-1]}" if ep_ids[0] != ep_ids[-1] else str(ep_ids[0])
        else:
            ep_range = ",".join(str(e) for e in ep_ids)
        merged = episodes[0].copy()
        merged["episode_merged"] = True
        merged["episode_range"] = ep_range
        merged["episode_count"] = len(episodes)
        s = merged.get("season_id", "")
        merged["episode_text"] = f"第{s}季：第{ep_range}集（共{len(episodes)}集）"
        unsent = [ep for ep in episodes if not self._is_recently_sent(self._send_key(ep))]
        if not unsent:
            logger.info(f"Emby入库通知 发送层拦截重复推送：{merged.get('item_name')} 第{s}季：第{ep_range}集（全部已发送过）")
            return
        logger.info(f"Emby入库通知 合并发送 {len(episodes)} 集：{merged.get('item_name')} 第{s}季：第{ep_range}集")
        self._send(merged)
        for ep in episodes:
            self._record_sent(self._send_key(ep))


class embyxiaoluo(_PluginBase):
    plugin_name = "Emby 入库通知"
    plugin_desc = "监听 Emby / Jellyfin 的 Webhook，入库或删除媒体时按自定义模板推送到 Telegram 与飞书；封面与详情取自 Emby（原名/时长/类型/分类/评分），支持剧集合并与消息去重。"
    plugin_icon = "https://raw.githubusercontent.com/xiaoluo-mp/MoviePilot-Local-Plugins/main/plugins.v2/embyxiaoluo/logo.png?v=1.0.17"
    plugin_version = "1.0.20"
    plugin_author = "小罗"
    author_url = "https://github.com/xiaoluo-mp/MoviePilot-Local-Plugins"
    plugin_config_prefix = "embyxiaoluo_"
    plugin_order = 20
    auth_level = 1

    _enabled: bool = False
    _use_mp_tg: bool = False
    _mp_tg_channel: str = ""
    _use_mp_wx: bool = False
    _mp_wx_channel: str = ""
    _tg_bot_token: str = ""
    _tg_chat_id: str = ""
    _tg_api_host: str = ""
    _wx_corp_id: str = ""
    _wx_corp_secret: str = ""
    _wx_agent_id: str = ""
    _wx_user_id: str = "@all"
    _wx_proxy_url: str = ""
    _wx_no_proxy: bool = True
    _wx_msg_type: str = "news_notice"
    _bark_server: str = "https://api.day.app"
    _bark_keys: str = ""
    _enable_watch_link: bool = False
    _watch_link_type: str = "server"
    _link_redirect_prefix: str = ""
    _emby_server_url: str = ""
    _emby_api_key: str = ""
    _emby_server_name: str = ""
    _cover_strategy: str = "series_backdrop"
    _enable_tmdb: bool = True
    _dedup_window: int = 60
    _episode_cache_timeout: int = 30
    _enable_custom_template: bool = False
    _tg_template: str = ""
    _wx_title_template: str = ""
    _wx_body_template: str = ""
    _bark_title_template: str = ""
    _bark_body_template: str = ""
    # 飞书（本地改版新增）
    _tg_title_template: str = ""
    _tg_body_template: str = ""
    _tg_enabled: bool = True
    _feishu_enabled: bool = True
    _feishu_mode: str = "mp"
    _use_mp_feishu: bool = True
    _mp_feishu_channel: str = ""
    _feishu_app_id: str = ""
    _feishu_app_secret: str = ""
    _feishu_domain: str = ""
    _feishu_receive_id: str = ""
    _feishu_receive_id_type: str = "chat_id"
    _feishu_webhook: str = ""
    _feishu_card_color: str = "blue"
    _event_feishu_title_template: str = ""
    _event_feishu_body_template: str = ""
    _event_tg_title_template: str = ""
    _event_tg_body_template: str = ""
    _feishu_title_template: str = ""
    _feishu_body_template: str = ""
    _test_action: str = ""

    _episode_cache: Optional[_EpisodeCache] = None
    _message_fingerprints: Dict[str, float] = {}
    _tmdb_meta_cache: Dict[str, Tuple[float, dict]] = {}
    _fingerprint_lock: threading.Lock = None

    def init_plugin(self, config: dict = None):
        self._fingerprint_lock = threading.Lock()
        self._message_fingerprints = {}
        if not config:
            return
        self._enabled = config.get("enabled", False)
        self._use_mp_tg = config.get("use_mp_tg", False)
        self._mp_tg_channel = config.get("mp_tg_channel", "")
        self._use_mp_wx = config.get("use_mp_wx", False)
        self._mp_wx_channel = config.get("mp_wx_channel", "")
        self._tg_bot_token = config.get("tg_bot_token", "")
        self._tg_chat_id = config.get("tg_chat_id", "")
        self._tg_api_host = config.get("tg_api_host", "").rstrip("/")
        self._wx_corp_id = config.get("wx_corp_id", "")
        self._wx_corp_secret = config.get("wx_corp_secret", "")
        self._wx_agent_id = config.get("wx_agent_id", "")
        self._wx_user_id = config.get("wx_user_id", "@all")
        self._wx_proxy_url = config.get("wx_proxy_url", "").rstrip("/")
        self._wx_no_proxy = config.get("wx_no_proxy", True)
        self._wx_msg_type = config.get("wx_msg_type", "news_notice")
        self._bark_server = config.get("bark_server", "https://api.day.app").rstrip("/")
        self._bark_keys = config.get("bark_keys", "")
        self._enable_watch_link = config.get("enable_watch_link", False)
        self._watch_link_type = config.get("watch_link_type", "server")
        self._link_redirect_prefix = config.get("link_redirect_prefix", "").strip()
        self._emby_server_url = config.get("emby_server_url", "").rstrip("/")
        self._emby_server_name = str(config.get("emby_server_name") or "")
        self._cover_strategy = str(config.get("cover_strategy") or "series_backdrop")
        self._enable_tmdb = config.get("enable_tmdb", True)
        self._dedup_window = int(config.get("dedup_window") or 60)
        self._episode_cache_timeout = int(config.get("episode_cache_timeout") or 30)
        self._enable_custom_template = config.get("enable_custom_template", False)
        self._tg_title_template = config.get("tg_title_template") or self._default_tg_title_template()
        self._tg_body_template = config.get("tg_body_template") or self._default_tg_body_template()
        self._tg_enabled = bool(config.get("tg_enabled", True))
        self._feishu_enabled = bool(config.get("feishu_enabled", True))
        self._tg_template = self._tg_body_template  # 兼容旧键
        # 固定行为（界面上已移除这些开关，避免多余配置）
        self._enable_tmdb = True
        self._enable_watch_link = True
        self._watch_link_type = "server"
        self._link_redirect_prefix = ""
        self._enable_custom_template = True
        self._wx_title_template = config.get("wx_title_template") or self._default_wx_title_template()
        self._wx_body_template = config.get("wx_body_template") or self._default_wx_body_template()
        self._bark_title_template = config.get("bark_title_template") or self._default_bark_title_template()
        self._bark_body_template = config.get("bark_body_template") or self._default_bark_body_template()
        self._feishu_mode = str(config.get("feishu_mode") or "mp").lower()
        self._use_mp_feishu = bool(config.get("use_mp_feishu", True))
        self._mp_feishu_channel = config.get("mp_feishu_channel", "") or ""
        self._feishu_app_id = config.get("feishu_app_id", "") or ""
        self._feishu_app_secret = config.get("feishu_app_secret", "") or ""
        self._feishu_domain = (config.get("feishu_domain", "") or "").rstrip("/")
        self._feishu_receive_id = (config.get("feishu_receive_id", "") or "").strip()
        self._feishu_receive_id_type = config.get("feishu_receive_id_type", "") or "chat_id"
        self._feishu_webhook = (config.get("feishu_webhook", "") or "").strip()
        self._feishu_card_color = config.get("feishu_card_color", "") or "blue"
        self._event_feishu_title_template = config.get("event_feishu_title_template") or ""
        self._event_feishu_body_template = config.get("event_feishu_body_template") or ""
        self._event_tg_title_template = config.get("event_tg_title_template") or ""
        self._event_tg_body_template = config.get("event_tg_body_template") or ""
        self._feishu_title_template = config.get("feishu_title_template") or self._default_feishu_title_template()
        self._feishu_body_template = config.get("feishu_body_template") or self._default_feishu_body_template()
        self._test_action = str(config.get("test_action") or "")
        if self._test_action in ("movie", "tv", "both"):
            action = self._test_action
            self._test_action = ""
            # 先复位再执行：避免重载/重复保存时反复触发
            reset_payload = dict(config)
            reset_payload["test_action"] = ""
            self.update_config(reset_payload)
            threading.Thread(target=self._send_test_action, args=(action,), daemon=True).start()
        self._episode_cache = _EpisodeCache(self._send_all_channels)
        self._episode_cache.CACHE_TIMEOUT = self._episode_cache_timeout

    def _get_mp_notification_config(self, channel_type: str, channel_name: str) -> dict:
        """从 MP 内置通知配置中获取指定渠道的 config"""
        try:
            notifications = self.systemconfig.get(SystemConfigKey.Notifications) or []
            for n in notifications:
                if (n.get("type") == channel_type
                        and n.get("enabled")
                        and n.get("name") == channel_name):
                    return n.get("config", {})
        except Exception as e:
            logger.warning(f"Emby入库通知 读取 MP 通知配置失败：{e}")
        return {}

    # ==================== 飞书渠道（本地改版新增） ====================

    def _mp_feishu_config(self) -> dict:
        """读取 MP 里已启用的飞书通知渠道配置（未指定渠道时取第一个）。"""
        name = (self._mp_feishu_channel or "").strip()
        try:
            notifications = self.systemconfig.get(SystemConfigKey.Notifications) or []
            for n in notifications:
                if n.get("type") != "feishu" or not n.get("enabled"):
                    continue
                if name and n.get("name") != name:
                    continue
                return n.get("config", {}) or {}
        except Exception as e:
            logger.warning(f"Emby入库通知 读取 MP 飞书渠道配置失败：{e}")
        return {}

    @property
    def _effective_feishu_app_id(self) -> str:
        if self._use_mp_feishu:
            return str(self._mp_feishu_config().get("FEISHU_APP_ID") or "")
        return self._feishu_app_id

    @property
    def _effective_feishu_app_secret(self) -> str:
        if self._use_mp_feishu:
            return str(self._mp_feishu_config().get("FEISHU_APP_SECRET") or "")
        return self._feishu_app_secret

    @property
    def _effective_feishu_domain(self) -> str:
        domain = ""
        if self._use_mp_feishu:
            domain = str(self._mp_feishu_config().get("FEISHU_DOMAIN") or "")
        return (domain or self._feishu_domain or "https://open.feishu.cn").rstrip("/")

    def _feishu_candidates(self) -> List[Tuple[str, str]]:
        """按优先级返回接收者候选：手填 > MP 群聊 > MP 默认用户 > 管理员列表。

        飞书的 open_id/chat_id 都是**应用维度**的标识，换应用即失效；配置里还可能带首尾空格，
        带空格的 ID 会被飞书判为 99992351。这里统一 strip 并保留多个候选，逐个尝试。
        """
        candidates: List[Tuple[str, str]] = []
        manual = (self._feishu_receive_id or "").strip()
        if manual:
            candidates.append(((self._feishu_receive_id_type or "chat_id"), manual))
        cfg = self._mp_feishu_config() if self._use_mp_feishu else {}
        if cfg:
            chat_id = str(cfg.get("FEISHU_CHAT_ID") or "").strip()
            if chat_id:
                candidates.append(("chat_id", chat_id))
            open_id = str(cfg.get("FEISHU_OPEN_ID") or "").strip()
            if open_id:
                candidates.append(("open_id", open_id))
            for admin in str(cfg.get("FEISHU_ADMINS") or "").split(","):
                admin = admin.strip()
                if admin:
                    candidates.append(("open_id", admin))
        seen = set()
        unique: List[Tuple[str, str]] = []
        for item in candidates:
            if item in seen:
                continue
            seen.add(item)
            unique.append(item)
        return unique

    def _feishu_receiver(self) -> Tuple[str, str]:
        """返回首个接收者候选（(类型, ID)）。"""
        candidates = self._feishu_candidates()
        return candidates[0] if candidates else ("chat_id", "")

    @property
    def _feishu_configured(self) -> bool:
        if (self._feishu_mode or "mp").lower() == "webhook":
            return bool(self._feishu_webhook)
        if not (self._effective_feishu_app_id and self._effective_feishu_app_secret):
            return False
        return bool(self._feishu_receiver()[1])

    @property
    def _effective_tg_token(self) -> str:
        if self._use_mp_tg and self._mp_tg_channel:
            cfg = self._get_mp_notification_config("telegram", self._mp_tg_channel)
            return cfg.get("TELEGRAM_TOKEN", "")
        return self._tg_bot_token

    @property
    def _effective_tg_chat_id(self) -> str:
        if self._use_mp_tg and self._mp_tg_channel:
            cfg = self._get_mp_notification_config("telegram", self._mp_tg_channel)
            return cfg.get("TELEGRAM_CHAT_ID", "")
        return self._tg_chat_id

    @property
    def _effective_tg_api_host(self) -> str:
        if self._use_mp_tg and self._mp_tg_channel:
            cfg = self._get_mp_notification_config("telegram", self._mp_tg_channel)
            return cfg.get("API_URL", "") or "https://api.telegram.org"
        return self._tg_api_host or "https://api.telegram.org"

    @property
    def _effective_wx_corp_id(self) -> str:
        if self._use_mp_wx and self._mp_wx_channel:
            cfg = self._get_mp_notification_config("wechat", self._mp_wx_channel)
            return cfg.get("WECHAT_CORPID", "")
        return self._wx_corp_id

    @property
    def _effective_wx_corp_secret(self) -> str:
        if self._use_mp_wx and self._mp_wx_channel:
            cfg = self._get_mp_notification_config("wechat", self._mp_wx_channel)
            return cfg.get("WECHAT_APP_SECRET", "")
        return self._wx_corp_secret

    @property
    def _effective_wx_agent_id(self) -> str:
        if self._use_mp_wx and self._mp_wx_channel:
            cfg = self._get_mp_notification_config("wechat", self._mp_wx_channel)
            return cfg.get("WECHAT_APP_ID", "")
        return self._wx_agent_id

    @property
    def _effective_wx_proxy_url(self) -> str:
        if self._use_mp_wx and self._mp_wx_channel:
            cfg = self._get_mp_notification_config("wechat", self._mp_wx_channel)
            return cfg.get("WECHAT_PROXY", "") or "https://qyapi.weixin.qq.com"
        return self._wx_proxy_url or "https://qyapi.weixin.qq.com"

    @property
    def _effective_wx_user_id(self) -> str:
        if self._use_mp_wx and self._mp_wx_channel:
            cfg = self._get_mp_notification_config("wechat", self._mp_wx_channel)
            admins = cfg.get("WECHAT_ADMINS", "")
            if admins:
                return admins
        return self._wx_user_id or "@all"

    @property
    def _proxies(self) -> Optional[dict]:
        return getattr(settings, 'PROXY', None)

    @property
    def _wx_proxies(self) -> Optional[dict]:
        if self._wx_no_proxy:
            return None
        return self._proxies

    @property
    def _tmdb_api_key(self) -> str:
        return getattr(settings, 'TMDB_API_KEY', None) or ""

    @property
    def _tmdb_api_domain(self) -> str:
        return getattr(settings, 'TMDB_API_DOMAIN', None) or "api.themoviedb.org"

    @property
    def _tmdb_image_domain(self) -> str:
        return getattr(settings, 'TMDB_IMAGE_DOMAIN', None) or "image.tmdb.org"

    @staticmethod
    def _default_tg_template() -> str:
        return (
            "<b>{{server_name}} | {{status_text}}</b>\n\n"
            "<b>【{{item_name}}】</b>\n{{episode_text}}\n\n"
            "👥 主演：{{cast}}\n📺 类型：{{genres}}\n⭐ 评分：{{rating}}\n📅 日期：{{release_date}}\n\n"
            "📝 简介：\n<blockquote>{{overview}}</blockquote>\n\n"
            "▶️ 立即观看：{{play_url}}\nℹ️ 了解更多：{{tmdb_url}}"
        )

    @staticmethod
    def _default_tg_title_template() -> str:
        return "新剧来临啦"

    @staticmethod
    def _default_tg_body_template() -> str:
        return (
            "👀 标题：<b>{{item_name}}</b>\n"
            "📺 季集：{{episode_text}}\n"
            "🎬 影片信息\n"
            "📚 分类：{{library}}\n"
            "🎭 类型：{{genres}}\n"
            "⭐ 评分：{{rating}}\n"
            "📅 发行：{{release_date}}\n"
            "👥 主演：{{cast}}\n"
            "📝 简介：<blockquote>{{overview}}</blockquote>\n"
            "📖 来源信息\n"
            "🖥️ 服务器：{{server_name}}\n"
            "📁 文件：{{file_path}}\n"
            "🕐 入库时间：{{added_at}}\n"
            "🔗 TMDB: <a href=\"{{tmdb_url}}\">立即查询</a>\n"
        )

    @staticmethod
    def _default_wx_title_template() -> str:
        return "{{server_name}} | {{status_text}} | 【{{item_name}}】"

    @staticmethod
    def _default_wx_body_template() -> str:
        return (
            "{{episode_text}}\n"
            "👥 主演：{{cast}}\n📺 类型：{{genres}}\n⭐ 评分：{{rating}}\n📅 日期：{{release_date}}\n\n"
            "{{overview}}"
        )

    @staticmethod
    def _default_bark_title_template() -> str:
        return "{{server_name}} | {{status_text}}\n【{{item_name}}】"

    @staticmethod
    def _default_bark_body_template() -> str:
        return (
            "{{episode_text}}\n"
            "👥 {{cast}}\n📺 {{genres}}  ⭐ {{rating}}\n📅 {{release_date}}\n\n"
            "{{overview}}"
        )

    @staticmethod
    def _default_feishu_title_template() -> str:
        return " 有新片入库啦"

    @staticmethod
    def _default_feishu_body_template() -> str:
        return (
            "**👀标题：{{item_name}}**\n"
            " 📺 季集：{{episode_text}}\n"
            "**🎬 影片信息**\n"
            "📚 分类：{{library}}\n"
            "🎭 类型：{{genres}}\n"
            "⭐ 评分：{{rating}}\n"
            "📅 发行：{{release_date}}\n"
            "👥 主演：{{cast}}\n"
            "**📝 简介**：{{overview}}\n"
            "**📖 来源信息**\n"
            "🖥️ 服务器：{{server_name}}\n"
            "🕐 入库时间：{{added_at}}\n"
            "📁 文件：{{file_path}}\n"
            "🔗TMDB:[立即查询]({{tmdb_url}})\n"
        )

    def get_state(self) -> bool:
        return self._enabled

    @staticmethod
    def get_command() -> List[Dict[str, Any]]:
        return []

    def get_api(self) -> List[Dict[str, Any]]:
        apis: List[Dict[str, Any]] = [{
            "path": "/webhook",
            "endpoint": self._api_webhook,
            "methods": ["POST"],
            "summary": "Emby入库通知 Webhook",
            "description": "接收 Emby/Jellyfin Webhook 回调（支持 application/json）"
        }, {
            "path": "/mp_channels",
            "endpoint": self._api_mp_channels,
            "methods": ["GET"],
            "summary": "获取 MP 通知渠道列表",
            "description": "返回 MP 内置的 Telegram / 企业微信通知渠道名称"
        }, {
            "path": "/test/movie",
            "endpoint": self.api_test_movie,
            "methods": ["POST"],
            "summary": "发送电影测试通知",
            "description": "用固定的电影样本按当前模板发送一条测试通知"
        }, {
            "path": "/test/tv",
            "endpoint": self.api_test_tv,
            "methods": ["POST"],
            "summary": "发送电视剧测试通知",
            "description": "用固定的电视剧样本按当前模板发送一条测试通知"
        }, {
            "path": "/ui_config",
            "endpoint": self.api_ui_config,
            "methods": ["GET", "POST"],
            "summary": "读取/保存插件配置",
            "description": "供 Vue 设置页读取渠道列表与配置，并保存模板与渠道选择"
        }, {
            "path": "/presets",
            "endpoint": self.api_presets,
            "methods": ["GET", "POST"],
            "summary": "模板预设读写",
            "description": "读取、保存、删除自定义模板预设（按飞书/TG 分开）"
        }, {
            "path": "/sample",
            "endpoint": self.api_sample,
            "methods": ["GET", "POST"],
            "summary": "获取样例媒体数据",
            "description": "返回一条样例媒体字段，前端用它本地渲染模板预览"
        }, {
            "path": "/preview",
            "endpoint": self.api_preview,
            "methods": ["POST"],
            "summary": "按模板渲染样例预览",
            "description": "返回给定模板对样例媒体的渲染结果（标题/正文）"
        }, {
            "path": "/test_send",
            "endpoint": self.api_test_send,
            "methods": ["POST"],
            "summary": "向单个渠道发送测试消息",
            "description": "使用请求中携带的模板向 Telegram 或飞书发送样例通知"
        }]
        # 详情页/设置页由前端用登录态 JWT 调用；不声明 auth 时宿主按默认 apikey 注册，
        # 前端拿到 401 会被当成登录失效强制登出。声明 bear 后 JWT / X-API-KEY / apikey 都接受。
        for api in apis:
            api.setdefault("auth", "bear")
        return apis

    def _api_mp_channels(self):
        """返回 MP 已配置的通知渠道列表，供前端下拉框使用"""
        tg_channels = []
        wx_channels = []
        feishu_channels = []
        try:
            notifications = self.systemconfig.get(SystemConfigKey.Notifications) or []
            for n in notifications:
                if not n.get("enabled"):
                    continue
                name = n.get("name", "")
                if n.get("type") == "telegram" and name:
                    tg_channels.append(name)
                elif n.get("type") == "wechat" and name:
                    wx_channels.append(name)
                elif n.get("type") == "feishu" and name:
                    feishu_channels.append(name)
        except Exception as e:
            logger.warning(f"Emby入库通知 获取 MP 通知渠道失败：{e}")
        return {"telegram": tg_channels, "wechat": wx_channels, "feishu": feishu_channels}

    def _preprocess_jellyfin(self, message: dict) -> dict:
        """将 Jellyfin Webhook 格式转换为 Emby 格式"""
        if "NotificationType" not in message:
            return message
        ntype = message.get("NotificationType", "")
        if ntype != "ItemAdded" or message.get("ItemType") not in ("Movie", "Episode"):
            if ntype == "NotificationTest":
                return {
                    "Event": "system.notificationtest",
                    "Server": {"Name": message.get("ServerName", ""), "Type": "Jellyfin"},
                }
            event_map = {
                "PlaybackStart": "playback.start",
                "PlaybackStop": "playback.stop",
                "PlaybackProgress": "playback.progress",
                "UserCreated": "user.created",
                "UserDeleted": "user.deleted",
                "UserUpdated": "user.updated",
                "ItemRemoved": "library.deleted",
                "TaskCompleted": "task.completed",
            }
            mapped = event_map.get(ntype)
            if not mapped:
                return {}
            return {
                "Event": mapped,
                "Server": {"Name": message.get("ServerName", ""), "Type": "Jellyfin"},
                "Item": {
                    "Type": message.get("ItemType") or "",
                    "Name": message.get("Name") or message.get("SeriesName") or "",
                    "Id": message.get("ItemId") or "",
                    "SeriesName": message.get("SeriesName") or "",
                    "IndexNumber": message.get("EpisodeNumber"),
                    "ParentIndexNumber": message.get("SeasonNumber"),
                },
                "Session": {
                    "RemoteEndPoint": message.get("RemoteEndPoint") or "",
                    "DeviceName": message.get("DeviceName") or "",
                    "Client": message.get("ClientName") or message.get("Client") or "",
                },
                "User": {"Name": message.get("UserName") or message.get("NotificationUsername") or ""},
            }
        result = {
            "Event": "library.new",
            "Item": {"ProviderIds": {}},
            "Server": {
                "Name": message.get("ServerName", ""),
                "Type": "Jellyfin",
                "Url": message.get("ServerUrl", ""),
            },
        }
        item = result["Item"]
        if message.get("ItemType") == "Movie":
            item["Type"] = "Movie"
            item["Name"] = message.get("Name", "")
        else:
            item["Type"] = "Episode"
            item["SeriesName"] = message.get("SeriesName", "")
            item["IndexNumber"] = message.get("EpisodeNumber")
            item["ParentIndexNumber"] = message.get("SeasonNumber")
        item["Id"] = message.get("ItemId", "")
        item["PremiereDate"] = str(message.get("Year", ""))
        if message.get("Provider_tmdb"):
            item["ProviderIds"]["Tmdb"] = message["Provider_tmdb"]
        if message.get("Provider_tvdb"):
            item["ProviderIds"]["Tvdb"] = message["Provider_tvdb"]
        return result

    def _parse_emby_json(self, message: dict) -> Optional[tuple]:
        """解析 Emby JSON 格式的 Webhook 报文，返回 (WebhookEventInfo, server_name, premiere_year)"""
        event_type = message.get("Event")
        if not event_type:
            return None
        event_info = WebhookEventInfo(event=event_type, channel="emby")
        # 提取服务器名称
        server_name = ""
        server_obj = message.get("Server")
        if server_obj and isinstance(server_obj, dict):
            server_name = server_obj.get("Name") or ""
        premiere_year = ""
        item = message.get("Item")
        if item:
            item_type_raw = item.get("Type")
            if item_type_raw in ("Episode", "Series", "Season"):
                event_info.item_type = "TV"
                series_name = item.get("SeriesName") or item.get("Name") or ""
                s = item.get("ParentIndexNumber")
                e = item.get("IndexNumber")
                event_info.item_name = series_name
                event_info.item_id = item.get("SeriesId") or item.get("Id")
                event_info.season_id = str(s) if s else None
                event_info.episode_id = str(e) if e else None
            elif item_type_raw == "Audio":
                event_info.item_type = "AUD"
                event_info.item_name = item.get("Album") or item.get("Name")
                event_info.item_id = item.get("AlbumId") or item.get("Id")
            else:
                event_info.item_type = "MOV"
                event_info.item_name = item.get("Name", "")
                event_info.item_id = item.get("Id")
            event_info.item_path = item.get("Path")
            event_info.tmdb_id = item.get("ProviderIds", {}).get("Tmdb")
            event_info.overview = item.get("Overview") or ""
            # 媒体库分类：Emby 用 LibraryName / CollectionName，Plex 用 librarySectionTitle
            library_name = (
                item.get("LibraryName") or item.get("CollectionName")
                or item.get("librarySectionTitle") or ""
            )
            if library_name:
                event_info.json_object = {
                    **(event_info.json_object or {}), "library": library_name
                }
            # 提取年份用于 TMDB 搜索
            premiere = item.get("PremiereDate") or ""
            if premiere:
                try:
                    if premiere.isdigit():
                        premiere_year = premiere
                    else:
                        premiere_year = str(datetime.fromisoformat(
                            premiere.replace("Z", "+00:00")
                        ).year)
                except Exception:
                    pass
        if message.get("Session"):
            event_info.ip = message["Session"].get("RemoteEndPoint")
            event_info.device_name = message["Session"].get("DeviceName")
            event_info.client = message["Session"].get("Client")
        if message.get("User"):
            event_info.user_name = message["User"].get("Name")
        # 播放进度（Emby 播放事件带 PlaybackInfo）
        try:
            playback = message.get("PlaybackInfo") or {}
            position = playback.get("PositionTicks")
            total = (message.get("Item") or {}).get("RunTimeTicks")
            if position is not None and total:
                event_info.percentage = round(float(position) / float(total) * 100, 1)
        except (TypeError, ValueError, ZeroDivisionError):
            pass
        return (event_info, server_name, premiere_year)

    async def _api_webhook(self, request: Request):
        """独立 API 端点：接收 Emby/Jellyfin Webhook（application/json）"""
        try:
            body = await request.body()
            message = json.loads(body) if body else {}
        except Exception as e:
            logger.warning(f"Emby入库通知 API 解析请求体失败：{e}")
            return {"success": False, "message": str(e)}
        if not message:
            return {"success": False, "message": "空请求"}
        logger.debug(f"Emby入库通知 API 收到 webhook：{message.get('Event') or message.get('NotificationType')}")
        message = self._preprocess_jellyfin(message)
        if not message:
            return {"success": True, "message": "无法识别的事件"}
        result = self._parse_emby_json(message)
        if not result:
            return {"success": True, "message": "无法识别的事件"}
        event_info, server_name, premiere_year = result
        if not self._enabled:
            return {"success": True, "message": "插件未启用"}
        try:
            if event_info.event in ("system.webhooktest", "system.notificationtest"):
                self._send_test_notification(event_info, server_name=server_name)
            elif event_info.event in ("library.new", "ItemAdded"):
                if event_info.item_type in ("MOV", "TV", "SHOW", "Episode", "Movie"):
                    # 跳过 Series/Season 级别事件（无季集信息），只处理 Episode 级别
                    if event_info.item_type in ("TV", "SHOW", "Episode") and not event_info.season_id and not event_info.episode_id:
                        logger.debug(f"Emby入库通知 跳过无季集信息的 TV 事件：{event_info.item_name}")
                        return {"success": True, "message": "skipped series/season level event"}
                    if not self._check_dedup(event_info):
                        self._dispatch(event_info, server_name=server_name, premiere_year=premiere_year)
            elif event_info.event in (
                "library.deleted", "library.removed", "item.deleted",
                "item.removed", "ItemRemoved", "ItemDeleted",
            ):
                self._dispatch_deleted(event_info, server_name=server_name)
            elif event_info.event:
                # 其余事件（播放/暂停/用户/系统/任务等）走通用事件通知
                self._dispatch_event(event_info, server_name=server_name)
        except Exception as e:
            logger.error(f"Emby入库通知 API 处理事件失败：{e}\n{traceback.format_exc()}")
            return {"success": False, "message": str(e)}
        return {"success": True}

    def stop_service(self):
        pass

    def _tmdb_request(self, path: str) -> Optional[dict]:
        if not self._tmdb_api_key:
            return None
        try:
            url = f"https://{self._tmdb_api_domain}/3{path}"
            sep = "&" if "?" in path else "?"
            url += f"{sep}api_key={self._tmdb_api_key}&language=zh-CN"
            resp = requests.get(url, timeout=10, proxies=self._proxies)
            if resp.status_code == 200:
                return resp.json()
            logger.warning(f"Emby入库通知 TMDB API {path} 返回 {resp.status_code}")
        except Exception as e:
            logger.warning(f"Emby入库通知 TMDB API 请求失败：{e}")
        return None

    @staticmethod
    def _size_from_bytes(data: bytes) -> Optional[Tuple[int, int]]:
        """从 PNG / JPEG / WebP 字节里读出宽高，用于判断横竖版。"""
        try:
            if data[:8] == b"\x89PNG\r\n\x1a\n":
                return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
            if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
                fmt = data[12:16]
                if fmt == b"VP8X":
                    return (int.from_bytes(data[24:27], "little") + 1,
                            int.from_bytes(data[27:30], "little") + 1)
                if fmt == b"VP8 ":
                    return (int.from_bytes(data[26:28], "little") & 0x3FFF,
                            int.from_bytes(data[28:30], "little") & 0x3FFF)
                if fmt == b"VP8L":
                    bits = int.from_bytes(data[21:25], "little")
                    return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
            if data[:2] == b"\xff\xd8":
                i, n = 2, len(data)
                while i < n - 9:
                    if data[i] != 0xFF:
                        i += 1
                        continue
                    marker = data[i + 1]
                    if marker == 0xFF:
                        i += 1
                        continue
                    if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
                        i += 2
                        continue
                    seg_len = int.from_bytes(data[i + 2:i + 4], "big")
                    if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                                  0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                        return (int.from_bytes(data[i + 7:i + 9], "big"),
                                int.from_bytes(data[i + 5:i + 7], "big"))
                    i += 2 + seg_len
        except Exception:  # pylint: disable=broad-except
            return None
        return None

    def _image_size(self, url: str) -> Optional[Tuple[int, int]]:
        """下载图片并返回 (宽, 高)；失败返回 None（不阻塞发送）。"""
        if not url or not url.startswith(("http://", "https://")):
            return None
        try:
            res = requests.get(url, timeout=15, proxies=self._proxies)
            if res.status_code != 200 or not res.content:
                return None
            return self._size_from_bytes(res.content)
        except Exception:  # pylint: disable=broad-except
            return None

    def _tmdb_image_url(self, path: str, size: str = "w500") -> str:
        if not path:
            return ""
        return f"https://{self._tmdb_image_domain}/t/p/{size}{path}"

    def _search_tmdb_id(self, name: str, media_type: str, year: str = "") -> str:
        """当 ProviderIds 无 Tmdb 时，按名称搜索 TMDB 获取 ID"""
        if not self._tmdb_api_key or not name:
            return ""
        search_type = "tv" if media_type in ("TV", "SHOW", "Episode") else "movie"
        path = f"/search/{search_type}?query={name}&page=1"
        if year:
            path += f"&year={year}"
        data = self._tmdb_request(path)
        if data and data.get("results"):
            first = data["results"][0]
            tmdb_id = str(first.get("id", ""))
            title = first.get("name") or first.get("title") or name
            logger.info(f"Emby入库通知 TMDB 搜索到：{title} (ID: {tmdb_id})")
            return tmdb_id
        logger.warning(f"Emby入库通知 TMDB 搜索无结果：{name} ({year})")
        return ""

    def _fetch_tmdb_metadata(self, tmdb_id: str, is_ep: bool,
                              season_id: Optional[str] = None,
                              episode_id: Optional[str] = None) -> dict:
        meta = {
            "genres": "", "cast": "", "rating": "",
            "release_date": "", "poster_url": "",
            "backdrop_url": "", "still_url": "", "overview_tmdb": "",
        }
        if not tmdb_id or not self._enable_tmdb or not self._tmdb_api_key:
            return meta
        try:
            if is_ep:
                self._fetch_tv_metadata(tmdb_id, season_id, episode_id, meta)
            else:
                self._fetch_movie_metadata(tmdb_id, meta)
        except Exception as e:
            logger.warning(f"Emby入库通知 TMDB 元数据获取失败：{e}")
        has_fields = [k for k, v in meta.items() if v]
        logger.info(f"Emby入库通知 TMDB 元数据 (ID={tmdb_id})：{', '.join(has_fields) if has_fields else '无数据'}")
        return meta

    def _fetch_movie_metadata(self, tmdb_id: str, meta: dict):
        data = self._tmdb_request(f"/movie/{tmdb_id}")
        if data:
            meta["rating"] = str(data.get("vote_average", ""))
            meta["release_date"] = data.get("release_date", "")
            meta["overview_tmdb"] = data.get("overview", "")
            genres = data.get("genres", [])
            if genres:
                meta["genres"] = ", ".join(GENRE_MAP.get(g["name"], g["name"]) for g in genres[:3])
            if data.get("poster_path"):
                meta["poster_url"] = self._tmdb_image_url(data["poster_path"])
            if data.get("backdrop_path"):
                meta["backdrop_url"] = self._tmdb_image_url(data["backdrop_path"])
        credits = self._tmdb_request(f"/movie/{tmdb_id}/credits")
        if credits and credits.get("cast"):
            meta["cast"] = ", ".join(a["name"] for a in credits["cast"][:5])

    def _fetch_tv_metadata(self, tmdb_id: str, season_id: Optional[str],
                            episode_id: Optional[str], meta: dict):
        tv = self._tmdb_request(f"/tv/{tmdb_id}")
        if tv:
            meta["rating"] = str(tv.get("vote_average", ""))
            meta["release_date"] = tv.get("first_air_date", "")
            if not meta.get("overview_tmdb"):
                meta["overview_tmdb"] = tv.get("overview", "")
            genres = tv.get("genres", [])
            if genres:
                meta["genres"] = ", ".join(GENRE_MAP.get(g["name"], g["name"]) for g in genres[:3])
            if tv.get("poster_path"):
                meta["poster_url"] = self._tmdb_image_url(tv["poster_path"])
            if tv.get("backdrop_path"):
                meta["backdrop_url"] = self._tmdb_image_url(tv["backdrop_path"])
        credits = self._tmdb_request(f"/tv/{tmdb_id}/credits")
        if credits and credits.get("cast"):
            meta["cast"] = ", ".join(a["name"] for a in credits["cast"][:5])
        # 获取季度海报（降级到剧集主海报）
        if season_id:
            try:
                s = int(season_id)
                season_data = self._tmdb_request(f"/tv/{tmdb_id}/season/{s}")
                if season_data and season_data.get("poster_path"):
                    meta["poster_url"] = self._tmdb_image_url(season_data["poster_path"])
                if season_data and not meta.get("release_date") and season_data.get("air_date"):
                    meta["release_date"] = season_data["air_date"]
            except (ValueError, TypeError):
                pass
        if season_id and episode_id:
            try:
                s, e = int(season_id), int(episode_id)
                ep_data = self._tmdb_request(f"/tv/{tmdb_id}/season/{s}/episode/{e}")
                if ep_data:
                    if ep_data.get("air_date"):
                        meta["release_date"] = ep_data["air_date"]
                    if ep_data.get("overview"):
                        meta["overview_tmdb"] = ep_data["overview"]
                    if ep_data.get("still_path"):
                        meta["still_url"] = self._tmdb_image_url(ep_data["still_path"])
            except (ValueError, TypeError):
                pass

    def _check_dedup(self, info: WebhookEventInfo) -> bool:
        is_ep = info.item_type in ("TV", "SHOW", "Episode")
        tmdb_id = info.tmdb_id or ""
        if info.item_type in ("MOV", "Movie"):
            media_id = tmdb_id or info.item_name or ""
            fingerprint = f"movie_{media_id}"
        elif is_ep:
            series = info.item_name or ""
            fingerprint = f"episode_{series}_{info.season_id or ''}_{info.episode_id or ''}"
        else:
            fingerprint = f"other_{info.item_name or ''}_{info.item_id or ''}"
        now = time.time()
        with self._fingerprint_lock:
            expired = [k for k, v in self._message_fingerprints.items() if now - v > self._dedup_window]
            for k in expired:
                del self._message_fingerprints[k]
            if fingerprint in self._message_fingerprints:
                elapsed = now - self._message_fingerprints[fingerprint]
                logger.info(f"Emby入库通知 跳过重复消息（{elapsed:.1f}秒前已处理）：{info.item_name}")
                return True
            self._message_fingerprints[fingerprint] = now
        return False

    def _send_test_notification(self, info: WebhookEventInfo, server_name: str = ""):
        display_name = server_name or (info.channel.upper() if info.channel else "MediaServer")
        media = {
            "item_name": "Webhook 连通性测试", "item_type": "MOV", "is_ep": False,
            "status_text": "测试通知", "episode_text": "",
            "overview": "这是一条来自 Emby 入库通知的测试消息，说明 Webhook 通道已正常连通。",
            "image_url": "", "server_name": display_name, "channel": info.channel or "",
            "play_url": "", "tmdb_url": "", "tmdb_id": "",
            "season_id": None, "episode_id": None,
            "genres": "", "cast": "", "rating": "",
            "release_date": "", "poster_url": "", "backdrop_url": "", "still_url": "",
        }
        self._send_all_channels(media)
        logger.info("Emby入库通知 已响应 Webhook 测试通知")

    # ==================== Emby API 详情补全（合并 EmbyNotify） ====================

    def _emby_servers(self) -> List[str]:
        """返回 MP 里已启用的 Emby 服务器名称（供前端选择封面/详情来源）。"""
        names: List[str] = []
        try:
            for server in (self.systemconfig.get(SystemConfigKey.MediaServers) or []):
                if server.get("type") == "emby" and server.get("enabled"):
                    name = str(server.get("name") or "").strip()
                    if name:
                        names.append(name)
        except Exception:  # pylint: disable=broad-except
            pass
        return names

    @property
    def _emby_credentials(self) -> Tuple[str, str]:
        """从 MP 媒体服务器配置里取 Emby 地址与 API Key（缺省回退插件字段）。"""
        try:
            servers = list(self.systemconfig.get(SystemConfigKey.MediaServers) or [])
            wanted = (self._emby_server_name or "").strip()
            if wanted:
                servers = [s for s in servers if s.get("name") == wanted] + [
                    s for s in servers if s.get("name") != wanted
                ]
            for server in servers:
                if server.get("type") != "emby" or not server.get("enabled"):
                    continue
                cfg = server.get("config") or {}
                host = str(cfg.get("host") or "").rstrip("/")
                apikey = str(cfg.get("apikey") or "")
                if host and apikey:
                    return host, apikey
        except Exception as e:  # pylint: disable=broad-except
            logger.warning(f"EmbyNotify 读取 MP 媒体服务器配置失败：{e}")
        return (self._emby_server_url or "").rstrip("/"), self._emby_api_key

    def _fetch_emby_item(self, item_id: str) -> dict:
        """用 Emby API 读取条目详情（原名 / 时长 / 类型 / 年份 / 评分 / 分类 / 简介）。"""
        if not item_id:
            return {}
        host, apikey = self._emby_credentials
        if not (host and apikey):
            return {}
        uid = self._emby_user_id(host, apikey)
        urls = []
        if uid:
            urls.append(f"{host}/Users/{uid}/Items/{item_id}")
        urls.append(f"{host}/Items/{item_id}")
        for url in urls:
            try:
                res = requests.get(
                    url,
                    params={
                        "api_key": apikey,
                        "Fields": "Overview,Genres,OriginalTitle,ProductionYear,PremiereDate,"
                                  "CommunityRating,RunTimeTicks,Path,CollectionName,SeriesName,"
                                  "ImageTags,BackdropImageTags,ParentBackdropItemId,ParentBackdropImageTags",
                    },
                    timeout=10,
                )
                if res.status_code == 200:
                    return res.json() or {}
                logger.debug(f"EmbyNotify Emby 详情请求 {url} 返回 HTTP {res.status_code}")
            except Exception as e:  # pylint: disable=broad-except
                logger.warning(f"EmbyNotify Emby 详情请求异常：{e}")
        logger.warning(f"EmbyNotify Emby 详情请求失败：{item_id}")
        return {}

    def _emby_user_id(self, host: str, apikey: str) -> str:
        """取 Emby 管理员用户 ID（Emby 4.x 的条目详情需要 /Users/{id}/Items/{itemId}）。"""
        cached = getattr(self, "_emby_uid_cache", None)
        if cached and cached[0] == host:
            return cached[1]
        uid = ""
        try:
            users = requests.get(f"{host}/Users", params={"api_key": apikey}, timeout=10).json() or []
            for user in users:
                if (user.get("Policy") or {}).get("IsAdministrator"):
                    uid = str(user.get("Id") or "")
                    break
            if not uid and users:
                uid = str(users[0].get("Id") or "")
        except Exception as e:  # pylint: disable=broad-except
            logger.debug(f"EmbyNotify 获取 Emby 用户列表失败：{e}")
        self._emby_uid_cache = (host, uid)
        return uid

    @staticmethod
    def _format_duration(ticks) -> str:
        """Emby RunTimeTicks → 分钟数。"""
        try:
            value = float(ticks)
        except (TypeError, ValueError):
            return ""
        if value <= 0:
            return ""
        return str(int(round(value / 600000000)))

    @staticmethod
    def _default_deleted_feishu_title() -> str:
        return "🗑 媒体已删除"

    @staticmethod
    def _default_deleted_feishu_body() -> str:
        return (
            "**删除条目**\n"
            "标题：{{item_name}}\n"
            "{{episode_text}}\n"
            "原名：{{original_title}}\n\n"
            "**来源信息**\n"
            "服务器：{{server_name}}\n"
            "文件：{{file_path}}\n"
            "删除时间：{{added_at}}"
        )

    @staticmethod
    def _default_deleted_tg_template() -> str:
        return (
            "🗑 <b>媒体已删除</b>\n\n"
            "<b>{{item_name}}</b>\n{{episode_text}}\n"
            "原名：{{original_title}}\n\n"
            "🖥️ 服务器：{{server_name}}\n"
            "📁 文件：{{file_path}}\n"
            "🕐 删除时间：{{added_at}}"
        )

    def _send_telegram_text(self, media: dict) -> None:
        """发送纯文本 Telegram 消息（删除通知用，不带封面）。"""
        token = self._effective_tg_token
        chat_id = self._effective_tg_chat_id
        if not (token and chat_id):
            return
        text = self._render_template(self._default_deleted_tg_template(), media, escape_html=True)
        try:
            res = requests.post(
                f"{self._effective_tg_api_host}/bot{token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
                timeout=15,
                proxies=self._proxies,
            )
            if res.status_code == 200:
                logger.info(f"EmbyNotify Telegram 删除通知发送成功：{media.get('item_name', '')}")
            else:
                logger.error(f"EmbyNotify Telegram 删除通知发送失败：{res.status_code} {res.text[:120]}")
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"EmbyNotify Telegram 删除通知异常：{e}")

    EVENT_TEXTS: Dict[str, str] = {
        "playback.start": "开始播放",
        "playback.pause": "暂停播放",
        "playback.unpause": "继续播放",
        "playback.stop": "停止播放",
        "playback.progress": "播放进度",
        "PlaybackStart": "开始播放",
        "PlaybackStop": "停止播放",
        "library.new": "新媒体入库",
        "library.deleted": "媒体已删除",
        "system.updateavailable": "有可用更新",
        "system.serverrestartrequired": "需要重启服务",
        "system.webhooktest": "Webhook 连通性测试",
        "system.notificationtest": "通知测试",
        "user.created": "新增用户",
        "user.deleted": "删除用户",
        "user.updated": "用户信息更新",
        "UserCreated": "新增用户",
        "UserDeleted": "删除用户",
        "UserUpdated": "用户信息更新",
        "task.completed": "任务完成",
        "series.added": "新增剧集",
        "season.added": "新增季",
        "episode.added": "新增单集",
    }

    @staticmethod
    def _ip_label(ip: str) -> str:
        """给 IP 加「本地局域网 / 公网」标识。"""
        raw = str(ip or "").strip()
        if not raw:
            return ""
        host = raw
        if host.count(":") == 1:
            host = host.split(":")[0]
        try:
            addr = ipaddress.ip_address(host)
        except ValueError:
            return raw
        if addr.is_private or addr.is_loopback or addr.is_link_local:
            return f"{host} 本地局域网"
        return f"{host} 公网"

    def _fetch_tmdb_meta_cached(self, tmdb_id: str, is_ep: bool) -> dict:
        """带 1 小时内存缓存的 TMDB 元数据，避免播放通知反复请求。"""
        if not tmdb_id:
            return {}
        now = time.time()
        hit = self._tmdb_meta_cache.get(str(tmdb_id))
        if hit and now - hit[0] < 3600:
            return hit[1]
        meta = self._fetch_tmdb_metadata(str(tmdb_id), bool(is_ep), None, None) or {}
        self._tmdb_meta_cache[str(tmdb_id)] = (now, meta)
        if len(self._tmdb_meta_cache) > 200:
            self._tmdb_meta_cache = dict(list(self._tmdb_meta_cache.items())[-100:])
        return meta

    @classmethod
    def _event_text(cls, event: str) -> str:
        """事件名转成可读中文，未知事件原样显示。"""
        return cls.EVENT_TEXTS.get(str(event or ""), str(event or "事件通知"))

    @staticmethod
    def _default_event_feishu_title_template() -> str:
        return "📢 {{event_text}} · {{item_name}}"

    @staticmethod
    def _default_event_feishu_body_template() -> str:
        return (
            "📺 条目：{{item_name}}{{episode_text}}\n"
            "👤 用户：{{user_name}}\n"
            "🖥️ 设备：{{device_name}}\n"
            "🌐 IP：{{ip_text}}\n"
            "⏱️ 进度：{{progress}}\n"
            "📝 剧情：{{overview}}\n"
            "🕐 时间：{{added_at}}"
        )

    @staticmethod
    def _default_event_tg_title_template() -> str:
        return "📢 <b>{{event_text}}</b> · {{item_name}}"

    @staticmethod
    def _default_event_tg_body_template() -> str:
        return (
            "📺 {{item_name}}{{episode_text}}\n"
            "👤 用户：{{user_name}}\n"
            "🖥️ 设备：{{device_name}}\n"
            "🌐 IP：{{ip_text}}\n"
            "⏱️ 进度：{{progress}}\n"
            "📝 剧情：{{overview}}\n"
            "🕐 时间：{{added_at}}"
        )

    def _dispatch_event(self, info: WebhookEventInfo, server_name: str = "") -> None:
        """通用事件通知：Emby 里勾选的事件都按这里推送。"""
        event = str(info.event or "")
        if not event:
            return
        # 播放类事件很频繁，同一事件 + 条目 + 用户在去重窗口内只发一次
        key = f"event|{event}|{info.item_id or ''}|{info.user_name or ''}"
        now = time.time()
        window = max(int(self._dedup_window or 0), 5)
        last = self._message_fingerprints.get(key)
        if last and now - last < window:
            logger.debug(f"Emby入库通知 跳过重复事件：{event} {info.item_name}")
            return
        self._message_fingerprints[key] = now
        if len(self._message_fingerprints) > 500:
            cutoff = now - 3600
            self._message_fingerprints = {
                k: v for k, v in self._message_fingerprints.items() if v >= cutoff
            }
        episode_text = ""
        if info.item_type in ("TV", "SHOW", "Episode") and info.season_id and info.episode_id:
            episode_text = f" 第{info.season_id}季第{info.episode_id}集"
        pct = getattr(info, "percentage", None)
        is_ep = info.item_type in ("TV", "SHOW", "Episode")
        # 补全条目信息：简介、海报（与入库通知一致的取图优先级）
        emby_item = self._fetch_emby_item(info.item_id or "") if info.item_id else {}
        overview = info.overview or str(emby_item.get("Overview") or "")
        tmdb_id = str(info.tmdb_id or (emby_item.get("ProviderIds") or {}).get("Tmdb") or "")
        base = self._emby_base()
        _, apikey = self._emby_credentials
        image_url = ""
        tmdb_meta: dict = {}
        if base and apikey and info.item_id:
            tags = emby_item.get("ImageTags") or {}
            bd_tags = emby_item.get("BackdropImageTags") or []
            bd_item_id = info.item_id
            if not bd_tags and is_ep and emby_item.get("ParentBackdropItemId") and emby_item.get("ParentBackdropImageTags"):
                bd_item_id = str(emby_item.get("ParentBackdropItemId"))
                bd_tags = emby_item.get("ParentBackdropImageTags") or []
            if bd_tags:
                image_url = f"{base}/Items/{bd_item_id}/Images/Backdrop/0?maxWidth=1920&api_key={apikey}"
            elif tags.get("Primary"):
                image_url = f"{base}/Items/{info.item_id}/Images/Primary?maxWidth=1280&api_key={apikey}"
        if (not overview or not image_url) and tmdb_id:
            tmdb_meta = self._fetch_tmdb_meta_cached(tmdb_id, is_ep)
            overview = overview or tmdb_meta.get("overview_tmdb", "")
            image_url = image_url or tmdb_meta.get("backdrop_url") or tmdb_meta.get("poster_url") or ""
        tmdb_url = (
            f"https://www.themoviedb.org/{'tv' if is_ep else 'movie'}/{tmdb_id}?language=zh-CN"
            if tmdb_id else ""
        )
        media = {
            "event": event,
            "event_text": self._event_text(event),
            "item_name": info.item_name or "",
            "item_type": info.item_type or "",
            "is_ep": is_ep,
            "episode_text": episode_text,
            "season_id": info.season_id,
            "episode_id": info.episode_id,
            "overview": overview,
            "image_url": image_url,
            "server_name": server_name or (str(info.channel or "").upper() or "MediaServer"),
            "user_name": info.user_name or "",
            "device_name": info.device_name or "",
            "client": info.client or "",
            "ip": info.ip or "",
            "ip_text": self._ip_label(info.ip or ""),
            "progress": (f"{pct:g}%" if isinstance(pct, (int, float)) else ""),
            "added_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "file_path": info.item_path or str(emby_item.get("Path") or ""),
            "detail_url": self._build_detail_url(info),
            "play_url": self._build_play_url(info),
            "tmdb_url": tmdb_url,
            "tmdb_id": tmdb_id,
            "channel": info.channel or "",
        }
        logger.info(
            f"Emby入库通知 事件通知：{media['event_text']} · {media['item_name']}"
            f"｜封面：{'有' if media.get('image_url') else '无'}"
            f"｜剧情：{'有' if media.get('overview') else '无'}"
        )
        if self._feishu_enabled and self._feishu_configured:
            title = self._render_template(
                self._event_feishu_title_template or self._default_event_feishu_title_template(), media
            ).strip()
            body = self._tidy_feishu_body(self._render_template(
                self._event_feishu_body_template or self._default_event_feishu_body_template(), media
            ))
            if (self._feishu_mode or "mp").lower() == "webhook":
                self._send_feishu_webhook(title, body, media)
            else:
                self._send_feishu_app(title, body, media, use_image=bool(media.get("image_url")))
        if self._tg_enabled and self._effective_tg_token and self._effective_tg_chat_id:
            title = self._render_template(
                self._event_tg_title_template or self._default_event_tg_title_template(), media, escape_html=True
            ).strip()
            body = self._render_template(
                self._event_tg_body_template or self._default_event_tg_body_template(), media, escape_html=True
            ).strip()
            self._send_tg_text(title, body, media)

    def _send_tg_text(self, title: str, body: str, media: dict) -> None:
        """发送 TG 事件通知：有封面就发图配文，没有就发纯文字。"""
        token = self._effective_tg_token
        chat_id = self._effective_tg_chat_id
        if not (token and chat_id):
            return
        api = self._effective_tg_api_host
        text = f"{title}\n\n{body}".strip()
        photo = str(media.get("image_url") or "")
        name = media.get("item_name") or media.get("event_text") or ""
        try:
            resp = None
            if photo:
                image_bytes = None
                for kwargs in ({}, {"proxies": self._proxies}):
                    try:
                        img = requests.get(photo, timeout=20, **kwargs)
                        if img.status_code == 200 and img.content:
                            image_bytes = img.content
                            break
                    except Exception:  # pylint: disable=broad-except
                        continue
                if image_bytes:
                    resp = requests.post(
                        f"{api}/bot{token}/sendPhoto",
                        data={"chat_id": str(chat_id), "parse_mode": "HTML", "caption": text[:1000]},
                        files={"photo": ("cover.jpg", image_bytes, "image/jpeg")},
                        timeout=30, proxies=self._proxies,
                    )
                else:
                    resp = requests.post(
                        f"{api}/bot{token}/sendPhoto",
                        json={"chat_id": chat_id, "photo": photo, "caption": text[:1000], "parse_mode": "HTML"},
                        timeout=20, proxies=self._proxies,
                    )
                if resp is not None and resp.status_code != 200:
                    logger.warning(f"Emby入库通知 TG 事件图片失败，改用纯文字：{resp.text[:120]}")
                    resp = None
            if resp is None:
                resp = requests.post(
                    f"{api}/bot{token}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": True,
                    },
                    timeout=15,
                    proxies=self._proxies,
                )
            if resp.status_code == 200:
                logger.info(f"Emby入库通知 Telegram 事件通知成功：{name}")
            else:
                logger.error(f"Emby入库通知 Telegram 事件通知失败：{resp.status_code} {resp.text[:120]}")
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Emby入库通知 Telegram 事件通知异常：{e}")

    def _dispatch_deleted(self, info: WebhookEventInfo, server_name: str = "") -> None:
        """处理媒体删除事件（library.deleted / ItemRemoved）。"""
        is_ep = info.item_type in ("TV", "SHOW", "Episode")
        episode_text = ""
        if is_ep and info.season_id and info.episode_id:
            episode_text = f"第{info.season_id}季：第{info.episode_id}集"
        elif is_ep and info.season_id:
            episode_text = f"第{info.season_id}季"
        item = self._fetch_emby_item(info.item_id or "")
        media = {
            "item_name": info.item_name or "",
            "item_type": info.item_type or "",
            "is_ep": is_ep,
            "status_text": "媒体已删除",
            "episode_text": episode_text,
            "overview": info.overview or str(item.get("Overview") or ""),
            "image_url": "",
            "server_name": server_name or str(info.channel or "").upper(),
            "channel": info.channel or "",
            "play_url": "",
            "tmdb_url": "",
            "tmdb_id": info.tmdb_id or "",
            "season_id": info.season_id,
            "episode_id": info.episode_id,
            "genres": "",
            "cast": "",
            "rating": "",
            "release_date": "",
            "poster_url": "",
            "backdrop_url": "",
            "still_url": "",
            "file_path": info.item_path or str(item.get("Path") or ""),
            "added_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "library": str((info.json_object or {}).get("library") or ""),
            "original_title": str(item.get("OriginalTitle") or ""),
            "duration": self._format_duration(item.get("RunTimeTicks")),
            "type_text": "剧集" if is_ep else "电影",
            "year": str(item.get("ProductionYear") or ""),
            "is_deleted": True,
        }
        logger.info(f"EmbyNotify 收到删除事件：{media['item_name']}")
        self._send_all_channels(media)

    def _dispatch(self, info: WebhookEventInfo, server_name: str = "", premiere_year: str = ""):
        is_ep = info.item_type in ("TV", "SHOW", "Episode")
        status_text = "新剧速递" if is_ep else "新片速递"
        episode_text = ""
        if is_ep:
            s = str(info.season_id) if info.season_id else ""
            e = str(info.episode_id) if info.episode_id else ""
            if s and e:
                episode_text = f"第{s}季：第{e}集"
            elif s:
                episode_text = f"第{s}季"
        display_name = server_name or (info.channel.upper() if info.channel else "MediaServer")
        # 当 Emby 未提供 tmdb_id 时，按名称搜索 TMDB
        if not info.tmdb_id and self._enable_tmdb:
            logger.info(f"Emby入库通知 Emby 未提供 TMDB ID，搜索：{info.item_name}")
            info.tmdb_id = self._search_tmdb_id(info.item_name or "", info.item_type or "", premiere_year)
        elif info.tmdb_id:
            logger.info(f"Emby入库通知 使用 Emby 提供的 TMDB ID：{info.tmdb_id}（{info.item_name}）")
        play_url = self._build_play_url(info)
        detail_url = self._build_detail_url(info)
        tmdb_url = (
            f"https://www.themoviedb.org/{'tv' if is_ep else 'movie'}/{info.tmdb_id}?language=zh-CN"
            if info.tmdb_id else ""
        )
        tmdb_meta = self._fetch_tmdb_metadata(info.tmdb_id, is_ep, info.season_id, info.episode_id)
        # Emby 详情补全：原名 / 时长 / 年份 / 分类，且作为 TMDB 缺失时的兜底
        emby_item = self._fetch_emby_item(info.item_id or "")
        emby_genres = " / ".join(
            [str(g) for g in (emby_item.get("Genres") or []) if g]
        )
        original_title = str(emby_item.get("OriginalTitle") or "")
        duration = self._format_duration(emby_item.get("RunTimeTicks"))
        year = str(emby_item.get("ProductionYear") or "")
        type_text = "剧集" if is_ep else "电影"
        overview = info.overview or tmdb_meta.get("overview_tmdb", "") or str(emby_item.get("Overview") or "") or ""
        # 封面：Emby 优先，且横版优先（竖版海报只作最后兜底，避免通知里出现大竖图）
        emby_host, emby_key = self._emby_credentials
        emby_primary = ""
        emby_backdrop = ""
        if emby_host and emby_key and info.item_id and emby_item:
            tags = emby_item.get("ImageTags") or {}
            bd_tags = emby_item.get("BackdropImageTags") or []
            if tags.get("Primary"):
                emby_primary = (
                    f"{emby_host}/Items/{info.item_id}/Images/Primary"
                    f"?maxWidth=1280&api_key={emby_key}"
                )
            bd_item_id = info.item_id
            if not bd_tags and is_ep and emby_item.get("ParentBackdropItemId") \
                    and emby_item.get("ParentBackdropImageTags"):
                # 单集自身没有背景图时用所属剧集的背景图
                bd_item_id = str(emby_item.get("ParentBackdropItemId"))
                bd_tags = emby_item.get("ParentBackdropImageTags") or []
            if bd_tags:
                emby_backdrop = (
                    f"{emby_host}/Items/{bd_item_id}/Images/Backdrop/0"
                    f"?maxWidth=1920&api_key={emby_key}"
                )
        # 横版优先：剧集用单集剧照(Episode Primary 普遍 16:9)，电影用 Emby 背景图；
        # 竖版海报(电影 Primary 是 2:3)只在没有任何横版图时兜底。
        strategy = self._cover_strategy or "series_backdrop"
        if is_ep:
            if strategy == "episode_still":
                # 单集截图优先
                candidates = [
                    ("Emby 单集剧照", emby_primary),
                    ("TMDB 剧照", tmdb_meta.get("still_url")),
                    ("Emby 剧集背景图", emby_backdrop),
                    ("TMDB 背景图", tmdb_meta.get("backdrop_url")),
                ]
            elif strategy == "poster":
                # 竖版海报优先
                candidates = [
                    ("TMDB 海报", tmdb_meta.get("poster_url")),
                    ("Emby 海报", emby_primary),
                    ("Emby 剧集背景图", emby_backdrop),
                    ("TMDB 背景图", tmdb_meta.get("backdrop_url")),
                ]
            else:
                # 默认：剧集横版宣传图（Series 背景图）优先，其次 TMDB 背景图，最后才是单集截图
                candidates = [
                    ("Emby 剧集背景图", emby_backdrop),
                    ("TMDB 背景图", tmdb_meta.get("backdrop_url")),
                    ("Emby 单集剧照", emby_primary),
                    ("TMDB 剧照", tmdb_meta.get("still_url")),
                ]
        else:
            if strategy == "poster":
                candidates = [
                    ("TMDB 海报", tmdb_meta.get("poster_url")),
                    ("Emby 海报", emby_primary),
                    ("Emby 背景图", emby_backdrop),
                    ("TMDB 背景图", tmdb_meta.get("backdrop_url")),
                ]
            else:
                candidates = [
                    ("Emby 背景图", emby_backdrop),
                    ("TMDB 背景图", tmdb_meta.get("backdrop_url")),
                    ("TMDB 剧照", tmdb_meta.get("still_url")),
                ]
        fallback = [
            ("TMDB 海报（竖版兜底）", tmdb_meta.get("poster_url")),
            ("Emby 海报（竖版兜底）", emby_primary),
            ("Emby 图片（兜底）", info.image_url),
        ]
        allow_portrait = strategy == "poster"
        image_url, image_source, image_size = "", "", None
        for label, url in candidates + fallback:
            if not url:
                continue
            size = self._image_size(url)
            if not allow_portrait and size and size[0] <= size[1]:
                logger.debug(
                    f"Emby入库通知 跳过竖版图：{label} {size[0]}×{size[1]}"
                )
                continue
            image_url, image_source, image_size = url, label, size
            break
        dim = f"（{image_size[0]}×{image_size[1]}）" if image_size else ""
        logger.info(f"Emby入库通知 封面选用：{image_source or '无（没有横版图）'}{dim}")
        media = {
            "item_name": info.item_name or "", "item_type": info.item_type or "",
            "is_ep": is_ep, "status_text": status_text, "episode_text": episode_text,
            "overview": overview, "image_url": image_url, "server_name": display_name,
            "channel": info.channel or "", "play_url": play_url, "detail_url": detail_url, "tmdb_url": tmdb_url,
            "tmdb_id": info.tmdb_id or "", "season_id": info.season_id, "episode_id": info.episode_id,
            "genres": tmdb_meta.get("genres", "") or emby_genres, "cast": tmdb_meta.get("cast", ""),
            "rating": tmdb_meta.get("rating", "") or (str(emby_item.get("CommunityRating") or "")),
            "release_date": tmdb_meta.get("release_date", ""),
            "poster_url": emby_primary or tmdb_meta.get("poster_url", ""),
            "backdrop_url": emby_backdrop or tmdb_meta.get("backdrop_url", ""),
            "still_url": tmdb_meta.get("still_url", ""),
            "file_path": info.item_path or str(emby_item.get("Path") or ""),
            "added_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "library": str((info.json_object or {}).get("library") or "")
                       or str(emby_item.get("CollectionName") or ""),
            "original_title": original_title,
            "duration": duration,
            "type_text": type_text,
            "year": year,
        }
        if self._episode_cache:
            self._episode_cache.add(media)
        else:
            self._send_all_channels(media)

    def _send_all_channels(self, media: dict):
        sent_channels = []
        if self._tg_enabled and self._effective_tg_token and self._effective_tg_chat_id:
            self._send_telegram(media)
            sent_channels.append("Telegram")
        if self._feishu_enabled and self._feishu_configured:
            self._send_feishu(media)
            sent_channels.append("飞书")
        if not sent_channels:
            logger.warning(
                f"EmbyNotify 没有可用的通知渠道，请在插件配置中填写 Telegram 或飞书配置。"
                f"（TG Token: {'有' if self._effective_tg_token else '无'}, "
                f"TG Chat ID: {'有' if self._effective_tg_chat_id else '无'}, "
                f"飞书: {'已配置' if self._feishu_configured else '未配置'}）"
            )
        # 测试通知不记录到卡片
        if media.get("status_text") == "测试通知":
            return
        cards: List[dict] = self.get_data("recent_cards") or []
        cards.append({
            "time": datetime.now().strftime("%m-%d %H:%M"),
            "item_name": media["item_name"], "item_type": media["item_type"],
            "season_id": media.get("season_id"), "episode_id": media.get("episode_id"),
            "image_url": media.get("poster_url") or media.get("image_url", ""),
            "channel": media.get("channel", ""), "channels": " / ".join(sent_channels),
            "episode_text": media.get("episode_text", ""),
        })
        self.save_data("recent_cards", cards[-10:])

    def _emby_base(self) -> str:
        """当前使用的 Emby 地址（优先 MP 媒体服务器配置）。"""
        host, _ = self._emby_credentials
        return (self._emby_server_url or host or "").rstrip("/")

    def _build_detail_url(self, info: WebhookEventInfo) -> str:
        """Emby 条目详情页：点开就是这部片的详情界面。"""
        base = self._emby_base()
        if base and info.item_id:
            return f"{base}/web/index.html#!/item?id={info.item_id}"
        return ""

    def _build_play_url(self, info: WebhookEventInfo) -> str:
        """Emby 直接播放地址：点开即播放当前这集/这部片。"""
        base = self._emby_base()
        _, apikey = self._emby_credentials
        if base and info.item_id and apikey:
            return f"{base}/Videos/{info.item_id}/stream?static=true&api_key={apikey}"
        return self._build_detail_url(info)

    def _build_redirect_url(self, raw_url: str) -> str:
        prefix = (self._link_redirect_prefix or "").strip()
        if not prefix or not prefix.startswith(("http://", "https://")):
            return ""
        encoded = quote(raw_url, safe="")
        if "{url}" in prefix:
            return prefix.replace("{url}", encoded)
        sep = "&" if "?" in prefix else "?"
        return f"{prefix}{sep}url={encoded}"

    @staticmethod
    def _episode_code(media: dict) -> str:
        """生成 S01E05 形式的季集代码；多集合并时输出 S01E01-E05。"""
        season = str(media.get("season_id") or "").strip()
        episode = str(media.get("episode_id") or "").strip()
        ep_range = str(media.get("episode_range") or "").strip()
        try:
            season_no = int(float(season)) if season else None
        except (TypeError, ValueError):
            season_no = None
        try:
            episode_no = int(float(episode)) if episode else None
        except (TypeError, ValueError):
            episode_no = None
        prefix = f"S{season_no:02d}" if season_no else ""
        if ep_range:
            parts = [x.strip() for x in ep_range.replace("–", "-").split("-") if x.strip()]
            try:
                start = int(float(parts[0]))
                end = int(float(parts[-1])) if len(parts) > 1 else start
                return f"{prefix}E{start:02d}-E{end:02d}" if start != end else f"{prefix}E{start:02d}"
            except (ValueError, IndexError):
                pass
        if episode_no:
            return f"{prefix}E{episode_no:02d}"
        return prefix

    @staticmethod
    def _season_episode_parts(media: dict) -> Tuple[str, str, str, str]:
        """返回 (季中文, 季英文, 集中文, 集英文)，例如 (第1季, S01, 第5集, E05)。"""
        def _num(value) -> Optional[int]:
            try:
                return int(float(str(value).strip())) if str(value or "").strip() else None
            except (TypeError, ValueError):
                return None

        season_no = _num(media.get("season_id"))
        episode_no = _num(media.get("episode_id"))
        ep_range = str(media.get("episode_range") or "").replace("–", "-").strip()
        start = end = None
        if ep_range:
            parts = [x.strip() for x in ep_range.split("-") if x.strip()]
            start, end = _num(parts[0]) if parts else None, _num(parts[-1]) if parts else None
        if start is None:
            start = end = episode_no
        season_cn = f"第{season_no}季" if season_no else ""
        season_en = f"S{season_no:02d}" if season_no else ""
        if start is None:
            episode_cn = episode_en = ""
        elif end is not None and end != start:
            episode_cn = f"第{start}-{end}集"
            episode_en = f"E{start:02d}-E{end:02d}"
        else:
            episode_cn = f"第{start}集"
            episode_en = f"E{start:02d}"
        return season_cn, season_en, episode_cn, episode_en

    def _template_context(self, media: dict) -> dict:
        play_url = str(media.get("play_url") or "")
        tmdb_url = str(media.get("tmdb_url") or "")
        # 详情链接：条目详情页 -> 播放地址 -> TMDB 页面，逐级兜底
        detail_url = str(media.get("detail_url") or "")
        if not detail_url.startswith(("http://", "https://")):
            detail_url = play_url if play_url.startswith(("http://", "https://")) else tmdb_url
        play_url_ok = play_url if play_url.startswith(("http://", "https://")) else ""
        tmdb_url_ok = tmdb_url if tmdb_url.startswith(("http://", "https://")) else ""
        return {
            "server_name": media.get("server_name", ""),
            "status_text": media.get("status_text", ""),
            "item_name": media.get("item_name", ""),
            "episode_text": media.get("episode_text", ""),
            "genres": media.get("genres", ""),
            "cast": media.get("cast", ""),
            "rating": media.get("rating", ""),
            "release_date": media.get("release_date", ""),
            "overview": media.get("overview", ""),
            "play_url": media.get("play_url", ""),
            "tmdb_url": media.get("tmdb_url", ""),
            "channel": media.get("channel", ""),
            "file_path": media.get("file_path", ""),
            "added_at": media.get("added_at", ""),
            "library": media.get("library", ""),
            "original_title": media.get("original_title", ""),
            "duration": media.get("duration", ""),
            "type_text": media.get("type_text", ""),
            "year": media.get("year", ""),
            "tmdb_id": media.get("tmdb_id", ""),
            "season": media.get("season_id") or "",
            "episode": media.get("episode_id") or "",
            "detail_url": detail_url,
            "detail_link": f"[查看详情]({detail_url})" if detail_url else "",
            "detail_link_html": f'<a href="{detail_url}">查看详情</a>' if detail_url else "",
            "play_link": f"[立即观看]({play_url_ok})" if play_url_ok else "",
            "play_link_html": f'<a href="{play_url_ok}">立即观看</a>' if play_url_ok else "",
            "tmdb_link": f"[TMDB]({tmdb_url_ok})" if tmdb_url_ok else "",
            "tmdb_link_html": f'<a href="{tmdb_url_ok}">TMDB</a>' if tmdb_url_ok else "",
            "episode_code": self._episode_code(media),
            "event": media.get("event", ""),
            "event_text": media.get("event_text", ""),
            "user_name": media.get("user_name", ""),
            "device_name": media.get("device_name", ""),
            "client": media.get("client", ""),
            "ip": media.get("ip", ""),
            "progress": media.get("progress", ""),
            "ip_text": media.get("ip_text", ""),
            "season_cn": self._season_episode_parts(media)[0],
            "season_en": self._season_episode_parts(media)[1],
            "episode_cn": self._season_episode_parts(media)[2],
            "episode_en": self._season_episode_parts(media)[3],
        }

    def _render_template(self, template: str, media: dict, escape_html: bool = False) -> str:
        if not template:
            return ""
        ctx = self._template_context(media)

        def _replace(match):
            key = match.group(1).strip()
            value = str(ctx.get(key, ""))
            return html.escape(value) if escape_html else value

        return re.sub(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}", _replace, template)

    def _send_telegram(self, media: dict):
        if media.get("is_deleted"):
            self._send_telegram_text(media)
            return
        type_text = media.get("genres") or ("剧集" if media.get("is_ep") else "电影")
        date_label = "📺 首播" if media.get("is_ep") else "🎬 上映"
        release_date = media.get("release_date", "") or "Unknown"
        title = self._render_template(
            self._tg_title_template or self._default_tg_title_template(), media, escape_html=True
        ).strip()
        body = self._render_template(
            self._tg_body_template or self._default_tg_body_template(), media, escape_html=True
        ).strip()
        caption = f"{title}\n\n{body}".strip() if title else body
        # 构建 InlineKeyboard 按钮（Telegram 仅支持 http/https URL）
        buttons = []
        play_url = media.get("play_url", "")
        tmdb_url = media.get("tmdb_url", "")
        using_custom = True  # 模板恒定启用，链接写在正文里
        if self._enable_watch_link and play_url:
            if play_url.startswith(("http://", "https://")):
                if not using_custom:
                    buttons.append({"text": "▶️ 立即观看", "url": play_url})
            else:
                redirect_url = self._build_redirect_url(play_url)
                if redirect_url:
                    if not using_custom:
                        buttons.append({"text": "▶️ 立即观看", "url": redirect_url})
                elif not using_custom:
                    # 自定义模板含 {{play_url}} 已展示链接，不重复追加
                    caption += f"\n\n▶️ 立即观看：{html.escape(play_url)}"
        if tmdb_url and not using_custom:
            buttons.append({"text": "ℹ️ 了解更多", "url": tmdb_url})
        reply_markup = {"inline_keyboard": [buttons]} if buttons else None
        photo = media.get("image_url", "")
        try:
            api = self._effective_tg_api_host
            token = self._effective_tg_token
            chat_id = self._effective_tg_chat_id
            payload = {"chat_id": chat_id, "parse_mode": "HTML"}
            if reply_markup:
                payload["reply_markup"] = reply_markup
            if photo:
                # 内网/本地图片 Telegram 服务器拉不到（会报 wrong type of the web page content），
                # 先自己把图片下载下来再以文件形式上传；下载失败才退回 URL 方式。
                image_bytes = None
                for kwargs in ({}, {"proxies": self._proxies}):
                    try:
                        img = requests.get(photo, timeout=20, **kwargs)
                        if img.status_code == 200 and img.content:
                            image_bytes = img.content
                            break
                    except Exception:  # pylint: disable=broad-except
                        continue
                if image_bytes:
                    form = {
                        "chat_id": str(chat_id),
                        "parse_mode": "HTML",
                        "caption": caption,
                    }
                    if reply_markup:
                        form["reply_markup"] = json.dumps(reply_markup, ensure_ascii=False)
                    resp = requests.post(
                        f"{api}/bot{token}/sendPhoto",
                        data=form,
                        files={"photo": ("cover.jpg", image_bytes, "image/jpeg")},
                        timeout=30, proxies=self._proxies,
                    )
                else:
                    payload["photo"] = photo
                    payload["caption"] = caption
                    resp = requests.post(f"{api}/bot{token}/sendPhoto", json=payload,
                                         timeout=15, proxies=self._proxies)
            else:
                payload["text"] = caption
                resp = requests.post(f"{api}/bot{token}/sendMessage", json=payload,
                                     timeout=15, proxies=self._proxies)
            if photo and resp.status_code != 200:
                # 图片发不出去（链接失效/图片过大）时退回纯文字，至少把内容送达
                logger.warning(f"EmbyNotify TG 图片消息失败，改用纯文字：{resp.text[:120]}")
                text_payload = {"chat_id": chat_id, "parse_mode": "HTML", "text": caption}
                if reply_markup:
                    text_payload["reply_markup"] = reply_markup
                resp = requests.post(f"{api}/bot{token}/sendMessage", json=text_payload,
                                     timeout=15, proxies=self._proxies)
            if resp.status_code != 200:
                logger.error(f"Emby入库通知 Telegram HTTP {resp.status_code}：{resp.text[:500]}")
                return
            result = resp.json()
            if result.get("ok"):
                logger.info(f"Emby入库通知 Telegram 发送成功：{media['item_name']}")
            else:
                logger.error(f"Emby入库通知 Telegram 发送失败：{result}")
        except Exception as e:
            logger.error(f"Emby入库通知 Telegram 发送失败：{e}")

    def _get_wx_token(self) -> Optional[str]:
        try:
            res = requests.get(
                f"{self._effective_wx_proxy_url}/cgi-bin/gettoken",
                params={"corpid": self._effective_wx_corp_id, "corpsecret": self._effective_wx_corp_secret},
                timeout=10, proxies=self._wx_proxies
            )
            data = res.json()
            if data.get("errcode", 0) == 0:
                return data["access_token"]
            logger.error(f"获取企业微信 token 失败：{data}")
        except Exception as e:
            logger.error(f"获取企业微信 token 异常：{e}")
        return None

    def _send_wechat(self, media: dict):
        token = self._get_wx_token()
        if not token:
            return
        image_url = media.get("image_url", "")
        play_url = media.get("play_url", "")
        tmdb_url = media.get("tmdb_url", "")
        # 企业微信只支持 http/https URL，非 http 链接可通过中转前缀包装
        if play_url.startswith(("http://", "https://")):
            safe_play_url = play_url
        else:
            safe_play_url = self._build_redirect_url(play_url) if play_url else ""
        safe_tmdb_url = tmdb_url if tmdb_url.startswith(("http://", "https://")) else ""
        jump_url = (safe_play_url if (self._enable_watch_link and safe_play_url)
                    else safe_tmdb_url or "https://www.themoviedb.org/")
        agent_id = self._effective_wx_agent_id
        agent_id_val = int(agent_id) if str(agent_id).isdigit() else agent_id
        episode_text = media.get("episode_text", "") or "新更上线"
        type_text = media.get("genres") or ("剧集" if media.get("is_ep") else "电影")
        date_label = "📺 首播" if media.get("is_ep") else "🎬 上映"
        release_date = media.get("release_date", "") or "Unknown"
        server_icon = f"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/{(media.get('channel') or 'emby').lower()}.png"
        try:
            url = f"{self._effective_wx_proxy_url}/cgi-bin/message/send?access_token={token}"
            if self._wx_msg_type == "news_notice":
                vertical_content = []
                if media.get("cast"):
                    vertical_content.append({"title": "👥 主演", "desc": media["cast"]})
                vertical_content.append({"title": "📺 类型", "desc": type_text})
                if media.get("rating"):
                    vertical_content.append({"title": "⭐ 评分", "desc": media["rating"]})
                vertical_content.append({"title": date_label, "desc": release_date})
                if media.get("overview"):
                    vertical_content.append({"title": "📝 内容简介", "desc": _truncate(media["overview"], 120)})
                card = {
                    "card_type": "news_notice",
                    "source": {"icon_url": server_icon, "desc": f"{media['server_name']} | {media['status_text']}", "desc_color": 0},
                    "main_title": {"title": f"【{media['item_name']}】", "desc": episode_text},
                    "card_image": {"url": image_url, "aspect_ratio": 2.25},
                    "vertical_content_list": vertical_content,
                    "jump_list": (
                        [{"type": 1, "url": safe_play_url, "title": "▶️ 立即观看"},
                         {"type": 1, "url": safe_tmdb_url, "title": "ℹ️ 了解更多"}]
                        if (self._enable_watch_link and safe_play_url and safe_tmdb_url) else
                        [{"type": 1, "url": jump_url, "title": "ℹ️ 了解更多"}]
                    ),
                    "card_action": {"type": 1, "url": jump_url},
                }
                if self._enable_custom_template:
                    if self._wx_title_template:
                        card["main_title"]["title"] = self._render_template(self._wx_title_template, media)
                    if self._wx_body_template:
                        wx_desc = self._render_template(self._wx_body_template, media).replace("\r", "")
                        card["vertical_content_list"] = [{
                            "title": "📝 自定义内容",
                            "desc": _truncate(wx_desc, 300),
                        }]
                payload = {"touser": self._effective_wx_user_id, "msgtype": "template_card",
                           "agentid": agent_id_val, "template_card": card}
            else:
                title_text = f"{media['server_name']} | {media['status_text']} | 【{media['item_name']}】"
                if media.get("episode_text"):
                    title_text += f" | {media['episode_text']}"
                desc_parts = []
                if media.get("cast"):
                    desc_parts.append(f"👥 主演：{media['cast']}")
                desc_parts.append(f"📺 类型：{type_text}")
                if media.get("rating"):
                    desc_parts.append(f"⭐ 评分：{media['rating']}")
                desc_parts.append(f"{date_label}：{release_date}")
                if media.get("overview"):
                    desc_parts.append(f"\n📝 内容简介：{_truncate(media['overview'], 100)}")
                if self._enable_custom_template:
                    if self._wx_title_template:
                        title_text = self._render_template(self._wx_title_template, media)
                    if self._wx_body_template:
                        desc_parts = [_truncate(self._render_template(self._wx_body_template, media).replace("\r", ""), 500)]
                payload = {
                    "touser": self._effective_wx_user_id, "msgtype": "news", "agentid": agent_id_val,
                    "news": {"articles": [{"title": title_text, "description": "\n".join(desc_parts),
                                           "url": jump_url, "picurl": image_url}]},
                }
            res = requests.post(url, json=payload, timeout=15, proxies=self._wx_proxies)
            data = res.json()
            if data.get("errcode", 0) == 0:
                logger.info(f"Emby入库通知 企业微信发送成功：{media['item_name']}")
            else:
                logger.error(f"Emby入库通知 企业微信发送失败：{data}")
        except Exception as e:
            logger.error(f"Emby入库通知 企业微信发送异常：{e}")

    def _send_bark(self, media: dict):
        type_text = media.get("genres") or ("剧集" if media.get("is_ep") else "电影")
        date_label = "📺 首播" if media.get("is_ep") else "🎬 上映"
        release_date = media.get("release_date", "") or "Unknown"
        play_url_raw = media.get("play_url", "")
        tmdb_url_raw = media.get("tmdb_url", "")
        if self._enable_custom_template and self._bark_body_template:
            body = self._render_template(self._bark_body_template, media)
        else:
            body = ""
            if media.get("cast"):
                body += f"👥 主演：{media['cast']}\n"
            body += f"📺 类型：{type_text}\n"
            if media.get("rating"):
                body += f"⭐ 评分：{media['rating']}\n"
            body += f"{date_label}：{release_date}"
            if media.get("overview"):
                body += f"\n\n📝 {_truncate(media['overview'], 80)}"
            # 默认模板：只追加 http/https 链接（可点击），非 http 链接仅用作点击通知的跳转
            link_lines = ""
            if self._enable_watch_link and play_url_raw:
                if play_url_raw.startswith(("http://", "https://")):
                    link_lines += f"\n▶️ 立即观看：{play_url_raw}"
            if tmdb_url_raw:
                link_lines += f"\nℹ️ 了解更多：{tmdb_url_raw}"
            if link_lines:
                body += f"\n{link_lines}"
        url_target = (play_url_raw if (self._enable_watch_link and play_url_raw)
                      else tmdb_url_raw)
        # icon 换成影片海报，fallback 到项目 logo
        poster_icon = media.get("poster_url") or ""
        logo_icon = "https://raw.githubusercontent.com/AWdress/MoviePilot-Plugins/main/plugins/awembypush/logo.png"
        icon_url = poster_icon or logo_icon
        keys = [k.strip() for k in self._bark_keys.split(",") if k.strip()]
        # 选取缩略图：剧集优先 still > backdrop > poster
        image_url = media.get("image_url") or media.get("poster_url") or ""
        # 分组：按剧集/电影分类
        group = "新剧速递" if media.get("is_ep") else "新片速递"
        # subtitle：剧集显示"季集 | 新更上线"，电影显示类型
        ep_text = media.get("episode_text") or ""
        subtitle = f"{ep_text} | 新更上线" if ep_text else (media.get("genres") or "")
        for key in keys:
            title = f"{media['server_name']} | {media['status_text']}\n\n【{media['item_name']}】"
            if self._enable_custom_template and self._bark_title_template:
                title = self._render_template(self._bark_title_template, media)
            payload = {
                "title": title,
                "body": body or "新内容已入库",
                "icon": icon_url, "url": url_target, "device_key": key,
                "group": group,
            }
            if subtitle:
                payload["subtitle"] = subtitle
            if image_url:
                payload["image"] = image_url
            try:
                res = requests.post(f"{self._bark_server}/push", json=payload,
                                    timeout=15, proxies=self._proxies)
                if res.status_code == 200:
                    logger.info(f"Emby入库通知 Bark ({key[:8]}...) 发送成功：{media['item_name']}")
                else:
                    logger.error(f"Emby入库通知 Bark ({key[:8]}...) 发送失败：{res.status_code} {res.text}")
            except Exception as e:
                logger.error(f"Emby入库通知 Bark ({key[:8]}...) 发送异常：{e}")

    # ==================== 飞书发送（本地改版新增） ====================

    @staticmethod
    def _tidy_feishu_body(text: str) -> str:
        """清洗正文：抹掉空样式标签与空字段行，保留用户自己敲的换行。"""
        # 飞书 markdown 不认 HTML 引用块，模板里若写了 <blockquote> 只保留内容
        text = re.sub(r"</?blockquote[^>]*>", "", text or "", flags=re.IGNORECASE)
        # 变量为空时（例如电影没有季集）会留下空标签，整段抹掉，避免只剩空色块
        text = re.sub(r"<font\b[^>]*>\s*</font>", "", text, flags=re.IGNORECASE)
        text = re.sub(r"<text_tag\b[^>]*>\s*</text_tag>", "", text, flags=re.IGNORECASE)
        rows: List[str] = []
        for line in (text or "").splitlines():
            raw = line.strip()
            if not raw:
                rows.append("")
                continue
            # 判断内容是否为空时忽略样式标签本身
            plain = re.sub(r"</?(?:font|text_tag)\b[^>]*>", "", raw).strip().lstrip("*").strip()
            if not plain:
                continue
            # 形如「主演：」「播放：」的空字段整行丢弃
            if plain.endswith(("：", ":")) and len(plain) <= 20:
                continue
            # 只剩 emoji / 符号（如「▶️」）的行也丢弃
            if not re.sub(r"[^\w\u4e00-\u9fff]+", "", plain):
                continue
            rows.append(raw)
        # 折叠连续空行、去掉首尾空行，其余换行原样保留
        out: List[str] = []
        for row in rows:
            if not row and (not out or not out[-1]):
                continue
            out.append(row)
        while out and not out[-1]:
            out.pop()
        return "\n".join(out).strip()

    def _build_feishu_card(self, title: str, body: str, image_key: str = "") -> dict:
        """飞书 2.0 卡片：图片贴顶铺满宽度，文字带边距（对齐 MP 自带媒体服务器通知）。"""
        elements: List[dict] = []
        if image_key:
            # 有图时 body 零内边距，图片左右不留白，视觉上就是整条消息的顶部大图
            elements.append({
                "tag": "img",
                "img_key": image_key,
                "mode": "fit_horizontal",
                "alt": {"tag": "plain_text", "content": title or "封面"},
            })
        title_margin = "12px 12px 0px 12px" if image_key else None
        body_margin = "4px 12px 12px 12px" if image_key else None
        title_section: dict = {
            "tag": "markdown",
            "text_size": "heading",
            "content": title or "媒体入库",
        }
        if title_margin:
            title_section["margin"] = title_margin
        body_section: dict = {
            "tag": "markdown",
            "text_size": "normal",
            "content": body or "新内容已入库",
        }
        if body_margin:
            body_section["margin"] = body_margin
        elements.append(title_section)
        elements.append(body_section)
        return {
            "schema": "2.0",
            "config": {
                "wide_screen_mode": True,
                "enable_forward": True,
                "summary": {"content": title or "媒体入库"},
            },
            "body": {
                "direction": "vertical",
                "padding": "0px 0px 0px 0px" if image_key else "12px 12px 12px 12px",
                "elements": elements,
            },
        }

    def _upload_feishu_image(self, api, media: dict) -> str:
        """上传卡片顶部横幅图并返回 image_key；失败返回空串（卡片退化为纯文本）。

        优先横版图（剧照/背景），竖版海报仅作兜底，避免卡片顶部出现大竖图。
        """
        url = (
            media.get("image_url") or media.get("still_url")
            or media.get("backdrop_url") or media.get("poster_url") or ""
        )
        if not url.startswith(("http://", "https://")):
            return ""
        path: Optional[Path] = None
        try:
            res = requests.get(url, timeout=20, proxies=self._proxies)
            if res.status_code != 200 or not res.content:
                return ""
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as fh:
                fh.write(res.content)
                path = Path(fh.name)
            resp = api.upload_image(path)
            if resp.success():
                return str((resp.data or {}).get("image_key") or "")
            logger.warning(
                f"Emby入库通知 飞书海报上传失败：code={resp.code} msg={resp.msg[:100]}"
            )
        except Exception as e:  # pylint: disable=broad-except
            logger.warning(f"Emby入库通知 飞书海报处理失败：{e}")
        finally:
            if path is not None:
                try:
                    path.unlink()
                except OSError:
                    pass
        return ""

    def _send_feishu(self, media: dict):
        """按配置的模板渲染并发送一条飞书通知。"""
        if media.get("is_deleted"):
            title = self._render_template(self._default_deleted_feishu_title(), media).strip()
            body = self._tidy_feishu_body(
                self._render_template(self._default_deleted_feishu_body(), media)
            )
        else:
            title = self._render_template(
                self._feishu_title_template or self._default_feishu_title_template(), media
            ).strip()
            body = self._tidy_feishu_body(
                self._render_template(
                    self._feishu_body_template or self._default_feishu_body_template(), media
                )
            )
        if not title:
            title = f"{media.get('server_name', '')} | 【{media.get('item_name', '')}】"
        if (self._feishu_mode or "mp").lower() == "webhook":
            self._send_feishu_webhook(title, body, media)
        else:
            self._send_feishu_app(title, body, media)

    def _send_feishu_app(self, title: str, body: str, media: dict, use_image: bool = True):
        """走飞书自建应用 OpenAPI 发送（复用 MP 飞书渠道或插件内自填凭据）。"""
        app_id = self._effective_feishu_app_id
        app_secret = self._effective_feishu_app_secret
        candidates = self._feishu_candidates()
        if not (app_id and app_secret and candidates):
            logger.warning(
                "Emby入库通知 飞书应用配置不完整，已跳过（需要 App ID / App Secret / 接收者；"
                "可在 MP 飞书渠道里配置群聊 chat_id 或默认用户）"
            )
            return
        try:
            from app.modules.feishu.openapi import FeishuOpenApi
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Emby入库通知 加载飞书 OpenAPI 客户端失败：{e}")
            return
        api = None
        try:
            api = FeishuOpenApi(app_id, app_secret, domain=self._effective_feishu_domain)
            image_key = self._upload_feishu_image(api, media) if use_image else ""
            # 图片放回卡片顶部（与 MP 自带媒体服务器通知一致，一条消息看完）
            card = json.dumps(self._build_feishu_card(title, body, image_key), ensure_ascii=False)
            # 依次尝试候选接收者：某个 open_id/chat_id 不属于当前应用时换下一个
            for rid_type, rid in candidates:
                resp = api.create_message(
                    rid_type,
                    rid,
                    "interactive",
                    card,
                    f"awembypushfe-{int(time.time() * 1000)}-{rid[-6:]}",
                )
                if resp.success():
                    logger.info(
                        f"Emby入库通知 飞书发送成功：{media.get('item_name', '')}（{rid_type}: {rid[:6]}…）"
                    )
                    return
                logger.warning(
                    f"Emby入库通知 飞书接收者 {rid_type}:{rid[:6]}… 不可用，尝试下一个："
                    f"code={resp.code} msg={resp.msg[:120]}"
                )
            logger.error("Emby入库通知 飞书发送失败：所有候选接收者都不可用")
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Emby入库通知 飞书发送异常：{e}")
        finally:
            if api is not None:
                try:
                    api.close()
                except Exception:  # pylint: disable=broad-except
                    pass

    def _send_feishu_webhook(self, title: str, body: str, media: dict):
        """走飞书群自定义机器人 Webhook 发送。"""
        webhook = self._feishu_webhook
        if not webhook:
            logger.warning("Emby入库通知 未填写飞书群机器人 Webhook，已跳过")
            return
        try:
            res = requests.post(
                webhook,
                json={"msg_type": "interactive", "card": self._build_feishu_card(title, body)},
                timeout=15,
            )
            try:
                data = res.json()
            except Exception:  # pylint: disable=broad-except
                data = {}
            code = data.get("code", data.get("StatusCode", 0))
            if res.status_code == 200 and code in (0, None):
                logger.info(f"Emby入库通知 飞书机器人发送成功：{media.get('item_name', '')}")
            else:
                logger.error(
                    f"Emby入库通知 飞书机器人发送失败：{res.status_code} {res.text[:200]}"
                )
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Emby入库通知 飞书机器人发送异常：{e}")

    # ==================== 前端（Vue）接口 ====================

    SECRET_KEYS: Tuple[str, ...] = ("tg_bot_token", "feishu_app_secret")

    def _channel_names(self) -> Dict[str, List[str]]:
        """返回 MP 里已启用的 Telegram / 飞书渠道名。"""
        tg: List[str] = []
        feishu: List[str] = []
        try:
            for n in (self.systemconfig.get(SystemConfigKey.Notifications) or []):
                if not n.get("enabled"):
                    continue
                name = n.get("name") or ""
                if n.get("type") == "telegram" and name:
                    tg.append(name)
                elif n.get("type") == "feishu" and name:
                    feishu.append(name)
        except Exception as e:  # pylint: disable=broad-except
            logger.warning(f"EmbyNotify 读取通知渠道失败：{e}")
        return {"telegram": tg, "feishu": feishu}

    def _stored_config(self) -> dict:
        """读取插件已保存的配置（用于掩码合并）。"""
        try:
            return dict(self.get_config() or {})
        except Exception:  # pylint: disable=broad-except
            return {}

    @staticmethod
    async def _read_params(request: Request) -> Dict[str, Any]:
        """合并查询参数与 JSON 请求体（请求体优先）。"""
        params: Dict[str, Any] = dict(request.query_params)
        try:
            body = await request.json()
        except Exception:  # pylint: disable=broad-except
            body = None
        if isinstance(body, dict):
            params.update(body)
        return params

    def _masked_config(self, config: dict) -> dict:
        data = dict(config or {})
        for key in self.SECRET_KEYS:
            if data.get(key):
                data[key] = "***"
        return data

    PRESET_DATA_KEY = "template_presets"

    def _default_templates(self) -> Dict[str, Dict[str, str]]:
        """返回内置的「原版」模板，不受用户保存内容影响。"""
        return {
            "feishu": {
                "title": self._default_feishu_title_template(),
                "body": self._default_feishu_body_template(),
            },
            "telegram": {
                "title": self._default_tg_title_template(),
                "body": self._default_tg_body_template(),
            },
        }

    def _load_presets(self) -> Dict[str, List[Dict[str, str]]]:
        """读取已保存的模板预设，按渠道分组。"""
        data = self.get_data(self.PRESET_DATA_KEY) or {}
        if not isinstance(data, dict):
            data = {}
        result: Dict[str, List[Dict[str, str]]] = {"feishu": [], "telegram": []}
        for channel in ("feishu", "telegram"):
            items = data.get(channel) or []
            if isinstance(items, list):
                result[channel] = [
                    {
                        "name": str(item.get("name") or "").strip(),
                        "title": str(item.get("title") or ""),
                        "body": str(item.get("body") or ""),
                    }
                    for item in items
                    if isinstance(item, dict) and str(item.get("name") or "").strip()
                ]
        return result

    def _save_presets(self, presets: Dict[str, List[Dict[str, str]]]) -> None:
        self.save_data(self.PRESET_DATA_KEY, presets)

    async def api_presets(self, request: Request) -> Dict[str, Any]:
        """模板预设：GET 读取，POST 保存/删除。"""
        if request.method.upper() != "POST":
            return {"success": True, "data": {"presets": self._load_presets()}}
        params = await self._read_params(request)
        channel = str(params.get("channel") or "feishu").lower()
        if channel not in ("feishu", "telegram"):
            channel = "feishu"
        action = str(params.get("action") or "save").lower()
        name = str(params.get("name") or "").strip()
        if not name:
            return {"success": False, "message": "模板名称不能为空", "data": None}
        presets = self._load_presets()
        items = [x for x in presets.get(channel) or [] if x.get("name") != name]
        if action == "delete":
            presets[channel] = items
        else:
            items.append({
                "name": name,
                "title": str(params.get("title") or ""),
                "body": str(params.get("body") or ""),
            })
            presets[channel] = items
        self._save_presets(presets)
        return {
            "success": True,
            "data": {"presets": presets},
            "message": ("已删除模板" if action == "delete" else "模板已保存"),
        }

    async def api_ui_config(self, request: Request) -> Dict[str, Any]:
        """Vue 页面读取 / 保存配置。"""
        if request.method.upper() == "POST":
            payload = await self._read_params(request)
            merged = dict(self._stored_config())
            for key, value in (payload or {}).items():
                if key in self.SECRET_KEYS and value == "***":
                    continue
                merged[key] = value
            self.update_config(merged)
            # update_config 只落库，不会重建运行中的实例；这里显式重新初始化，
            # 否则刚保存的渠道开关/模板要等下次重载才生效。
            try:
                self.init_plugin(merged)
            except Exception as e:  # pylint: disable=broad-except
                logger.warning(f"EmbyNotify 保存后重新初始化失败：{e}")
            return {"success": True, "data": {"config": self._masked_config(merged)}}
        stored = self._stored_config()
        return {
            "success": True,
            "data": {
                "config": self._masked_config(stored),
                "channels": self._channel_names(),
                "presets": self._load_presets(),
                "defaults": self._default_templates(),
                "servers": self._emby_servers(),
                # 运行态（保存后是否立即生效以此为准，便于排查开关不生效）
                "runtime": {
                    "enabled": self._enabled,
                    "tg_enabled": self._tg_enabled,
                    "feishu_enabled": self._feishu_enabled,
                    "feishu_configured": self._feishu_configured,
                },
            },
        }

    async def api_preview(self, request: Request) -> Dict[str, Any]:
        """按给定模板渲染一条样例通知，供前端实时预览。"""
        params = await self._read_params(request)
        channel = str(params.get("channel") or "telegram")
        media = self._build_test_media(str(params.get("sample") or "tv"))
        escape = channel == "telegram"
        title = self._render_template(
            str(params.get("title_template") or ""), media, escape_html=escape
        ).strip()
        body = self._render_template(
            str(params.get("body_template") or ""), media, escape_html=escape
        ).strip()
        if channel != "telegram":
            body = self._tidy_feishu_body(body)
        return {"success": True, "data": {"title": title, "body": body}}

    async def api_sample(self, request: Request) -> Dict[str, Any]:
        """返回样例媒体数据，供前端本地渲染预览（避免每次编辑都请求后端）。"""
        params = await self._read_params(request)
        kind = str(params.get("kind") or params.get("sample") or "tv")
        media = self._build_test_media(kind)
        return {"success": True, "data": {"media": media}}

    async def api_test_send(self, request: Request) -> Dict[str, Any]:
        """用当前编辑中的模板向单个渠道发送测试消息。"""
        params = await self._read_params(request)
        channel = str(params.get("channel") or "telegram")
        sample = str(params.get("sample") or "tv")
        title_tpl = str(params.get("title_template") or "")
        body_tpl = str(params.get("body_template") or "")
        media = self._build_test_media(sample)
        try:
            if channel == "telegram":
                old = (self._tg_title_template, self._tg_body_template)
                self._tg_title_template, self._tg_body_template = title_tpl, body_tpl
                try:
                    self._send_telegram(media)
                finally:
                    self._tg_title_template, self._tg_body_template = old
            else:
                old = (self._feishu_title_template, self._feishu_body_template)
                self._feishu_title_template, self._feishu_body_template = title_tpl, body_tpl
                try:
                    self._send_feishu(media)
                finally:
                    self._feishu_title_template, self._feishu_body_template = old
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"EmbyNotify 测试发送失败：{e}")
            return {"success": False, "message": f"发送失败：{e}", "data": None}
        label = "Telegram" if channel == "telegram" else "飞书"
        sample_label = "电影" if sample == "movie" else "电视剧"
        return {"success": True, "message": f"已发送{label}（{sample_label}样例）", "data": None}

    # ==================== 测试通知（本地改版新增） ====================

    TEST_SAMPLES: Dict[str, Dict[str, Any]] = {
        "movie": {
            "tmdb_id": "299534", "name": "复仇者联盟4：终局之战", "is_ep": False,
            "library": "电影",
            "file_path": "/影视城/电影/复仇者联盟4：终局之战 (2019)/Avengers.Endgame.2019.mkv",
        },
        "tv": {
            "tmdb_id": "206484", "name": "诛仙", "is_ep": True,
            "season": "1", "episode": "5", "library": "国产剧",
            "file_path": "/影视城/电视剧/诛仙 (2022)/Season 01/诛仙.S01E05.mkv",
        },
    }

    SAMPLE_CACHE_TTL = 6 * 3600
    SAMPLE_CACHE_KEY = "sample_v2_"

    def _build_test_media(self, kind: str) -> dict:
        """返回样例媒体：命中插件数据缓存时立即返回，避免每次都等 TMDB。"""
        key = str(kind or "tv")
        if key not in self.TEST_SAMPLES:
            key = "movie"
        cached = self.get_data(f"{self.SAMPLE_CACHE_KEY}{key}") or {}
        media = cached.get("media") if isinstance(cached, dict) else None
        try:
            fresh = media and (time.time() - float(cached.get("at") or 0)) < self.SAMPLE_CACHE_TTL
        except (TypeError, ValueError):
            fresh = False
        if fresh:
            return dict(media)
        media = self._compose_test_media(key)
        try:
            self.save_data(f"{self.SAMPLE_CACHE_KEY}{key}", {"at": time.time(), "media": media})
        except Exception as e:  # pylint: disable=broad-except
            logger.debug(f"Emby入库通知 样例缓存写入失败：{e}")
        return media

    def _test_media_links(self, name: str, is_ep: bool) -> Tuple[str, str]:
        """给测试样例找真实 Emby 条目，返回 (详情页链接, 播放直链)。"""
        base = self._emby_base()
        _, apikey = self._emby_credentials
        if not (base and apikey and name):
            return (f"{base}/web/index.html" if base else "", "")
        try:
            kind = "Series" if is_ep else "Movie"
            res = requests.get(
                f"{base}/Items",
                params={"api_key": apikey, "SearchTerm": name, "Recursive": "true",
                        "IncludeItemTypes": kind, "Limit": 1},
                timeout=10,
            )
            items = (res.json() or {}).get("Items") or []
            if not items:
                return (f"{base}/web/index.html", "")
            detail_id = str(items[0].get("Id") or "")
            play_id = detail_id
            if is_ep:
                eps = requests.get(
                    f"{base}/Items",
                    params={"api_key": apikey, "ParentId": detail_id, "Recursive": "true",
                            "IncludeItemTypes": "Episode", "Limit": 1,
                            "SortBy": "ParentIndexNumber,IndexNumber"},
                    timeout=10,
                )
                ep_items = (eps.json() or {}).get("Items") or []
                play_id = str(ep_items[0].get("Id") or "") if ep_items else ""
            detail_url = f"{base}/web/index.html#!/item?id={detail_id}" if detail_id else ""
            play_url = (
                f"{base}/Videos/{play_id}/stream?static=true&api_key={apikey}"
                if play_id else ""
            )
            return detail_url, play_url
        except Exception as e:  # pylint: disable=broad-except
            logger.debug(f"Emby入库通知 测试样例取链接失败：{e}")
            return (f"{base}/web/index.html", "")

    def _compose_test_media(self, kind: str) -> dict:
        """按固定样本构造一条与真实入库同结构的测试数据（含 TMDB 元数据）。"""
        sample = self.TEST_SAMPLES.get(kind) or self.TEST_SAMPLES["movie"]
        is_ep = bool(sample.get("is_ep"))
        tmdb_id = str(sample.get("tmdb_id") or "")
        season = str(sample.get("season") or "") or None
        episode = str(sample.get("episode") or "") or None
        meta = self._fetch_tmdb_metadata(tmdb_id, is_ep, season, episode) or {}
        detail_url, play_url = self._test_media_links(str(sample.get("name") or ""), is_ep)
        episode_text = f"第{season}季：第{episode}集" if (is_ep and season and episode) else ""
        strategy = self._cover_strategy or "series_backdrop"
        if strategy == "poster":
            image_url = meta.get("poster_url") or meta.get("backdrop_url") or meta.get("still_url") or ""
        elif is_ep and strategy == "episode_still":
            image_url = meta.get("still_url") or meta.get("backdrop_url") or meta.get("poster_url") or ""
        elif is_ep:
            image_url = meta.get("backdrop_url") or meta.get("still_url") or meta.get("poster_url") or ""
        else:
            image_url = meta.get("backdrop_url") or meta.get("poster_url") or ""
        return {
            "item_name": sample.get("name", ""),
            "item_type": "TV" if is_ep else "MOV",
            "is_ep": is_ep,
            "status_text": "测试通知",
            "episode_text": episode_text,
            "overview": meta.get("overview_tmdb", ""),
            "image_url": image_url,
            "server_name": "测试服务器",
            "channel": "emby",
            "play_url": play_url,
            "detail_url": detail_url,
            "tmdb_url": (
                f"https://www.themoviedb.org/{'tv' if is_ep else 'movie'}/{tmdb_id}?language=zh-CN"
                if tmdb_id else ""
            ),
            "tmdb_id": tmdb_id,
            "season_id": season,
            "episode_id": episode,
            "genres": meta.get("genres", ""),
            "cast": meta.get("cast", ""),
            "rating": meta.get("rating", ""),
            "release_date": meta.get("release_date", ""),
            "poster_url": meta.get("poster_url", ""),
            "backdrop_url": meta.get("backdrop_url", ""),
            "still_url": meta.get("still_url", ""),
            "file_path": sample.get("file_path", ""),
            "added_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "library": sample.get("library", ""),
        }

    def _run_template_test(self, kind: str) -> Dict[str, Any]:
        """用固定样本按当前模板发送一条测试通知。"""
        if not self._enabled:
            return {"success": False, "message": "插件未启用，请先启用并保存", "data": None}
        try:
            media = self._build_test_media(kind)
            self._send_all_channels(media)
            label = "电视剧" if kind == "tv" else "电影"
            return {
                "success": True,
                "message": f"已按当前模板发送{label}测试通知",
                "data": {"tmdb_id": media.get("tmdb_id")},
            }
        except Exception as e:  # pylint: disable=broad-except
            logger.error(f"Emby入库通知 测试通知发送失败：{e}")
            return {"success": False, "message": f"发送失败：{e}", "data": None}

    async def api_test_movie(self, request: Request) -> Dict[str, Any]:
        """详情页「测试电影通知」按钮。"""
        del request
        return self._run_template_test("movie")

    async def api_test_tv(self, request: Request) -> Dict[str, Any]:
        """详情页「测试电视剧通知」按钮。"""
        del request
        return self._run_template_test("tv")

    def _send_test_action(self, action: str) -> None:
        """设置页「测试发送」：按选择发送电影 / 电视剧 / 两者样本（后台线程，不阻塞保存）。"""
        kinds = ["movie", "tv"] if action == "both" else [action]
        for kind in kinds:
            try:
                media = self._build_test_media(kind)
                self._send_all_channels(media)
                logger.info(
                    f"Emby入库通知 已按当前模板发送{('电视剧' if kind == 'tv' else '电影')}测试通知"
                )
            except Exception as e:  # pylint: disable=broad-except
                logger.error(f"Emby入库通知 测试发送失败（{kind}）：{e}")

    def get_form(self) -> Tuple[List[dict], Dict[str, Any]]:
        # MP 里已启用的通知渠道
        tg_items = []
        feishu_items = []
        try:
            notifications = self.systemconfig.get(SystemConfigKey.Notifications) or []
            for n in notifications:
                if not n.get("enabled"):
                    continue
                name = n.get("name", "")
                if n.get("type") == "telegram" and name:
                    tg_items.append({"title": name, "value": name})
                elif n.get("type") == "feishu" and name:
                    feishu_items.append({"title": name, "value": name})
        except Exception:
            pass

        variables_hint = (
            "可用变量：{{item_name}} 标题 | {{episode_text}} 季集 | {{library}} 分类 | {{genres}} 类型 | "
            "{{rating}} 评分 | {{release_date}} 发行 | {{cast}} 主演 | {{overview}} 简介 | "
            "{{original_title}} 原名 | {{duration}} 时长 | {{year}} 年份 | {{type_text}} 类型文字 | "
            "{{server_name}} 服务器 | {{file_path}} 文件 | {{added_at}} 时间 | "
            "{{detail_link}} 查看详情(Markdown) | {{detail_link_html}} 查看详情(HTML) | "
            "{{play_url}} 播放链接 | {{tmdb_url}} TMDB"
        )

        # ── 测试发送（保存后自动执行并复位） ──
        test_rows = [
            {'component': 'VRow', 'props': {'class': 'mt-4'}, 'content': [
                {'component': 'VCol', 'props': {'cols': 12}, 'content': [
                    {'component': 'VAlert', 'props': {
                        'type': 'info', 'variant': 'tonal',
                        'text': '🧪 测试发送：选好后点「保存」，按当前模板立即发送，发完自动复位'}}]}]},
            {'component': 'VRow', 'content': [
                {'component': 'VCol', 'props': {'cols': 12, 'md': 4}, 'content': [
                    {'component': 'VSelect', 'props': {
                        'model': 'test_action', 'label': '🧪 测试发送',
                        'items': [
                            {'title': '不操作', 'value': ''},
                            {'title': '发送电影测试', 'value': 'movie'},
                            {'title': '发送电视剧测试', 'value': 'tv'},
                            {'title': '电影 + 电视剧都发', 'value': 'both'},
                        ],
                        'hint': '保存后立即发送，随后自动复位',
                        'persistent-hint': True}}]}]},
        ]

        # ── Telegram ──
        tg_rows = [
            {'component': 'VRow', 'props': {'class': 'mt-4'}, 'content': [
                {'component': 'VCol', 'props': {'cols': 12}, 'content': [
                    {'component': 'VAlert', 'props': {
                        'type': 'success', 'variant': 'tonal', 'text': '📬 Telegram 通知配置'}}]}]},
            {'component': 'VRow', 'content': [
                {'component': 'VCol', 'props': {'cols': 12, 'md': 6}, 'content': [
                    {'component': 'VSwitch', 'props': {
                        'model': 'use_mp_tg', 'label': '使用 MP 内置 TG 配置', 'color': 'success',
                        'hint': '保存后刷新页面生效', 'persistent-hint': True}}]},
                {'component': 'VCol', 'props': {'cols': 12, 'md': 6}, 'content': [
                    {'component': 'VSelect', 'props': {
                        'model': 'mp_tg_channel', 'label': '选择 TG 通知渠道',
                        'items': tg_items,
                        'hint': f'检测到 {len(tg_items)} 个已启用的 Telegram 渠道' if tg_items else '未检测到已启用的 Telegram 渠道',
                        'persistent-hint': True}}]},
            ]},
        ]
        if not self._use_mp_tg:
            tg_rows.append(
                {'component': 'VRow', 'content': [
                    {'component': 'VCol', 'props': {'cols': 12, 'md': 4}, 'content': [
                        {'component': 'VTextField', 'props': {'model': 'tg_bot_token', 'label': 'Bot Token',
                            'hint': '通过 @BotFather 获取', 'persistent-hint': True}}]},
                    {'component': 'VCol', 'props': {'cols': 12, 'md': 4}, 'content': [
                        {'component': 'VTextField', 'props': {'model': 'tg_chat_id', 'label': 'Chat ID',
                            'hint': '目标用户或群组 ID', 'persistent-hint': True}}]},
                    {'component': 'VCol', 'props': {'cols': 12, 'md': 4}, 'content': [
                        {'component': 'VTextField', 'props': {'model': 'tg_api_host', 'label': 'API Host',
                            'placeholder': 'https://api.telegram.org',
                            'hint': '自建反代可修改', 'persistent-hint': True}}]},
                ]}
            )
        tg_rows.extend([
            {'component': 'VRow', 'content': [
                {'component': 'VCol', 'props': {'cols': 12}, 'content': [
                    {'component': 'VTextarea', 'props': {'model': 'tg_title_template', 'label': 'TG 标题模板',
                        'rows': 2, 'hint': '默认已预置，可直接微调', 'persistent-hint': True}}]}]},
            {'component': 'VRow', 'content': [
                {'component': 'VCol', 'props': {'cols': 12}, 'content': [
                    {'component': 'VTextarea', 'props': {'model': 'tg_body_template', 'label': 'TG 正文模板（HTML）',
                        'rows': 8,
                        'hint': '支持 Telegram HTML：<b>加粗</b>、<a href="">文字</a>；链接用 {{detail_link_html}}',
                        'persistent-hint': True}}]}]},
        ])

        # ── 飞书 ──
        feishu_rows = [
            {'component': 'VRow', 'props': {'class': 'mt-4'}, 'content': [
                {'component': 'VCol', 'props': {'cols': 12}, 'content': [
                    {'component': 'VAlert', 'props': {
                        'type': 'primary', 'variant': 'tonal', 'text': '🚀 飞书通知配置'}}]}]},
            {'component': 'VRow', 'content': [
                {'component': 'VCol', 'props': {'cols': 12, 'md': 6}, 'content': [
                    {'component': 'VSelect', 'props': {
                        'model': 'feishu_mode', 'label': '飞书发送方式',
                        'items': [
                            {'title': '复用 MP 飞书应用（推荐）', 'value': 'mp'},
                            {'title': '飞书群机器人 Webhook', 'value': 'webhook'},
                        ],
                        'persistent-hint': True}}]},
            ]},
        ]
        if (self._feishu_mode or 'mp') == 'webhook':
            feishu_rows.append(
                {'component': 'VRow', 'content': [
                    {'component': 'VCol', 'props': {'cols': 12}, 'content': [
                        {'component': 'VTextField', 'props': {
                            'model': 'feishu_webhook', 'label': '群机器人 Webhook 地址',
                            'placeholder': 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
                            'hint': '飞书群 → 设置 → 群机器人 → 添加自定义机器人',
                            'persistent-hint': True}}]}]}
            )
        else:
            feishu_rows.extend([
                {'component': 'VRow', 'content': [
                    {'component': 'VCol', 'props': {'cols': 12, 'md': 6}, 'content': [
                        {'component': 'VSwitch', 'props': {
                            'model': 'use_mp_feishu', 'label': '使用 MP 内置飞书配置', 'color': 'primary',
                            'hint': '保存后刷新页面生效', 'persistent-hint': True}}]},
                    {'component': 'VCol', 'props': {'cols': 12, 'md': 6}, 'content': [
                        {'component': 'VSelect', 'props': {
                            'model': 'mp_feishu_channel', 'label': '选择飞书通知渠道',
                            'items': feishu_items,
                            'hint': f'检测到 {len(feishu_items)} 个已启用的飞书渠道' if feishu_items else '未检测到已启用的飞书渠道',
                            'persistent-hint': True}}]},
                ]},
                {'component': 'VRow', 'content': [
                    {'component': 'VCol', 'props': {'cols': 12, 'md': 4}, 'content': [
                        {'component': 'VTextField', 'props': {
                            'model': 'feishu_app_id', 'label': 'App ID',
                            'hint': '不使用 MP 配置时填写', 'persistent-hint': True}}]},
                    {'component': 'VCol', 'props': {'cols': 12, 'md': 4}, 'content': [
                        {'component': 'VTextField', 'props': {
                            'model': 'feishu_app_secret', 'label': 'App Secret',
                            'persistent-hint': True}}]},
                    {'component': 'VCol', 'props': {'cols': 12, 'md': 4}, 'content': [
                        {'component': 'VTextField', 'props': {
                            'model': 'feishu_domain', 'label': '开放平台域名',
                            'placeholder': 'https://open.feishu.cn',
                            'hint': 'Lark 国际版填 https://open.larksuite.com',
                            'persistent-hint': True}}]},
                ]},
                {'component': 'VRow', 'content': [
                    {'component': 'VCol', 'props': {'cols': 12, 'md': 4}, 'content': [
                        {'component': 'VTextField', 'props': {
                            'model': 'feishu_receive_id', 'label': '接收者 ID（可选）',
                            'hint': '留空则用 MP 渠道的群聊/默认用户', 'persistent-hint': True}}]},
                    {'component': 'VCol', 'props': {'cols': 12, 'md': 4}, 'content': [
                        {'component': 'VSelect', 'props': {
                            'model': 'feishu_receive_id_type', 'label': '接收者类型',
                            'items': [
                                {'title': '群聊 chat_id', 'value': 'chat_id'},
                                {'title': '用户 open_id', 'value': 'open_id'},
                                {'title': '用户 user_id', 'value': 'user_id'},
                                {'title': '邮箱 email', 'value': 'email'},
                            ]}}]},
                ]},
            ])
        feishu_rows.extend([
            {'component': 'VRow', 'content': [
                {'component': 'VCol', 'props': {'cols': 12}, 'content': [
                    {'component': 'VTextarea', 'props': {'model': 'feishu_title_template', 'label': '飞书标题模板',
                        'rows': 2, 'hint': '默认已预置，可直接微调', 'persistent-hint': True}}]}]},
            {'component': 'VRow', 'content': [
                {'component': 'VCol', 'props': {'cols': 12}, 'content': [
                    {'component': 'VTextarea', 'props': {'model': 'feishu_body_template', 'label': '飞书正文模板',
                        'rows': 10,
                        'hint': '支持飞书 markdown：**加粗**、[文字](链接)；链接用 {{detail_link}}',
                        'persistent-hint': True}}]}]},
        ])

        form_content = [
            {'component': 'VRow', 'content': [
                {'component': 'VCol', 'props': {'cols': 12, 'md': 4}, 'content': [
                    {'component': 'VSwitch', 'props': {'model': 'enabled', 'label': '启用插件', 'color': 'primary'}}]}]},
            {'component': 'VRow', 'content': [
                {'component': 'VCol', 'props': {'cols': 12}, 'content': [
                    {'component': 'VAlert', 'props': {
                        'type': 'info', 'variant': 'tonal', 'style': 'font-size: 13px;',
                        'text': '📡 Webhook：http(s)://MP地址:3000/api/v1/plugin/embyxiaoluo/webhook?apikey=MP的API密钥'}}]}]},
            {'component': 'VRow', 'content': [
                {'component': 'VCol', 'props': {'cols': 12}, 'content': [
                    {'component': 'VAlert', 'props': {
                        'type': 'info', 'variant': 'tonal', 'style': 'font-size: 12px;',
                        'text': variables_hint}}]}]},
        ]
        form_content.extend(test_rows)
        form_content.extend(tg_rows)
        form_content.extend(feishu_rows)
        return [
            {'component': 'VForm', 'content': form_content}
        ], {
            "enabled": False,
            "test_action": "",
            "use_mp_tg": True, "mp_tg_channel": "",
            "tg_bot_token": "", "tg_chat_id": "", "tg_api_host": "",
            "tg_title_template": self._default_tg_title_template(),
            "tg_body_template": self._default_tg_body_template(),
            "tg_enabled": True, "feishu_enabled": True,
            "feishu_mode": "mp", "use_mp_feishu": True, "mp_feishu_channel": "",
            "feishu_app_id": "", "feishu_app_secret": "", "feishu_domain": "",
            "feishu_receive_id": "", "feishu_receive_id_type": "chat_id",
            "feishu_webhook": "",
            "feishu_title_template": self._default_feishu_title_template(),
            "feishu_body_template": self._default_feishu_body_template(),
            # 固定行为（界面不再暴露）
            "enable_tmdb": True, "enable_watch_link": True, "watch_link_type": "server",
            "link_redirect_prefix": "", "emby_server_url": "", "emby_server_name": "",
            "cover_strategy": "series_backdrop",
            "dedup_window": 60, "episode_cache_timeout": 30, "enable_custom_template": True,
        }

    @staticmethod
    def get_render_mode() -> Tuple[str, str]:
        """使用 Vue 模块联邦渲染插件详情页与配置页。"""
        return "vue", "dist/v1_0_19/assets"

    def get_page(self) -> List[dict]:
        """详情页由 Vue 组件通过插件 API 加载数据。"""
        return []
