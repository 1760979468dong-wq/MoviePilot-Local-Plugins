"""PT管家插件的纯函数工具：数值解析、字段聚合与总量合计。"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any, Iterable, Mapping

# 容量单位换算表，站点页面与 MoviePilot 均按 1024 进制展示
BYTE_UNITS: dict[str, int] = {
    "B": 1,
    "KB": 1024,
    "MB": 1024**2,
    "GB": 1024**3,
    "TB": 1024**4,
    "PB": 1024**5,
    "EB": 1024**6,
}

# 中文数量级后缀
CN_SCALE: dict[str, float] = {"万": 10_000.0, "亿": 100_000_000.0}

_NUMBER_RE = re.compile(r"-?\d[\d,\s]*(?:\.\d+)?")
_LABEL_NOISE_RE = re.compile(r"[\[\]【】()（）\s:：]+")


def as_text(value: Any) -> str:
    """把任意值安全转换为去空白的文本。"""

    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def as_int(value: Any) -> int:
    """把任意值安全转换为整数，失败时返回 0。"""

    if value is None or value == "":
        return 0
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    number = parse_number(value)
    return int(number) if number is not None else 0


def as_float(value: Any) -> float | None:
    """把任意值安全转换为浮点数，失败时返回 None。"""

    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, (int, float)):
        return float(value)
    return parse_number(value)


def parse_number(value: Any) -> float | None:
    """解析站点页面文本中的数值，支持千分位、单位后缀与万/亿数量级。"""

    text = as_text(value)
    if not text:
        return None
    match = _NUMBER_RE.search(text)
    if not match:
        return None
    number_text = match.group(0).replace(",", "").replace(" ", "")
    try:
        number = float(number_text)
    except ValueError:
        return None
    tail = text[match.end():].strip()
    for suffix, scale in CN_SCALE.items():
        if tail.startswith(suffix):
            number *= scale
            break
    return number


def parse_capacity(value: Any) -> int | None:
    """解析带容量单位的文本为字节数，例如 ``293.99 GB``。"""

    text = as_text(value).upper()
    if not text:
        return None
    match = _NUMBER_RE.search(text)
    if not match:
        return None
    number_text = match.group(0).replace(",", "").replace(" ", "")
    try:
        number = float(number_text)
    except ValueError:
        return None
    tail = text[match.end():].strip()
    for unit in sorted(BYTE_UNITS, key=len, reverse=True):
        if tail.startswith(unit):
            return int(number * BYTE_UNITS[unit])
    for suffix, scale in CN_SCALE.items():
        if tail.startswith(suffix):
            return int(number * scale)
    return None


def format_bytes(value: Any) -> str:
    """按 1024 进制把字节数格式化为容量文本。"""

    number = as_float(value) or 0.0
    if number <= 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"]
    index = 0
    while number >= 1024 and index < len(units) - 1:
        number /= 1024
        index += 1
    if index == 0:
        return f"{int(number)} {units[index]}"
    digits = 2 if number < 100 else 1
    return f"{number:.{digits}f} {units[index]}"


def format_number(value: Any, digits: int = 2) -> str:
    """格式化普通数值，缺失时返回占位文本。"""

    number = as_float(value)
    if number is None:
        return "未提供"
    return f"{number:,.{digits}f}".rstrip("0").rstrip(".") if digits else f"{number:,.0f}"


def overall_ratio(upload: Any, download: Any) -> float | None:
    """按上传下载总量计算综合分享率。"""

    upload_value = as_float(upload) or 0.0
    download_value = as_float(download) or 0.0
    if download_value <= 0:
        return None
    return round(upload_value / download_value, 3)


def normalize_ratio(ratio: Any, upload: Any, download: Any) -> float | None:
    """优先使用站点分享率，为 0 且流量正常时按上传下载兜底计算。"""

    value = as_float(ratio)
    upload_value = as_float(upload) or 0.0
    download_value = as_float(download) or 0.0
    if not value and upload_value > 0 and download_value > 0:
        return round(upload_value / download_value, 3)
    return value


def parse_datetime(value: Any) -> datetime | None:
    """解析站点或 MoviePilot 提供的日期时间文本。"""

    text = as_text(value)
    if not text:
        return None
    candidate = text.replace("T", " ").split("+")[0].strip()
    candidate = re.sub(r"\s*\(.*\)\s*$", "", candidate)
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d",
        "%Y-%m-%dT%H:%M:%S",
    ):
        try:
            return datetime.strptime(candidate[: len(fmt) + 2].strip(), fmt)
        except ValueError:
            continue
    return None


def career_days(join_at: Any, now: datetime | None = None) -> int | None:
    """计算加入站点至今的天数。"""

    joined = parse_datetime(join_at)
    if joined is None:
        return None
    reference = now or datetime.now()
    # 站点解析出的加入时间不带时区，调用方可能传入带时区的当前时间，
    # 直接相减会抛 TypeError；统一按无时区比较。
    if reference.tzinfo is not None and joined.tzinfo is None:
        reference = reference.replace(tzinfo=None)
    elif reference.tzinfo is None and joined.tzinfo is not None:
        joined = joined.replace(tzinfo=None)
    return max((reference - joined).days, 0)


def estimate_hourly_bonus(
    current: Mapping[str, Any],
    previous: Mapping[str, Any] | None,
) -> float | None:
    """根据最近两次成功的站点快照估算每小时魔力增长。"""

    if not previous:
        return None
    current_bonus = as_float(current.get("bonus"))
    previous_bonus = as_float(previous.get("bonus"))
    if current_bonus is None or previous_bonus is None or current_bonus < previous_bonus:
        return None
    current_time = parse_datetime(current.get("source_updated_at")) or parse_datetime(
        f"{as_text(current.get('updated_day'))} {as_text(current.get('updated_time'))}"
    )
    previous_time = parse_datetime(previous.get("source_updated_at")) or parse_datetime(
        f"{as_text(previous.get('updated_day'))} {as_text(previous.get('updated_time'))}"
    )
    if current_time is None or previous_time is None:
        return None
    elapsed_hours = (current_time - previous_time).total_seconds() / 3600
    if elapsed_hours <= 0.5:
        return None
    return round((current_bonus - previous_bonus) / elapsed_hours, 2)


def daily_average(
    latest: Mapping[str, Any],
    earliest: Mapping[str, Any] | None,
) -> dict[str, float | None]:
    """按历史首末快照估算每日上传与下载增量。"""

    result: dict[str, float | None] = {"upload": None, "download": None, "bonus": None}
    if not earliest:
        return result
    start_time = parse_datetime(earliest.get("source_updated_at")) or parse_datetime(
        as_text(earliest.get("updated_day"))
    )
    end_time = parse_datetime(latest.get("source_updated_at")) or parse_datetime(
        as_text(latest.get("updated_day"))
    )
    if start_time is None or end_time is None:
        return result
    days = (end_time - start_time).total_seconds() / 86400
    if days < 1:
        return result
    for key in ("upload", "download", "bonus"):
        current_value = as_float(latest.get(key))
        start_value = as_float(earliest.get(key))
        if current_value is None or start_value is None:
            continue
        if current_value < start_value:
            continue
        result[key] = round((current_value - start_value) / days, 2)
    return result


def build_trend(
    rows: Iterable[Mapping[str, Any]],
    *,
    days: int = 30,
    today: date | None = None,
) -> list[dict[str, Any]]:
    """按自然日整理站点历史快照，用于详情页趋势展示。"""

    reference = today or datetime.now().date()
    earliest = reference - timedelta(days=max(days - 1, 0))
    by_day: dict[str, dict[str, Any]] = {}
    for row in rows:
        day_text = as_text(row.get("updated_day"))[:10]
        if not day_text:
            continue
        try:
            day = date.fromisoformat(day_text)
        except ValueError:
            continue
        if day < earliest or day > reference:
            continue
        current = by_day.get(day_text)
        score = (not bool(as_text(row.get("err_msg"))), as_text(row.get("updated_time")))
        if current is not None and (not current["ok"], current["time"]) > score:
            continue
        by_day[day_text] = {
            "day": day_text,
            "time": score[1],
            "ok": score[0],
            "upload": as_int(row.get("upload")),
            "download": as_int(row.get("download")),
            "bonus": as_float(row.get("bonus")),
            "seeding": as_int(row.get("seeding")),
            "seeding_size": as_int(row.get("seeding_size")),
            "ratio": as_float(row.get("ratio")),
        }
    ordered = [by_day[key] for key in sorted(by_day)]
    for item in ordered:
        item.pop("time", None)
        item.pop("ok", None)
    return ordered


def select_previous_successful(items: list[Mapping[str, Any]]) -> Mapping[str, Any] | None:
    """返回最近一次成功且早于最新快照的站点数据，用于估算时魔。"""

    successful = [item for item in items if not as_text(item.get("err_msg"))]
    if len(successful) < 2:
        return None
    return successful[-2]


def build_site_records(
    sites: Iterable[Mapping[str, Any]],
    snapshots: Mapping[str, list[Mapping[str, Any]]],
    extended: Mapping[str, Mapping[str, Any]],
    now: datetime | None = None,
) -> tuple[list[dict[str, Any]], str, str]:
    """把站点配置、MoviePilot 快照与扩展字段合并为站点记录。

    :param sites: 站点基础信息（含域名、名称、启用状态等）
    :param snapshots: 按域名分组的 MoviePilot 站点历史快照（时间升序）
    :param extended: 按域名分组的站点页面扩展字段
    :param now: 计算在册天数使用的当前时间
    :return: 站点记录列表、MoviePilot 数据最新时间、扩展数据最近采集时间
    """

    reference = now or datetime.now()
    records: list[dict[str, Any]] = []
    mp_data_at = ""
    extended_at = ""
    for site in sites:
        domain = as_text(site.get("domain")).casefold()
        items = list(snapshots.get(domain, []))
        latest: Mapping[str, Any] = items[-1] if items else {}
        previous = select_previous_successful(items)
        earliest = items[0] if items else None
        average = daily_average(latest, earliest) if latest else {}
        raw_extended = dict(extended.get(domain) or {})
        collected_at = as_text(raw_extended.get("collected_at"))
        if collected_at > extended_at:
            extended_at = collected_at
        # 数据时间取「MoviePilot 快照时间」与「插件页面采集时间」中较晚者：
        # 单独抓取只更新扩展字段，若只显示快照时间，会让人误以为抓取没生效。
        snapshot_at = " ".join(
            part for part in (as_text(latest.get("updated_day")), as_text(latest.get("updated_time"))) if part
        )
        page_collected_at = as_text(raw_extended.get("collected_at"))
        updated_at = max(snapshot_at, page_collected_at) if (snapshot_at or page_collected_at) else ""
        if updated_at > mp_data_at:
            mp_data_at = updated_at
        join_at = as_text(latest.get("join_at")) or as_text(raw_extended.get("join_at"))
        # 时魔统一口径：站点页面给出的真实时魔优先，缺失时退回相邻快照估算，并记录来源，
        # 避免表格、详情、合计三处显示不同数值。
        page_hourly = as_float(raw_extended.get("hourly_bonus"))
        estimate = estimate_hourly_bonus(latest, previous) if latest else None
        if page_hourly:
            hourly_bonus, hourly_source = page_hourly, "page"
        elif estimate:
            hourly_bonus, hourly_source = estimate, "estimate"
        elif average.get("bonus"):
            # 快照差值不可用时（魔力未增长或被消耗）退回历史日均推算
            hourly_bonus, hourly_source = round(float(average["bonus"]) / 24, 2), "daily"
        else:
            hourly_bonus, hourly_source = None, ""
        records.append(
            {
                "site_id": site.get("site_id"),
                "name": as_text(site.get("name")) or domain,
                "domain": domain,
                "url": as_text(site.get("url")) or (f"https://{domain}/" if domain else ""),
                "is_active": bool(site.get("is_active")),
                "site_priority": as_int(site.get("site_priority")) or None,
                "username": as_text(latest.get("username")),
                "uid": as_text(latest.get("uid")) or as_text(raw_extended.get("uid")),
                "user_level": as_text(latest.get("user_level")),
                "join_at": join_at,
                "career_days": career_days(join_at, reference),
                "upload": as_int(latest.get("upload")),
                "download": as_int(latest.get("download")),
                "ratio": normalize_ratio(
                    latest.get("ratio"), latest.get("upload"), latest.get("download")
                ),
                "bonus": as_float(latest.get("bonus")),
                "seeding": as_int(latest.get("seeding")),
                "seeding_size": as_int(latest.get("seeding_size")),
                "leeching": as_int(latest.get("leeching")),
                "leeching_size": as_int(latest.get("leeching_size")),
                "message_unread": as_int(latest.get("message_unread")),
                "updated_at": updated_at,
                "err_msg": as_text(latest.get("err_msg")),
                "hourly_bonus": hourly_bonus,
                "hourly_bonus_source": hourly_source,
                "hourly_bonus_estimate": estimate,
                "daily_upload": average.get("upload"),
                "daily_download": average.get("download"),
                # 日均魔力跟随统一口径的时魔计算（时魔 × 24），
                # 保证详情页「日均魔力」与「时魔」一致，避免出现两套数值。
                "daily_bonus": (
                    round(float(hourly_bonus) * 24, 2) if hourly_bonus else average.get("bonus")
                ),
                "extended": raw_extended or None,
            }
        )
    return records, mp_data_at, extended_at


def summarize_sites(sites: Iterable[Mapping[str, Any]]) -> dict[str, Any]:
    """汇总全部站点的流量、做种、魔力与扩展字段总量。"""

    items = list(sites)
    totals: dict[str, Any] = {
        "site_count": len(items),
        "active_site_count": sum(1 for item in items if item.get("is_active")),
        "error_site_count": sum(1 for item in items if as_text(item.get("err_msg"))),
        "upload": 0,
        "download": 0,
        "bonus": 0.0,
        "seeding": 0,
        "seeding_size": 0,
        "leeching": 0,
        "leeching_size": 0,
        "seeding_points": 0.0,
        "hourly_bonus": 0.0,
        "hourly_bonus_page_count": 0,
        "hourly_bonus_estimate_count": 0,
        "hourly_bonus_daily_count": 0,
        "hr": 0,
        "claims_used": 0,
        "claims_total": 0,
        "invites_available": 0,
        "invites_sent": 0,
        "extended_site_count": 0,
        "extended_ok_count": 0,
        "has_seeding_points": False,
        "has_hourly_bonus": False,
        "has_hr": False,
        "has_claims": False,
        "has_invites": False,
    }
    for item in items:
        totals["upload"] += as_int(item.get("upload"))
        totals["download"] += as_int(item.get("download"))
        totals["bonus"] += as_float(item.get("bonus")) or 0.0
        totals["seeding"] += as_int(item.get("seeding"))
        totals["seeding_size"] += as_int(item.get("seeding_size"))
        totals["leeching"] += as_int(item.get("leeching"))
        totals["leeching_size"] += as_int(item.get("leeching_size"))
        hourly = as_float(item.get("hourly_bonus"))
        if hourly:
            totals["hourly_bonus"] += hourly
            totals["has_hourly_bonus"] = True
            source = as_text(item.get("hourly_bonus_source"))
            if source == "page":
                totals["hourly_bonus_page_count"] += 1
            elif source == "estimate":
                totals["hourly_bonus_estimate_count"] += 1
            elif source == "daily":
                totals["hourly_bonus_daily_count"] += 1
        extended = item.get("extended") or {}
        if extended:
            totals["extended_site_count"] += 1
            if extended.get("ok"):
                totals["extended_ok_count"] += 1
        points = as_float(extended.get("seeding_points"))
        if points:
            totals["seeding_points"] += points
            totals["has_seeding_points"] = True
        hr_value = extended.get("hr")
        if hr_value is not None:
            totals["hr"] += as_int(hr_value)
            totals["has_hr"] = True
        if extended.get("claims_used") is not None:
            totals["claims_used"] += as_int(extended.get("claims_used"))
            totals["has_claims"] = True
        if extended.get("claims_total") is not None:
            totals["claims_total"] += as_int(extended.get("claims_total"))
        if extended.get("invites_available") is not None:
            totals["invites_available"] += as_int(extended.get("invites_available"))
            totals["has_invites"] = True
        if extended.get("invites_sent") is not None:
            totals["invites_sent"] += as_int(extended.get("invites_sent"))
            totals["has_invites"] = True
    totals["ratio"] = overall_ratio(totals["upload"], totals["download"])
    totals["bonus"] = round(totals["bonus"], 2)
    totals["seeding_points"] = round(totals["seeding_points"], 2)
    totals["hourly_bonus"] = round(totals["hourly_bonus"], 2)
    return totals


def sort_sites(
    sites: Iterable[Mapping[str, Any]],
    *,
    field: str = "seeding_size",
    descending: bool = True,
) -> list[dict[str, Any]]:
    """按指定字段对站点列表排序，缺失值统一排在末尾。"""

    items = [dict(item) for item in sites]
    numeric_fields = {
        "upload",
        "download",
        "ratio",
        "bonus",
        "seeding",
        "seeding_size",
        "leeching",
        "leeching_size",
        "hourly_bonus_estimate",
        "site_priority",
    }

    def sort_key(item: Mapping[str, Any]) -> tuple[int, Any]:
        """生成排序键，缺失值统一归入末尾分组。"""

        value = item.get(field)
        if field in numeric_fields:
            number = as_float(value)
            return (1, 0.0) if number is None else (0, number)
        text = as_text(value)
        return (1, "") if not text else (0, text)

    items.sort(key=sort_key, reverse=descending)
    return items


def mask_cookie(value: Any) -> str:
    """把 Cookie 文本压缩为仅表示存在性的安全摘要。"""

    text = as_text(value)
    if not text:
        return ""
    return f"{len(text)} 字符"


def strip_label_noise(value: Any) -> str:
    """去掉标签文本中的括号与空白，便于统一匹配。"""

    return _LABEL_NOISE_RE.sub("", as_text(value))
