from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from pymongo import MongoClient
import os
import logging
from dotenv import load_dotenv
import io
from datetime import datetime
import tempfile
import uuid

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
try:
    client = MongoClient(os.getenv("MONGO_URI"))
    db = client["pdf_ai"]
    collection = db["documents"]
    logger.info("Connected to MongoDB")
except Exception as e:
    logger.error(f"MongoDB connection failed: {e}")
    raise

# Initialize embeddings
try:
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    logger.info("Embeddings model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load embeddings model: {e}")
    raise

def ingest_pdf_from_bytes(pdf_bytes, filename):
    """Process PDF from bytes and store in MongoDB with vector embeddings"""
    
    temp_file_path = None
    
    try:
        # Create a unique filename to avoid conflicts
        unique_filename = f"{uuid.uuid4()}_{filename}"
        
        # Create temp directory if it doesn't exist
        temp_dir = os.path.join(tempfile.gettempdir(), "pdf_processor")
        os.makedirs(temp_dir, exist_ok=True)
        
        # Create temp file path
        temp_file_path = os.path.join(temp_dir, unique_filename)
        
        # Write bytes to temp file with proper permissions
        logger.info(f"Creating temp file: {temp_file_path}")
        with open(temp_file_path, 'wb') as f:
            f.write(pdf_bytes)
        
        # Verify file was written
        if not os.path.exists(temp_file_path):
            raise Exception("Failed to create temp file")
        
        logger.info(f"Temp file created successfully, size: {os.path.getsize(temp_file_path)} bytes")
        
        # Load PDF using the temp file
        loader = PyPDFLoader(temp_file_path)
        documents = loader.load()
        
        if not documents:
            raise ValueError("No content extracted from PDF")
        
        logger.info(f"Loaded {len(documents)} pages from PDF")

        # Split documents into chunks
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        splits = splitter.split_documents(documents)
        logger.info(f"Created {len(splits)} text chunks")

        # Store in MongoDB with embeddings
        success_count = 0
        for i, doc in enumerate(splits):
            try:
                # Generate embedding
                embedding = embeddings.embed_query(doc.page_content)
                
                # Store in MongoDB
                collection.insert_one({
                    "text": doc.page_content,
                    "embedding": embedding,
                    "page": doc.metadata.get("page", 0),
                    "file": filename,
                    "chunk_id": i,
                    "timestamp": datetime.utcnow()
                })
                success_count += 1
                
            except Exception as e:
                logger.error(f"Failed to store chunk {i}: {e}")
                continue

        logger.info(f"Successfully stored {success_count}/{len(splits)} chunks in MongoDB")
        return {"success": True, "chunks_stored": success_count}
        
    except Exception as e:
        logger.error(f"PDF ingestion failed: {e}")
        raise
        
    finally:
        # Clean up temp file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                # Make sure file is not locked before deleting
                import time
                time.sleep(0.1)  # Small delay to ensure file is released
                os.remove(temp_file_path)
                logger.info(f"Temp file deleted: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Could not delete temp file {temp_file_path}: {e}")