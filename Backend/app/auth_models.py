from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserCreate(BaseModel):
    """User registration model"""
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    """User login model"""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """User response model"""
    id: str
    email: str

class TokenResponse(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    """Token data model"""
    email: Optional[str] = None
    user_id: Optional[str] = None