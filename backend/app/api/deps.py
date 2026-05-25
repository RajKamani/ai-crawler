from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import supabase
from app.config import settings

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Validate the Bearer token against Supabase auth.
    Returns the user object if valid, otherwise raises 401.
    """
    token = credentials.credentials
    if settings.ENV == "development" and token == "mock-user-session-token-12345":
        class MockUser:
            id = "00000000-0000-0000-0000-000000000000"
            email = "mock@example.com"
        return MockUser()
        
    try:
        # Verify user token with Supabase Auth
        res = supabase.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return res.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
