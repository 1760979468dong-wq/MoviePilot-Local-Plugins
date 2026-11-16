"""站点后宫（邀请）页解析：邀请名额状态与被邀者列表。

参考「后宫管理系统」的做法：访问 NexusPHP 的 ``invite.php?id=<uid>``，
从「被邀者」表格里读取用户名、邮箱、上传、下载、分享率与状态，
并按分享率给出健康度，便于在总览里快速发现风险成员。
"""

from __future__ import annotations

import re
from typing import Any, Mapping

import requests
from lxml import etree

from .core import as_text, parse_number

# 表头关键字 → 内部字段，兼容简体/繁体与英文写法
_HEADER_FIELDS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("用户名", "用戶名", "username", "名字"), "username"),
    (("邮箱", "郵箱", "email", "电子邮件", "電子郵件"), "email"),
    (("上传", "上傳", "uploaded", "upload"), "uploaded"),
    (("下载", "下載", "downloaded", "download"), "downloaded"),
    (("分享率", "ratio"), "ratio"),
    (("当前做种数", "當前做種數", "做种数", "seeding"), "seeding_count"),
    (("做种体积", "做種體積", "seeding_size"), "seeding_size"),
    (("时魔", "時魔", "每小时", "每小時"), "hourly_bonus"),
    (("最后做种", "最後做種", "最近汇报", "最後匯報", "last_seen"), "last_seen"),
    (("状态", "狀態", "status"), "enabled"),
)

_SIZE_RE = re.compile(r"([\d.,]+)\s*([KMGTPE]?i?B)\b", re.IGNORECASE)
_UNITS = {
    "B": 1,
    "KB": 1024,
    "MB": 1024 ** 2,
    "GB": 1024 ** 3,
    "TB": 1024 ** 4,
    "PB": 1024 ** 5,
    "EB": 1024 ** 6,
}
# 明显的表头文字，用于过滤误抓的标题行
_HEADER_NOISE = frozenset(
    {"用户名", "用户", "邮箱", "邮件", "分享率", "上传", "下载", "状态", "确认", "username", "email"}
)

# 页头「邀请 [发送]: 1(0)」：括号前为可用名额，括号内为已发送
_QUOTA_PAIR_RE = re.compile(r"邀请[^0-9（(]{0,14}[：:]?\s*(\d+)\s*[（(]\s*(\d+)\s*[)）]")
# 页头「邀请 [发送]: 0/0」：斜杠前为可用名额，斜杠后为已发送（部分站点改版写法）
_QUOTA_SLASH_RE = re.compile(r"邀请[^0-9]{0,14}[：:]?\s*(\d+)\s*[/／]\s*(\d+)")
# 页头只有单个名额数字，如「[邀请]: 0」
_QUOTA_SINGLE_RE = re.compile(r"邀请\s*[\]】]?\s*[：:]\s*(\d+)")
# 邀请页统计行：被邀者当前状态 (N) / 已发邀请状态 (M)
_INVITEE_COUNT_RE = re.compile(r"被邀者当前状态\s*[（(]?\s*(\d+)\s*[)）]?")
_SENT_COUNT_RE = re.compile(r"已发邀请状态\s*[（(]?\s*(\d+)\s*[)）]?")


def size_to_bytes(value: Any) -> float | None:
    """把 ``1.5 TB`` 这类容量文本换算为字节数。"""

    match = _SIZE_RE.search(as_text(value))
    if not match:
        return None
    try:
        number = float(match.group(1).replace(",", ""))
    except ValueError:
        return None
    unit = match.group(2).upper().replace("I", "")
    return number * _UNITS.get(unit, 1)


def ratio_value(value: Any) -> float | None:
    """解析分享率文本；``∞``/``无限`` 返回 ``None``（由上层显示为无限）。"""

    text = as_text(value)
    if not text or text.lower() in _HEADER_NOISE or _SIZE_RE.search(text):
        return None
    if text in {"∞", "无限", "無限"} or text.lower().startswith("inf"):
        return None
    number = parse_number(text.replace(",", "."))
    return float(number) if number is not None else None


def ratio_health(ratio: float | None, uploaded: float | None, downloaded: float | None) -> tuple[str, str]:
    """按分享率给出健康度与中文标签。"""

    if ratio is None and uploaded is not None and downloaded is not None:
        if downloaded <= 0:
            return ("excellent", "无限") if uploaded > 0 else ("neutral", "无数据")
        ratio = uploaded / downloaded
    if ratio is None:
        return "neutral", "无数据"
    if ratio >= 1:
        return "good", "正常"
    if ratio >= 0.4:
        return "warning", "较低"
    if ratio > 0:
        return "danger", "危险"
    return "neutral", "无数据"


class InvitePageParser:
    """解析站点邀请页的被邀者列表。"""

    @classmethod
    def parse_quota(cls, html_text: str) -> dict[str, int]:
        """从邀请页解析该站的邀请名额。

        NexusPHP 各站写法差异较大，按可靠性依次尝试：

        1. 页头 ``邀请 [发送]: 1(0)`` —— 括号前为可用名额、括号内为已发送；
        2. 页头 ``[邀请]: 0`` —— 只有可用名额；
        3. 统计行 ``被邀者当前状态 (3)`` / ``已发邀请状态 (2)``。

        解析不到的字段不写入，交由上层决定是否沿用旧值。
        """

        result: dict[str, int] = {}
        if not html_text:
            return result
        try:
            tree = etree.HTML(html_text)
        except Exception:  # noqa: BLE001 - 页面异常按无数据处理
            return result
        if tree is None:
            return result
        text = re.sub(r"\s+", " ", " ".join(tree.itertext()))
        pair = _QUOTA_PAIR_RE.search(text)
        if pair:
            result["invites_available"] = int(pair.group(1))
            result["invites_sent"] = int(pair.group(2))
        else:
            slash = _QUOTA_SLASH_RE.search(text)
            if slash:
                result["invites_available"] = int(slash.group(1))
                result["invites_sent"] = int(slash.group(2))
            else:
                single = _QUOTA_SINGLE_RE.search(text)
                if single:
                    result["invites_available"] = int(single.group(1))
        sent = _SENT_COUNT_RE.search(text)
        if sent and "invites_sent" not in result:
            result["invites_sent"] = int(sent.group(1))
        invitees = _INVITEE_COUNT_RE.search(text)
        if invitees:
            result["invitee_count"] = int(invitees.group(1))
        return result

    @classmethod
    def parse(cls, html_text: str, site_url: str = "") -> list[dict[str, Any]]:
        """返回被邀者列表；解析不到时返回空列表。"""

        if not html_text:
            return []
        try:
            tree = etree.HTML(html_text)
        except Exception:  # noqa: BLE001 - 页面异常按无数据处理
            return []
        if tree is None:
            return []
        for table in tree.xpath("//table"):
            rows = table.xpath(".//tr")
            if len(rows) < 2:
                continue
            header_cells = [cls._text(cell) for cell in rows[0].xpath("./td|./th")]
            mapping = cls._header_mapping(header_cells)
            if "username" not in mapping or "ratio" not in mapping:
                continue
            invitees = []
            for row in rows[1:]:
                cells = [cls._text(cell) for cell in row.xpath("./td|./th")]
                if not any(cells):
                    continue
                item = cls._row(cells, mapping, row, site_url)
                if item:
                    invitees.append(item)
            if invitees:
                return invitees
        return []

    @staticmethod
    def _text(cell: Any) -> str:
        """取单元格纯文本并压缩空白。"""

        try:
            return re.sub(r"\s+", " ", " ".join(cell.itertext())).strip()
        except Exception:  # noqa: BLE001
            return ""

    @staticmethod
    def _header_mapping(header_cells: list[str]) -> dict[str, int]:
        """按表头文字建立「字段 → 列序号」映射。"""

        mapping: dict[str, int] = {}
        for index, raw in enumerate(header_cells):
            text = re.sub(r"\s+", "", raw).lower()
            if not text:
                continue
            for keywords, field in _HEADER_FIELDS:
                if field in mapping:
                    continue
                if any(keyword.lower() in text for keyword in keywords):
                    mapping[field] = index
                    break
        return mapping

    @classmethod
    def _row(
        cls,
        cells: list[str],
        mapping: Mapping[str, int],
        row: Any,
        site_url: str,
    ) -> dict[str, Any] | None:
        """把一行单元格转换为被邀者记录。"""

        def pick(field: str) -> str:
            index = mapping.get(field)
            if index is None or index >= len(cells):
                return ""
            return cells[index]

        username = pick("username")
        if not username or username.lower() in _HEADER_NOISE:
            return None
        uploaded = size_to_bytes(pick("uploaded"))
        downloaded = size_to_bytes(pick("downloaded"))
        ratio = ratio_value(pick("ratio"))
        health, label = ratio_health(ratio, uploaded, downloaded)

        profile_url = ""
        for link in row.xpath(".//a[@href]"):
            href = as_text(link.get("href"))
            if "userdetails.php" in href:
                profile_url = href if href.startswith("http") else f"{site_url.rstrip('/')}/{href.lstrip('/')}"
                break

        # 页面用 class 或图标标记禁用成员
        classes = as_text(row.get("class"))
        disabled = bool(re.search(r"banned|disabled", classes, re.IGNORECASE))
        status_text = pick("enabled")
        if re.search(r"^(no|否)$|禁|disabled|banned", status_text, re.IGNORECASE):
            disabled = True

        return {
            "username": username,
            "email": pick("email"),
            "uploaded": uploaded,
            "downloaded": downloaded,
            "ratio": None if ratio is None else round(ratio, 3),
            "seeding_count": int(parse_number(pick("seeding_count")) or 0),
            "seeding_size": size_to_bytes(pick("seeding_size")),
            "last_seen": pick("last_seen"),
            "status": "已禁用" if disabled else (status_text or "正常"),
            "disabled": disabled,
            "ratio_health": health,
            "ratio_label": label,
            "profile_url": profile_url,
        }


class InviteCollector:
    """按站点抓取邀请页并解析被邀者列表。"""

    def __init__(self, timeout: int = 25, proxy_host: str | None = None) -> None:
        self._timeout = max(int(timeout or 25), 5)
        self._proxy_host = as_text(proxy_host)

    def fetch(self, site: Mapping[str, Any]) -> dict[str, Any]:
        """抓取一个站点的邀请页，返回解析结果。"""

        host = as_text(site.get("host")) or as_text(site.get("domain"))
        uid = as_text(site.get("uid"))
        cookie = self._normalize_cookie(site.get("cookie"))
        user_agent = as_text(site.get("ua")) or "Mozilla/5.0"
        collected_at = as_text(site.get("collected_at"))
        if not host:
            return {"ok": False, "error": "缺少站点域名", "invitees": [], "collected_at": collected_at}
        if not cookie:
            return {"ok": False, "error": "站点未配置 Cookie", "invitees": [], "collected_at": collected_at}
        if not uid:
            return {"ok": False, "error": "缺少用户 UID，无法定位邀请页", "invitees": [], "collected_at": collected_at}

        url = f"https://{host}/invite.php?id={uid}"
        response, error = self._get(
            url,
            cookie,
            user_agent,
            use_proxy=bool(site.get("proxy")),
        )
        if response is None:
            return {
                "ok": False,
                "error": error,
                "invitees": [],
                "collected_at": collected_at,
            }
        if response.status_code != 200:
            return {
                "ok": False,
                "error": f"站点返回 HTTP {response.status_code}",
                "invitees": [],
                "collected_at": collected_at,
            }
        invitees = InvitePageParser.parse(response.text, f"https://{host}")
        quota = InvitePageParser.parse_quota(response.text)
        return {
            "ok": True,
            "error": "",
            "url": url,
            "invitees": invitees,
            "invites_available": quota.get("invites_available"),
            "invites_sent": quota.get("invites_sent"),
            "collected_at": collected_at,
        }

    def _get(
        self,
        url: str,
        cookie: str,
        user_agent: str,
        *,
        use_proxy: bool,
    ) -> tuple[requests.Response | None, str]:
        """请求邀请页：直连失败后自动换代理重试一次。

        多数站点在 MoviePilot 里未勾选「使用代理」，但容器直连会超时，
        导致邀请名额与被邀者列表长期为空；这里做一次通道回退。
        """

        headers = {
            "Cookie": cookie,
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml",
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
            except Exception as error:  # noqa: BLE001 - 网络异常统一转提示
                last_error = f"请求失败：{type(error).__name__}"
                continue
            if response.status_code >= 500:
                last_error = f"站点返回 HTTP {response.status_code}"
                continue
            return response, ""
        return None, last_error or "站点未返回可解析的页面"

    @staticmethod
    def _normalize_cookie(value: Any) -> str:
        """把 Cookie 压成单行，避免换行导致请求头非法。"""

        text = re.sub(r"[\r\n]+", "; ", as_text(value))
        text = re.sub(r";\s*;+", ";", text)
        return text.strip().strip(";").strip()
