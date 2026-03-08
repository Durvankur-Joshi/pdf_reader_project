from fastapi import FastAPI, UploadFile, File, HTTPException
import os
import shutil
from app.ingest import ingest_pdf
from app.query import ask_question
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from app.vector_search import search_documents
import logging
from typing import Optional, List

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QuestionRequest(BaseModel):
    question: str

class Source(BaseModel):
    file: str
    page: int
    score: Optional[float] = None

class AnswerResponse(BaseModel):
    question: str
    answer: str
    sources: List[Source]

app = FastAPI(title="PDF RAG API", description="Upload PDFs and ask questions about them")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload directory if it doesn't exist
UPLOAD_FOLDER = "data"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.get("/")
def home():
    return {"message": "RAG API running", "status": "healthy"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF file"""
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Create safe filename
    safe_filename = file.filename.replace(" ", "_")
    file_path = os.path.join(UPLOAD_FOLDER, safe_filename)
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"File saved: {file_path}")
        
        # Process PDF
        result = ingest_pdf(file_path)
        
        return {
            "message": f"File {file.filename} uploaded successfully",
            "chunks_stored": result.get("chunks_stored", 0),
            "filename": safe_filename
        }
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        # Clean up file if processing failed
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask", response_model=AnswerResponse)
async def ask(request: QuestionRequest):
    """Ask a question about uploaded PDFs"""
    
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    try:
        answer = ask_question(request.question)
        
        return {
            "question": request.question,
            "answer": answer["answer"],
            "sources": [
                Source(file=s["file"], page=s["page"], score=s.get("score"))
                for s in answer["sources"]
            ]
        }
        
    except Exception as e:
        logger.error(f"Question answering failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test-search")
def test_search(q: str, limit: int = 3):
    """Test vector search functionality"""
    try:
        docs = search_documents(q, limit)
        return {"results": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "mongodb": check_mongodb_connection(),
        "uploads_dir": os.path.exists(UPLOAD_FOLDER)
    }

def check_mongodb_connection():
    """Check MongoDB connection"""
    try:
        from app.mongo_db import client
        client.admin.command('ping')
        return True
    except:
        return False