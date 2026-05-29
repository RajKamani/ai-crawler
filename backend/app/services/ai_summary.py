import logging
from groq import Groq
from app.config import settings
from app.database import supabase

logger = logging.getLogger(__name__)

class AISummaryService:
    def __init__(self):
        self.client = None
        if settings.GROQ_API_KEY:
            try:
                self.client = Groq(api_key=settings.GROQ_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")

    async def get_summary(self, post_id: str) -> str:
        """
        Get or generate summary for a post.
        Checks database cache first, otherwise generates via Groq and caches it.
        """
        try:
            # Check database for existing summary
            res = supabase.table("posts") \
                .select("title, content, ai_summary") \
                .eq("id", post_id) \
                .single() \
                .execute()
            
            if not res.data:
                return "Post not found."
            
            post = res.data
            if post.get("ai_summary"):
                logger.info(f"Summary cache hit for post: {post_id}")
                return post["ai_summary"]

            # Cache miss, generate summary
            if not self.client:
                return "AI Summary is currently unavailable (Groq client not initialized)."
            
            title = post["title"]
            content = post["content"] or ""
            
            if len(content.strip()) < 100:
                # Content too short to summarize
                summary = f"Summary not required for short post: {title}"
                await self._save_summary(post_id, summary)
                return summary

            summary = await self._generate_groq_summary(title, content)
            
            # Save to cache
            await self._save_summary(post_id, summary)
            return summary

        except Exception as e:
            logger.error(f"Error in get_summary for post {post_id}: {e}")
            return f"Error generating summary: {str(e)}"

    async def _generate_groq_summary(self, title: str, content: str) -> str:
        """Generate summary using Groq chat completion API"""
        prompt = (
            f"Please summarize the following article/thread.\n"
            f"Title: {title}\n"
            f"Content: {content[:8000]}\n\n"
            f"Guidelines:\n"
            f"- Output a concise bullet-point summary (maximum 3-4 bullet points).\n"
            f"- Focus on key takeaways: what was built, what tool was introduced, or what the core idea is.\n"
            f"- Format using clean Markdown with bold keywords for highlights.\n"
            f"- Keep it professional and strictly objective. No introductions or explanations outside the bullet points.\n"
            f"- Avoid AI writing cliches and buzzwords. Do not use words like 'delve', 'tapestry', 'leverage', 'utilize', 'robust', 'streamline', 'seamless', 'pivotal', 'testament', 'revolutionize', 'groundbreaking', 'furthermore', 'moreover', 'in conclusion'. Use direct, simple, and plain words instead (e.g. use 'use' instead of 'leverage' or 'utilize', 'reliable' instead of 'robust', 'important' or 'key' instead of 'pivotal')."
        )

        try:
            completion = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a technical document summary generator. Summarize posts in plain, direct language without fluff or AI buzzwords."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq API call failed: {e}")
            # Try fallback model if versatile is not available
            try:
                completion = self.client.chat.completions.create(
                    model="llama3-70b-8192",
                    messages=[
                        {"role": "system", "content": "You are a technical document summary generator. Summarize posts in plain, direct language without fluff or AI buzzwords."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=500
                )
                return completion.choices[0].message.content.strip()
            except Exception as fe:
                logger.error(f"Groq fallback API call failed: {fe}")
                raise fe

    async def _save_summary(self, post_id: str, summary: str):
        """Cache the summary in the posts table"""
        try:
            supabase.table("posts") \
                .update({"ai_summary": summary}) \
                .eq("id", post_id) \
                .execute()
            logger.info(f"Cached summary for post: {post_id}")
        except Exception as e:
            logger.error(f"Failed to cache summary for post {post_id}: {e}")
