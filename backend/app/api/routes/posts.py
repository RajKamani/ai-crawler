import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from app.database import supabase
from app.api.deps import get_current_user
from datetime import datetime

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

        # 4. Filter allowed source IDs in Python based on the type filter and user's selections
        allowed_source_ids = []
        for s in sources_res.data:
            s_type = s["type"]
            s_url = s["url"]
            
            if type:
                if s_type == type:
                    if type == "github":
                        allowed_source_ids.append(s["id"])
                    elif type == "reddit" and clean_sub_name(s_url) in active_sub_names:
                        allowed_source_ids.append(s["id"])
                    elif type == "blog" and clean_blog_url(s_url) in active_blog_urls:
                        allowed_source_ids.append(s["id"])
            else:
                if s_type == "reddit" and clean_sub_name(s_url) in active_sub_names:
                    allowed_source_ids.append(s["id"])
                elif s_type == "blog" and clean_blog_url(s_url) in active_blog_urls:
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

        # 4. Filter sources in Python to only include selected subreddits and blogs
        source_ids = []
        for s in sources_res.data:
            s_type = s["type"]
            s_url = s["url"]
            if s_type == "reddit" and clean_sub_name(s_url) in active_sub_names:
                source_ids.append(s["id"])
            elif s_type == "blog" and clean_blog_url(s_url) in active_blog_urls:
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
