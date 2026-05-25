import logging
import feedparser
from fastapi import APIRouter, HTTPException, Depends
from app.database import supabase
from app.api.deps import get_current_user
from app.models.schemas import BlogAdd, ToggleActiveState

router = APIRouter(tags=["user-blogs"])
logger = logging.getLogger(__name__)

POPULAR_BLOG_SUGGESTIONS = [
    {"name": "TechCrunch AI", "url": "https://techcrunch.com/category/artificial-intelligence/feed/"},
    {"name": "The Verge AI", "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"},
    {"name": "Hacker News (AI/ML)", "url": "https://hnrss.org/best?q=ai+llm+ml"},
    {"name": "MIT Tech Review", "url": "https://www.technologyreview.com/feed/"},
    {"name": "Towards Data Science", "url": "https://towardsdatascience.com/feed"},
    {"name": "Simon Willison", "url": "https://simonwillison.net/atom/everything/"},
    {"name": "Lil'Log (Lilian Weng)", "url": "https://lilianweng.github.io/index.xml"},
    {"name": "Jay Alammar", "url": "https://jalammar.github.io/feed.xml"},
    {"name": "Chip Huyen", "url": "https://huyenchip.com/feed.xml"},
    {"name": "AI Snake Oil", "url": "https://www.aisnakeoil.com/feed"},
    {"name": "Claude News", "url": "https://raw.githubusercontent.com/taobojlen/anthropic-rss-feed/main/anthropic_news_rss.xml"},
    {"name": "Claude blog", "url": "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_claude.xml"},
    {"name": "OpenAI blog", "url": "https://openai.com/news/rss.xml"}
    
]

@router.get("/api/v1/me/blogs")
async def list_my_blogs(user = Depends(get_current_user)):
    """List all blog feeds the current user has added"""
    try:
        result = supabase.table("user_blogs") \
            .select("*") \
            .eq("user_id", user.id) \
            .order("added_at", desc=True) \
            .execute()
        return {"blogs": result.data, "count": len(result.data)}
    except Exception as e:
        logger.error(f"Error fetching user blogs: {e}")
        raise HTTPException(500, f"Failed to list blogs: {str(e)}")

@router.post("/api/v1/me/blogs")
async def add_blog(body: BlogAdd, user = Depends(get_current_user)):
    """Add a custom blog RSS feed to the user's feed list after validation"""
    name = body.name.strip()
    url = str(body.url)
    
    # 1. Check if user already added it
    existing_res = supabase.table("user_blogs") \
        .select("id") \
        .eq("user_id", user.id) \
        .eq("blog_url", url) \
        .execute()
    
    if existing_res.data:
        raise HTTPException(409, f"This blog feed has already been added to your list")

    # 2. Validate the RSS feed is reachable and parseable
    try:
        feed = feedparser.parse(url)
        if feed.bozo and not feed.entries:
            raise HTTPException(400, f"Could not parse RSS feed at {url}")
    except Exception as e:
        logger.error(f"RSS parser failed for {url}: {e}")
        raise HTTPException(400, f"Failed to parse RSS feed: {str(e)}")
    
    # 3. Save to user_blogs table
    try:
        result = supabase.table("user_blogs").insert({
            "user_id": user.id,
            "blog_name": name,
            "blog_url": url,
            "is_active": True
        }).execute()
        return {"blog": result.data[0], "message": f"{name} added to your feed"}
    except Exception as e:
        logger.error(f"Failed to add user blog: {e}")
        raise HTTPException(500, f"Database error: {str(e)}")

@router.delete("/api/v1/me/blogs/{blog_id}")
async def remove_blog(blog_id: str, user = Depends(get_current_user)):
    """Remove a blog from user list"""
    try:
        supabase.table("user_blogs") \
            .delete() \
            .eq("id", blog_id) \
            .eq("user_id", user.id) \
            .execute()
        return {"message": "Blog removed successfully"}
    except Exception as e:
        logger.error(f"Error deleting user blog: {e}")
        raise HTTPException(500, f"Database error: {str(e)}")

@router.patch("/api/v1/me/blogs/{blog_id}")
async def toggle_blog(blog_id: str, body: ToggleActiveState, user = Depends(get_current_user)):
    """Toggle a blog feed active/inactive"""
    is_active = body.is_active

    try:
        res = supabase.table("user_blogs") \
            .update({"is_active": is_active}) \
            .eq("id", blog_id) \
            .eq("user_id", user.id) \
            .execute()
        
        if not res.data:
            raise HTTPException(404, "Blog configuration not found")
            
        return {"blog": res.data[0], "message": "Blog config updated"}
    except Exception as e:
        logger.error(f"Error updating user blog toggles: {e}")
        raise HTTPException(500, f"Database error: {str(e)}")

@router.get("/api/v1/blogs/popular")
async def get_popular_blog_suggestions():
    """Return suggested popular blog RSS feeds to add"""
    return {"suggestions": POPULAR_BLOG_SUGGESTIONS}
