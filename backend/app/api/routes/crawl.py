import logging
from fastapi import APIRouter, HTTPException, Depends, Body
from app.api.deps import get_current_user
from app.scheduler.jobs import (
    job_crawl_blog_global,
    job_crawl_blog_user,
    job_crawl_reddit_global,
    job_crawl_reddit_user,
    job_crawl_github_trending
)

router = APIRouter(prefix="/api/v1/crawl", tags=["crawl"])
logger = logging.getLogger(__name__)

CRAWLER_JOBS = {
    "blog_global": job_crawl_blog_global,
    "blog_user": job_crawl_blog_user,
    "reddit_global": job_crawl_reddit_global,
    "reddit_user": job_crawl_reddit_user,
    "github_trending": job_crawl_github_trending
}

@router.post("")
async def trigger_crawl(body: dict = Body(...), user = Depends(get_current_user)):
    """Manually trigger a crawler task by name"""
    crawler_name = body.get("crawler")
    if not crawler_name:
        raise HTTPException(400, "crawler name is required")

    if crawler_name not in CRAWLER_JOBS:
        raise HTTPException(
            400, 
            f"Invalid crawler name. Must be one of: {list(CRAWLER_JOBS.keys())}"
        )

    try:
        # Run job function
        # Since these jobs are designed to run synchronously (inside executor) or run loop internally,
        # we trigger them directly
        CRAWLER_JOBS[crawler_name]()
        return {
            "crawler": crawler_name,
            "status": "success",
            "message": f"Successfully triggered crawler '{crawler_name}' in backend."
        }
    except Exception as e:
        logger.error(f"Error triggering manual crawl for {crawler_name}: {e}")
        raise HTTPException(500, f"Crawl execution failed: {str(e)}")
