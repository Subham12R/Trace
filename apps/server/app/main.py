from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import init_db
from app.core.watcher import start_watcher, stop_watcher
from app.api import metrics, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_watcher()
    yield
    stop_watcher()


app = FastAPI(title="Trace API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])
