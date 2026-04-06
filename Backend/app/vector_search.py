from app.mongo_db import collection
from langchain_community.embeddings import HuggingFaceEmbeddings
import logging
from typing import List, Dict, Any, Optional

# Setup logger
logger = logging.getLogger(__name__)

try:
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    logger.info("Embeddings model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load embeddings: {e}")
    raise

def search_documents(
    query: str,
    user_id: str,
    session_id: Optional[str] = None,
    files: Optional[List[str]] = None,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """Search for relevant documents using vector similarity"""
    
    if not query or not query.strip():
        raise ValueError("Query cannot be empty")
    
    try:
        # Generate query embedding
        query_vector = embeddings.embed_query(query)
        
        # MongoDB vector search pipeline WITHOUT filter first (using post-filtering)
        pipeline = [
        {
        "$vectorSearch": {
            "index": "vector_index",
            "path": "embedding",
            "queryVector": query_vector,
            "numCandidates": 100,
            "limit": 5
         }
        },
        {
        "$project": {
            "text": 1,
            "file": 1,
            "score": {"$meta": "vectorSearchScore"}
          }
         }
        ]
        
        # Execute search
        results = collection.aggregate(pipeline)
        
        # Process results
        docs = []
        for r in results:
            docs.append({
                "text": r.get("text", ""),
                "metadata": r.get("metadata", {}),
                "file": r.get("file", "unknown"),
                "file_type": r.get("file_type", "unknown"),
                "score": r.get("score", 0)
            })
        
        logger.info(f"Found {len(docs)} relevant documents for user {user_id}")
        
        # If no results found with vector search, try fallback
        if not docs:
            logger.info("No vector search results, trying fallback text search")
            return fallback_text_search(query, user_id, session_id, files, limit)
            
        return docs
        
    except Exception as e:
        logger.error(f"Vector search failed: {str(e)}")
        # Fallback to text search
        return fallback_text_search(query, user_id, session_id, files, limit)

def fallback_text_search(
    query: str,
    user_id: str,
    session_id: Optional[str] = None,
    files: Optional[List[str]] = None,
    limit: int = 3
) -> List[Dict[str, Any]]:
    """Fallback text search if vector search fails"""
    try:
        logger.info(f"Performing fallback text search for query: {query[:50]}...")
        
        # Build filter
        filter_conditions = {
            "text": {"$regex": query, "$options": "i"},
            "user_id": user_id
        }
        
        if session_id:
            filter_conditions["session_id"] = session_id
        
        if files:
            filter_conditions["file"] = {"$in": files}
        
        results = collection.find(filter_conditions).limit(limit)
        
        docs = []
        for r in results:
            docs.append({
                "text": r.get("text", ""),
                "metadata": r.get("metadata", {}),
                "file": r.get("file", "unknown"),
                "file_type": r.get("file_type", "unknown")
            })
        
        logger.info(f"Fallback search found {len(docs)} documents")
        return docs
        
    except Exception as e:
        logger.error(f"Fallback search failed: {str(e)}")
        return []