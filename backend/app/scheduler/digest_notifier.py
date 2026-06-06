import logging
import httpx
import random
from app.database import supabase
from app.api.routes.posts import clean_sub_name, clean_blog_url

logger = logging.getLogger(__name__)

def send_daily_digest_notifications():
    """
    Query active notification tokens and send beautiful, dynamic daily digest
    notifications containing catchy titles and hot story previews.
    """
    logger.info("Starting daily digest notification job...")
    try:
        # Fetch active tokens
        res = supabase.table("notification_tokens").select("*").eq("is_active", True).execute()
        tokens_list = res.data or []
        
        if not tokens_list:
            logger.info("No active notification tokens found.")
            return

        # Catchy titles list with dynamic emojis
        catchy_titles = [
            "⚡ TECH INTEL: Your Daily Digest is Ready",
            "🧠 SYNAPSE: Fresh Tech Insights Await",
            "🤖 COLD CRAWL: Your Daily Technical Stack",
            "💡 TECH WATCH: What's Hot Off the Web Today"
        ]

        # Group tokens by user_id to minimize database queries
        user_tokens = {}
        for t in tokens_list:
            token = t.get("expo_push_token")
            user_id = t.get("user_id")
            if token and token.startswith("ExponentPushToken") and user_id:
                if user_id not in user_tokens:
                    user_tokens[user_id] = []
                user_tokens[user_id].append(token)

        messages = []
        for user_id, tokens in user_tokens.items():
            # Generate catchy title
            title = random.choice(catchy_titles)
            body = "Your daily digest is ready — 5 fresh stories curated for you."
            
            try:
                # 1. Fetch user's active subreddits & blogs to find their top story
                user_subs_res = supabase.table("user_subreddits") \
                    .select("subreddit_name") \
                    .eq("user_id", user_id) \
                    .eq("is_active", True) \
                    .execute()
                active_sub_names = {clean_sub_name(row["subreddit_name"]) for row in user_subs_res.data}

                user_blogs_res = supabase.table("user_blogs") \
                    .select("blog_url") \
                    .eq("user_id", user_id) \
                    .eq("is_active", True) \
                    .execute()
                active_blog_urls = {clean_blog_url(row["blog_url"]) for row in user_blogs_res.data}

                # 2. Fetch active sources
                sources_res = supabase.table("sources") \
                    .select("id, type, url") \
                    .eq("is_active", True) \
                    .execute()

                # 3. Filter allowed source IDs
                allowed_source_ids = []
                for s in sources_res.data:
                    s_type = s["type"]
                    s_url = s["url"]
                    if s_type == "blog" and (not active_blog_urls or clean_blog_url(s_url) in active_blog_urls):
                        allowed_source_ids.append(s["id"])

                if allowed_source_ids:
                    # Fetch top recent post from allowed sources to show preview
                    latest_post_res = supabase.table("posts") \
                        .select("title") \
                        .in_("source_id", allowed_source_ids) \
                        .order("published_at", desc=True) \
                        .limit(1) \
                        .execute()
                    
                    if latest_post_res.data:
                        top_story = latest_post_res.data[0]["title"]
                        # Truncate title if it's too long
                        if len(top_story) > 60:
                            top_story = top_story[:57] + "..."
                        body = f"🔥 HOT: \"{top_story}\" + other fresh tech takeaways inside."
            except Exception as query_err:
                logger.error(f"Error resolving preview story for user {user_id}: {query_err}")
                # Fallback to default body if query fails

            # Append messages for all tokens of this user
            for token in tokens:
                messages.append({
                    "to": token,
                    "sound": "default",
                    "title": title,
                    "body": body,
                    "data": {"screen": "digest"}
                })
        
        if not messages:
            logger.info("No valid ExponentPushTokens matched.")
            return

        # Send in chunks of 100 (Expo limit)
        chunk_size = 100
        for i in range(0, len(messages), chunk_size):
            chunk = messages[i:i + chunk_size]
            try:
                response = httpx.post(
                    "https://exp.host/--/api/v2/push/send",
                    headers={
                        "Accept": "application/json",
                        "Accept-Encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    },
                    json=chunk,
                    timeout=10.0
                )
                if response.status_code == 200:
                    logger.info(f"Successfully sent chunk of {len(chunk)} push notifications.")
                else:
                    logger.error(f"Failed to send push chunk: {response.text}")
            except Exception as e:
                logger.error(f"Error sending push chunk to Expo: {e}")
                
    except Exception as e:
        logger.error(f"Error in send_daily_digest_notifications: {e}")
