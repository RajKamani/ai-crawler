import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    crawl
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Background Scheduler
    logger.info("Initializing application startup lifespan...")
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

# Setup CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow React Native apps to connect from any local/metro origin
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
