import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase
from app.api.deps import get_current_user
from app.models.schemas import PostViewMark

router = APIRouter(prefix="/api/v1/posts/views", tags=["post_views"])
logger = logging.getLogger(__name__)

@router.post("")
async def mark_post_as_viewed(body: PostViewMark, user = Depends(get_current_user)):
    """Mark a post as viewed by the authenticated user (read receipt)"""
    try:
        # Upsert view record
        view_data = {
            "user_id": user.id,
            "post_id": str(body.post_id)
        }
        res = supabase.table("post_views").upsert(view_data, on_conflict="user_id,post_id").execute()
        if not res.data:
            raise HTTPException(500, "Failed to record post view")
        return {"status": "success", "message": "Post marked as viewed"}
    except Exception as e:
        logger.error(f"Error marking post {body.post_id} as viewed for user {user.id}: {e}")
        raise HTTPException(500, f"Failed to mark post as viewed: {str(e)}")

@router.get("")
async def get_viewed_posts(user = Depends(get_current_user)):
    """Get all post IDs viewed by the authenticated user"""
    try:
        res = supabase.table("post_views").select("post_id").eq("user_id", user.id).execute()
        viewed_ids = [item["post_id"] for item in res.data]
        return {"viewed_post_ids": viewed_ids}
    except Exception as e:
        logger.error(f"Error fetching viewed posts for user {user.id}: {e}")
        raise HTTPException(500, f"Failed to fetch viewed posts: {str(e)}")
