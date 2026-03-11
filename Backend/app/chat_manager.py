from app.mongo_db import db
from app.models import ChatSession, Message, MessageRole, ChatSessionResponse
from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid
import logging
from bson import ObjectId

logger = logging.getLogger(__name__)

sessions_collection = db["chat_sessions"]
messages_collection = db["messages"]

class ChatSessionManager:
    
    @staticmethod
    async def create_session(user_id: str, title: str = None) -> Dict[str, Any]:
        """Create a new chat session"""
        if not title:
            title = f"Chat Session {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
        
        session_id = str(uuid.uuid4())
        
        session = {
            "session_id": session_id,
            "user_id": user_id,
            "title": title,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "files": [],
            "message_count": 0
        }
        
        sessions_collection.insert_one(session)
        
        return {
            "session_id": session_id,
            "title": title,
            "created_at": session["created_at"],
            "updated_at": session["updated_at"],
            "message_count": 0,
            "file_count": 0
        }
    
    @staticmethod
    async def get_user_sessions(user_id: str) -> List[Dict[str, Any]]:
        """Get all sessions for a user"""
        cursor = sessions_collection.find(
            {"user_id": user_id}
        ).sort("updated_at", -1)
        
        sessions = []
        for doc in cursor:
            sessions.append({
                "session_id": doc["session_id"],
                "title": doc["title"],
                "created_at": doc["created_at"],
                "updated_at": doc["updated_at"],
                "message_count": doc.get("message_count", 0),
                "file_count": len(doc.get("files", []))
            })
        
        return sessions
    
    @staticmethod
    async def get_session(session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific session"""
        session = sessions_collection.find_one({
            "session_id": session_id,
            "user_id": user_id
        })
        
        if not session:
            return None
        
        # Get messages for this session
        messages = list(messages_collection.find(
            {"session_id": session_id}
        ).sort("timestamp", 1))
        
        return {
            "session_id": session["session_id"],
            "title": session["title"],
            "created_at": session["created_at"],
            "updated_at": session["updated_at"],
            "files": session.get("files", []),
            "messages": [
                {
                    "role": msg["role"],
                    "content": msg["content"],
                    "timestamp": msg["timestamp"],
                    "sources": msg.get("sources", [])
                }
                for msg in messages
            ]
        }
    
    @staticmethod
    async def add_message(
        session_id: str,
        user_id: str,
        role: MessageRole,
        content: str,
        sources: List[Dict[str, Any]] = None
    ) -> None:
        """Add a message to a session"""
        # Verify session belongs to user
        session = sessions_collection.find_one({
            "session_id": session_id,
            "user_id": user_id
        })
        
        if not session:
            raise ValueError("Session not found")
        
        # Add message
        message = {
            "session_id": session_id,
            "role": role.value if isinstance(role, MessageRole) else role,
            "content": content,
            "timestamp": datetime.utcnow(),
            "sources": sources or []
        }
        
        messages_collection.insert_one(message)
        
        # Update session
        sessions_collection.update_one(
            {"session_id": session_id},
            {
                "$set": {"updated_at": datetime.utcnow()},
                "$inc": {"message_count": 1}
            }
        )
    
    @staticmethod
    async def add_file_to_session(session_id: str, user_id: str, filename: str) -> None:
        """Add a file reference to a session"""
        sessions_collection.update_one(
            {
                "session_id": session_id,
                "user_id": user_id
            },
            {
                "$addToSet": {"files": filename},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    
    @staticmethod
    async def delete_session(session_id: str, user_id: str) -> bool:
        """Delete a session and its messages"""
        result = sessions_collection.delete_one({
            "session_id": session_id,
            "user_id": user_id
        })
        
        if result.deleted_count > 0:
            # Delete messages
            messages_collection.delete_many({"session_id": session_id})
            
            # Note: Files are not deleted, just disassociated
            return True
        
        return False
    
    @staticmethod
    async def get_session_files(session_id: str, user_id: str) -> List[str]:
        """Get all files associated with a session"""
        session = sessions_collection.find_one({
            "session_id": session_id,
            "user_id": user_id
        })
        
        return session.get("files", []) if session else []