import logging
from fastapi import APIRouter, HTTPException, Depends
from app.database import supabase
from app.api.deps import get_current_user
from app.models.schemas import BugReportCreate

router = APIRouter(prefix="/api/v1/bug-reports", tags=["bug-reports"])
logger = logging.getLogger(__name__)

@router.post("")
async def create_bug_report(body: BugReportCreate, user = Depends(get_current_user)):
    """Submit a new bug/crash report to the database"""
    try:
        report_data = {
            "user_id": user.id,
            "title": body.title,
            "description": body.description,
            "steps_to_reproduce": body.steps_to_reproduce,
            "device_info": body.device_info,
            "logs": body.logs
        }
        res = supabase.table("bug_reports").insert(report_data).execute()
        if not res.data:
            raise HTTPException(500, "Failed to submit bug report")
        return {
            "status": "success",
            "message": "Bug report submitted successfully",
            "report_id": res.data[0]["id"]
        }
    except Exception as e:
        logger.error(f"Error creating bug report for user {user.id}: {e}")
        raise HTTPException(500, f"Database error: {str(e)}")
