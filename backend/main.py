import time
import os
from collections import defaultdict
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from routers.events import router as events_router
from routers.auth import router as auth_router
from routers.admin import router as admin_router
from db.database import init_db
from db.crud import get_user_by_email, create_user
import bcrypt as _bcrypt

load_dotenv()

app = FastAPI(
    title="SF Bay Area Events API",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENV", "development") != "production" else None,
    redoc_url=None,
)

# ---------------------------------------------------------------------------
# CORS — allow explicit origins + all *.vercel.app preview URLs
# ---------------------------------------------------------------------------
_ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173",
).split(",")

# Allow all vercel.app subdomains (handles rotating preview URLs)
_ALLOWED_ORIGIN_REGEX = r"https://.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_origin_regex=_ALLOWED_ORIGIN_REGEX,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Accept", "Authorization"],
)

# ---------------------------------------------------------------------------
# Security headers
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
# Rate limiting — 30 req / 60 s per IP
# ---------------------------------------------------------------------------
_RATE_LIMIT = int(os.getenv("RATE_LIMIT", "30"))
_RATE_WINDOW = int(os.getenv("RATE_WINDOW", "60"))
_request_log: dict[str, list[float]] = defaultdict(list)

@app.middleware("http")
async def rate_limit(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - _RATE_WINDOW
    _request_log[ip] = [t for t in _request_log[ip] if t > window_start]
    if len(_request_log[ip]) >= _RATE_LIMIT:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please slow down."},
            headers={"Retry-After": str(_RATE_WINDOW)},
        )
    _request_log[ip].append(now)
    return await call_next(request)

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "pranavs.mec@gmail.com")
_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "D$5700n")
_ADMIN_DISPLAY = os.getenv("ADMIN_DISPLAY_NAME", "Pranav")


@app.on_event("startup")
async def startup():
    await init_db()
    await _seed_admin()


async def _seed_admin():
    from db.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        if not await get_user_by_email(db, _ADMIN_EMAIL):
            hashed = _bcrypt.hashpw(_ADMIN_PASSWORD.encode(), _bcrypt.gensalt()).decode()
            await create_user(db, _ADMIN_EMAIL, hashed, _ADMIN_DISPLAY, is_admin=True)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
app.include_router(events_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
