from fastapi import FastAPI, UploadFile, File, HTTPException
from app.ingest import ingest_pdf_from_bytes
from app.query import ask_question
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from app.vector_search import search_documents
import logging
from typing import Optional, List
from datetime import datetime
import gridfs
from app.mongo_db import db

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize GridFS
fs = gridfs.GridFS(db)
files_collection = db["files"]

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "RAG API running", "status": "healthy"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF file - stores in MongoDB only"""
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Read file content
        pdf_bytes = await file.read()
        
        # Store original PDF in GridFS (optional - if you want to keep the original)
        file_id = fs.put(
            pdf_bytes, 
            filename=file.filename,
            uploadDate=datetime.utcnow(),
            contentType="application/pdf"
        )
        
        # Store file metadata
        files_collection.insert_one({
            "file_id": file_id,
            "filename": file.filename,
            "upload_date": datetime.utcnow(),
            "size": len(pdf_bytes)
        })
        
        logger.info(f"PDF stored in GridFS with ID: {file_id}")
        
        # Process PDF content directly from bytes
        result = ingest_pdf_from_bytes(pdf_bytes, file.filename)
        
        return {
            "message": f"File {file.filename} uploaded and processed successfully",
            "chunks_stored": result.get("chunks_stored", 0),
            "filename": file.filename,
            "file_id": str(file_id)
        }
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files")
async def list_files():
    """List all uploaded PDFs"""
    try:
        files = files_collection.find({}, {"filename": 1, "upload_date": 1, "size": 1})
        return {
            "files": [
                {
                    "filename": f["filename"],
                    "upload_date": f["upload_date"],
                    "size": f.get("size", 0)
                }
                for f in files
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/file/{filename}")
async def get_file_info(filename: str):
    """Get information about a specific file"""
    try:
        file_info = files_collection.find_one({"filename": filename})
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")
        
        return {
            "filename": file_info["filename"],
            "upload_date": file_info["upload_date"],
            "size": file_info.get("size", 0)
        }
    except Exception as e:
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
        "gridfs": check_gridfs()
    }

def check_mongodb_connection():
    """Check MongoDB connection"""
    try:
        from app.mongo_db import client
        client.admin.command('ping')
        return True
    except:
        return False

def check_gridfs():
    """Check GridFS is working"""
    try:
        # Try to list files
        list(fs.find().limit(1))
        return True
    except:
        return False

# Add cleanup endpoint (optional)
@app.delete("/cleanup/{filename}")
async def cleanup_file(filename: str):
    """Delete a file and its chunks from MongoDB"""
    try:
        # Find file in GridFS
        gridfs_file = fs.find_one({"filename": filename})
        if gridfs_file:
            # Delete from GridFS
            fs.delete(gridfs_file._id)
            
            # Delete metadata
            files_collection.delete_one({"filename": filename})
            
            # Delete all document chunks
            collection.delete_many({"file": filename})
            
            return {"message": f"File {filename} and its data cleaned up successfully"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))