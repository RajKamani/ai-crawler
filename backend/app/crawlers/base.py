import logging
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.database import supabase

logger = logging.getLogger(__name__)

class BaseCrawler(ABC):
    def __init__(self):
        pass

    @abstractmethod
    async def crawl(self, *args, **kwargs):
        pass

    async def is_duplicate(self, url: str) -> bool:
        """Check if post URL already exists in database"""
        try:
            res = supabase.table("posts").select("id").eq("url", url).execute()
            return len(res.data) > 0
        except Exception as e:
            logger.error(f"Error checking duplicates for {url}: {e}")
            return False

    async def save_post(self, title: str, content: str, url: str, author: str, published_at: Any, source_id: str, raw_data: Optional[Dict] = None) -> Optional[Dict]:
        """Save a crawled post to Supabase database"""
        # Format published_at to ISO standard
        if isinstance(published_at, (tuple, list)):
            # struct_time parsed by feedparser
            import time
            dt = datetime(*published_at[:6])
            pub_date = dt.isoformat() + "Z"
        elif isinstance(published_at, datetime):
            pub_date = published_at.isoformat()
        else:
            pub_date = datetime.utcnow().isoformat() + "Z"

        # Simple automatic classification
        category, tags = self._classify_post(title, content)

        try:
            post_data = {
                "source_id": source_id,
                "title": title,
                "content": content[:10000] if content else "", # Limit text to prevent database overflow
                "url": url,
                "author": author,
                "category": category,
                "tags": tags,
                "published_at": pub_date,
                "raw_data": raw_data
            }
            res = supabase.table("posts").insert(post_data).execute()
            if res.data:
                logger.info(f"Saved post: {title}")
                saved_post = res.data[0]
                
                # Fetch source type for notification (non-blocking)
                try:
                    # Run notification triggering in a background task
                    import asyncio
                    from app.services.notification_service import notify_new_post
                    
                    # Run fetch and notify in background
                    async def fetch_and_notify(sid, title, pid):
                        source_res = supabase.table("sources").select("type").eq("id", sid).execute()
                        stype = "post"
                        if source_res.data:
                            stype = source_res.data[0].get("type", "post")
                        await notify_new_post(title, pid, stype)

                    asyncio.create_task(fetch_and_notify(source_id, title, saved_post["id"]))
                except Exception as notify_err:
                    logger.error(f"Failed to queue notification: {notify_err}")

                return saved_post
        except Exception as e:
            logger.error(f"Failed to save post {title}: {e}")
        return None

    def _classify_post(self, title: str, content: str) -> tuple[str, List[str]]:
        """Categorize post based on keywords in title/content"""
        text = f"{title} {content or ''}".lower()
        tags = []
        category = "general"

        # Identify tags
        keyword_tags = {
            "python": ["python", "pip", "django", "fastapi"],
            "javascript": ["javascript", "js", "typescript", "ts", "react", "next.js"],
            "rust": ["rust", "cargo"],
            "llm": ["llm", "large language model", "gpt", "llama", "claude", "gemini", "mistral", "cohere"],
            "agent": ["agent", "agents", "agency", "autogen", "crewai", "langgraph"],
            "rxtx": ["rag", "vector search", "embeddings", "pinecone", "chromadb", "qdrant", "milvus"],
            "finetune": ["finetuning", "fine-tuning", "lora", "qlora"],
            "app": ["mobile", "app", "ios", "android", "website", "application"]
        }

        for tag, keywords in keyword_tags.items():
            if any(kw in text for kw in keywords):
                tags.append(tag)

        # Identify category
        if any(kw in text for kw in ["github", "repository", "open-source", "repo", "library", "framework"]):
            category = "framework"
        elif any(kw in text for kw in ["release", "launch", "tool", "showcase", "demo", "product"]):
            category = "tool"
        elif any(kw in text for kw in ["idea", "concept", "brainstorm", "prototype", "hackathon"]):
            category = "idea"
        elif any(kw in text for kw in ["question", "help", "advice", "discussion", "thoughts", "opinion"]):
            category = "discussion"
        
        return category, tags
