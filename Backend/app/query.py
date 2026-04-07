from app.vector_search import search_documents
from app.chat_manager import ChatSessionManager
from app.models import MessageRole
from langchain_google_genai import ChatGoogleGenerativeAI
import os
from dotenv import load_dotenv
import logging
from typing import Optional, List

# Setup logging
load_dotenv()
logger = logging.getLogger(__name__)

# Initialize Gemini model
try:
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.3,
        max_tokens=1000
    )
    logger.info("Gemini model initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Gemini model: {e}")
    model = None

async def ask_question(
    question: str,
    user_id: str,
    session_id: Optional[str] = None,
    files: Optional[List[str]] = None
):
    """Answer question using RAG pipeline with session support"""
    
    if not model:
        logger.error("AI model not available")
        return {
            "answer": "AI model not available. Please check your Google API key.",
            "sources": []
        }
    
    try:
        logger.info(f"Processing question for user {user_id}: {question[:100]}...")
        
        # Get conversation history if session exists
        conversation_history = ""
        if session_id:
            logger.info(f"Getting session history for session {session_id}")
            session = await ChatSessionManager.get_session(session_id, user_id)
            if session and session.get("messages"):
                # Get last 5 messages for context
                recent_messages = session["messages"][-5:]
                for msg in recent_messages:
                    role = "User" if msg["role"] == "user" else "Assistant"
                    conversation_history += f"{role}: {msg['content']}\n"
                logger.info(f"Found {len(recent_messages)} recent messages")
        
        # Search for relevant documents
        logger.info(f"Searching documents for query")
        docs = search_documents(
            query=question,
            user_id=user_id,
            session_id=session_id,
            files=files
        )
        if not session_id:
         return {
           "answer": "Session ID missing. Please start a chat session.",
          "sources": []
        }
        
        if not docs:
            logger.warning("No relevant documents found")
            return {
                "answer": "No relevant documents found. Please upload files first.",
                "sources": []
            }
        
        logger.info(f"Found {len(docs)} relevant documents")
        
        # Prepare context
        context = ""
        sources = []
        
        for doc in docs:
            context += f"\nFrom {doc['file']} (Type: {doc.get('file_type', 'unknown')}):\n{doc['text']}\n"
            sources.append({
                "file": doc["file"],
                "file_type": doc.get("file_type", "unknown"),
                "score": doc.get("score"),
                "text_snippet": doc["text"][:200] + "..." if len(doc["text"]) > 200 else doc["text"]
            })
        
        # Create prompt with conversation history
        prompt = f"""You are a helpful assistant that answers questions based on the provided context.

Conversation History:
{conversation_history if conversation_history else "No previous conversation."}

Current Context from uploaded files:
{context}

Current Question: {question}

Instructions:
1. Answer based only on the provided context and conversation history
2. If the answer isn't in the context, say "I cannot find this information in the uploaded files"
3. Be concise and accurate
4. Reference which file you're getting information from when possible

Answer:"""

        # Get response from Gemini
        logger.info("Sending prompt to Gemini")
        response = model.invoke(prompt)
        logger.info("Received response from Gemini")
        
        return {
            "answer": response.content,
            "sources": sources
        }
        
    except Exception as e:
        logger.error(f"Question answering failed: {str(e)}")
        return {
            "answer": f"Error processing question: {str(e)}",
            "sources": []
        }