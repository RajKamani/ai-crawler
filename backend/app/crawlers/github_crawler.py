import logging
import httpx
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.config import settings
from app.crawlers.base import BaseCrawler

logger = logging.getLogger(__name__)

class GitHubCrawler(BaseCrawler):
    async def crawl(self, source) -> tuple[int, int]:
        """
        Crawl trending repositories.
        We search GitHub API using queries defined in source['url'] (e.g. 'topic:ai', 'topic:llm')
        """
        query = source["url"] # e.g. "topic:ai" or "topic:llm"
        logger.info(f"Crawling GitHub trending with query: {query}")
        
        # Calculate date from 7 days ago to query recent active repos
        since_date = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
        
        # Search query format: topic:llm created:>2026-05-17
        full_query = f"{query} created:>{since_date}"
        url = f"https://api.github.com/search/repositories?q={full_query}&sort=stars&order=desc&per_page=15"
        
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ai-content-crawler:v1.0.0"
        }
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

        found_count = 0
        saved_count = 0
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=15.0)
                
                if response.status_code == 403:
                    logger.error("GitHub API Rate Limited (403).")
                    return 0, 0
                elif response.status_code != 200:
                    logger.error(f"GitHub API returned error code {response.status_code}: {response.text}")
                    return 0, 0

                data = response.json()
                items = data.get("items", [])
                logger.info(f"Found {len(items)} repositories for query: {query}")

                for item in items:
                    repo_url = item.get("html_url")
                    if not repo_url:
                        continue

                    found_count += 1
                    if await self.is_duplicate(repo_url):
                        continue

                    owner = item.get("owner", {}).get("login", "Unknown")
                    name = item.get("name", "Untitled")
                    title = f"{owner}/{name}"
                    
                    description = item.get("description") or "No description provided."
                    stars = item.get("stargazers_count", 0)
                    forks = item.get("forks_count", 0)
                    language = item.get("language") or "Unknown"
                    topics = item.get("topics", [])
                    
                    # Generate rich markdown content for PostCard display
                    content = f"{description}\n\nLanguage: {language} | Stars: ⭐ {stars:,} | Forks: 🍴 {forks:,}"
                    
                    # Format ISO timestamp
                    created_at_str = item.get("created_at")
                    if created_at_str:
                        published_at = datetime.strptime(created_at_str, "%Y-%m-%dT%H:%M:%SZ")
                    else:
                        published_at = datetime.utcnow()

                    # Save repo as a post
                    res = await self.save_post(
                        title=title,
                        content=content,
                        url=repo_url,
                        author=owner,
                        published_at=published_at,
                        source_id=source["id"],
                        raw_data={
                            "stars": stars,
                            "forks": forks,
                            "language": language,
                            "topics": topics,
                            "homepage": item.get("homepage", "")
                        }
                    )
                    if res:
                        saved_count += 1
        except Exception as e:
            logger.error(f"Error crawling GitHub search {query}: {e}")
        return found_count, saved_count
