"""FastAPI application factory.

Wires together: logging, DB pool lifecycle, CORS, request-id correlation,
the exception → error-envelope handlers, and versioned routers. Feature
routers (Module 4) register themselves in ``_include_routers``.
"""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.logging import configure_logging, get_logger
from app.db import pool

log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    await pool.create_pool()
    log.info("app.started", env=get_settings().env)
    try:
        yield
    finally:
        await pool.close_pool()
        log.info("app.stopped")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="PodMind AI API",
        version="1.0.0",
        description="AI-powered podcast research platform — MVP 1: AI Research Engine",
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
    )

    # ------------------------------------------------------------ middleware
    @app.middleware("http")
    async def request_context(request: Request, call_next):
        """Bind a request id to the logging context and echo it back."""
        request_id = request.headers.get("x-request-id", uuid.uuid4().hex)
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id, path=request.url.path, method=request.method
        )
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response

    # ------------------------------------------------------- error envelope
    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        if exc.status_code >= 500:
            log.error("request.failed", code=exc.code, message=exc.message)
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_failed",
                    "message": "Request validation failed",
                    "details": {"errors": exc.errors()},
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(_: Request, exc: Exception) -> JSONResponse:
        log.exception("request.unhandled_error")
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "internal_error", "message": "Internal server error", "details": None}},
        )

    _include_routers(app)
    return app


def _include_routers(app: FastAPI) -> None:
    settings = get_settings()

    @app.get("/health", tags=["ops"])
    async def health() -> dict:
        """Liveness — no dependencies, used by Railway healthcheck."""
        return {"status": "ok"}

    @app.get("/health/ready", tags=["ops"])
    async def readiness() -> dict:
        """Readiness — verifies the database is reachable."""
        async with pool.get_pool().acquire() as conn:
            await conn.fetchval("select 1")
        return {"status": "ready"}

    # Feature routers mount here in Module 4:
    # app.include_router(projects.router, prefix=settings.api_v1_prefix)
    # app.include_router(research.router, prefix=settings.api_v1_prefix)
    # ...
    _ = settings  # referenced by the commented mounts above


app = create_app()
