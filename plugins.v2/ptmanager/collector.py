"""站点用户详情页扩展字段采集器。

MoviePilot 只把站点首页的账号概览写入 ``siteuserdata``，邀请、H&R、认领、
做种积分、时魔等字段必须回到站点页面获取。本模块用通用的 NexusPHP 标签解析
方式抓取 ``userdetails.php``，解析不到时如实返回原因，不做任何猜测。
"""

from __future__ import annotations

import re
from typing import Any, Mapping

import requests
from lxml import etree

from .core import as_float, as_int, as_text, parse_number

# 扩展字段的候选标签；同一含义在不同站点写法不同，全部列入候选。
# 上传、下载、分享率、做种数等基础字段以 MoviePilot 采集结果为准，这里不重复解析，
# 避免站点页面的图例文本污染权威数据。
FIELD_LABELS: dict[str, tuple[str, ...]] = {
    "uid": ("用户ID/UID", "用户ID", "UID", "用户 UID", "会员ID", "用戶ID/UID", "用戶ID", "會員ID"),
    "inviter": ("邀请人", "邀请者", "邀請人", "邀請者"),
    "invite": (
        "邀请名额",
        "邀请资格",
        "可发送邀请",
        "私人邀请",
        "邀请",
        "邀請名額",
        "邀請資格",
        "可發送邀請",
        "私人邀請",
        "邀請",
    ),
    "hr": ("H&R", "HR", "H＆R"),
    "claims": ("认领", "认领数", "認領", "認領數"),
    "seeding_points": ("做种积分", "种子积分", "积分", "做種積分", "種子積分", "積分"),
    "bonus": ("魔力值", "魔力", "蝌蚪", "金币", "煤灰", "奖励点数", "金幣", "獎勵點數"),
    "hourly_bonus": ("时魔", "每小时魔力", "魔力/小时", "每小时积分", "時魔", "每小時魔力", "每小時積分"),
    "seeding_time": ("做种时间", "累计做种时间", "做種時間", "累計做種時間"),
    "leeching_time": ("下载时间", "累计下载时间", "下載時間", "累計下載時間"),
    "time_ratio": (
        "做种/下载时间比率",
        "做种下载时间比率",
        "做種/下載時間比率",
        "做種下載時間比率",
    ),
    "join_at": ("加入日期", "注册日期", "加入时间", "注册时间", "註冊日期", "註冊時間"),
    "client": ("BT客户端", "客户端", "BT用戶端", "用戶端"),
    "seeding_now": ("做种中", "当前做种", "做種中", "當前做種"),
    "leeching_now": ("下载中", "当前下载", "下載中", "當前下載"),
}

# 允许在长文本中段匹配的标签，用于站点把多个指标挤在同一行的紧凑表头。
INLINE_SCAN_LABELS: tuple[str, ...] = (
    "做种积分",
    "时魔",
    "认领",
    "邀请",
    "H&R",
    "魔力值",
)

def _element_text(element: Any) -> str:
    """安全取出 lxml 元素的全部文本（兼容 etree 与 html 两种节点）。"""

    try:
        return " ".join(element.itertext())
    except Exception:  # noqa: BLE001 - 节点异常时退回空串
        return ""


# 明确表示「没有」的措辞，用于把文本型结果归一化为 0。
_ABSENT_HINT_RE = re.compile(r"没有|无|不可|禁止|未开放|不具备")

# 形如 ``0(0)`` 的邀请名额/已发送邀请
_INVITE_PAIR_RE = re.compile(r"(\d+)\s*[（(]\s*(\d+)\s*[)）]")
# 形如 ``0/5000`` 的认领已用/上限
_CLAIM_PAIR_RE = re.compile(r"(\d+)\s*[/／]\s*(\d+)")
# 纯数值文本
_PURE_NUMBER_RE = re.compile(r"[\d,]+(?:\.\d+)?")
# 标签文本清洗
_BRACKET_CLEAN_RE = re.compile(r"[\[\]【】()（）\s:：]+")
# Cookie 中的换行与多余分隔符
_COOKIE_SPLIT_RE = re.compile(r"[\r\n]+")
_COOKIE_DUP_SEP_RE = re.compile(r";\s*;+")
# 客户端名称特征，用于过滤表头里的 IPv4、地点等无关取值
_CLIENT_RE = re.compile(
    r"qBittorrent|Transmission|Deluge|rTorrent|µTorrent|uTorrent|libtorrent|aria2|Xunlei|"
    r"BiglyBT|Vuze|Flood|Torrent|Downloader|BitComet|qbit",
    re.IGNORECASE,
)
# 取值文本必须含有的有效字符；用于剔除 ``[`` ``]:`` 这类分隔符残留片段
_VALUE_CONTENT_RE = re.compile(r"[0-9A-Za-z\u4e00-\u9fff]")

# 魔力明细页的时魔句式：你当前每小时能获取134.341个魔力值 / 你當前每小時能獲取 2,081.5 个
_HOURLY_BONUS_RE = re.compile(
    r"(?:你当前每小时能获取|你當前每小時能獲取|当前每小时能获取|當前每小時能獲取|"
    r"每小时能获取|每小時能獲取|每小时获得|每小時獲得)"
    r"\s*([\d,]+(?:\.\d+)?)"
)

# 基础时魔之外的额外奖励，如：保种体积大于1TB且做种满24小时非零魔种子额外奖励（22.565）（超4361 GB）
_EXTRA_BONUS_RE = re.compile(
    r"(?:额外奖励|額外獎勵|额外加成|額外加成|时魔奖励|時魔獎勵)"
    r"[^0-9（(]{0,20}[（(]\s*([\d,]+(?:\.\d+)?)\s*[)）]"
)
# 紧跟标签但属于操作按钮的文字，不能当作取值
_ACTION_WORDS = frozenset(
    {
        "使用",
        "使用&说明",
        "发送",
        "發送",
        "查看",
        "察看",
        "详情",
        "詳情",
        "显示",
        "隐藏",
        "隱藏",
        "更多",
        "清除",
        "管理",
        "设置",
        "設置",
        "点击",
        "點擊",
        "进入",
        "進入",
    }
)
# 取值尾部括注；纯数字括注属于成对数据（如邀请 ``1(0)``），不能当说明文字剔除。
# 闭合括号可选，用于处理站点把括注拆到下一个文本片段、取值只剩 ``2026-01-20 00:22:21 (`` 的情况。
_TRAILING_ANNOTATION_RE = re.compile(r"\s*[（(]\s*([^（()）]*?)\s*[)）]?\s*$")
# 站点把「当前做种数 / 当前下载数」写成一行成对文本的几种形式
_ACTIVITY_PATTERNS: tuple[str, ...] = (
    # 部分站点在标签与冒号之间插入 ``[清除]`` 之类的操作链接
    r"(?:当前活动|當前活動)\s*(?:\[[^\]]{0,20}\]\s*)?[：:]\s*(\d[\d,]*)\s+(\d[\d,]*)",
    r"活动\s*[：:]\s*[⬆↑]\s*(\d[\d,]*)\s*[⬇↓]\s*(\d[\d,]*)",
)
# 站点把时魔写在魔力值标签的括注里，如 ``魔力值(0魔力/小时)``
_HOURLY_PATTERNS: tuple[str, ...] = (r"(\d[\d,.]*)\s*(?:魔力|积分|積分)\s*/\s*(?:小时|小時)",)
_LABEL_BY_TEXT: dict[str, str] = {}
for _key, _labels in FIELD_LABELS.items():
    for _label in _labels:
        _LABEL_BY_TEXT.setdefault(_BRACKET_CLEAN_RE.sub("", _label), _key)
# 「邀请」既是邀请人字段的一部分，也用于邀请名额，这里明确归属邀请名额。
_LABEL_BY_TEXT["邀请"] = "invite"
_LABEL_BY_TEXT["HR"] = "hr"
_LABEL_BY_TEXT["H&R"] = "hr"


class SitePageCollector:
    """按站点抓取并解析用户详情页扩展字段。"""

    def __init__(
        self,
        *,
        timeout: int = 25,
        proxy_host: str | None = None,
        user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    ) -> None:
        """记录超时、代理与请求头配置。"""

        self._timeout = max(int(timeout or 25), 5)
        self._proxy_host = as_text(proxy_host)
        self._user_agent = user_agent
        self._headers = {
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml",
        }

    def _get(
        self,
        url: str,
        cookie: str,
        user_agent: str,
        *,
        use_proxy: bool,
    ) -> tuple[requests.Response | None, str]:
        """请求站点页面：先按站点配置的直连/代理，失败后换另一条通道重试。

        容器内直连多数海外 PT 站会超时，而站点本身并没有勾选「使用代理」，
        表现为整站扩展字段（含邀请名额）采集失败。这里在直连失败时自动
        用 MoviePilot 配置的代理再试一次，避免用户逐站手动开代理。

        返回 ``(响应, 错误文本)``；4xx 视为站点明确拒绝，不再换通道重试。
        """

        headers = {
            "Cookie": cookie,
            "User-Agent": user_agent or self._headers["User-Agent"],
            "Accept": self._headers["Accept"],
        }
        attempts = [bool(use_proxy)]
        if self._proxy_host:
            attempts.append(not use_proxy)
        last_error = ""
        for flag in attempts:
            proxies = (
                {"http": self._proxy_host, "https": self._proxy_host}
                if flag and self._proxy_host
                else None
            )
            try:
                response = requests.get(
                    url,
                    headers=headers,
                    proxies=proxies,
                    timeout=self._timeout,
                    verify=False,
                    allow_redirects=True,
                )
            except Exception as error:  # noqa: BLE001 - 网络异常统一转提示文本
                last_error = f"请求失败：{type(error).__name__}"
                continue
            if response.status_code >= 500:
                last_error = f"站点返回 HTTP {response.status_code}"
                continue
            return response, ""
        return None, last_error or "站点未返回可解析的页面"

    def collect(self, site: Mapping[str, Any]) -> dict[str, Any]:
        """抓取单个站点的用户详情页并返回结构化扩展字段。"""

        domain = as_text(site.get("domain"))
        host = as_text(site.get("host")) or domain
        uid = as_text(site.get("uid"))
        cookie = self.normalize_cookie(site.get("cookie"))
        user_agent = as_text(site.get("ua")) or self._user_agent
        if not host:
            return {"ok": False, "error": "缺少站点域名", "raw": []}
        if not cookie:
            return {"ok": False, "error": "站点未配置 Cookie", "raw": []}
        if not uid:
            return {"ok": False, "error": "缺少用户 UID，无法定位详情页", "raw": []}

        use_proxy = bool(site.get("proxy"))

        last_error = ""
        for parameter in ("id", "userid"):
            url = f"https://{host}/userdetails.php?{parameter}={uid}"
            response, error = self._get(url, cookie, user_agent, use_proxy=use_proxy)
            if response is None:
                last_error = error
                continue
            if response.status_code != 200:
                last_error = f"站点返回 HTTP {response.status_code}"
                continue
            parsed = self.parse_user_details(response.text)
            if not parsed.get("fields"):
                last_error = "页面未解析到可识别的账号字段（可能需要重新登录站点）"
                continue
            parsed["ok"] = True
            parsed["url"] = url
            # 时魔在魔力明细页（mybonus.php），用户详情页通常没有该字段。
            if parsed.get("fields", {}).get("hourly_bonus") is None:
                hourly = self.fetch_hourly_bonus(host, cookie, user_agent, use_proxy=use_proxy)
                if hourly is not None:
                    parsed.setdefault("fields", {})["hourly_bonus"] = hourly
                    parsed.setdefault("raw", []).append(f"hourly_bonus={hourly}（mybonus.php）")
            return parsed
        return {"ok": False, "error": last_error or "站点未返回可解析的页面", "raw": []}

    @staticmethod
    def normalize_cookie(value: Any) -> str:
        """把站点保存的 Cookie 压成单行，避免换行导致的请求头非法。"""

        text = _COOKIE_SPLIT_RE.sub("; ", as_text(value))
        text = _COOKIE_DUP_SEP_RE.sub(";", text)
        return text.strip().strip(";").strip()

    def fetch_hourly_bonus(
        self,
        host: str,
        cookie: str,
        user_agent: str,
        *,
        use_proxy: bool = False,
    ) -> float | None:
        """从魔力明细页（mybonus.php）读取站点给出的真实时魔。

        NexusPHP 的写法没有统一标签，实测常见为
        ``你当前每小时能获取134.341个魔力值``（繁中为「你當前每小時能獲取」）。
        不同站点把魔力称作魔力值/电力值/积分等，因此只锚定"每小时能获取"这一句式。
        """

        url = f"https://{host}/mybonus.php"
        response, _ = self._get(url, cookie, user_agent, use_proxy=use_proxy)
        if response is None or response.status_code != 200:
            return None
        return self.parse_hourly_bonus(response.text)

    @staticmethod
    def parse_hourly_bonus(html_text: str) -> float | None:
        """从魔力明细页解析每小时可获得的**合计**数量。

        站点常把时魔拆成「基本奖励 / 官种加成 / 后宫加成」等多项，
        页面上的「合计」才是真正的每小时总量（如憨憨 139.642、UBits 153.824）。
        因此优先解析带「合计」列的奖励表格，取不到时才退回单句表述。
        """

        if not html_text:
            return None
        tree = None
        try:
            tree = etree.HTML(html_text)
        except Exception:  # noqa: BLE001 - HTML 异常时退回正则直扫
            tree = None

        if tree is not None:
            total = SitePageCollector._parse_bonus_total_table(tree)
            if total is not None:
                return total
            # 部分站点用 div 网格排版，合计是跨行的合并单元格
            total = SitePageCollector._parse_bonus_total_grid(tree)
            if total is not None:
                return total
            text = tree.xpath("string(.)")
        else:
            text = html_text

        text = re.sub(r"\s+", " ", text or "")
        value = _HOURLY_BONUS_RE.search(text)
        if not value:
            return None
        number = parse_number(value.group(1))
        if number is None:
            return None
        # 部分站点在基础时魔之外还有额外奖励（如家园「保种体积大于 1TB … 额外奖励（22.565）」），
        # 这些奖励同样计入每小时收益，需要累加，否则显示值会偏小。
        extra = SitePageCollector._parse_extra_bonus(text)
        return round(float(number) + extra, 3)

    @staticmethod
    def _parse_extra_bonus(text: str) -> float:
        """解析基础时魔之外的「额外奖励」数值，累加到每小时收益。"""

        total = 0.0
        for match in _EXTRA_BONUS_RE.finditer(text or ""):
            number = parse_number(match.group(1))
            if number is not None and float(number) > 0:
                total += float(number)
        return total

    @staticmethod
    def _parse_bonus_total_grid(tree: Any) -> float | None:
        """解析 div 网格排版的奖励表合计（合计为跨行合并单元格）。

        憨憨等站点不用 ``<table>``，而是用 flex/grid 的 div 画表，
        「合计」列是一个带 ``row-span`` 的单元格，值即每小时总量。
        """

        # 找到「合计」表头元素，再从其容器内找跨行单元格
        headers = tree.xpath(
            "//*[normalize-space(text())='合计' and not(.//*)]"
        )
        for header in headers:
            container = header.getparent()
            for _ in range(3):
                if container is None:
                    break
                spanning = container.xpath(
                    ".//*[contains(@class,'row-span') or contains(@style,'row-span')]"
                )
                for cell in spanning:
                    raw = re.sub(r"\s+", "", _element_text(cell))
                    number = parse_number(raw)
                    if number is not None and float(number) > 0:
                        return round(float(number), 3)
                container = container.getparent()
        return None

    @staticmethod
    def _parse_bonus_total_table(tree: Any) -> float | None:
        """解析「奖励类型 … 合计」奖励表格中的合计值。"""

        for table in tree.xpath("//table"):
            # 取表格内第一行作为表头（lxml 会自动补 tbody，需用 (.//tr)[1]）
            first_row = table.xpath("(.//tr)[1]")
            if not first_row:
                continue
            header = [
                re.sub(r"\s+", "", _element_text(cell))
                for cell in first_row[0].xpath("./td|./th")
            ]
            # 表头写法各站不同：有的以「奖励类型」开头，有的直接是「数量 / 体积 …」，
            # 只要末列是「合计」且能取到数值，就认为是每小时收益汇总表。
            if "合计" not in header or len(header) < 3:
                continue
            total_index = header.index("合计")
            for tr in table.xpath(".//tr")[1:]:
                cells = tr.xpath("./td|./th")
                if len(cells) <= total_index:
                    continue
                raw = re.sub(r"\s+", "", _element_text(cells[total_index]))
                if not raw or not re.search(r"\d", raw):
                    continue
                number = parse_number(raw)
                # 合计为 0 通常表示未计算，不作为有效时魔
                if number is not None and float(number) > 0:
                    return round(float(number), 3)
        return None

    @classmethod
    def parse_user_details(cls, html_text: str) -> dict[str, Any]:
        """从用户详情页 HTML 中解析标签取值并归一化为扩展字段。"""

        tokens = cls._tokens(html_text)
        candidates: dict[str, list[str]] = {}
        raw: list[str] = []

        def remember(key: str, value: str) -> None:
            """按置信度顺序累积候选值并记录原始文本。"""

            if value:
                candidates.setdefault(key, []).append(value)
                text = f"{key}={value}"
                if text not in raw:
                    raw.append(text)

        # 第一轮：同一片段内直接给出取值（置信度最高）
        pending: list[tuple[int, str]] = []
        for index, token in enumerate(tokens):
            matched = cls._match_with_separator(token)
            if not matched:
                continue
            key, value = matched
            if value:
                remember(key, value)
            else:
                pending.append((index, key))
        # 第二轮：标签与取值被拆成相邻片段
        for index, key in pending:
            value = cls._next_value(tokens, index)
            if value:
                remember(key, value)
        # 第三轮：片段本身就是标签（无分隔符）
        for index, token in enumerate(tokens):
            key = cls._label_key(token)
            if not key or index + 1 >= len(tokens):
                continue
            value = cls._next_value(tokens, index)
            if value:
                remember(key, value)
        # 第四轮：紧凑表头中段匹配，只补空缺字段
        for token in tokens:
            if len(token) < 16:
                continue
            for label in INLINE_SCAN_LABELS:
                key = cls._label_key(label)
                if not key or candidates.get(key):
                    continue
                match = re.search(
                    rf"{re.escape(label)}\s*[：:]\s*([^\s：:，,；;]{{1,30}})", token
                )
                if match:
                    cleaned = cls._clean_value(match.group(1))
                    if cleaned:
                        remember(key, cleaned)

        # 第五轮：整行成对指标（如「当前活动：738 0」）与时魔括注，按正则单独提取
        plain = " ".join(tokens)
        for pattern in _ACTIVITY_PATTERNS:
            if candidates.get("activity"):
                break
            match = re.search(pattern, plain)
            if match:
                remember("activity", " ".join(match.groups()))
        if not candidates.get("hourly_bonus"):
            for pattern in _HOURLY_PATTERNS:
                match = re.search(pattern, plain)
                if match:
                    remember("hourly_bonus", match.group(1))
                    break

        return {"fields": cls._normalize(candidates), "raw": raw[:40]}

    @classmethod
    def _tokens(cls, html_text: str) -> list[str]:
        """把页面拆成顺序文本片段，作为标签与取值匹配的基础。"""

        html = etree.HTML(html_text or "")
        if html is not None:
            tokens = [" ".join(node.split()) for node in html.xpath("//text()")]
        else:
            plain = re.sub(r"<[^>]+>", "\n", html_text or "")
            tokens = [" ".join(line.split()) for line in plain.splitlines()]
        return [token for token in tokens if token]

    @classmethod
    def _match_with_separator(cls, token: str) -> tuple[str, str] | None:
        """匹配 ``标签：取值`` 或仅有 ``标签：`` 的片段。"""

        stripped = token.strip()
        for key, labels in FIELD_LABELS.items():
            for label in labels:
                pattern = rf"^[\[\]【】]?\s*{re.escape(label)}\s*[\[\]【】]?\s*[：:]\s*(.*)$"
                match = re.match(pattern, stripped)
                if not match:
                    continue
                return key, cls._clean_value(match.group(1))
        return None

    @staticmethod
    def _clean_value(value: Any) -> str:
        """清理取值文本：去掉分隔符残留、括注说明与尾部标点。"""

        text = as_text(value)
        text = re.sub(r"^[\[\]【】:：\-—\s]+", "", text)
        # 站点常在取值后追加括注（如「2026-09-03 17:46:56 (1月9天前, 5周)」）
        annotation = _TRAILING_ANNOTATION_RE.search(text)
        if annotation and not _PURE_NUMBER_RE.fullmatch(annotation.group(1).replace(",", "")):
            text = text[: annotation.start()]
        return text.rstrip(":：,，;；|").strip()

    @classmethod
    def _label_key(cls, token: str) -> str:
        """判断片段是否本身就是已知标签，是则返回归一化字段名。"""

        cleaned = _BRACKET_CLEAN_RE.sub("", token.strip())
        if not cleaned or len(cleaned) > 12:
            return ""
        return _LABEL_BY_TEXT.get(cleaned, "")

    @classmethod
    def _next_value(cls, tokens: list[str], index: int) -> str:
        """在标签片段之后寻找第一个可信取值片段。"""

        for offset in range(1, 4):
            position = index + offset
            if position >= len(tokens):
                return ""
            candidate = as_text(tokens[position])
            if not cls._is_plausible_value(candidate):
                continue
            cleaned = cls._clean_value(candidate)
            # 片段可能只是分隔符残留或紧跟标签的操作按钮文字，继续向后找真正的取值
            if not cleaned or not _VALUE_CONTENT_RE.search(cleaned):
                continue
            if cleaned in _ACTION_WORDS:
                continue
            # 站点会用 ``<wbr>`` 等标签把千分位数值拆成多个片段（如 ``26,`` + ``830.8``）
            return cls._merge_continuation(tokens, position, cleaned, candidate)
        return ""

    @classmethod
    def _merge_continuation(cls, tokens: list[str], position: int, value: str, raw: str) -> str:
        """把被标签拆开的数值片段重新拼接，如 ``26,`` + ``830.8`` → ``26,830.8``。"""

        merged = value
        source = as_text(raw).rstrip()
        for offset in range(1, 3):
            # 片段末尾的分隔符可能已被 _clean_value 去掉，需回看原始片段判断是否被截断
            tail = source[-1:] if offset == 1 else merged[-1:]
            if tail not in (",", ".", "-", "/", ":"):
                break
            following = as_text(tokens[position + offset]) if position + offset < len(tokens) else ""
            if not following or not re.match(r"^\d", following):
                break
            merged = f"{merged}{cls._clean_value(following)}"
            source = as_text(following).rstrip()
        return merged

    @classmethod
    def _is_plausible_value(cls, value: str) -> bool:
        """判断片段是否可作为取值，过滤链接、标签与说明文字。"""

        if not value or len(value) > 60:
            return False
        if value.endswith((":", "：")):
            return False
        if re.match(r"^[\[\]【】].*[\[\]【】][：:]?$", value):
            return False
        if cls._label_key(value):
            return False
        return value not in {"查看", "详情", "邀请树", "控制面板", "显示/隐藏", "清除", "更多"}

    @classmethod
    def _normalize(cls, candidates: Mapping[str, list[str]]) -> dict[str, Any]:
        """把候选取值归一化为带类型的扩展字段。"""

        def first(key: str) -> str:
            """返回该字段的首个非空候选文本。"""

            for value in candidates.get(key, []):
                if as_text(value):
                    return as_text(value)
            return ""

        def first_number(key: str) -> float | None:
            """返回该字段首个可解析为数字的候选值，跳过括注与操作词等噪声。"""

            for value in candidates.get(key, []):
                number = parse_number(value)
                if number is not None:
                    return number
            return None

        fields: dict[str, Any] = {}
        uid_raw = first("uid")
        if uid_raw:
            # 少数站点把「用户名 / UID」写在同一个单元格，取最后一段作为 UID
            fields["uid"] = uid_raw.split("/")[-1].strip() or uid_raw
        for key in ("inviter", "join_at", "seeding_time", "leeching_time"):
            text = first(key)
            if text:
                fields[key] = text
        client = next(
            (value for value in candidates.get("client", []) if _CLIENT_RE.search(as_text(value))),
            "",
        )
        if client:
            fields["client"] = as_text(client)
        time_ratio = first_number("time_ratio")
        if time_ratio is not None:
            fields["time_ratio"] = time_ratio
        fields.update(cls._normalize_invites(candidates.get("invite", [])))
        fields.update(cls._normalize_claims(candidates.get("claims", [])))
        fields.update(cls._normalize_hr(candidates.get("hr", [])))
        for key in ("seeding_points", "bonus", "hourly_bonus"):
            number = first_number(key)
            if number is not None:
                fields[key] = number
        for key in ("seeding_now", "leeching_now"):
            number = first_number(key)
            if number is not None:
                fields[key] = int(number)
        # 「当前活动：738 0」是站点页面给出的实时做种/下载数，MoviePilot 不采集该字段
        activity = first("activity")
        if activity:
            numbers = [int(item.replace(",", "")) for item in re.findall(r"\d[\d,]*", activity)]
            if len(numbers) >= 2:
                fields.setdefault("seeding_now", numbers[0])
                fields.setdefault("leeching_now", numbers[1])
            elif numbers:
                fields.setdefault("seeding_now", numbers[0])
        return fields

    @staticmethod
    def _normalize_invites(values: list[str]) -> dict[str, Any]:
        """归一化邀请名额与已发送邀请数量。"""

        texts = [as_text(value) for value in values if as_text(value)]
        for text in texts:
            pair = _INVITE_PAIR_RE.search(text)
            if pair:
                return {
                    "invites_available": int(pair.group(1)),
                    "invites_sent": int(pair.group(2)),
                }
        for text in texts:
            if _PURE_NUMBER_RE.fullmatch(text.replace(",", "")):
                return {"invites_available": int(parse_number(text) or 0)}
        for text in texts:
            if _ABSENT_HINT_RE.search(text):
                return {"invite_raw": text, "invites_available": 0}
        return {"invite_raw": texts[0]} if texts else {}

    @staticmethod
    def _normalize_claims(values: list[str]) -> dict[str, Any]:
        """归一化认领数量，站点普遍以 ``已用/上限`` 形式展示。"""

        for text in (as_text(value) for value in values):
            if not text:
                continue
            pair = _CLAIM_PAIR_RE.search(text)
            if pair:
                return {
                    "claims_used": int(pair.group(1)),
                    "claims_total": int(pair.group(2)),
                }
        for text in (as_text(value) for value in values):
            number = parse_number(text)
            if number is not None:
                return {"claims_used": int(number)}
        return {}

    @staticmethod
    def _normalize_hr(values: list[str]) -> dict[str, Any]:
        """归一化 H&R 未完成数量。"""

        for text in (as_text(value) for value in values):
            if not text:
                continue
            if _ABSENT_HINT_RE.search(text):
                return {"hr": 0, "hr_raw": text}
            number = parse_number(text)
            if number is not None:
                return {"hr": int(number), "hr_raw": text}
        return {}

    @staticmethod
    def normalize_number(value: Any) -> float | None:
        """对外暴露数值解析，便于测试与复用。"""

        return as_float(value)

    @staticmethod
    def normalize_int(value: Any) -> int:
        """对外暴露整数解析，便于测试与复用。"""

        return as_int(value)
