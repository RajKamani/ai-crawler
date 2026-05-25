import logging
import asyncio
from datetime import datetime
# pyrefly: ignore [missing-import]
from apscheduler.schedulers.background import BackgroundScheduler
# pyrefly: ignore [missing-import]
from apscheduler.triggers.interval import IntervalTrigger
# pyrefly: ignore [missing-import]
from apscheduler.triggers.cron import CronTrigger
# pyrefly: ignore [missing-import]
from apscheduler.triggers.date import DateTrigger
from app.database import supabase
from app.crawlers.blog_crawler import BlogCrawler
from app.crawlers.reddit_crawler import RedditCrawler
from app.crawlers.github_crawler import GitHubCrawler

logger = logging.getLogger(__name__)

# Initialize crawlers
blog_crawler = BlogCrawler()
reddit_crawler = RedditCrawler()
github_crawler = GitHubCrawler()

# Initialize scheduler
scheduler = BackgroundScheduler()

# Global dict to track intervals currently running in scheduler
# Helps detect modifications in db
current_schedules = {}

# helper to run async crawlers from sync scheduler thread
def run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

def start_crawl_log(crawler_name: str) -> str:
    """Create a new crawl log entry with status 'running' and return its ID"""
    try:
        res = supabase.table("crawl_logs").insert({
            "crawler_name": crawler_name,
            "status": "running"
        }).execute()
        if res.data:
            return res.data[0]["id"]
    except Exception as e:
        logger.error(f"Failed to create crawl log for {crawler_name}: {e}")
    return None

def finish_crawl_log(log_id: str, status: str, posts_found: int = 0, posts_saved: int = 0, error_message: str = None):
    """Complete a crawl log entry with status, counts, and/or errors"""
    if not log_id:
        return
    try:
        update_data = {
            "status": status,
            "posts_found": posts_found,
            "posts_saved": posts_saved,
            "completed_at": datetime.utcnow().isoformat() + "Z"
        }
        if error_message:
            update_data["error_message"] = error_message[:1000] # truncate
            
        supabase.table("crawl_logs").update(update_data).eq("id", log_id).execute()
    except Exception as e:
        logger.error(f"Failed to update crawl log {log_id}: {e}")

# Crawler Jobs
def job_crawl_blog_global(log_id: str = None):
    logger.info("Starting global blog crawling job...")
    if not log_id:
        log_id = start_crawl_log("blog_global")
    total_found = 0
    total_saved = 0
    try:
        # Fetch active global blogs
        res = supabase.table("sources") \
            .select("*") \
            .eq("type", "blog") \
            .eq("is_active", True) \
            .execute()
        
        for source in res.data:
            found, saved = run_async(blog_crawler.crawl_global(source))
            total_found += found
            total_saved += saved
            
        finish_crawl_log(log_id, "success", total_found, total_saved)
    except Exception as e:
        logger.error(f"Error in job_crawl_blog_global: {e}")
        finish_crawl_log(log_id, "failed", total_found, total_saved, str(e))

def job_crawl_blog_user(log_id: str = None):
    logger.info("Starting user blog crawling job...")
    if not log_id:
        log_id = start_crawl_log("blog_user")
    try:
        found, saved = run_async(blog_crawler.crawl_user_blogs())
        finish_crawl_log(log_id, "success", found, saved)
    except Exception as e:
        logger.error(f"Error in job_crawl_blog_user: {e}")
        finish_crawl_log(log_id, "failed", 0, 0, str(e))

def job_crawl_reddit_global(log_id: str = None):
    logger.info("Starting global reddit crawling job...")
    if not log_id:
        log_id = start_crawl_log("reddit_global")
    total_found = 0
    total_saved = 0
    try:
        res = supabase.table("sources") \
            .select("*") \
            .eq("type", "reddit") \
            .eq("is_active", True) \
            .execute()
        
        for source in res.data:
            found, saved = run_async(reddit_crawler.crawl_global(source))
            total_found += found
            total_saved += saved
            
        finish_crawl_log(log_id, "success", total_found, total_saved)
    except Exception as e:
        logger.error(f"Error in job_crawl_reddit_global: {e}")
        finish_crawl_log(log_id, "failed", total_found, total_saved, str(e))

def job_crawl_reddit_user(log_id: str = None):
    logger.info("Starting user reddit crawling job...")
    if not log_id:
        log_id = start_crawl_log("reddit_user")
    try:
        found, saved = run_async(reddit_crawler.crawl_user_subreddits())
        finish_crawl_log(log_id, "success", found, saved)
    except Exception as e:
        logger.error(f"Error in job_crawl_reddit_user: {e}")
        finish_crawl_log(log_id, "failed", 0, 0, str(e))

def job_crawl_github_trending(log_id: str = None):
    logger.info("Starting GitHub trending crawling job...")
    if not log_id:
        log_id = start_crawl_log("github_trending")
    total_found = 0
    total_saved = 0
    try:
        # Seed github sources if not present (topic:ai, topic:llm, topic:generative-ai)
        # Search query format in sources
        res = supabase.table("sources") \
            .select("*") \
            .eq("type", "github") \
            .eq("is_active", True) \
            .execute()
        
        if not res.data:
            # Seed default github sources
            supabase.table("sources").insert([
                {"name": "GitHub AI Topic", "type": "github", "url": "topic:ai", "crawl_frequency_minutes": 180},
                {"name": "GitHub LLM Topic", "type": "github", "url": "topic:llm", "crawl_frequency_minutes": 180}
            ]).execute()
            
            res = supabase.table("sources") \
                .select("*") \
                .eq("type", "github") \
                .eq("is_active", True) \
                .execute()

        for source in res.data:
            found, saved = run_async(github_crawler.crawl(source))
            total_found += found
            total_saved += saved
            
        finish_crawl_log(log_id, "success", total_found, total_saved)
    except Exception as e:
        logger.error(f"Error in job_crawl_github_trending: {e}")
        finish_crawl_log(log_id, "failed", total_found, total_saved, str(e))

# Mapping from DB crawler name to local Python function
JOB_MAPPING = {
    "blog_global": (job_crawl_blog_global, "Crawl global company blogs"),
    "blog_user": (job_crawl_blog_user, "Crawl user custom RSS blogs"),
    "reddit_global": (job_crawl_reddit_global, "Crawl global subreddits with filters"),
    "reddit_user": (job_crawl_reddit_user, "Crawl user subreddits filter-free"),
    "github_trending": (job_crawl_github_trending, "Crawl GitHub trending repos")
}

def get_trigger_for_interval(interval: int, name: str):
    if interval < 0:
        minutes_past_midnight = abs(interval) - 1
        hour = minutes_past_midnight // 60
        minute = minutes_past_midnight % 60
        logger.info(f"Scheduler: '{name}' parsed as Daily Time daily at {hour:02d}:{minute:02d}")
        return CronTrigger(hour=hour, minute=minute)
    elif interval >= 1000000:
        run_timestamp = interval * 60
        run_date = datetime.fromtimestamp(run_timestamp)
        logger.info(f"Scheduler: '{name}' parsed as Specific Datetime at {run_date}")
        return DateTrigger(run_date=run_date)
    else:
        logger.info(f"Scheduler: '{name}' parsed as Interval every {interval} minutes")
        return IntervalTrigger(minutes=interval)

def sync_scheduler_intervals():
    """
    Read settings from crawler_settings table and update job intervals.
    Reschedules or pauses jobs dynamically on the fly.
    """
    logger.info("Syncing crawler schedules with database...")
    try:
        res = supabase.table("crawler_settings").select("*").execute()
        if not res.data:
            logger.warning("No crawler settings found in database.")
            return

        for row in res.data:
            name = row["crawler_name"]
            interval = row["interval_minutes"]
            is_active = row["is_active"]

            if name not in JOB_MAPPING:
                continue

            # Check if one-shot date schedule is in the past
            if is_active and interval >= 1000000:
                run_timestamp = interval * 60
                run_date = datetime.fromtimestamp(run_timestamp)
                if run_date <= datetime.now():
                    logger.info(f"One-shot schedule {run_date} for {name} is in the past. Deactivating in database.")
                    try:
                        supabase.table("crawler_settings") \
                            .update({"is_active": False}) \
                            .eq("crawler_name", name) \
                            .execute()
                    except Exception as db_err:
                        logger.error(f"Failed to auto-deactivate one-shot job {name}: {db_err}")
                    is_active = False

            job_func, desc = JOB_MAPPING[name]
            job_id = f"job_{name}"

            # Check if job exists in scheduler
            existing_job = scheduler.get_job(job_id)

            if existing_job:
                # If settings changed, reschedule or remove
                current = current_schedules.get(name, {})
                if current.get("interval") != interval or current.get("is_active") != is_active:
                    if not is_active:
                        logger.info(f"Deactivating crawler job: {name}")
                        scheduler.remove_job(job_id)
                        current_schedules[name] = {"interval": interval, "is_active": False}
                    else:
                        logger.info(f"Rescheduling crawler job: {name} (interval/value: {interval})")
                        scheduler.reschedule_job(
                            job_id,
                            trigger=get_trigger_for_interval(interval, name)
                        )
                        current_schedules[name] = {"interval": interval, "is_active": True}
            else:
                # If job doesn't exist but is active, add it
                if is_active:
                    logger.info(f"Adding crawler job: {name} (interval/value: {interval})")
                    scheduler.add_job(
                        job_func,
                        trigger=get_trigger_for_interval(interval, name),
                        id=job_id,
                        name=desc,
                        replace_existing=True
                    )
                    current_schedules[name] = {"interval": interval, "is_active": True}
                else:
                    current_schedules[name] = {"interval": interval, "is_active": False}

    except Exception as e:
        logger.error(f"Error syncing scheduler intervals: {e}")

def job_cleanup_stale_posts():
    """Delete posts older than 90 days to keep database size manageable"""
    logger.info("Starting stale posts cleanup job...")
    try:
        from datetime import timedelta
        cutoff_date = (datetime.utcnow() - timedelta(days=90)).isoformat() + "Z"
        res = supabase.table("posts").delete().lt("published_at", cutoff_date).execute()
        deleted_count = len(res.data) if res.data else 0
        logger.info(f"Stale posts cleanup complete. Deleted {deleted_count} posts.")
    except Exception as e:
        logger.error(f"Error in job_cleanup_stale_posts: {e}")

def start_scheduler():
    """Start APScheduler and initialize jobs"""
    if not scheduler.running:
        logger.info("Starting Background Scheduler...")
        scheduler.start()
        
        # Load and set up jobs according to DB config
        sync_scheduler_intervals()
        
        # Add interval job to sync schedules config with DB every 3 minutes
        scheduler.add_job(
            sync_scheduler_intervals,
            trigger=IntervalTrigger(minutes=3),
            id="scheduler_sync",
            name="Sync crawler schedules with DB",
            replace_existing=True
        )

        # Add cleanup job for stale posts, runs daily at midnight
        scheduler.add_job(
            job_cleanup_stale_posts,
            trigger=CronTrigger(hour=0, minute=0),
            id="stale_posts_cleanup",
            name="Delete posts older than 90 days",
            replace_existing=True
        )

def shutdown_scheduler():
    """Shutdown APScheduler"""
    if scheduler.running:
        logger.info("Shutting down Background Scheduler...")
        scheduler.shutdown()
