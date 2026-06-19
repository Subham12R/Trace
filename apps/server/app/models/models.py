from sqlalchemy import Column, Integer, String, DateTime, Float, create_engine
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()


class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String, nullable=False)
    session_id = Column(String, nullable=True)
    timestamp = Column(DateTime, nullable=False)
    model = Column(String, nullable=True)
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    cache_read_tokens = Column(Integer, nullable=False, default=0)
    cache_write_tokens = Column(Integer, nullable=False, default=0)
    cost = Column(Float, nullable=False, default=0.0)
    project = Column(String, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class IngestionState(Base):
    __tablename__ = "ingestion_state"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String, nullable=False)
    file_path = Column(String, nullable=False, unique=True)
    file_hash = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    last_modified = Column(DateTime, nullable=True)
    last_parsed_at = Column(DateTime, default=datetime.utcnow)
