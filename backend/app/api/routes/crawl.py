import logging
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from app.api.deps import get_current_user
from app.models.schemas import CrawlerTrigger
from app.database import supabase
from app.scheduler.jobs import (
    start_crawl_log,
    job_crawl_blog_global,
    job_crawl_blog_custom,
    job_crawl_reddit_global,
    job_crawl_reddit_custom,
    job_crawl_github_trending
)

router = APIRouter(prefix="/api/v1/crawl", tags=["crawl"])
logger = logging.getLogger(__name__)

CRAWLER_JOBS = {
    "blog_global": job_crawl_blog_global,
    "blog_custom": job_crawl_blog_custom,
    "reddit_global": job_crawl_reddit_global,
    "reddit_custom": job_crawl_reddit_custom,
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
    try:
        if crawler_name not in CRAWLER_JOBS:
            raise HTTPException(400, f"Invalid crawler name: {crawler_name}")

        # Start the log synchronously to get a log_id
        # All crawlers are now global, so we don't pass user_id
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error manual triggering crawler '{crawler_name}': {e}")
        raise HTTPException(500, f"Error manual triggering crawler: {str(e)}")

@router.get("/logs")
async def get_crawl_logs(limit: int = 20, user = Depends(get_current_user)):
    """Fetch recent crawler execution logs"""
    try:
        query = supabase.table("crawl_logs").select("*")
        query.params = query.params.add("or", f"(user_id.is.null,user_id.eq.{user.id})")
        res = query.order("started_at", desc=True).range(0, limit - 1).execute()
        return {"logs": res.data, "count": len(res.data)}
    except Exception as e:
        logger.error(f"Error fetching crawl logs: {e}")
        raise HTTPException(500, f"Failed to fetch crawl logs: {str(e)}")
