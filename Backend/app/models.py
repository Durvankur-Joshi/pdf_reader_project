from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class FileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    XLSX = "xlsx"
    PPTX = "pptx"
    IMAGE = "image"

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class Message(BaseModel):
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sources: Optional[List[Dict[str, Any]]] = None

class ChatSession(BaseModel):
    session_id: str
    user_id: str
    title: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    messages: List[Message] = []
    files: List[str] = []  # List of filenames used in this session

class ChatSessionCreate(BaseModel):
    title: Optional[str] = None

class ChatSessionResponse(BaseModel):
    session_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int
    file_count: int

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    files: Optional[List[str]] = None  # Optional: specify which files to use

class ChatResponse(BaseModel):
    session_id: str
    message: str
    sources: List[Dict[str, Any]]
    timestamp: datetime

class FileUploadResponse(BaseModel):
    filename: str
    file_type: FileType
    size: int
    chunks_processed: int
    session_id: Optional[str] = None