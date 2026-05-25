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
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

# Crawler Jobs
def job_crawl_blog_global():
    logger.info("Starting global blog crawling job...")
    try:
        # Fetch active global blogs
        res = supabase.table("sources") \
            .select("*") \
            .eq("type", "blog") \
            .eq("is_active", True) \
            .execute()
        
        for source in res.data:
            run_async(blog_crawler.crawl_global(source))
    except Exception as e:
        logger.error(f"Error in job_crawl_blog_global: {e}")

def job_crawl_blog_user():
    logger.info("Starting user blog crawling job...")
    try:
        run_async(blog_crawler.crawl_user_blogs())
    except Exception as e:
        logger.error(f"Error in job_crawl_blog_user: {e}")

def job_crawl_reddit_global():
    logger.info("Starting global reddit crawling job...")
    try:
        res = supabase.table("sources") \
            .select("*") \
            .eq("type", "reddit") \
            .eq("is_active", True) \
            .execute()
        
        for source in res.data:
            run_async(reddit_crawler.crawl_global(source))
    except Exception as e:
        logger.error(f"Error in job_crawl_reddit_global: {e}")

def job_crawl_reddit_user():
    logger.info("Starting user reddit crawling job...")
    try:
        run_async(reddit_crawler.crawl_user_subreddits())
    except Exception as e:
        logger.error(f"Error in job_crawl_reddit_user: {e}")

def job_crawl_github_trending():
    logger.info("Starting GitHub trending crawling job...")
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
            run_async(github_crawler.crawl(source))
    except Exception as e:
        logger.error(f"Error in job_crawl_github_trending: {e}")

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

def shutdown_scheduler():
    """Shutdown APScheduler"""
    if scheduler.running:
        logger.info("Shutting down Background Scheduler...")
        scheduler.shutdown()
