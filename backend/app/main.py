import logging
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.config import settings
from app.scheduler.jobs import start_scheduler, shutdown_scheduler

# Route imports
from app.api.routes import (
    posts,
    user_subreddits,
    user_blogs,
    settings as settings_route,
    bookmarks,
    summary,
    crawl,
    post_views,
    notifications
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def run_migrations():
    logger.info("Checking database migrations...")
    db_url = settings.DATABASE_URL
    if not db_url:
        logger.warning("DATABASE_URL not set. Skipping database migrations.")
        return
    try:
        import os
        from alembic.config import Config
        from alembic import command
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ini_path = os.path.join(base_dir, "alembic.ini")
        
        logger.info(f"Running Alembic migrations with config: {ini_path}")
        alembic_cfg = Config(ini_path)
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations completed successfully.")
    except Exception as e:
        logger.error(f"Failed to run database migrations: {e}")

# Token Bucket Rate Limiting Middleware
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rate_limit_seconds: float = 60.0, max_requests: int = 100):
        super().__init__(app)
        self.rate_limit_seconds = rate_limit_seconds
        self.max_requests = max_requests
        self.tokens = defaultdict(lambda: max_requests)
        self.last_update = defaultdict(float)

    async def dispatch(self, request: Request, call_next):
        # Extract client IP
        ip = request.client.host if request.client else "unknown"
        
        # Skip rate limiting for health check
        if request.url.path in ["/", "/health"]:
            return await call_next(request)

        now = time.time()
        # Replenish tokens
        refill_rate = self.max_requests / self.rate_limit_seconds
        elapsed = now - self.last_update[ip]
        
        if self.last_update[ip] > 0:
            replenished = elapsed * refill_rate
            self.tokens[ip] = min(self.max_requests, self.tokens[ip] + replenished)
        else:
            self.tokens[ip] = self.max_requests

        self.last_update[ip] = now

        # Check tokens
        if self.tokens[ip] >= 1:
            self.tokens[ip] -= 1
            return await call_next(request)
        else:
            logger.warning(f"Rate limit exceeded for IP: {ip} on endpoint {request.url.path}")
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."}
            )

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run migrations first, then initialize Background Scheduler
    logger.info("Initializing application startup lifespan...")
    
    # Run Alembic migrations programmatically
    run_migrations()
    
    try:
        start_scheduler()
        logger.info("Startup complete.")
    except Exception as e:
        logger.error(f"Error during scheduler startup: {e}")
    
    yield
    
    # Shutdown: Clean up background scheduler
    logger.info("Shutting down application lifespan...")
    try:
        shutdown_scheduler()
        logger.info("Shutdown complete.")
    except Exception as e:
        logger.error(f"Error during scheduler shutdown: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-stack API to crawl, index, search, and summarize AI company blogs, Reddit subreddits, and GitHub trending repositories.",
    version="1.0.0",
    lifespan=lifespan
)

# Setup Rate Limiting
app.add_middleware(RateLimitMiddleware)

# Setup CORS Middleware
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(posts.router)
app.include_router(user_subreddits.router)
app.include_router(user_blogs.router)
app.include_router(settings_route.router)
app.include_router(bookmarks.router)
app.include_router(summary.router)
app.include_router(crawl.router)
app.include_router(post_views.router)
app.include_router(notifications.router)

@app.get("/")
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
