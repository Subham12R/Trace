import csv
import io
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.core.database import SessionLocal
from app.models.models import Request

router = APIRouter()

_FIELDS = [
    "id", "source", "session_id", "timestamp", "model",
    "input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens",
    "cost", "project", "branch", "latency_ms",
]


def _apply_range(q, range_: str):
    now = datetime.utcnow()
    if range_ == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return q.filter(Request.timestamp >= start)
    elif range_ == "week":
        return q.filter(Request.timestamp >= now - timedelta(days=7))
    elif range_ == "month":
        return q.filter(Request.timestamp >= now - timedelta(days=30))
    return q  # "all"


def _row_to_dict(r: Request) -> dict:
    return {
        "id": r.id,
        "source": r.source,
        "session_id": r.session_id,
        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        "model": r.model,
        "input_tokens": r.input_tokens,
        "output_tokens": r.output_tokens,
        "cache_read_tokens": r.cache_read_tokens,
        "cache_write_tokens": r.cache_write_tokens,
        "cost": r.cost,
        "project": r.project,
        "branch": r.branch,
        "latency_ms": r.latency_ms,
    }


@router.get("/json")
def export_json(range: str = Query("all", description="today|week|month|all")):
    """Stream all matching request records as a JSON array."""
    db = SessionLocal()
    rows = _apply_range(db.query(Request), range).order_by(Request.timestamp).all()
    db.close()

    def gen():
        yield "["
        for i, r in enumerate(rows):
            prefix = "" if i == 0 else ","
            yield prefix + json.dumps(_row_to_dict(r))
        yield "]"

    return StreamingResponse(
        gen(),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=trace-export.json"},
    )


@router.get("/csv")
def export_csv(range: str = Query("all", description="today|week|month|all")):
    """Stream all matching request records as CSV."""
    db = SessionLocal()
    rows = _apply_range(db.query(Request), range).order_by(Request.timestamp).all()
    db.close()

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=_FIELDS)
    writer.writeheader()
    for r in rows:
        writer.writerow(_row_to_dict(r))
    buf.seek(0)

    return StreamingResponse(
        iter([buf.read()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=trace-export.csv"},
    )
