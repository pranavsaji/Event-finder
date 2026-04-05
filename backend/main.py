import time
import os
from collections import defaultdict
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from routers.events import router as events_router

load_dotenv()

app = FastAPI(
    title="SF Bay Area Events API",
    version="1.0.0",
    # Disable auto-generated docs in production
    docs_url="/docs" if os.getenv("ENV", "development") != "production" else None,
    redoc_url=None,
)

# ---------------------------------------------------------------------------
# CORS — restrict to known frontend origins in production
# ---------------------------------------------------------------------------
_ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["Content-Type", "Accept"],
)

# ---------------------------------------------------------------------------
# Security headers middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"
    return response

# ---------------------------------------------------------------------------
# Simple in-memory rate limiter — max 30 requests / 60 s per IP
# ---------------------------------------------------------------------------
_RATE_LIMIT = int(os.getenv("RATE_LIMIT", "30"))
_RATE_WINDOW = int(os.getenv("RATE_WINDOW", "60"))
_request_log: dict[str, list[float]] = defaultdict(list)

@app.middleware("http")
async def rate_limit(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - _RATE_WINDOW

    timestamps = _request_log[ip]
    # Purge old entries
    _request_log[ip] = [t for t in timestamps if t > window_start]

    if len(_request_log[ip]) >= _RATE_LIMIT:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please slow down."},
            headers={"Retry-After": str(_RATE_WINDOW)},
        )

    _request_log[ip].append(now)
    return await call_next(request)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
app.include_router(events_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
