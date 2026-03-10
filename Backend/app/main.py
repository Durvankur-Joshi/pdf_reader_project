from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
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
from app.auth import router as auth_router, get_current_user_id
from bson import ObjectId

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


app = FastAPI(
    title="PDF RAG API", description="Upload PDFs and ask questions about them"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth routes
app.include_router(auth_router)


@app.get("/")
def home():
    return {"message": "RAG API running", "status": "healthy"}


@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)
):
    """Upload and process a PDF file - stores in MongoDB only"""

    # Validate file type
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    try:
        # Read file content
        pdf_bytes = await file.read()

        # Store original PDF in GridFS with user_id in metadata
        file_id = fs.put(
            pdf_bytes,
            filename=file.filename,
            uploadDate=datetime.utcnow(),
            contentType="application/pdf",
            metadata={"user_id": user_id},
        )

        # Store file metadata with user_id
        files_collection.insert_one(
            {
                "file_id": file_id,
                "filename": file.filename,
                "user_id": user_id,
                "upload_date": datetime.utcnow(),
                "size": len(pdf_bytes),
            }
        )

        logger.info(f"PDF stored in GridFS with ID: {file_id} for user {user_id}")

        # Process PDF content with user_id
        result = ingest_pdf_from_bytes(pdf_bytes, file.filename, user_id)

        return {
            "message": f"File {file.filename} uploaded and processed successfully",
            "chunks_stored": result.get("chunks_stored", 0),
            "filename": file.filename,
            "file_id": str(file_id),
        }

    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/files")
async def list_files(user_id: str = Depends(get_current_user_id)):
    """List all uploaded PDFs for current user"""
    try:
        files = files_collection.find(
            {"user_id": user_id}, {"filename": 1, "upload_date": 1, "size": 1}
        )
        return {
            "files": [
                {
                    "filename": f["filename"],
                    "upload_date": f["upload_date"],
                    "size": f.get("size", 0),
                }
                for f in files
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/file/{filename}")
async def get_file_info(filename: str, user_id: str = Depends(get_current_user_id)):
    """Get information about a specific file"""
    try:
        file_info = files_collection.find_one(
            {"filename": filename, "user_id": user_id}
        )
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")

        return {
            "filename": file_info["filename"],
            "upload_date": file_info["upload_date"],
            "size": file_info.get("size", 0),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask", response_model=AnswerResponse)
async def ask(request: QuestionRequest, user_id: str = Depends(get_current_user_id)):
    """Ask a question about uploaded PDFs"""

    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        answer = ask_question(request.question, user_id)

        return {
            "question": request.question,
            "answer": answer["answer"],
            "sources": [
                Source(file=s["file"], page=s["page"], score=s.get("score"))
                for s in answer["sources"]
            ],
        }

    except Exception as e:
        logger.error(f"Question answering failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/test-search")
def test_search(q: str, user_id: str = Depends(get_current_user_id), limit: int = 3):
    """Test vector search functionality"""
    try:
        docs = search_documents(q, user_id, limit)
        return {"results": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "mongodb": check_mongodb_connection(),
        "gridfs": check_gridfs(),
    }


def check_mongodb_connection():
    """Check MongoDB connection"""
    try:
        from app.mongo_db import client

        client.admin.command("ping")
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


@app.delete("/cleanup/{filename}")
async def cleanup_file(filename: str, user_id: str = Depends(get_current_user_id)):
    """Delete a file and its chunks from MongoDB"""
    try:
        # Find file in GridFS that belongs to user
        gridfs_file = fs.find_one({"filename": filename, "metadata.user_id": user_id})

        if gridfs_file:
            # Delete from GridFS
            fs.delete(gridfs_file._id)

            # Delete metadata
            files_collection.delete_one({"filename": filename, "user_id": user_id})

            # Delete all document chunks for this user and file
            collection.delete_many({"file": filename, "user_id": user_id})

            return {"message": f"File {filename} and its data cleaned up successfully"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
