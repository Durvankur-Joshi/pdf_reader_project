from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from pymongo import MongoClient
import os
import logging
from dotenv import load_dotenv

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

def ingest_pdf(file_path):
    """Process and store PDF in MongoDB with vector embeddings"""
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found: {file_path}")
    
    try:
        # Load PDF
        logger.info(f"Loading PDF: {file_path}")
        loader = PyPDFLoader(file_path)
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
                    "file": os.path.basename(file_path),
                    "chunk_id": i
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