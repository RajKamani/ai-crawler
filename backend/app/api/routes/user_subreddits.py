import logging
import httpx
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from app.database import supabase
from app.api.deps import get_current_user
from app.models.schemas import SubredditAdd, ToggleActiveState

router = APIRouter(tags=["user-subreddits"])
logger = logging.getLogger(__name__)

POPULAR_SUBREDDITS = [
    {"name": "r/artificial", "description": "Artificial Intelligence discussion"},
    {"name": "r/MachineLearning", "description": "Research and ML engineering"},
    {"name": "r/LocalLLaMA", "description": "Local LLM development and models"},
    {"name": "r/ChatGPT", "description": "All things ChatGPT and OpenAI"},
    {"name": "r/singularity", "description": "Discussion on technology singularity"},
    {"name": "r/SideProject", "description": "Showcasing apps and projects"},
    {"name": "r/webdev", "description": "Web development and frontend"},
    {"name": "r/reactjs", "description": "React framework discussions"},
    {"name": "r/indiehackers", "description": "Startup ideas and bootstrap business"},
    {"name": "r/selfhosted", "description": "Self-hosting AI models and tools"}
]

@router.get("/api/v1/me/subreddits")
async def list_my_subreddits(user = Depends(get_current_user)):
    """List all custom subreddits added by the current user"""
    try:
        res = supabase.table("user_subreddits") \
            .select("*") \
            .eq("user_id", user.id) \
            .order("added_at", desc=True) \
            .execute()
        return {"subreddits": res.data, "count": len(res.data)}
    except Exception as e:
        logger.error(f"Error listing user subreddits: {e}")
        raise HTTPException(500, f"Failed to list subreddits: {str(e)}")

@router.post("/api/v1/me/subreddits")
async def add_subreddit(body: SubredditAdd, user = Depends(get_current_user)):
    """Add a custom subreddit, validating that it exists on Reddit first"""
    subreddit_name = body.subreddit_name

    # 1. Check if user already added it
    existing_res = supabase.table("user_subreddits") \
        .select("id") \
        .eq("user_id", user.id) \
        .eq("subreddit_name", f"r/{subreddit_name}") \
        .execute()
    
    if existing_res.data:
        raise HTTPException(409, f"r/{subreddit_name} has already been added to your settings")

    # 2. Check if subreddit exists on Reddit (About API check)
    url = f"https://www.reddit.com/r/{subreddit_name}/about.json"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=5.0)
            if response.status_code == 404:
                raise HTTPException(404, f"Subreddit r/{subreddit_name} does not exist")
            elif response.status_code == 429:
                logger.warning(f"Reddit rate-limited subreddit verification. Adding anyway.")
            elif response.status_code != 200:
                logger.warning(f"Reddit verification returned status {response.status_code}. Adding anyway.")
    except httpx.RequestError as e:
        logger.warning(f"Network error verifying subreddit: {e}. Bypassing verification.")

    # 3. Add to user_subreddits table
    try:
        res = supabase.table("user_subreddits").insert({
            "user_id": user.id,
            "subreddit_name": f"r/{subreddit_name}",
            "is_active": True
        }).execute()
        return {"subreddit": res.data[0], "message": f"r/{subreddit_name} added successfully."}
    except Exception as e:
        logger.error(f"Failed to add user subreddit: {e}")
        raise HTTPException(500, f"Database error: {str(e)}")

@router.delete("/api/v1/me/subreddits/{sub_id}")
async def remove_subreddit(sub_id: str, user = Depends(get_current_user)):
    """Remove a subreddit from user list"""
    try:
        supabase.table("user_subreddits") \
            .delete() \
            .eq("id", sub_id) \
            .eq("user_id", user.id) \
            .execute()
        return {"message": "Subreddit removed successfully"}
    except Exception as e:
        logger.error(f"Error removing user subreddit: {e}")
        raise HTTPException(500, f"Database error: {str(e)}")

@router.patch("/api/v1/me/subreddits/{sub_id}")
async def toggle_subreddit(sub_id: str, body: ToggleActiveState, user = Depends(get_current_user)):
    """Toggle a subreddit active/inactive"""
    is_active = body.is_active

    try:
        res = supabase.table("user_subreddits") \
            .update({"is_active": is_active}) \
            .eq("id", sub_id) \
            .eq("user_id", user.id) \
            .execute()
        
        if not res.data:
            raise HTTPException(404, "Subreddit configuration not found")
        
        return {"subreddit": res.data[0], "message": f"Subreddit updated"}
    except Exception as e:
        logger.error(f"Error toggling user subreddit: {sub_id} for user {user.id}: {e}")
        raise HTTPException(500, f"Database error: {str(e)}")

@router.get("/api/v1/subreddits/popular")
async def get_popular_suggestions():
    """Get suggested popular subreddits to quickly add"""
    return {"suggestions": POPULAR_SUBREDDITS}
