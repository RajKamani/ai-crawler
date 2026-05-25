import logging
import httpx
import praw
from datetime import datetime
from typing import List, Dict, Any
from app.config import settings
from app.database import supabase
from app.crawlers.base import BaseCrawler

logger = logging.getLogger(__name__)

RELEVANCE_KEYWORDS = [
    "ai", "ml", "llm", "large language model", "neural network", "deep learning",
    "gpt", "openai", "claude", "gemini", "llama", "anthropic", "copilot", "midjourney",
    "stable diffusion", "diffusion model", "transformer", "fine-tuning", "finetuning",
    "prompt engineering", "vector database", "embeddings", "langchain", "llamaindex",
    "crewai", "autogen", "agent", "agents", "intelligent agent", "huggingface", "hugging face"
]

class RedditCrawler(BaseCrawler):
    def __init__(self):
        super().__init__()
        self.reddit = None
        if settings.REDDIT_CLIENT_ID and settings.REDDIT_CLIENT_SECRET:
            try:
                self.reddit = praw.Reddit(
                    client_id=settings.REDDIT_CLIENT_ID,
                    client_secret=settings.REDDIT_CLIENT_SECRET,
                    user_agent=settings.REDDIT_USER_AGENT
                )
                logger.info("Initialized PRAW client successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize PRAW: {e}. Falling back to public JSON crawler.")

    async def crawl(self, source):
        """Standard crawl interface for single source (global)"""
        await self.crawl_global(source)

    async def crawl_global(self, source):
        """Crawl default global subreddit (applies relevance keyword filter)"""
        sub_name = source["url"].replace("r/", "").strip()
        logger.info(f"Crawling global subreddit: r/{sub_name}")
        
        posts = await self._fetch_reddit_posts(sub_name)
        for post in posts:
            if await self.is_duplicate(post["url"]):
                continue

            # Global subreddits apply strict keyword filtering
            text_to_check = f"{post['title']} {post['content']}".lower()
            is_relevant = any(kw in text_to_check for kw in RELEVANCE_KEYWORDS)

            if is_relevant:
                await self.save_post(
                    title=post["title"],
                    content=post["content"],
                    url=post["url"],
                    author=post["author"],
                    published_at=post["published_at"],
                    source_id=source["id"],
                    raw_data=post["raw_data"]
                )

    async def crawl_user_subreddits(self):
        """Crawl all active user-added subreddits (unfiltered)"""
        logger.info("Crawling user custom subreddits...")
        try:
            result = supabase.table("user_subreddits") \
                .select("subreddit_name") \
                .eq("is_active", True) \
                .execute()
            
            if not result.data:
                logger.info("No active user custom subreddits found.")
                return

            # Deduplicate subreddits across users
            unique_subs = set(row["subreddit_name"].lower().replace("r/", "").strip() for row in result.data)
            
            for sub_name in unique_subs:
                try:
                    source_id = await self._get_or_create_source(f"r/{sub_name}", f"r/{sub_name}")
                    posts = await self._fetch_reddit_posts(sub_name)
                    
                    for post in posts:
                        if not await self.is_duplicate(post["url"]):
                            # No keyword filter for user custom subreddits
                            await self.save_post(
                                title=post["title"],
                                content=post["content"],
                                url=post["url"],
                                author=post["author"],
                                published_at=post["published_at"],
                                source_id=source_id,
                                raw_data=post["raw_data"]
                            )
                except Exception as e:
                    logger.error(f"Error crawling user subreddit r/{sub_name}: {e}")

            # Update last_crawled_at for all user subreddits
            now_iso = datetime.utcnow().isoformat() + "Z"
            supabase.table("user_subreddits") \
                .update({"last_crawled_at": now_iso}) \
                .eq("is_active", True) \
                .execute()

        except Exception as e:
            logger.error(f"Error in crawl_user_subreddits: {e}")

    async def _fetch_reddit_posts(self, subreddit_name: str) -> List[Dict[str, Any]]:
        """Fetch posts from a subreddit using PRAW or public JSON fallback"""
        if self.reddit:
            return await self._fetch_praw(subreddit_name)
        else:
            return await self._fetch_public_json(subreddit_name)

    async def _fetch_praw(self, subreddit_name: str) -> List[Dict[str, Any]]:
        """Fetch posts using PRAW client (threaded/sync execution wrapper)"""
        # Run blocking PRAW call in executor (or since this runs inside an async context, keep it brief)
        posts_data = []
        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            # Fetch hot posts
            for submission in subreddit.hot(limit=25):
                # Don't fetch stickied posts
                if submission.stickied:
                    continue
                
                published_at = datetime.utcfromtimestamp(submission.created_utc)
                url = f"https://reddit.com{submission.permalink}"
                
                # Check for image/thumbnail URL
                thumb_url = submission.thumbnail if (submission.thumbnail and submission.thumbnail.startswith("http")) else None
                if not thumb_url and not submission.is_self:
                    if any(submission.url.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]):
                        thumb_url = submission.url

                # Popularity filter: Score >= 50 OR Upvote Ratio >= 0.85
                score = submission.score or 0
                ratio = submission.upvote_ratio or 0.0
                if score < 50 and ratio < 0.85:
                    logger.info(f"Skipping Reddit post '{submission.title}' - not popular enough (Score: {score}, Ratio: {ratio})")
                    continue

                posts_data.append({
                    "title": submission.title,
                    "content": submission.selftext or submission.url,
                    "url": url,
                    "author": submission.author.name if submission.author else "Deleted",
                    "published_at": published_at,
                    "raw_data": {
                        "score": submission.score,
                        "num_comments": submission.num_comments,
                        "upvote_ratio": submission.upvote_ratio,
                        "is_self": submission.is_self,
                        "thumbnail_url": thumb_url
                    }
                })
        except Exception as e:
            logger.error(f"PRAW fetch error for r/{subreddit_name}: {e}. Trying public JSON fallback.")
            return await self._fetch_public_json(subreddit_name)
        return posts_data

    async def _fetch_public_json(self, subreddit_name: str) -> List[Dict[str, Any]]:
        """Fetch posts using public .json feed (no credentials required)"""
        posts_data = []
        url = f"https://www.reddit.com/r/{subreddit_name}/hot.json?limit=25"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=10.0)
                
                if response.status_code == 429:
                    logger.error(f"Reddit public API rate limited (429) for r/{subreddit_name}")
                    return []
                elif response.status_code != 200:
                    logger.error(f"Reddit public API returned code {response.status_code} for r/{subreddit_name}")
                    return []

                data = response.json()
                children = data.get("data", {}).get("children", [])
                
                for child in children:
                    post_data = child.get("data", {})
                    if post_data.get("stickied"):
                        continue
                    
                    created_utc = post_data.get("created_utc")
                    published_at = datetime.utcfromtimestamp(created_utc) if created_utc else datetime.utcnow()
                    permalink = post_data.get("permalink", "")
                    post_url = f"https://reddit.com{permalink}" if permalink else post_data.get("url")
                    
                    # Extract image URL
                    thumb_url = post_data.get("thumbnail") if (post_data.get("thumbnail") and post_data.get("thumbnail").startswith("http")) else None
                    if not thumb_url and not post_data.get("is_self"):
                        post_url_field = post_data.get("url", "")
                        if any(post_url_field.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]):
                            thumb_url = post_url_field

                    # Popularity filter: Score >= 50 OR Upvote Ratio >= 0.85
                    score = post_data.get("score") or 0
                    ratio = post_data.get("upvote_ratio") or 0.0
                    title = post_data.get("title", "")
                    if score < 50 and ratio < 0.85:
                        logger.info(f"Skipping Reddit post '{title}' - not popular enough (Score: {score}, Ratio: {ratio})")
                        continue

                    posts_data.append({
                        "title": post_data.get("title", ""),
                        "content": post_data.get("selftext", "") or post_data.get("url", ""),
                        "url": post_url,
                        "author": post_data.get("author", "[deleted]"),
                        "published_at": published_at,
                        "raw_data": {
                            "score": post_data.get("score"),
                            "num_comments": post_data.get("num_comments"),
                            "upvote_ratio": post_data.get("upvote_ratio"),
                            "is_self": post_data.get("is_self"),
                            "thumbnail_url": thumb_url
                        }
                    })
        except Exception as e:
            logger.error(f"Public JSON fetch error for r/{subreddit_name}: {e}")
        return posts_data

    async def _get_or_create_source(self, name: str, sub_path: str) -> str:
        """Find existing source or create new one for user subreddit"""
        res = supabase.table("sources") \
            .select("id") \
            .eq("url", sub_path) \
            .eq("type", "reddit") \
            .execute()
        
        if res.data:
            return res.data[0]["id"]
        
        # Create a new source record in database
        new_source = supabase.table("sources").insert({
            "name": name,
            "type": "reddit",
            "url": sub_path,
            "is_active": True,
            "crawl_frequency_minutes": 45
        }).execute()
        return new_source.data[0]["id"]
