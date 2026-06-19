from fastapi import APIRouter, Query
from datetime import datetime, timedelta
from sqlalchemy import func, desc

from app.core.database import SessionLocal
from app.models.models import Request
from app.schemas.metrics import MetricsSummary, TrendPoint, SessionSummary, ActiveSession
from app.services.aggregator import get_time_bucket_expr
from app.core.config import ACTIVE_SESSION_THRESHOLD_SECONDS, detect_installed_sources, SOURCE_CONFIG

from app.services.cloud_sync import fetch_claude_oauth_usage

router = APIRouter()


@router.get("/providers")
def get_providers():
    """Return all providers with their installation status."""
    installed = set(detect_installed_sources())
    return [
        {
            "id": source,
            "name": source.replace("-", " ").title(),
            "installed": source in installed,
            "env": cfg["env"],
            "defaults": cfg["defaults"],
            "domain": cfg.get("domain"),
            "logo_url": cfg.get("logo_url")
            or (f"https://www.google.com/s2/favicons?domain={cfg['domain']}&sz=64" if cfg.get("domain") else None),
        }
        for source, cfg in SOURCE_CONFIG.items()
    ]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/summary", response_model=MetricsSummary)
def summary(range: str = Query("today")):
    db = SessionLocal()
    try:
        q = db.query(Request)
        q = _apply_range(q, range)

        total_requests = q.count()
        input_tokens = q.with_entities(func.sum(Request.input_tokens)).scalar() or 0
        output_tokens = q.with_entities(func.sum(Request.output_tokens)).scalar() or 0
        cache_read = q.with_entities(func.sum(Request.cache_read_tokens)).scalar() or 0
        cache_write = q.with_entities(func.sum(Request.cache_write_tokens)).scalar() or 0
        total_cost = q.with_entities(func.sum(Request.cost)).scalar() or 0.0
        session_count = q.with_entities(func.count(func.distinct(Request.session_id))).scalar() or 0

        total_cache = cache_read + cache_write
        cache_hit_rate = (cache_read / total_cache * 100) if total_cache > 0 else 0.0

        return MetricsSummary(
            total_cost=round(total_cost, 2),
            total_requests=total_requests,
            input_tokens=int(input_tokens),
            output_tokens=int(output_tokens),
            cache_read_tokens=int(cache_read),
            cache_write_tokens=int(cache_write),
            cache_hit_rate=round(cache_hit_rate, 1),
            session_count=int(session_count),
        )
    finally:
        db.close()


@router.get("/trends", response_model=list[TrendPoint])
def trends(range: str = Query("today"), metric: str = Query("cost")):
    db = SessionLocal()
    try:
        q = db.query(Request)
        q = _apply_range(q, range)

        bucket_expr = get_time_bucket_expr(range)
        # SQLite strftime
        rows = (
            q.with_entities(
                func.strftime(bucket_expr, Request.timestamp).label("bucket"),
                Request.source,
                func.sum(Request.input_tokens).label("input_tokens"),
                func.sum(Request.output_tokens).label("output_tokens"),
                func.sum(Request.cost).label("cost"),
            )
            .group_by("bucket", Request.source)
            .order_by("bucket")
            .all()
        )

        return [
            TrendPoint(
                bucket=r.bucket,
                source=r.source,
                input_tokens=int(r.input_tokens or 0),
                output_tokens=int(r.output_tokens or 0),
                cost=round(r.cost or 0.0, 2),
            )
            for r in rows
        ]
    finally:
        db.close()


@router.get("/sessions", response_model=list[SessionSummary])
def sessions(range: str = Query("today"), group_by: str = Query("sessions")):
    db = SessionLocal()
    try:
        q = db.query(Request)
        q = _apply_range(q, range)

        if group_by == "providers":
            group_cols = [Request.source]
        elif group_by == "projects":
            group_cols = [Request.project]
        else:
            group_cols = [Request.session_id, Request.source]

        rows = (
            q.with_entities(
                Request.session_id,
                Request.source,
                Request.model,
                func.count(Request.id).label("request_count"),
                func.sum(Request.input_tokens).label("input_tokens"),
                func.sum(Request.output_tokens).label("output_tokens"),
                func.sum(Request.cost).label("cost"),
                func.min(Request.timestamp).label("start_time"),
                func.max(Request.timestamp).label("end_time"),
            )
            .group_by(*group_cols)
            .order_by(desc("cost"))
            .all()
        )

        return [
            SessionSummary(
                session_id=r.session_id or "unknown",
                source=r.source,
                model=r.model,
                request_count=int(r.request_count or 0),
                input_tokens=int(r.input_tokens or 0),
                output_tokens=int(r.output_tokens or 0),
                cost=round(r.cost or 0.0, 2),
                start_time=r.start_time,
                end_time=r.end_time,
            )
            for r in rows
        ]
    finally:
        db.close()


@router.get("/projects")
def projects(range: str = Query("today")):
    """Return usage breakdown per branch/project."""
    db = SessionLocal()
    try:
        q = db.query(Request)
        q = _apply_range(q, range)

        rows = (
            q.with_entities(
                Request.branch,
                Request.project,
                Request.source,
                func.count(Request.id).label("request_count"),
                func.sum(Request.input_tokens).label("input_tokens"),
                func.sum(Request.output_tokens).label("output_tokens"),
                func.sum(Request.cache_read_tokens).label("cache_read_tokens"),
                func.sum(Request.cache_write_tokens).label("cache_write_tokens"),
                func.sum(Request.cost).label("cost"),
                func.count(func.distinct(Request.session_id)).label("session_count"),
            )
            .group_by(Request.branch, Request.project, Request.source)
            .order_by(desc("cost"))
            .all()
        )

        return [
            {
                "branch": r.branch or "—",
                "project": r.project or "unknown",
                "source": r.source,
                "request_count": int(r.request_count or 0),
                "input_tokens": int(r.input_tokens or 0),
                "output_tokens": int(r.output_tokens or 0),
                "cache_read_tokens": int(r.cache_read_tokens or 0),
                "cache_write_tokens": int(r.cache_write_tokens or 0),
                "cost": round(r.cost or 0.0, 2),
                "session_count": int(r.session_count or 0),
            }
            for r in rows
        ]
    finally:
        db.close()


@router.get("/models")
def models(range: str = Query("today")):
    """Return usage breakdown per source and model."""
    db = SessionLocal()
    try:
        q = db.query(Request)
        q = _apply_range(q, range)

        rows = (
            q.with_entities(
                Request.source,
                Request.model,
                func.count(Request.id).label("request_count"),
                func.sum(Request.input_tokens).label("input_tokens"),
                func.sum(Request.output_tokens).label("output_tokens"),
                func.sum(Request.cost).label("cost"),
            )
            .group_by(Request.source, Request.model)
            .order_by(desc("cost"))
            .all()
        )

        return [
            {
                "source": r.source,
                "model": r.model or "unknown",
                "request_count": int(r.request_count or 0),
                "input_tokens": int(r.input_tokens or 0),
                "output_tokens": int(r.output_tokens or 0),
                "cost": round(r.cost or 0.0, 2),
            }
            for r in rows
        ]
    finally:
        db.close()


@router.get("/active", response_model=list[ActiveSession])
def active_sessions():
    db = SessionLocal()
    try:
        threshold = datetime.utcnow() - timedelta(seconds=ACTIVE_SESSION_THRESHOLD_SECONDS)
        rows = (
            db.query(Request)
            .filter(Request.timestamp >= threshold)
            .with_entities(
                Request.source,
                Request.session_id,
                Request.model,
                func.max(Request.timestamp).label("last_active"),
            )
            .group_by(Request.source, Request.session_id)
            .all()
        )

        return [
            ActiveSession(
                source=r.source,
                session_id=r.session_id or "unknown",
                model=r.model,
                last_active=r.last_active,
            )
            for r in rows
        ]
    finally:
        db.close()


# Last successful quota response, kept in-process so that a transient failure
# (e.g. the OAuth usage endpoint rate-limiting us) doesn't make the Provider
# Limits panel vanish — we serve the last-known values flagged as stale.
_quota_cache: dict = {"data": None}


@router.get("/quota")
def quota():
    """Return provider quota/limits. Currently supports Claude OAuth."""
    result = []
    claude = fetch_claude_oauth_usage()
    if claude:
        limits = []
        five_hour = claude.get("five_hour")
        seven_day = claude.get("seven_day")
        thirty_day = claude.get("thirty_day")
        if five_hour:
            limits.append({
                "id": "rolling",
                "label": "Rolling Usage",
                "utilization": five_hour.get("utilization", 0),
                "resets_at": five_hour.get("resets_at"),
            })
        if seven_day:
            limits.append({
                "id": "weekly",
                "label": "Weekly Usage",
                "utilization": seven_day.get("utilization", 0),
                "resets_at": seven_day.get("resets_at"),
            })
        if thirty_day:
            limits.append({
                "id": "monthly",
                "label": "Monthly Usage",
                "utilization": thirty_day.get("utilization", 0),
                "resets_at": thirty_day.get("resets_at"),
            })
        result.append({
            "provider": "claude",
            "limits": limits,
            "last_updated": datetime.utcnow().isoformat(),
            "stale": False,
        })

    if result:
        _quota_cache["data"] = result
        return result

    # Live fetch returned nothing (no creds, error, or rate-limited). If we have
    # a previous good response, serve it as stale rather than dropping the panel.
    cached = _quota_cache["data"]
    if cached:
        return [{**provider, "stale": True} for provider in cached]
    return []


@router.post("/refresh")
def refresh_data():
    """Trigger an immediate scan/ingest of all source files."""
    import threading
    from app.core.watcher import tick
    thread = threading.Thread(target=tick, daemon=True)
    thread.start()
    return {"status": "scanning"}


@router.get("/streak")
def streak(months: int = Query(6)):
    """Return daily request counts for calendar heatmap."""
    db = SessionLocal()
    try:
        end = datetime.utcnow()
        start = end - timedelta(days=30 * months)

        rows = (
            db.query(Request)
            .filter(Request.timestamp >= start)
            .with_entities(
                func.strftime("%Y-%m-%d", Request.timestamp).label("day"),
                func.count(Request.id).label("count"),
            )
            .group_by("day")
            .all()
        )

        counts = {r.day: r.count for r in rows}
        max_count = max(counts.values()) if counts else 1

        return {
            "start": start.date().isoformat(),
            "end": end.date().isoformat(),
            "days": [
                {"date": day, "count": counts.get(day, 0)}
                for day in _date_range(start.date(), end.date())
            ],
            "max_count": max_count,
        }
    finally:
        db.close()


def _date_range(start, end):
    current = start
    while current <= end:
        yield current.isoformat()
        current += timedelta(days=1)


def _apply_range(q, range: str):
    now = datetime.utcnow()
    if range == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return q.filter(Request.timestamp >= start)
    elif range == "week":
        start = now - timedelta(days=7)
        return q.filter(Request.timestamp >= start)
    elif range == "month":
        start = now - timedelta(days=30)
        return q.filter(Request.timestamp >= start)
    return q
