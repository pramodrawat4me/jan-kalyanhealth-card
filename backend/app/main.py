import logging

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import ValidationError as PydanticValidationError
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session

from app.api.v1.api import api_router
from app.api.v1.deps import get_db
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.logging import configure_logging
from app.core.rate_limit import limiter
from app.models.stored_file import StoredFile

settings = get_settings()
configure_logging(settings.environment)

_logger = logging.getLogger(__name__)
if settings.is_production and "localhost" in settings.backend_base_url:
    # `backend_base_url` is used to build every absolute customer-photo URL
    # returned to the frontend (see `LocalFileStorage.resolve_url`). If it's
    # still pointing at localhost in production, every photo silently fails
    # to load in the browser (the upload itself still succeeds, since it
    # never touches this URL) — loud startup warning beats a quiet 404.
    _logger.warning(
        "BACKEND_BASE_URL is unset or still the localhost default (%r) while "
        "ENVIRONMENT=production — customer photo URLs returned to the "
        "frontend will be unreachable. Set BACKEND_BASE_URL to this "
        "service's public HTTPS URL (e.g. https://<service>.onrender.com).",
        settings.backend_base_url,
    )

app = FastAPI(
    title="Jan Kalyan Health Card API",
    version="1.0.0",
    description="Hospital discount card management platform — partner and admin API.",
)

app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.error_code,
            "message": exc.message,
            "fields": exc.fields,
        },
    )


_LOCATION_PREFIXES = {"body", "query", "path", "header", "cookie", "form"}


def _format_validation_errors(errors: list[dict]) -> dict[str, str]:
    """Turns Pydantic/FastAPI's `errors()` list into a flat `{field: message}`
    map. The leading `loc` entry is the request part (body/query/form/...),
    which is noise for a form-level error display, so it's dropped whenever
    a real field name follows it.
    """

    fields: dict[str, str] = {}
    for err in errors:
        loc = [str(part) for part in err["loc"]]
        if loc and loc[0] in _LOCATION_PREFIXES and len(loc) > 1:
            loc = loc[1:]
        fields[".".join(loc) or "_"] = err["msg"]
    return fields


@app.exception_handler(PydanticValidationError)
def handle_pydantic_validation_error(request: Request, exc: PydanticValidationError) -> JSONResponse:
    """Routers that build a Pydantic schema manually inside the function
    body (e.g. multipart form endpoints) raise a raw `pydantic.ValidationError`
    rather than FastAPI's own `RequestValidationError` — this keeps both
    cases mapped to the same response envelope instead of a bare 500."""

    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": "Validation failed.",
            "fields": _format_validation_errors(exc.errors()),
        },
    )


@app.exception_handler(RequestValidationError)
def handle_request_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    """FastAPI's own automatic validation of path/query/form/body parameters
    (e.g. an unparsable date, an out-of-range page number) raises this
    instead of `pydantic.ValidationError` — without this handler it falls
    through to FastAPI's default `{"detail": [...]}` shape, which the
    frontend's error envelope parsing doesn't understand, so the user would
    see a generic fallback message with no indication of which field failed.
    """

    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": "Validation failed.",
            "fields": _format_validation_errors(exc.errors()),
        },
    )


@app.exception_handler(RateLimitExceeded)
def handle_rate_limit(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": "RATE_LIMIT_EXCEEDED",
            "message": "Too many requests. Please try again later.",
        },
    )


@app.exception_handler(Exception)
def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    """Last-resort safety net. Without this, any unhandled exception (e.g.
    a customer photo missing from disk, a corrupt image, an unexpected
    PDF-rendering error) falls through to Starlette's bare-HTML 500 page —
    which the frontend's `ApiResponse` envelope parser can't read, so the
    user just sees a generic "failed" toast with zero diagnostic trail.
    Logging with `exc_info` here means the real traceback (customer id,
    which step failed, etc. via the request path) always lands in Render's
    log stream, even for failure modes nobody anticipated."""

    _logger.exception("Unhandled exception on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "INTERNAL_ERROR",
            "message": "Something went wrong. Please try again in a moment.",
        },
    )


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router)


@app.get("/storage/photos/{filename}", tags=["storage"])
def serve_customer_photo(filename: str, db: Session = Depends(get_db)) -> Response:
    """Customer photos only, read from the `stored_files` table (see
    `DatabaseFileStorage`) — never a generated PDF (those are streamed,
    never persisted) or anything else on disk."""

    record = db.query(StoredFile).filter(StoredFile.key == f"photos/{filename}").first()
    if record is None:
        raise HTTPException(status_code=404, detail="Photo not found.")
    return Response(content=record.content, media_type=record.content_type)
