from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import init_db
from app.core.watcher import start_watcher, stop_watcher
from app.services.ollama_proxy import start_ollama_proxy, stop_ollama_proxy
from app.api import metrics, health, auth, cloud_sync, system, export


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_watcher()
    start_ollama_proxy()
    yield
    stop_watcher()
    stop_ollama_proxy()


app = FastAPI(title="Trace API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # "null" covers Electron's file:// renderer; localhost:5173 covers dev mode.
    # Wildcard would let any site read from/write to this local API.
    allow_origins=["null", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(cloud_sync.router, prefix="/api/cloud", tags=["cloud"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])
app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
