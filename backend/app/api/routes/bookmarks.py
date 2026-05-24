import logging
from fastapi import APIRouter, HTTPException, Depends, Body
from app.database import supabase
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/v1/bookmarks", tags=["bookmarks"])
logger = logging.getLogger(__name__)

@router.get("")
async def get_my_bookmarks(user = Depends(get_current_user)):
    """Get all posts bookmarked by the current user"""
    try:
        # Fetch matching bookmark rows
        bookmarks_res = supabase.table("bookmarks") \
            .select("post_id") \
            .eq("user_id", user.id) \
            .execute()
        
        if not bookmarks_res.data:
            return {"posts": [], "count": 0}

        post_ids = [b["post_id"] for b in bookmarks_res.data]

        # Fetch full post details for bookmarked post IDs
        posts_res = supabase.table("posts") \
            .select("*, sources(name, type)") \
            .in_("id", post_ids) \
            .order("published_at", desc=True) \
            .execute()
        
        posts = posts_res.data
        for post in posts:
            post["is_bookmarked"] = True

        return {"posts": posts, "count": len(posts)}
    except Exception as e:
        logger.error(f"Error fetching bookmarks for user {user.id}: {e}")
        raise HTTPException(500, f"Database error: {str(e)}")

@router.post("")
async def create_bookmark(body: dict = Body(...), user = Depends(get_current_user)):
    """Save a post to user's bookmarks"""
    post_id = body.get("post_id")
    if not post_id:
        raise HTTPException(400, "post_id is required")

    try:
        res = supabase.table("bookmarks").insert({
            "user_id": user.id,
            "post_id": post_id
        }).execute()
        return {"bookmark": res.data[0], "message": "Post bookmarked successfully"}
    except Exception as e:
        logger.error(f"Error creating bookmark: {e}")
        # Could be duplicate key violation
        raise HTTPException(400, "Could not bookmark post (maybe already bookmarked)")

@router.delete("/{post_id}")
async def delete_bookmark(post_id: str, user = Depends(get_current_user)):
    """Remove a post from user's bookmarks"""
    try:
        supabase.table("bookmarks") \
            .delete() \
            .eq("user_id", user.id) \
            .eq("post_id", post_id) \
            .execute()
        return {"message": "Post removed from bookmarks"}
    except Exception as e:
        logger.error(f"Error deleting bookmark: {e}")
        raise HTTPException(500, f"Database error: {str(e)}")
