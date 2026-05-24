import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from app.database import supabase
from app.api.deps import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/v1/posts", tags=["posts"])
logger = logging.getLogger(__name__)

@router.get("")
async def get_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None, description="Filter by type: 'blog', 'reddit', 'github'"),
    category: Optional[str] = Query(None, description="Filter by category: 'tool', 'idea', 'framework', 'discussion'"),
    tag: Optional[str] = Query(None, description="Filter by tags"),
    q: Optional[str] = Query(None, description="Full-text search query"),
    user = Depends(get_current_user) # Optional authorization if we want to show bookmarks
):
    """
    Get paginated posts, with support for filtering by type, category, tag, or search query.
    If authenticated, returns bookmark status for each post.
    """
    try:
        offset = (page - 1) * limit
        
        # Build query
        # Fetch post list with parent source info
        base_query = supabase.table("posts").select("*, sources(name, type)")
        
        # 1. Type filtering (blog, reddit, github)
        if type:
            source_res = supabase.table("sources").select("id").eq("type", type).execute()
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
            # Fallback if text search is used
            base_query = base_query.text_search("search_vector", q)

        # Pagination and order
        res = base_query \
            .order("published_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()

        posts = res.data

        # If authenticated, fetch bookmarks to add is_bookmarked field
        if user and posts:
            post_ids = [p["id"] for p in posts]
            bookmarks_res = supabase.table("bookmarks") \
                .select("post_id") \
                .eq("user_id", user.id) \
                .in_("post_id", post_ids) \
                .execute()
            
            bookmarked_ids = set(b["post_id"] for b in bookmarks_res.data)
            for post in posts:
                post["is_bookmarked"] = post["id"] in bookmarked_ids
        else:
            for post in posts:
                post["is_bookmarked"] = False

        return {"posts": posts, "page": page, "limit": limit, "count": len(posts)}

    except Exception as e:
        logger.error(f"Error fetching posts: {e}")
        raise HTTPException(500, f"Failed to fetch posts: {str(e)}")


@router.get("/personalized")
async def get_personalized_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user = Depends(get_current_user)
):
    """
    Returns a personalized feed for the authenticated user.
    The feed contains posts from:
    1. Pre-seeded global sources (active blogs, subreddits, and github tags)
    2. The user's custom subreddits
    3. The user's custom blog feeds
    """
    try:
        offset = (page - 1) * limit
        
        # A. Fetch active global source IDs
        global_sources_res = supabase.table("sources") \
            .select("id") \
            .eq("is_active", True) \
            .execute()
        source_ids = [s["id"] for s in global_sources_res.data]

        # B. Fetch user's custom subreddit source IDs
        user_subs_res = supabase.table("user_subreddits") \
            .select("subreddit_name") \
            .eq("user_id", user.id) \
            .eq("is_active", True) \
            .execute()
        
        if user_subs_res.data:
            sub_names = [f"r/{row['subreddit_name'].lower().replace('r/', '').strip()}" for row in user_subs_res.data]
            sub_sources_res = supabase.table("sources") \
                .select("id") \
                .eq("type", "reddit") \
                .in_("url", sub_names) \
                .execute()
            source_ids.extend([s["id"] for s in sub_sources_res.data])

        # C. Fetch user's custom blog source IDs
        user_blogs_res = supabase.table("user_blogs") \
            .select("blog_url") \
            .eq("user_id", user.id) \
            .eq("is_active", True) \
            .execute()
        
        if user_blogs_res.data:
            blog_urls = [row["blog_url"] for row in user_blogs_res.data]
            blog_sources_res = supabase.table("sources") \
                .select("id") \
                .eq("type", "blog") \
                .in_("url", blog_urls) \
                .execute()
            source_ids.extend([s["id"] for s in blog_sources_res.data])

        if not source_ids:
            return {"posts": [], "page": page, "limit": limit, "count": 0}

        # Query posts belonging to these source IDs
        res = supabase.table("posts") \
            .select("*, sources(name, type)") \
            .in_("source_id", source_ids) \
            .order("published_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()

        posts = res.data

        # Fetch bookmarks
        if posts:
            post_ids = [p["id"] for p in posts]
            bookmarks_res = supabase.table("bookmarks") \
                .select("post_id") \
                .eq("user_id", user.id) \
                .in_("post_id", post_ids) \
                .execute()
            
            bookmarked_ids = set(b["post_id"] for b in bookmarks_res.data)
            for post in posts:
                post["is_bookmarked"] = post["id"] in bookmarked_ids

        return {"posts": posts, "page": page, "limit": limit, "count": len(posts)}

    except Exception as e:
        logger.error(f"Error fetching personalized feed for user {user.id}: {e}")
        raise HTTPException(500, f"Failed to fetch personalized feed: {str(e)}")
