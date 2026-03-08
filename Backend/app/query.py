from app.vector_search import search_documents
from langchain_google_genai import ChatGoogleGenerativeAI
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# Initialize Gemini model
try:
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",  
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.3,
        max_tokens=500
    )
    logger.info("Gemini model initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Gemini model: {e}")
    model = None

def ask_question(question):
    """Answer question using RAG pipeline"""
    
    if not model:
        return {
            "answer": "AI model not available. Please check your Google API key.",
            "sources": []
        }
    
    try:
        # Search for relevant documents
        docs = search_documents(question)
        
        if not docs:
            return {
                "answer": "No relevant documents found. Please upload a PDF first.",
                "sources": []
            }
        
        # Prepare context
        context = ""
        sources = []
        
        for doc in docs:
            context += f"\nFrom {doc['file']} (Page {doc['page']}):\n{doc['text']}\n"
            sources.append({
                "file": doc["file"],
                "page": doc["page"],
                "score": doc.get("score")
            })
        
        # Create prompt
        prompt = f"""You are a helpful assistant that answers questions based on the provided context.
        
Context:
{context}

Question: {question}

Instructions:
1. Answer based only on the provided context
2. If the answer isn't in the context, say "I cannot find this information in the provided documents"
3. Be concise and accurate

Answer:"""

        # Get response from Gemini
        response = model.invoke(prompt)
        
        return {
            "answer": response.content,
            "sources": sources
        }
        
    except Exception as e:
        logger.error(f"Question answering failed: {e}")
        return {
            "answer": f"Error processing question: {str(e)}",
            "sources": []
        }