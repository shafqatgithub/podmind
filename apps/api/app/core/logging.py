"""Structured logging setup (structlog → JSON in production, pretty in dev).

Every log line carries the ``request_id`` bound by the middleware in
``app.main``, so a single grep reconstructs a full request across layers.
Usage anywhere in the codebase::

    from app.core.logging import get_logger
    log = get_logger(__name__)
    log.info("research.started", topic=topic, project_id=str(project_id))
"""

import logging
import sys

import structlog

from app.core.config import get_settings


def configure_logging() -> None:
    settings = get_settings()

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
    )

    shared_processors: list = [
        structlog.contextvars.merge_contextvars,   # request_id lives here
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    renderer = (
        structlog.processors.JSONRenderer()
        if settings.is_production
        else structlog.dev.ConsoleRenderer(colors=True)
    )

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.log_level.upper(), logging.INFO)
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)
