# -*- coding: utf-8 -*-
import os
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware

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

# ==================== Logging ====================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== App ====================
app = FastAPI(
    title="PDF AI Assistant API",
    version="2.0"
)

# ==================== Startup ====================
@app.on_event("startup")
async def startup_event():
    logger.info("=" * 50)
    logger.info("🚀 APPLICATION STARTING")
    logger.info(f"Python version: {os.sys.version}")
    logger.info(f"PORT: {os.getenv('PORT')}")
    logger.info("=" * 50)

    try:
        from app.mongo_db import client
        client.admin.command("ping")
        logger.info("✅ MongoDB connected")
    except Exception as e:
        logger.error(f"❌ MongoDB failed: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Application shutting down")

# ==================== CORS ====================
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

# ✅ allow all for production (IMPORTANT)
if os.getenv("RENDER"):
    ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Routers ====================
app.include_router(auth_router)

# ==================== Root ====================
@app.get("/")
async def home():
    return {
        "message": "PDF AI Assistant API",
        "version": "2.0",
        "status": "running"
    }

# ==================== Upload ====================
@app.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id),
):
    file_type = FileProcessor.get_file_type(file.filename)
    if file_type == "unknown":
        raise HTTPException(status_code=400, detail="Unsupported file type")

    try:
        file_bytes = await file.read()

        result = await FileProcessor.process_file(
            file_bytes=file_bytes,
            filename=file.filename,
            user_id=user_id,
            session_id=session_id,
        )

        if session_id:
            await ChatSessionManager.add_file_to_session(
                session_id=session_id,
                user_id=user_id,
                filename=file.filename
            )

        return FileUploadResponse(
            filename=result["filename"],
            file_type=result["file_type"],
            size=len(file_bytes),
            chunks_processed=result["chunks_stored"],
            session_id=session_id,
        )

    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Sessions ====================
@app.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    title: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    session = await ChatSessionManager.create_session(user_id, title)
    return ChatSessionResponse(**session)

@app.get("/sessions")
async def list_sessions(user_id: str = Depends(get_current_user_id)):
    sessions = await ChatSessionManager.get_user_sessions(user_id)
    return {"sessions": sessions}

@app.get("/sessions/{session_id}")
async def get_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    session = await ChatSessionManager.get_session(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    success = await ChatSessionManager.delete_session(session_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted"}

# ==================== Messages ====================
@app.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str):
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

# ==================== Chat ====================
@app.post("/chat")
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user_id)):
    session_id = request.session_id

    if not session_id:
        new_session = await ChatSessionManager.create_session(user_id)
        session_id = new_session["session_id"]

    await ChatSessionManager.add_message(
        session_id=session_id,
        user_id=user_id,
        role=MessageRole.USER,
        content=request.message,
    )

    answer_data = await ask_question(
        question=request.message,
        user_id=user_id,
        session_id=session_id,
        files=request.files,
    )

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

# ==================== Health ====================
@app.get("/health")
async def health_check():
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