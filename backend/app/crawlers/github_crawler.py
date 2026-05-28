import logging
import httpx
import re
import json
from datetime import datetime
from typing import List, Dict, Any, Tuple
from bs4 import BeautifulSoup
from app.crawlers.base import BaseCrawler

logger = logging.getLogger(__name__)

# Topic mapping from generic keywords to concrete Trendshift topic slugs
TRENDSHIFT_TOPIC_MAPPING = {
    "ai": ["ai-agent", "ai-coding", "ai-workflow"],
    "llm": ["ai-agent", "ai-coding"],
    "generative-ai": ["ai-image", "ai-video", "ai-voice"],
    "ml": ["ai-infrastructure", "ai-memory"],
    "machine-learning": ["ai-infrastructure", "ai-memory"],
    "agent": ["ai-agent"],
    "agents": ["ai-agent"],
    "coding": ["ai-coding"],
    "programming": ["programming-examples"],
    "selfhosted": ["self-hosted"],
    "self-hosted": ["self-hosted"],
    "mcp": ["mcp"],
    "rag": ["rag"],
    "database": ["vector-database"],
    "vector": ["vector-database"],
    "frontend": ["ui-components"],
    "ui": ["ui-components"],
}

KNOWN_TRENDSHIFT_TOPICS = {
    "ai-agent", "ai-coding", "ai-image", "ai-infrastructure", "ai-memory",
    "ai-skills", "ai-translation", "ai-video", "ai-voice", "ai-workflow",
    "audio-processing", "authentication", "bundler", "chatbot", "cloud-native",
    "computer-vision", "crypto-trading", "curated-list", "data-streaming",
    "data-visualization", "database-backup", "design-system", "digital-human",
    "document-processing", "ecommerce", "emulator", "file-management", "fintech",
    "game-development", "headless-browser", "headless-cms", "home-automation",
    "image-editing", "iot", "local-llm", "mcp", "monitoring", "nlp",
    "observability", "pentesting", "programming-examples", "proxy", "rag",
    "resume-building", "robotics", "search", "self-hosted", "static-analysis",
    "synthetic-data", "text-to-speech", "ui-components", "vector-database",
    "video-editing", "web-scraping", "webassembly", "workflow-automation"
}

class GitHubCrawler(BaseCrawler):
    async def crawl(self, source) -> Tuple[int, int]:
        """
        Crawl trending repositories from Trendshift.io instead of native GitHub search.
        """
        raw_query = source["url"]
        logger.info(f"Crawling Trendshift.io for query: {raw_query}")

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        # Resolve target slugs
        topic_slugs = []
        is_topic_crawl = False

        if raw_query.startswith("topic:"):
            is_topic_crawl = True
            topic_name = raw_query.replace("topic:", "").strip().lower()
            if topic_name in TRENDSHIFT_TOPIC_MAPPING:
                topic_slugs = TRENDSHIFT_TOPIC_MAPPING[topic_name]
            elif topic_name in KNOWN_TRENDSHIFT_TOPICS:
                topic_slugs = [topic_name]
            else:
                # Fallback to topic name as slug if not in map
                topic_slugs = [topic_name]
        
        found_count = 0
        saved_count = 0

        async with httpx.AsyncClient() as client:
            if is_topic_crawl:
                # Crawl each resolved Trendshift topic page
                for slug in topic_slugs:
                    try:
                        url = f"https://trendshift.io/topics/{slug}"
                        logger.info(f"Fetching Trendshift topic page: {url}")
                        response = await client.get(url, headers=headers, timeout=15.0)
                        
                        if response.status_code == 404:
                            logger.warning(f"Trendshift topic '{slug}' returned 404. Trying homepage fallback.")
                            # Fallback to homepage parser
                            f, s = await self._parse_and_save_list_page(client, "https://trendshift.io/", headers, source)
                            found_count += f
                            saved_count += s
                            continue
                        elif response.status_code != 200:
                            logger.error(f"Trendshift returned error code {response.status_code} for topic '{slug}'")
                            continue

                        f, s = await self._parse_and_save_topic_page(response.text, source)
                        found_count += f
                        saved_count += s
                    except Exception as e:
                        logger.error(f"Error crawling Trendshift topic '{slug}': {e}")
            else:
                # Crawl homepage (Today's daily trending)
                try:
                    f, s = await self._parse_and_save_list_page(client, "https://trendshift.io/", headers, source)
                    found_count += f
                    saved_count += s
                except Exception as e:
                    logger.error(f"Error crawling Trendshift homepage: {e}")

                # Crawl monthly trending repositories
                try:
                    f, s = await self._parse_and_save_list_page(client, "https://trendshift.io/monthly", headers, source)
                    found_count += f
                    saved_count += s
                except Exception as e:
                    logger.error(f"Error crawling Trendshift monthly trending: {e}")

        return found_count, saved_count

    async def _parse_and_save_list_page(self, client: httpx.AsyncClient, url: str, headers: Dict[str, str], source: Dict[str, Any]) -> Tuple[int, int]:
        """
        Fetch and parse any Trendshift list page (like homepage or monthly page) using a hybrid JSON-LD + HTML parser.
        """
        logger.info(f"Fetching Trendshift list page: {url}")
        response = await client.get(url, headers=headers, timeout=15.0)
        if response.status_code != 200:
            logger.error(f"Trendshift page {url} returned status {response.status_code}")
            return 0, 0

        html = response.text
        soup = BeautifulSoup(html, "html.parser")

        # 1. Parse JSON-LD metadata for clean details
        repos_data = []
        json_ld_blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
        for block in json_ld_blocks:
            try:
                data = json.loads(block)
                if data.get("@type") == "ItemList":
                    for element in data.get("itemListElement", []):
                        item = element.get("item", {})
                        name = item.get("name")
                        if name:
                            repos_data.append({
                                "title": name,
                                "description": item.get("description", "") or "No description provided.",
                                "url": item.get("codeRepository") or item.get("url") or f"https://github.com/{name}",
                                "language": item.get("programmingLanguage") or "Unknown",
                                "topics": item.get("keywords") or [],
                                "stars": 0
                            })
            except Exception as e:
                logger.warning(f"Failed to parse JSON-LD block: {e}")

        # 2. Parse HTML rows to find stars and match with JSON-LD repositories
        main_container = soup.find("div", class_=lambda x: x and "divide-y" in x)
        if main_container:
            repo_links = main_container.find_all("a", href=re.compile(r"^/repositories/\d+$"))
            stars_by_name = {}
            for a in repo_links:
                title = a.get_text(strip=True)
                if not title or "/" not in title:
                    continue
                # Find parent container to locate stars
                container = a.find_parent("div", class_=lambda x: x and "flex-col" in x)
                stars = 0
                if container:
                    stars_span = container.find("span", class_=lambda x: x and "text-foreground" in x)
                    if stars_span:
                        stars_text = stars_span.get_text(strip=True)
                        try:
                            if "k" in stars_text.lower():
                                stars = int(float(stars_text.lower().replace("k", "")) * 1000)
                            else:
                                stars = int(stars_text)
                        except ValueError:
                            pass
                stars_by_name[title] = stars
            
            # Merge HTML stars into JSON-LD repos list
            for repo in repos_data:
                if repo["title"] in stars_by_name:
                    repo["stars"] = stars_by_name[repo["title"]]

        # 3. Fallback: Parse pure HTML if JSON-LD parsing returned no results but HTML list container exists
        if not repos_data and main_container:
            logger.info("JSON-LD was empty or missing. Falling back to pure HTML parsing.")
            repo_links = main_container.find_all("a", href=re.compile(r"^/repositories/\d+$"))
            for a in repo_links:
                title = a.get_text(strip=True)
                if not title or "/" not in title:
                    continue
                # Find parent container to locate stars & details
                container = a.find_parent("div", class_=lambda x: x and "flex-col" in x)
                description = "No description provided."
                stars = 0
                topics = []
                if container:
                    desc_p = container.find("p", class_=lambda x: x and "text-muted-foreground" in x)
                    if desc_p:
                        description = desc_p.get_text(strip=True)
                    stars_span = container.find("span", class_=lambda x: x and "text-foreground" in x)
                    if stars_span:
                        stars_text = stars_span.get_text(strip=True)
                        try:
                            if "k" in stars_text.lower():
                                stars = int(float(stars_text.lower().replace("k", "")) * 1000)
                            else:
                                stars = int(stars_text)
                        except ValueError:
                            pass
                    topic_badges = container.find_all("a", href=re.compile(r"^/topics/"))
                    for badge in topic_badges:
                        topics.append(badge.get_text(strip=True).replace("#", ""))

                repos_data.append({
                    "title": title,
                    "description": description,
                    "url": f"https://github.com/{title}",
                    "language": "Unknown",
                    "topics": topics,
                    "stars": stars
                })

        # 4. Save repositories to the database
        found_count = 0
        saved_count = 0

        for repo in repos_data:
            title = repo["title"]
            repo_url = repo["url"]
            
            found_count += 1
            
            if await self.is_duplicate(repo_url, source["id"]):
                continue

            parts = title.split('/')
            owner = parts[0] if len(parts) > 0 else "Unknown"

            # Create rich markdown content for PostCard display
            description = repo["description"]
            language = repo["language"]
            stars = repo["stars"]
            content = f"{description}\n\nLanguage: {language} | Stars: ⭐ {stars:,} | Forks: 🍴 0"

            res = await self.save_post(
                title=title,
                content=content,
                url=repo_url,
                author=owner,
                published_at=datetime.utcnow(),
                source_id=source["id"],
                raw_data={
                    "stars": stars,
                    "forks": 0,
                    "language": language,
                    "topics": repo["topics"],
                    "homepage": ""
                }
            )
            if res:
                saved_count += 1

        return found_count, saved_count

    async def _parse_and_save_topic_page(self, html: str, source: Dict[str, Any]) -> Tuple[int, int]:
        """
        Parse and save repositories listed on a Trendshift topic page.
        """
        soup = BeautifulSoup(html, "html.parser")
        main_container = soup.find("div", class_=lambda x: x and "divide-y" in x)
        if not main_container:
            logger.warning("Topic main container (divide-y) not found.")
            return 0, 0

        found_count = 0
        saved_count = 0

        repo_links = main_container.find_all("a", href=re.compile(r"^/repositories/\d+$"))
        for a in repo_links:
            title = a.get_text(strip=True)
            if not title or "/" not in title:
                continue

            found_count += 1
            repo_url = f"https://github.com/{title}"
            if await self.is_duplicate(repo_url, source["id"]):
                continue

            container = a.find_parent("div", class_=lambda x: x and "flex-col" in x)
            description = "No description provided."
            stars = 0
            topics = []
            
            if container:
                desc_p = container.find("p", class_=lambda x: x and "text-muted-foreground" in x)
                if desc_p:
                    description = desc_p.get_text(strip=True)

                stars_span = container.find("span", class_=lambda x: x and "text-foreground" in x)
                if stars_span:
                    stars_text = stars_span.get_text(strip=True)
                    try:
                        if "k" in stars_text.lower():
                            stars = int(float(stars_text.lower().replace("k", "")) * 1000)
                        else:
                            stars = int(stars_text)
                    except ValueError:
                        pass

                topic_badges = container.find_all("a", href=re.compile(r"^/topics/"))
                for badge in topic_badges:
                    topics.append(badge.get_text(strip=True).replace("#", ""))

            parts = title.split('/')
            owner = parts[0] if len(parts) > 0 else "Unknown"

            content = f"{description}\n\nLanguage: Unknown | Stars: ⭐ {stars:,} | Topics: {', '.join(topics)}"

            res = await self.save_post(
                title=title,
                content=content,
                url=repo_url,
                author=owner,
                published_at=datetime.utcnow(),
                source_id=source["id"],
                raw_data={
                    "stars": stars,
                    "forks": 0,
                    "language": "Unknown",
                    "topics": topics,
                    "homepage": ""
                }
            )
            if res:
                saved_count += 1

        return found_count, saved_count
