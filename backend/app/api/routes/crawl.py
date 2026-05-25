import logging
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from app.api.deps import get_current_user
from app.models.schemas import CrawlerTrigger
from app.database import supabase
from app.scheduler.jobs import (
    start_crawl_log,
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

@router.post("", status_code=202)
async def trigger_crawl(
    body: CrawlerTrigger,
    background_tasks: BackgroundTasks,
    user = Depends(get_current_user)
):
    """Manually trigger a crawler task by name (asynchronous background task)"""
    crawler_name = body.crawler

    # Start the log synchronously to get a log_id
    log_id = start_crawl_log(crawler_name)
    if not log_id:
        raise HTTPException(500, "Failed to initialize crawl log")

    # Queue job function in background
    job_func = CRAWLER_JOBS[crawler_name]
    background_tasks.add_task(job_func, log_id)

    return {
        "crawler": crawler_name,
        "status": "accepted",
        "crawl_log_id": log_id,
        "message": f"Successfully triggered crawler '{crawler_name}' in background."
    }

@router.get("/logs")
async def get_crawl_logs(limit: int = 20, user = Depends(get_current_user)):
    """Fetch recent crawler execution logs"""
    try:
        res = supabase.table("crawl_logs") \
            .select("*") \
            .order("started_at", desc=True) \
            .range(0, limit - 1) \
            .execute()
        return {"logs": res.data, "count": len(res.data)}
    except Exception as e:
        logger.error(f"Error fetching crawl logs: {e}")
        raise HTTPException(500, f"Failed to fetch crawl logs: {str(e)}")
