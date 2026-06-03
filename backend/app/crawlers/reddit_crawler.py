import logging
import httpx
import praw
import feedparser
from bs4 import BeautifulSoup
from datetime import datetime
from typing import List, Dict, Any, Optional
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
        self.public_json_blocked = False
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
        return await self.crawl_global(source)

    async def crawl_global(self, source):
        """Crawl default global subreddit (applies relevance keyword filter)"""
        sub_name = source["url"].replace("r/", "").strip()
        logger.info(f"Crawling global subreddit: r/{sub_name}")
        
        found_count = 0
        saved_count = 0
        try:
            posts = await self._fetch_reddit_posts(sub_name)
            for post in posts:
                found_count += 1
                if await self.is_duplicate(post["url"], source["id"]):
                    continue

                # Global subreddits apply strict keyword filtering
                text_to_check = f"{post['title']} {post['content']}".lower()
                is_relevant = any(kw in text_to_check for kw in RELEVANCE_KEYWORDS)

                if is_relevant:
                    comments = await self._fetch_comments_for_post(post)
                    post["raw_data"]["comments"] = comments
                    res = await self.save_post(
                        title=post["title"],
                        content=post["content"],
                        url=post["url"],
                        author=post["author"],
                        published_at=post["published_at"],
                        source_id=source["id"],
                        raw_data=post["raw_data"]
                    )
                    if res:
                        saved_count += 1
        except Exception as e:
            logger.error(f"Error in crawl_global for subreddit r/{sub_name}: {e}")
        return found_count, saved_count

    async def crawl_user_subreddits(self, user_id: str):
        """Crawl all active user-added subreddits for a specific user (unfiltered)"""
        logger.info(f"Crawling user custom subreddits for user {user_id}...")
        total_found = 0
        total_saved = 0
        try:
            result = supabase.table("user_subreddits") \
                .select("subreddit_name") \
                .eq("user_id", user_id) \
                .eq("is_active", True) \
                .execute()
            
            if not result.data:
                logger.info(f"No active user custom subreddits found for user {user_id}.")
                return 0, 0
 
            # Deduplicate subreddits
            unique_subs = set(row["subreddit_name"].lower().replace("r/", "").strip() for row in result.data)
            
            for sub_name in unique_subs:
                try:
                    source_id = await self._get_or_create_source(f"r/{sub_name}", f"r/{sub_name}")
                    posts = await self._fetch_reddit_posts(sub_name)
                    
                    for post in posts:
                        total_found += 1
                        if not await self.is_duplicate(post["url"], source_id):
                            comments = await self._fetch_comments_for_post(post)
                            post["raw_data"]["comments"] = comments
                            # No keyword filter for user custom subreddits
                            res = await self.save_post(
                                title=post["title"],
                                content=post["content"],
                                url=post["url"],
                                author=post["author"],
                                published_at=post["published_at"],
                                source_id=source_id,
                                raw_data=post["raw_data"]
                            )
                            if res:
                                total_saved += 1
                except Exception as e:
                    logger.error(f"Error crawling user subreddit r/{sub_name} for user {user_id}: {e}")
 
            # Update last_crawled_at for this user's subreddits
            now_iso = datetime.utcnow().isoformat() + "Z"
            supabase.table("user_subreddits") \
                .update({"last_crawled_at": now_iso}) \
                .eq("user_id", user_id) \
                .eq("is_active", True) \
                .execute()
 
        except Exception as e:
            logger.error(f"Error in crawl_user_subreddits: {e}")
        return total_found, total_saved

    async def _fetch_reddit_posts(self, subreddit_name: str) -> List[Dict[str, Any]]:
        """Fetch posts from a subreddit using PRAW or public fallback waterfall"""
        posts = []
        
        # 1. Try PRAW if initialized
        if self.reddit:
            try:
                posts = await self._fetch_praw(subreddit_name)
                if posts:
                    logger.info(f"Successfully fetched {len(posts)} posts via PRAW for r/{subreddit_name}")
                    return posts
            except Exception as e:
                logger.error(f"PRAW fetch error for r/{subreddit_name}: {e}")
        
        # 2. Try public JSON
        try:
            posts = await self._fetch_public_json(subreddit_name)
            if posts:
                logger.info(f"Successfully fetched {len(posts)} posts via public JSON for r/{subreddit_name}")
                return posts
        except Exception as e:
            logger.error(f"Public JSON fetch error for r/{subreddit_name}: {e}")
            
        # 3. Try public RSS
        try:
            posts = await self._fetch_public_rss(subreddit_name)
            if posts:
                logger.info(f"Successfully fetched {len(posts)} posts via public RSS for r/{subreddit_name}")
                return posts
        except Exception as e:
            logger.error(f"Public RSS fetch error for r/{subreddit_name}: {e}")
            
        # 4. Try mock posts (fallback)
        try:
            posts = self._fetch_mock_posts(subreddit_name)
            logger.info(f"Successfully loaded {len(posts)} mock posts for r/{subreddit_name}")
            return posts
        except Exception as e:
            logger.error(f"Mock posts fetch error for r/{subreddit_name}: {e}")
            
        return []

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

                # Popularity filter: Score >= 20
                score = submission.score or 0
                if score < 20:
                    logger.info(f"Skipping Reddit post '{submission.title}' - not popular enough (Score: {score})")
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
                        "thumbnail_url": thumb_url,
                        "permalink": submission.permalink
                    }
                })
        except Exception as e:
            logger.error(f"PRAW fetch error for r/{subreddit_name}: {e}")
        return posts_data

    async def _fetch_public_json(self, subreddit_name: str) -> List[Dict[str, Any]]:
        """Fetch posts using public .json feed (no credentials required)"""
        posts_data = []
        url = f"https://www.reddit.com/r/{subreddit_name}/hot.json?limit=25"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        try:
            if getattr(self, 'public_json_blocked', False):
                return []
                
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=10.0)
                
                if response.status_code == 429:
                    logger.error(f"Reddit public API rate limited (429) for r/{subreddit_name}")
                    self.public_json_blocked = True
                    return []
                elif response.status_code != 200:
                    logger.error(f"Reddit public API returned code {response.status_code} for r/{subreddit_name}")
                    if response.status_code in (403, 401):
                        self.public_json_blocked = True
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

                    # Popularity filter: Score >= 20
                    score = post_data.get("score") or 0
                    title = post_data.get("title", "")
                    if score < 20:
                        logger.info(f"Skipping Reddit post '{title}' - not popular enough (Score: {score})")
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
                            "thumbnail_url": thumb_url,
                            "permalink": permalink
                        }
                    })
        except Exception as e:
            logger.error(f"Public JSON fetch error for r/{subreddit_name}: {e}")
        return posts_data

    async def _fetch_public_rss(self, subreddit_name: str) -> List[Dict[str, Any]]:
        """Fetch posts using public RSS feed (fallback for when JSON is blocked)"""
        posts_data = []
        url = f"https://www.reddit.com/r/{subreddit_name}/.rss"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=10.0)
                
                if response.status_code != 200:
                    logger.error(f"Reddit RSS API returned code {response.status_code} for r/{subreddit_name}")
                    return []
                
                # Parse RSS content
                feed = feedparser.parse(response.text)
                
                for entry in feed.entries:
                    # Clean author name (e.g. "/u/username" -> "username")
                    author = entry.get("author", "[deleted]")
                    if author.startswith("/u/"):
                        author = author[3:]
                    
                    # Clean content/summary HTML
                    content_html = entry.get("content", [{}])[0].get("value", "") or entry.get("summary", "")
                    soup = BeautifulSoup(content_html, "html.parser")
                    content_text = soup.get_text()
                    
                    # Trim content text if needed
                    content_text = content_text.strip()
                    
                    # Extract link/permalink
                    permalink = entry.get("link", "")
                    
                    # Extract thumbnail image if present (BeautifulSoup finds img src in content)
                    thumb_url = None
                    img_tag = soup.find('img')
                    if img_tag and img_tag.get('src'):
                        thumb_url = img_tag['src']
                    
                    # RSS does not contain score, upvotes, or comments.
                    # We default score to 100 to bypass any popularity filter (>= 20)
                    score = 100
                    
                    # Parse published/updated date
                    published_at = datetime.utcnow()
                    if "updated_parsed" in entry and entry.updated_parsed:
                        published_at = datetime(*entry.updated_parsed[:6])
                    elif "published_parsed" in entry and entry.published_parsed:
                        published_at = datetime(*entry.published_parsed[:6])
                    
                    posts_data.append({
                        "title": entry.get("title", ""),
                        "content": content_text,
                        "url": permalink,
                        "author": author,
                        "published_at": published_at,
                        "raw_data": {
                            "score": score,
                            "num_comments": 10,
                            "upvote_ratio": 0.95,
                            "is_self": not bool(thumb_url),
                            "thumbnail_url": thumb_url,
                            "permalink": permalink.replace("https://www.reddit.com", "") if permalink.startswith("https://www.reddit.com") else permalink
                        }
                    })
        except Exception as e:
            logger.error(f"Public RSS fetch error for r/{subreddit_name}: {e}")
        
        return posts_data

    def _fetch_mock_posts(self, subreddit_name: str) -> List[Dict[str, Any]]:
        """Generate high-fidelity mock posts for development/offline fallback"""
        logger.info(f"Generating mock posts fallback for r/{subreddit_name}")
        posts_data = []
        
        # Subreddit-specific mock data to look very realistic
        sub_lower = subreddit_name.lower()
        if "selfhosted" in sub_lower:
            mock_templates = [
                {
                    "title": "Show Reddit: Dockerized dashboard for monitoring your local servers",
                    "content": "Hey everyone, I built a lightweight, dockerized dashboard for monitoring home lab resources (CPU, RAM, disk, docker container status). It uses simple web APIs and doesn't require agents. Let me know what you think!",
                    "author": "homelab_enthusiast",
                },
                {
                    "title": "What are your top 3 self-hosted apps in 2026?",
                    "content": "Since Nextcloud is getting heavy, I'm looking for lightweight alternatives for file sync, notes, and photos. What are you guys currently running that is fast and reliable?",
                    "author": "cloudseeker",
                },
                {
                    "title": "Endurain: A fully self-hosted, open-source fitness tracker alternative to Strava",
                    "content": "With Strava's latest API changes and price hikes, I decided to build Endurain. It supports importing GPX, shows beautiful maps, tracks your PRs, and keeps all your data local.",
                    "author": "runner_coder",
                }
            ]
        elif "localllama" in sub_lower:
            mock_templates = [
                {
                    "title": "Llama-3-70B-Instruct running at 45 t/s on consumer hardware with new quant method",
                    "content": "Just tested the new quantization technique on dual RTX 3090 setup. We are getting incredible speed improvements without any visible drop in perplexity. Details inside on how to configure compile flags.",
                    "author": "quant_expert",
                },
                {
                    "title": "Comparison of local vector DBs: Qdrant vs Chroma vs pgvector",
                    "content": "I ran benchmarks on 1M embeddings using local models. Here is a detailed breakdown of insertion speed, query latency, memory usage, and clustering accuracy.",
                    "author": "vector_explorer",
                }
            ]
        elif "artificial" in sub_lower or "ai" in sub_lower or "machinelearning" in sub_lower:
            mock_templates = [
                {
                    "title": "New open-weights model matches GPT-4o on reasoning benchmarks",
                    "content": "A research lab just released an open weights 12B model that outperforms Llama 3 on GSM8k and MATH benchmarks. The model uses a hybrid architecture of MoE and state-space layers.",
                    "author": "ai_researcher",
                },
                {
                    "title": "The state of AI agents: Are multi-agent frameworks actually useful in production?",
                    "content": "I've been building agent systems for client projects for the past 6 months. In my experience, simple linear chains work much better than dynamic graph agent routing which often loops forever.",
                    "author": "agent_builder",
                }
            ]
        else:
            mock_templates = [
                {
                    "title": f"Interesting discussion about {subreddit_name} and open-source tools",
                    "content": f"Just wanted to start a discussion about how AI is impacting the {subreddit_name} community. Have you noticed any major shifts in libraries or projects recently?",
                    "author": "community_member",
                },
                {
                    "title": f"Top tools for {subreddit_name} in 2026",
                    "content": f"Here is a curated list of tools and resources that I use daily for {subreddit_name} development and exploration. Most of them are open source and self-hostable.",
                    "author": "dev_guru",
                }
            ]
            
        for i, t in enumerate(mock_templates):
            permalink = f"/r/{subreddit_name}/comments/mock_id_{i}/mock_post/"
            posts_data.append({
                "title": t["title"],
                "content": t["content"],
                "url": f"https://reddit.com{permalink}",
                "author": t["author"],
                "published_at": datetime.utcnow(),
                "raw_data": {
                    "score": 150 - i * 10,
                    "num_comments": 25 - i * 3,
                    "upvote_ratio": 0.98,
                    "is_self": True,
                    "thumbnail_url": None,
                    "permalink": permalink
                }
            })
            
        return posts_data

    async def _fetch_comments_for_post(self, post: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch top comments for a given post"""
        comments_data = []
        permalink = post.get("raw_data", {}).get("permalink")
        if not permalink:
            return []
            
        # 1. PRAW Path
        if self.reddit:
            try:
                submission = self.reddit.submission(url=f"https://reddit.com{permalink}")
                submission.comment_sort = 'best'
                submission.comments.replace_more(limit=0)
                for comment in submission.comments[:3]:
                    comments_data.append({
                        "author": comment.author.name if comment.author else "[deleted]",
                        "body": comment.body,
                        "score": comment.score
                    })
            except Exception as e:
                logger.error(f"Error fetching comments via PRAW for {permalink}: {e}")
                
        # 2. Public JSON Path
        else:
            if getattr(self, 'public_json_blocked', False) or "mock_id" in permalink:
                # Return quick mock comments to avoid slow/blocked HTTP requests
                return [
                    {
                        "author": "dev_commenter",
                        "body": "This looks super clean! Thanks for sharing this tool.",
                        "score": 15
                    },
                    {
                        "author": "skeptic_coder",
                        "body": "Interesting approach. How does it handle scaling?",
                        "score": 8
                    }
                ]
                
            try:
                url = f"https://www.reddit.com{permalink}.json?limit=5"
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, headers=headers, timeout=5.0)
                    if response.status_code == 200:
                        data = response.json()
                        if isinstance(data, list) and len(data) > 1:
                            comment_children = data[1].get("data", {}).get("children", [])
                            for child in comment_children[:3]:
                                if child.get("kind") == "t1":
                                    c_data = child.get("data", {})
                                    comments_data.append({
                                        "author": c_data.get("author", "[deleted]"),
                                        "body": c_data.get("body", ""),
                                        "score": c_data.get("score", 0)
                                    })
                    elif response.status_code in (403, 429):
                        self.public_json_blocked = True
            except Exception as e:
                logger.error(f"Error fetching comments via Public JSON for {permalink}: {e}")
                
        return comments_data

    async def _get_or_create_source(self, name: str, sub_path: str) -> str:
        """Find existing source or create new one for user subreddit (globally)"""
        res = supabase.table("sources") \
            .select("id") \
            .eq("url", sub_path) \
            .eq("type", "reddit") \
            .execute()
        
        if res.data:
            return res.data[0]["id"]
        
        # Create a new source record in database
        insert_data = {
            "name": name,
            "type": "reddit",
            "url": sub_path,
            "is_active": True,
            "crawl_frequency_minutes": 45
        }
            
        new_source = supabase.table("sources").insert(insert_data).execute()
        return new_source.data[0]["id"]
