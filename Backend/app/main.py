import os

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from datetime import datetime
import uvicorn
import logging

from app.auth import router as auth_router, get_current_user_id
from app.file_processor import FileProcessor
from app.chat_manager import ChatSessionManager
from app.query import ask_question
from app.models import (
    ChatRequest,
    ChatResponse,
    FileUploadResponse,
    ChatSessionResponse,
    MessageRole,
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PDF AI Assistant API")

@app.on_event("startup")
async def startup_event():
    logger.info("="*50)
    logger.info("APPLICATION STARTING UP")
    logger.info(f"Python version: {os.sys.version}")
    logger.info(f"PORT env var: {os.getenv('PORT')}")
    logger.info("="*50)
    
    # Test MongoDB connection
    try:
        from app.mongo_db import client
        client.admin.command('ping')
        logger.info("✅ MongoDB connection successful")
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth routes
app.include_router(auth_router)


@app.get("/")
async def home():
    return {
        "message": "PDF AI Assistant API",
        "version": "2.0",
        "features": [
            "Multi-file support",
            "Multi-format support (PDF, DOCX, TXT, XLSX, PPTX, Images)",
            "Chat sessions",
            "Conversation history",
        ],
    }


# ==================== File Upload Endpoints ====================


@app.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id),
):
    """Upload and process any supported file type"""

    # Validate file type
    file_type = FileProcessor.get_file_type(file.filename)
    if file_type == "unknown":
        raise HTTPException(status_code=400, detail="Unsupported file type")

    try:
        # Read file content
        file_bytes = await file.read()

        # Process file
        result = await FileProcessor.process_file(
            file_bytes=file_bytes,
            filename=file.filename,
            user_id=user_id,
            session_id=session_id,
        )

        # If session_id provided, associate file with session
        if session_id:
            await ChatSessionManager.add_file_to_session(
                session_id=session_id, user_id=user_id, filename=file.filename
            )

        return FileUploadResponse(
            filename=result["filename"],
            file_type=result["file_type"],
            size=result.get("size", len(file_bytes)),
            chunks_processed=result["chunks_stored"],
            session_id=session_id,
        )

    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Chat Session Endpoints ====================


@app.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    title: Optional[str] = None, user_id: str = Depends(get_current_user_id)
):
    """Create a new chat session"""
    session = await ChatSessionManager.create_session(user_id, title)
    return ChatSessionResponse(**session)


@app.get("/sessions")
async def list_sessions(user_id: str = Depends(get_current_user_id)):
    """List all chat sessions for user"""
    sessions = await ChatSessionManager.get_user_sessions(user_id)
    return {"sessions": sessions}


@app.get("/sessions/{session_id}")
async def get_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    """Get a specific chat session with messages"""
    session = await ChatSessionManager.get_session(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete a chat session"""
    success = await ChatSessionManager.delete_session(session_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted successfully"}

    # Add these endpoints to Backend/app/main.py

@app.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get all messages for a session"""
    from app.mongo_db import messages_collection
    
    messages = list(messages_collection.find(
        {"session_id": session_id}
    ).sort("timestamp", 1))
    
    return {
        "messages": [
            {
                "id": str(msg["_id"]),
                "role": msg["role"],
                "content": msg["content"],
                "timestamp": msg["timestamp"],
                "sources": msg.get("sources", [])
            }
            for msg in messages
        ]
    }

@app.put("/sessions/{session_id}")
async def update_session(
    session_id: str,
    title: str,
    user_id: str = Depends(get_current_user_id)
):
    """Update session title"""
    from app.mongo_db import sessions_collection
    
    result = sessions_collection.update_one(
        {"session_id": session_id, "user_id": user_id},
        {"$set": {"title": title}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"message": "Session updated successfully"}

@app.delete("/sessions/{session_id}/messages/{message_id}")
async def delete_message(
    session_id: str,
    message_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a specific message"""
    from app.mongo_db import messages_collection
    from bson import ObjectId
    
    result = messages_collection.delete_one({
        "_id": ObjectId(message_id),
        "session_id": session_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"message": "Message deleted successfully"}

@app.get("/bookmarks")
async def get_bookmarks(user_id: str = Depends(get_current_user_id)):
    """Get all bookmarked messages"""
    from app.mongo_db import messages_collection
    
    messages = list(messages_collection.find({
        "user_id": user_id,
        "bookmarked": True
    }).sort("timestamp", -1))
    
    return {
        "bookmarks": [
            {
                "id": str(msg["_id"]),
                "content": msg["content"],
                "session_id": msg["session_id"],
                "timestamp": msg["timestamp"]
            }
            for msg in messages
        ]
    }


# ==================== Chat Endpoints ====================


@app.post("/chat")
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user_id)):
    """Send a message in a chat session"""

    # Create new session if none provided
    session_id = request.session_id
    if not session_id:
        new_session = await ChatSessionManager.create_session(user_id)
        session_id = new_session["session_id"]

    # Save user message
    await ChatSessionManager.add_message(
        session_id=session_id,
        user_id=user_id,
        role=MessageRole.USER,
        content=request.message,
    )

    # Get answer
    answer_data = await ask_question(
        question=request.message,
        user_id=user_id,
        session_id=session_id,
        files=request.files,
    )

    # Save assistant message
    await ChatSessionManager.add_message(
        session_id=session_id,
        user_id=user_id,
        role=MessageRole.ASSISTANT,
        content=answer_data["answer"],
        sources=answer_data["sources"],
    )

    return ChatResponse(
        session_id=session_id,
        message=answer_data["answer"],
        sources=answer_data["sources"],
        timestamp=datetime.utcnow(),
    )


# ==================== File Management Endpoints ====================


@app.get("/files")
async def list_files(
    session_id: Optional[str] = None, user_id: str = Depends(get_current_user_id)
):
    """List all files for user, optionally filtered by session"""
    from app.mongo_db import files_collection

    query = {"user_id": user_id}
    if session_id:
        query["session_id"] = session_id

    files = files_collection.find(
        query,
        {
            "filename": 1,
            "file_type": 1,
            "size": 1,
            "upload_date": 1,
            "chunks": 1,
            "session_id": 1,
        },
    ).sort("upload_date", -1)

    return {
        "files": [
            {
                "filename": f["filename"],
                "file_type": f.get("file_type", "unknown"),
                "size": f.get("size", 0),
                "upload_date": f["upload_date"],
                "chunks": f.get("chunks", 0),
                "session_id": f.get("session_id"),
            }
            for f in files
        ]
    }


@app.delete("/files/{filename}")
async def delete_file(filename: str, user_id: str = Depends(get_current_user_id)):
    """Delete a file and its chunks"""
    from app.mongo_db import files_collection, collection, fs

    # Find file
    file_doc = files_collection.find_one({"filename": filename, "user_id": user_id})

    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    # Delete from GridFS
    if file_doc.get("file_id"):
        fs.delete(file_doc["file_id"])

    # Delete metadata
    files_collection.delete_one({"_id": file_doc["_id"]})

    # Delete chunks
    collection.delete_many({"file": filename, "user_id": user_id})

    return {"message": f"File {filename} deleted successfully"}


# ==================== Health Check ====================


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    from app.mongo_db import client

    try:
        client.admin.command("ping")
        mongodb_status = "connected"
    except:
        mongodb_status = "disconnected"

    return {
        "status": "healthy",
        "mongodb": mongodb_status,
        "timestamp": datetime.utcnow(),
    }


logger = logging.getLogger(__name__)
