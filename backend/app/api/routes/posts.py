import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from app.database import supabase
from app.api.deps import get_current_user
from datetime import datetime
from app.config import settings

router = APIRouter(prefix="/api/v1/posts", tags=["posts"])
logger = logging.getLogger(__name__)

def format_post(post: dict) -> dict:
    """Inject thumbnail_url from raw_data if available"""
    raw = post.get("raw_data") or {}
    post["thumbnail_url"] = raw.get("thumbnail_url")
    return post


def clean_sub_name(name: str) -> str:
    """Normalize subreddit names for safe comparison (removes r/ prefixes and lowercases)"""
    if not name:
        return ""
    name = name.lower().strip()
    if name.startswith("r/"):
        name = name[2:]
    if name.startswith("r/"):
        name = name[2:]
    return name


def clean_blog_url(url: str) -> str:
    """Normalize blog RSS URLs for safe comparison (removes protocol, www, trailing slashes, and lowercases)"""
    if not url:
        return ""
    url = url.lower().strip().rstrip("/")
    if url.startswith("https://"):
        url = url[8:]
    elif url.startswith("http://"):
        url = url[7:]
    if url.startswith("www."):
        url = url[4:]
    return url


from urllib.parse import urlparse

def check_similarity(title1: str, title2: str) -> bool:
    """Compare two titles using Jaccard token overlap of words > 3 characters"""
    if not title1 or not title2:
        return False
    words1 = set(w for w in title1.lower().split() if len(w) > 3)
    words2 = set(w for w in title2.lower().split() if len(w) > 3)
    if not words1 or not words2:
        return False
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return (len(intersection) / len(union)) > 0.4

def clean_url(url: str) -> str:
    """Strip protocol, subdomains, query parameters, and trailing slashes for base link comparison"""
    if not url:
        return ""
    try:
        parsed = urlparse(url.lower().strip())
        netloc = parsed.netloc
        if netloc.startswith("www."):
            netloc = netloc[4:]
        path = parsed.path.rstrip("/")
        return f"{netloc}{path}"
    except Exception:
        return url.lower().strip()


@router.get("")
async def get_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None, description="Filter by type: 'blog', 'reddit', 'github'"),
    category: Optional[str] = Query(None, description="Filter by category: 'tool', 'idea', 'framework', 'discussion'"),
    tag: Optional[str] = Query(None, description="Filter by tags"),
    source_id: Optional[str] = Query(None, description="Filter by source ID"),
    q: Optional[str] = Query(None, description="Full-text search query"),
    user = Depends(get_current_user) # Optional authorization if we want to show bookmarks
):
    """
    Get paginated posts, with support for filtering by type, category, tag, or search query.
    If authenticated, returns bookmark status for each post.
    """
    try:
        offset = (page - 1) * limit
        
        # Retrieve user preference for github language if not specified in search query
        github_lang = None
        if hasattr(user, "user_metadata") and user.user_metadata:
            github_lang = user.user_metadata.get("github_language")
            if github_lang and isinstance(github_lang, str):
                github_lang = github_lang.lower().strip()
                if github_lang == "any":
                    github_lang = None

        if type == "github" and github_lang and not tag:
            tag = github_lang

        # 1. Fetch user's active subreddit names
        user_subs_res = supabase.table("user_subreddits") \
            .select("subreddit_name") \
            .eq("user_id", user.id) \
            .eq("is_active", True) \
            .execute()
        active_sub_names = {clean_sub_name(row["subreddit_name"]) for row in user_subs_res.data}

        # 2. Fetch user's active blog URLs
        user_blogs_res = supabase.table("user_blogs") \
            .select("blog_url") \
            .eq("user_id", user.id) \
            .eq("is_active", True) \
            .execute()
        active_blog_urls = {clean_blog_url(row["blog_url"]) for row in user_blogs_res.data}

        # 3. Fetch active sources
        sources_res = supabase.table("sources") \
            .select("id, name, type, url") \
            .eq("is_active", True) \
            .execute()

        # 4. Filter allowed source IDs in Python based on the type filter and user's selections.
        # Fall back to showing all global/curated active sources of that type if the user has no custom selections yet.
        allowed_source_ids = []
        for s in sources_res.data:
            s_type = s["type"]
            s_url = s["url"]
            
            if type:
                if s_type == type:
                    if type == "github":
                        allowed_source_ids.append(s["id"])
                    elif type == "reddit" and (not active_sub_names or clean_sub_name(s_url) in active_sub_names):
                        allowed_source_ids.append(s["id"])
                    elif type == "blog" and (not active_blog_urls or clean_blog_url(s_url) in active_blog_urls):
                        allowed_source_ids.append(s["id"])
            else:
                if s_type == "reddit" and (not active_sub_names or clean_sub_name(s_url) in active_sub_names):
                    allowed_source_ids.append(s["id"])
                elif s_type == "blog" and (not active_blog_urls or clean_blog_url(s_url) in active_blog_urls):
                    allowed_source_ids.append(s["id"])

        if not allowed_source_ids:
            return {"posts": [], "page": page, "limit": limit, "count": 0}

        # Build query
        base_query = supabase.table("posts").select("*, sources(name, type)")
        
        # 0. Source ID filtering (verify user has access to it)
        if source_id:
            if source_id in allowed_source_ids:
                base_query = base_query.eq("source_id", source_id)
            else:
                return {"posts": [], "page": page, "limit": limit, "count": 0}
        else:
            base_query = base_query.in_("source_id", allowed_source_ids)

        # 1. Type filtering (blog, reddit, github)
        if type:
            source_res = supabase.table("sources") \
                .select("id") \
                .eq("type", type) \
                .in_("id", allowed_source_ids) \
                .execute()
            source_ids = [s["id"] for s in source_res.data]
            base_query = base_query.in_("source_id", source_ids)

        # 2. Category filtering
        if category:
            base_query = base_query.eq("category", category)

        # 3. Tag filtering
        if tag:
            # PostgreSQL array contains filter: tags @> ARRAY['tag']
            base_query = base_query.contains("tags", [tag])

        # 4. Search query (using full-text search)
        if q:
            base_query = base_query.wfts("search_vector", q)

        # Pagination and order
        res = base_query \
            .order("published_at", desc=True) \
            .range(offset, offset + limit) \
            .execute()

        posts = [format_post(p) for p in res.data]

        # Fetch bookmarks and views
        if posts:
            post_ids = [p["id"] for p in posts]
            
            # Fetch bookmarks
            bookmarks_res = supabase.table("bookmarks") \
                .select("post_id") \
                .eq("user_id", user.id) \
                .in_("post_id", post_ids) \
                .execute()
            bookmarked_ids = set(b["post_id"] for b in bookmarks_res.data)
            
            # Fetch viewed status
            views_res = supabase.table("post_views") \
                .select("post_id") \
                .eq("user_id", user.id) \
                .in_("post_id", post_ids) \
                .execute()
            viewed_ids = set(v["post_id"] for v in views_res.data)
            
            for post in posts:
                post["is_bookmarked"] = post["id"] in bookmarked_ids
                post["is_viewed"] = post["id"] in viewed_ids
        else:
            for post in posts:
                post["is_bookmarked"] = False
                post["is_viewed"] = False

        # De-duplicate posts in this batch
        unique_posts = []
        seen_ids = set()
        similar_map = {} # main_post_id -> list of similar posts
        
        for post in posts:
            if post["id"] in seen_ids:
                continue
                
            matched_parent = None
            for parent in unique_posts:
                # 1. Compare cleaned URLs if available
                if post.get("url") and parent.get("url"):
                    if clean_url(post["url"]) == clean_url(parent["url"]):
                        matched_parent = parent
                        break
                # 2. Compare Jaccard similarity of titles
                if check_similarity(post["title"], parent["title"]):
                    matched_parent = parent
                    break
                    
            if matched_parent:
                pid = matched_parent["id"]
                if pid not in similar_map:
                    similar_map[pid] = []
                similar_map[pid].append({
                    "id": post["id"],
                    "title": post["title"],
                    "url": post["url"],
                    "source_name": (post.get("sources") or {}).get("name", "Unknown") if isinstance(post.get("sources"), dict) else "Unknown",
                    "source_type": (post.get("sources") or {}).get("type", "unknown") if isinstance(post.get("sources"), dict) else "unknown"
                })
                seen_ids.add(post["id"])
            else:
                unique_posts.append(post)
                
        for post in unique_posts:
            post["similar_posts"] = similar_map.get(post["id"], [])
            
        posts = unique_posts

        return {"posts": posts, "page": page, "limit": limit, "count": len(posts)}

    except Exception as e:
        logger.error(f"Error fetching posts: {e}")
        raise HTTPException(500, f"Failed to fetch posts: {str(e)}")


@router.get("/personalized")
async def get_personalized_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    source_id: Optional[str] = Query(None, description="Filter by source ID"),
    user = Depends(get_current_user)
):
    """
    Returns a personalized feed for the authenticated user.
    The feed contains posts from:
    1. Custom and global subreddits selected by the user.
    2. Custom and global blogs selected by the user.
    """
    try:
        offset = (page - 1) * limit
        
        # 1. Fetch user's active subreddit names
        user_subs_res = supabase.table("user_subreddits") \
            .select("subreddit_name") \
            .eq("user_id", user.id) \
            .eq("is_active", True) \
            .execute()
        active_sub_names = {clean_sub_name(row["subreddit_name"]) for row in user_subs_res.data}

        # 2. Fetch user's active blog URLs
        user_blogs_res = supabase.table("user_blogs") \
            .select("blog_url") \
            .eq("user_id", user.id) \
            .eq("is_active", True) \
            .execute()
        active_blog_urls = {clean_blog_url(row["blog_url"]) for row in user_blogs_res.data}

        # 3. Fetch active sources
        sources_res = supabase.table("sources") \
            .select("id, name, type, url") \
            .eq("is_active", True) \
            .execute()

        # 4. Filter sources in Python to only include selected subreddits and blogs.
        # Fall back to showing all global/curated active sources if the user has no custom selections yet.
        source_ids = []
        for s in sources_res.data:
            s_type = s["type"]
            s_url = s["url"]
            if s_type == "reddit" and (not active_sub_names or clean_sub_name(s_url) in active_sub_names):
                source_ids.append(s["id"])
            elif s_type == "blog" and (not active_blog_urls or clean_blog_url(s_url) in active_blog_urls):
                source_ids.append(s["id"])

        if not source_ids:
            return {"posts": [], "page": page, "limit": limit, "count": 0}

        # Filter by specific source ID if requested, validating user access
        if source_id:
            if source_id in source_ids:
                source_ids = [source_id]
            else:
                return {"posts": [], "page": page, "limit": limit, "count": 0}

        res = supabase.table("posts") \
            .select("*, sources(name, type)") \
            .in_("source_id", source_ids) \
            .order("published_at", desc=True) \
            .range(offset, offset + limit) \
            .execute()

        posts = [format_post(p) for p in res.data]

        # Fetch bookmarks and views
        if posts:
            post_ids = [p["id"] for p in posts]
            
            # Fetch bookmarks
            bookmarks_res = supabase.table("bookmarks") \
                .select("post_id") \
                .eq("user_id", user.id) \
                .in_("post_id", post_ids) \
                .execute()
            bookmarked_ids = set(b["post_id"] for b in bookmarks_res.data)
            
            # Fetch viewed status
            views_res = supabase.table("post_views") \
                .select("post_id") \
                .eq("user_id", user.id) \
                .in_("post_id", post_ids) \
                .execute()
            viewed_ids = set(v["post_id"] for v in views_res.data)
            
            for post in posts:
                post["is_bookmarked"] = post["id"] in bookmarked_ids
                post["is_viewed"] = post["id"] in viewed_ids
        else:
            for post in posts:
                post["is_bookmarked"] = False
                post["is_viewed"] = False

        # De-duplicate posts in this batch
        unique_posts = []
        seen_ids = set()
        similar_map = {} # main_post_id -> list of similar posts
        
        for post in posts:
            if post["id"] in seen_ids:
                continue
                
            matched_parent = None
            for parent in unique_posts:
                # 1. Compare cleaned URLs if available
                if post.get("url") and parent.get("url"):
                    if clean_url(post["url"]) == clean_url(parent["url"]):
                        matched_parent = parent
                        break
                # 2. Compare Jaccard similarity of titles
                if check_similarity(post["title"], parent["title"]):
                    matched_parent = parent
                    break
                    
            if matched_parent:
                pid = matched_parent["id"]
                if pid not in similar_map:
                    similar_map[pid] = []
                similar_map[pid].append({
                    "id": post["id"],
                    "title": post["title"],
                    "url": post["url"],
                    "source_name": (post.get("sources") or {}).get("name", "Unknown") if isinstance(post.get("sources"), dict) else "Unknown",
                    "source_type": (post.get("sources") or {}).get("type", "unknown") if isinstance(post.get("sources"), dict) else "unknown"
                })
                seen_ids.add(post["id"])
            else:
                unique_posts.append(post)
                
        for post in unique_posts:
            post["similar_posts"] = similar_map.get(post["id"], [])
            
        posts = unique_posts

        return {"posts": posts, "page": page, "limit": limit, "count": len(posts)}

    except Exception as e:
        logger.error(f"Error fetching personalized feed for user {user.id}: {e}")
        raise HTTPException(500, f"Failed to fetch personalized feed: {str(e)}")


@router.get("/sources")
async def get_active_feed_sources(user = Depends(get_current_user)):
    """Get active feed sources selected/followed by the user"""
    try:
        # 1. Fetch user's active subreddit names
        user_subs_res = supabase.table("user_subreddits") \
            .select("subreddit_name") \
            .eq("user_id", user.id) \
            .eq("is_active", True) \
            .execute()
        active_sub_names = {clean_sub_name(row["subreddit_name"]) for row in user_subs_res.data}

        # 2. Fetch user's active blog URLs
        user_blogs_res = supabase.table("user_blogs") \
            .select("blog_url") \
            .eq("user_id", user.id) \
            .eq("is_active", True) \
            .execute()
        active_blog_urls = {clean_blog_url(row["blog_url"]) for row in user_blogs_res.data}

        # 3. Fetch active sources
        sources_res = supabase.table("sources") \
            .select("id, name, type, url") \
            .eq("is_active", True) \
            .execute()

        # 4. Filter sources in Python to only include selected subreddits and blogs
        filtered_sources = []
        for s in sources_res.data:
            s_type = s["type"]
            s_url = s["url"]
            if s_type == "reddit" and clean_sub_name(s_url) in active_sub_names:
                filtered_sources.append(s)
            elif s_type == "blog" and clean_blog_url(s_url) in active_blog_urls:
                filtered_sources.append(s)

        # Sort by name
        filtered_sources.sort(key=lambda x: x["name"].lower())
        return {"sources": filtered_sources}
    except Exception as e:
        logger.error(f"Error fetching active sources: {e}")
        raise HTTPException(500, f"Failed to fetch active sources: {str(e)}")


@router.get("/unread/count")
async def get_unread_count(user = Depends(get_current_user)):
    """Get the count of unread posts for the user's subscribed subreddits and blogs"""
    try:
        # 1. Fetch user's active subreddits & blogs
        user_subs_res = supabase.table("user_subreddits") \
            .select("subreddit_name") \
            .eq("user_id", user.id) \
            .eq("is_active", True) \
            .execute()
        active_sub_names = {clean_sub_name(row["subreddit_name"]) for row in user_subs_res.data}

        user_blogs_res = supabase.table("user_blogs") \
            .select("blog_url") \
            .eq("user_id", user.id) \
            .eq("is_active", True) \
            .execute()
        active_blog_urls = {clean_blog_url(row["blog_url"]) for row in user_blogs_res.data}

        # Fetch active sources
        sources_res = supabase.table("sources") \
            .select("id, name, type, url") \
            .eq("is_active", True) \
            .execute()

        # Filter source IDs
        allowed_source_ids = []
        for s in sources_res.data:
            s_type = s["type"]
            s_url = s["url"]
            if s_type == "github":
                allowed_source_ids.append(s["id"])
            elif s_type == "reddit" and (not active_sub_names or clean_sub_name(s_url) in active_sub_names):
                allowed_source_ids.append(s["id"])
            elif s_type == "blog" and (not active_blog_urls or clean_blog_url(s_url) in active_blog_urls):
                allowed_source_ids.append(s["id"])

        if not allowed_source_ids:
            return {"unread_count": 0}

        # 2. Fetch all viewed post IDs for this user
        views_res = supabase.table("post_views") \
            .select("post_id") \
            .eq("user_id", user.id) \
            .execute()
        viewed_ids = set(v["post_id"] for v in views_res.data)

        # 3. Query the posts count
        total_res = supabase.table("posts") \
            .select("id") \
            .in_("source_id", allowed_source_ids) \
            .execute()
            
        total_posts = total_res.data or []
        total_count = len(total_posts)
        
        viewed_allowed_count = sum(1 for p in total_posts if p["id"] in viewed_ids)
        unread_count = max(0, total_count - viewed_allowed_count)
        
        return {"unread_count": unread_count}
    except Exception as e:
        logger.error(f"Error fetching unread count: {e}")
        raise HTTPException(500, f"Failed to fetch unread count: {str(e)}")


@router.get("/digest")
async def get_daily_digest(user = Depends(get_current_user)):
    """Generate a daily digest morning brief of the top 5 unread posts using Groq"""
    try:
        # 1. Fetch user's active subreddits & blogs
        user_subs_res = supabase.table("user_subreddits") \
            .select("subreddit_name") \
            .eq("user_id", user.id) \
            .eq("is_active", True) \
            .execute()
        active_sub_names = {clean_sub_name(row["subreddit_name"]) for row in user_subs_res.data}

        user_blogs_res = supabase.table("user_blogs") \
            .select("blog_url") \
            .eq("user_id", user.id) \
            .eq("is_active", True) \
            .execute()
        active_blog_urls = {clean_blog_url(row["blog_url"]) for row in user_blogs_res.data}

        # Fetch active sources
        sources_res = supabase.table("sources") \
            .select("id, name, type, url") \
            .eq("is_active", True) \
            .execute()

        allowed_source_ids = []
        for s in sources_res.data:
            s_type = s["type"]
            s_url = s["url"]
            if s_type == "github":
                allowed_source_ids.append(s["id"])
            elif s_type == "reddit" and (not active_sub_names or clean_sub_name(s_url) in active_sub_names):
                allowed_source_ids.append(s["id"])
            elif s_type == "blog" and (not active_blog_urls or clean_blog_url(s_url) in active_blog_urls):
                allowed_source_ids.append(s["id"])

        if not allowed_source_ids:
            return {"digest_text": "You haven't followed any sources yet. Go to Settings to add subreddits or RSS blogs.", "posts": []}

        # 2. Fetch user's viewed posts
        views_res = supabase.table("post_views") \
            .select("post_id") \
            .eq("user_id", user.id) \
            .execute()
        viewed_ids = set(v["post_id"] for v in views_res.data)

        # 3. Fetch recent posts
        posts_res = supabase.table("posts") \
            .select("*, sources(name, type)") \
            .in_("source_id", allowed_source_ids) \
            .order("published_at", desc=True) \
            .limit(30) \
            .execute()
            
        all_recent_posts = posts_res.data or []
        
        # Sort so that unread ones come first, then sort by popularity (score)
        def sort_key(p):
            is_read = p["id"] in viewed_ids
            score = p.get("raw_data", {}).get("score") or 0 if isinstance(p.get("raw_data"), dict) else 0
            return (0 if not is_read else 1, -score, p.get("published_at", ""))
            
        all_recent_posts.sort(key=sort_key)
        
        # Select top 5 digest posts
        digest_posts = all_recent_posts[:5]
        if not digest_posts:
            return {"digest_text": "No new posts available today for your feed.", "posts": []}
            
        # 4. Generate AI Morning Briefing text using Groq
        briefing_text = ""
        if settings.GROQ_API_KEY:
            try:
                # Combine titles and contents
                post_items = []
                for p in digest_posts:
                    source_name = (p.get("sources") or {}).get("name", "Unknown") if isinstance(p.get("sources"), dict) else "Unknown"
                    post_items.append(f"Source ({source_name}): Title: {p['title']}\nContent Excerpt: {(p['content'] or '')[:300]}")
                
                combined_text = "\n\n".join(post_items)
                
                prompt = (
                    f"Generate a personal morning briefing / digest of the following top posts. "
                    f"Write in a friendly, engaging tone like a personal assistant. "
                    f"Synthesize the news into a cohesive digest of 3-4 short paragraphs. "
                    f"Give bold titles for each main story/highlight. "
                    f"Keep it professional and concise.\n\n"
                    f"Posts details:\n{combined_text}"
                )
                
                from groq import Groq
                client = Groq(api_key=settings.GROQ_API_KEY)
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are a professional personal intelligence assistant generating a friendly morning briefing digest."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=600
                )
                briefing_text = completion.choices[0].message.content.strip()
            except Exception as e:
                logger.error(f"Failed to generate daily digest briefing: {e}")
                
        if not briefing_text:
            briefing_text = "### 🌅 Your Morning Briefing\nHere are the top stories curated from your feed today:\n\n"
            for p in digest_posts:
                source_name = (p.get("sources") or {}).get("name", "Unknown") if isinstance(p.get("sources"), dict) else "Unknown"
                briefing_text += f"- **{p['title']}** (from {source_name})\n"
                
        # Format the posts with bookmarked/viewed flags
        digest_post_ids = [p["id"] for p in digest_posts]
        bookmarks_res = supabase.table("bookmarks") \
            .select("post_id") \
            .eq("user_id", user.id) \
            .in_("post_id", digest_post_ids) \
            .execute()
        bookmarked_ids = set(b["post_id"] for b in bookmarks_res.data)
        
        formatted_posts = []
        for p in digest_posts:
            raw = p.get("raw_data") or {}
            p["thumbnail_url"] = raw.get("thumbnail_url") if isinstance(raw, dict) else None
            p["is_bookmarked"] = p["id"] in bookmarked_ids
            p["is_viewed"] = p["id"] in viewed_ids
            formatted_posts.append(p)
            
        return {
            "digest_text": briefing_text,
            "posts": formatted_posts
        }
    except Exception as e:
        logger.error(f"Error in get_daily_digest: {e}")
        raise HTTPException(500, f"Failed to generate daily digest: {str(e)}")
