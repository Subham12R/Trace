from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class MetricsSummary(BaseModel):
    total_cost: float
    total_requests: int
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int
    cache_write_tokens: int
    cache_hit_rate: float
    session_count: int


class TrendPoint(BaseModel):
    bucket: str
    source: str
    input_tokens: int
    output_tokens: int
    cost: float


class SessionSummary(BaseModel):
    session_id: str
    source: str
    model: Optional[str]
    request_count: int
    input_tokens: int
    output_tokens: int
    cost: float
    start_time: datetime
    end_time: datetime


class ActiveSession(BaseModel):
    source: str
    session_id: str
    model: Optional[str]
    last_active: datetime
