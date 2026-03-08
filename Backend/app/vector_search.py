from app.mongo_db import collection
from langchain_huggingface import HuggingFaceEmbeddings
import logging

logger = logging.getLogger(__name__)

try:
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
except Exception as e:
    logger.error(f"Failed to load embeddings: {e}")
    raise

def search_documents(query, limit=3):
    """Search for relevant documents using vector similarity"""
    
    if not query or not query.strip():
        raise ValueError("Query cannot be empty")
    
    try:
        # Generate query embedding
        query_vector = embeddings.embed_query(query)
        
        # MongoDB vector search pipeline
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",  # Make sure this index exists in MongoDB
                    "path": "embedding",
                    "queryVector": query_vector,
                    "numCandidates": 100,
                    "limit": limit
                }
            },
            {
                "$project": {
                    "text": 1,
                    "page": 1,
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
                "page": r.get("page", 0),
                "file": r.get("file", "unknown"),
                "score": r.get("score", 0)
            })
        
        logger.info(f"Found {len(docs)} relevant documents for query")
        return docs
        
    except Exception as e:
        logger.error(f"Vector search failed: {e}")
        # Fallback to text search if vector search fails
        return fallback_text_search(query, limit)

def fallback_text_search(query, limit=3):
    """Fallback text search if vector search fails"""
    try:
        results = collection.find(
            {"text": {"$regex": query, "$options": "i"}}
        ).limit(limit)
        
        docs = []
        for r in results:
            docs.append({
                "text": r.get("text", ""),
                "page": r.get("page", 0),
                "file": r.get("file", "unknown")
            })
        
        return docs
    except Exception as e:
        logger.error(f"Fallback search failed: {e}")
        return []