import logging
from typing import Optional
import feedparser
from datetime import datetime
from bs4 import BeautifulSoup
from app.database import supabase
from app.crawlers.base import BaseCrawler

logger = logging.getLogger(__name__)

class BlogCrawler(BaseCrawler):
    async def crawl(self, source):
        """Standard crawl interface for single source (global)"""
        await self.crawl_global(source)

    async def crawl_global(self, source):
        """Crawl default global blog sources (shared across all users)"""
        logger.info(f"Crawling global blog: {source['name']} ({source['url']})")
        await self._crawl_feed(
            feed_url=source["url"],
            source_id=source["id"],
            source_name=source["name"]
        )

    async def crawl_user_blogs(self):
        """Crawl all active user-added custom blog feeds"""
        logger.info("Crawling user custom blogs...")
        try:
            # Fetch all active user blogs
            result = supabase.table("user_blogs") \
                .select("blog_name, blog_url") \
                .eq("is_active", True) \
                .execute()
            
            if not result.data:
                logger.info("No active user custom blogs found.")
                return

            # Deduplicate blog URLs across users to avoid multiple requests
            unique_blogs = {}
            for row in result.data:
                unique_blogs[row["blog_url"]] = row["blog_name"]
            
            for blog_url, blog_name in unique_blogs.items():
                try:
                    source_id = await self._get_or_create_source(blog_name, blog_url)
                    await self._crawl_feed(
                        feed_url=blog_url,
                        source_id=source_id,
                        source_name=blog_name
                    )
                except Exception as e:
                    logger.error(f"Error crawling user blog {blog_name} ({blog_url}): {e}")

            # Update last_crawled_at for all crawled active user blogs
            now_iso = datetime.utcnow().isoformat() + "Z"
            supabase.table("user_blogs") \
                .update({"last_crawled_at": now_iso}) \
                .eq("is_active", True) \
                .execute()
                
        except Exception as e:
            logger.error(f"Error in crawl_user_blogs: {e}")

    async def _crawl_feed(self, feed_url: str, source_id: str, source_name: str):
        """Crawl a single RSS/Atom feed"""
        try:
            feed = feedparser.parse(feed_url)
            if feed.bozo and not feed.entries:
                logger.error(f"Bozo indicator true and no entries for feed: {feed_url}")
                return

            for entry in feed.entries:
                url = entry.get('link', '')
                if not url:
                    continue

                if await self.is_duplicate(url):
                    continue

                title = entry.get('title', 'Untitled')
                content = self._extract_content(entry)
                author = entry.get('author', source_name)
                published_time = entry.get('published_parsed') or entry.get('updated_parsed')

                # Try to extract image URL for thumbnail
                raw_html = ""
                if 'content' in entry and len(entry.content) > 0:
                    raw_html = entry.content[0].get('value', '')
                if not raw_html:
                    raw_html = entry.get('summary', '') or entry.get('description', '')
                
                thumbnail_url = self._extract_image(entry, raw_html)

                await self.save_post(
                    title=title,
                    content=content,
                    url=url,
                    author=author,
                    published_at=published_time,
                    source_id=source_id,
                    raw_data={
                        "summary_detail": entry.get('summary', ''),
                        "id": entry.get('id', ''),
                        "thumbnail_url": thumbnail_url
                    }
                )
        except Exception as e:
            logger.error(f"Error parsing feed {feed_url}: {e}")

    def _extract_image(self, entry, raw_html: str) -> Optional[str]:
        """Extract image URL from enclosures, media tags, or HTML content"""
        # 1. Try enclosures
        enclosures = entry.get('enclosures', [])
        for enc in enclosures:
            if enc.get('type', '').startswith('image/') and enc.get('href'):
                return enc.get('href')

        # 2. Try media content
        media = entry.get('media_content', [])
        for m in media:
            if m.get('url'):
                return m.get('url')

        # 3. Try media thumbnail
        thumbs = entry.get('media_thumbnail', [])
        for t in thumbs:
            if t.get('url'):
                return t.get('url')

        # 4. Try HTML parser search
        if raw_html:
            try:
                soup = BeautifulSoup(raw_html, 'html.parser')
                img = soup.find('img')
                if img and img.get('src'):
                    src = img.get('src')
                    if src.startswith('http'):
                        return src
            except:
                pass
        return None

    async def _get_or_create_source(self, blog_name: str, blog_url: str) -> str:
        """Find existing source or create new one for user blog"""
        res = supabase.table("sources") \
            .select("id") \
            .eq("url", blog_url) \
            .eq("type", "blog") \
            .execute()
        
        if res.data:
            return res.data[0]["id"]
        
        # Create a new source record in database
        new_source = supabase.table("sources").insert({
            "name": blog_name,
            "type": "blog",
            "url": blog_url,
            "is_active": True,
            "crawl_frequency_minutes": 90
        }).execute()
        return new_source.data[0]["id"]

    def _extract_content(self, entry) -> str:
        """Extract and clean HTML content from RSS entry summary or content"""
        raw = ""
        if 'content' in entry and len(entry.content) > 0:
            raw = entry.content[0].get('value', '')
        if not raw:
            raw = entry.get('summary', '') or entry.get('description', '')
        
        if not raw:
            return ""

        try:
            soup = BeautifulSoup(raw, 'html.parser')
            # Extract plain text
            return soup.get_text(separator=' ', strip=True)[:5000]
        except Exception as e:
            logger.warning(f"HTML parsing failed: {e}")
            return raw[:5000]
