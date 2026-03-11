import os
import logging
import tempfile
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader,
    UnstructuredExcelLoader,
    UnstructuredPowerPointLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document  # Updated import
from app.mongo_db import collection, fs, files_collection
import pandas as pd
import pytesseract
from PIL import Image
import io

logger = logging.getLogger(__name__)

# Initialize embeddings
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

class FileProcessor:
    SUPPORTED_EXTENSIONS = {
        '.pdf': 'pdf',
        '.docx': 'docx',
        '.doc': 'docx',
        '.txt': 'txt',
        '.csv': 'xlsx',
        '.xlsx': 'xlsx',
        '.xls': 'xlsx',
        '.pptx': 'pptx',
        '.ppt': 'pptx',
        '.jpg': 'image',
        '.jpeg': 'image',
        '.png': 'image',
        '.gif': 'image'
    }
    
    @classmethod
    def get_file_type(cls, filename: str) -> str:
        ext = os.path.splitext(filename)[1].lower()
        return cls.SUPPORTED_EXTENSIONS.get(ext, 'txt')
    
    @classmethod
    async def process_file(cls, file_bytes: bytes, filename: str, user_id: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Process any supported file type and store in MongoDB"""
        
        temp_file_path = None
        file_type = cls.get_file_type(filename)
        
        try:
            # Create temp file
            unique_filename = f"{uuid.uuid4()}_{filename}"
            temp_dir = os.path.join(tempfile.gettempdir(), "file_processor")
            os.makedirs(temp_dir, exist_ok=True)
            temp_file_path = os.path.join(temp_dir, unique_filename)
            
            with open(temp_file_path, 'wb') as f:
                f.write(file_bytes)
            
            # Load documents based on file type
            documents = await cls._load_documents(temp_file_path, filename, file_type)
            
            if not documents:
                raise ValueError(f"No content extracted from {filename}")
            
            # Split documents into chunks
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            splits = splitter.split_documents(documents)
            
            # Store in MongoDB with embeddings
            success_count = 0
            for i, doc in enumerate(splits):
                try:
                    embedding = embeddings.embed_query(doc.page_content)
                    
                    collection.insert_one({
                        "text": doc.page_content,
                        "embedding": embedding,
                        "metadata": doc.metadata,
                        "file": filename,
                        "file_type": file_type,
                        "user_id": user_id,
                        "session_id": session_id,
                        "chunk_id": i,
                        "timestamp": datetime.utcnow()
                    })
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to store chunk {i}: {e}")
                    continue
            
            # Store file in GridFS
            file_id = fs.put(
                file_bytes,
                filename=filename,
                uploadDate=datetime.utcnow(),
                contentType=cls._get_mime_type(file_type),
                metadata={
                    "user_id": user_id,
                    "file_type": file_type,
                    "session_id": session_id
                }
            )
            
            # Store file metadata
            files_collection.insert_one({
                "file_id": file_id,
                "filename": filename,
                "file_type": file_type,
                "user_id": user_id,
                "session_id": session_id,
                "upload_date": datetime.utcnow(),
                "size": len(file_bytes),
                "chunks": success_count
            })
            
            return {
                "success": True,
                "filename": filename,
                "file_type": file_type,
                "chunks_stored": success_count,
                "file_id": str(file_id)
            }
            
        except Exception as e:
            logger.error(f"File processing failed: {e}")
            raise
        finally:
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except:
                    pass
    
    @classmethod
    async def _load_documents(cls, file_path: str, filename: str, file_type: str) -> List[Document]:
        """Load documents based on file type"""
        
        try:
            if file_type == 'pdf':
                loader = PyPDFLoader(file_path)
                return loader.load()
                
            elif file_type == 'docx':
                loader = Docx2txtLoader(file_path)
                return loader.load()
                
            elif file_type == 'txt':
                loader = TextLoader(file_path, encoding='utf-8')
                return loader.load()
                
            elif file_type == 'xlsx':
                # Handle Excel files
                try:
                    df_dict = pd.read_excel(file_path, sheet_name=None)
                    documents = []
                    for sheet_name, df in df_dict.items():
                        content = f"Sheet: {sheet_name}\n"
                        content += df.to_string()
                        doc = Document(
                            page_content=content,
                            metadata={"source": filename, "sheet": sheet_name, "page": 0}
                        )
                        documents.append(doc)
                    return documents
                except Exception as e:
                    logger.error(f"Excel processing error: {e}")
                    loader = UnstructuredExcelLoader(file_path)
                    return loader.load()
                    
            elif file_type == 'pptx':
                loader = UnstructuredPowerPointLoader(file_path)
                return loader.load()
                
            elif file_type == 'image':
                # Handle images with OCR
                try:
                    image = Image.open(file_path)
                    text = pytesseract.image_to_string(image)
                    doc = Document(
                        page_content=text,
                        metadata={"source": filename, "page": 0}
                    )
                    return [doc]
                except Exception as e:
                    logger.error(f"OCR failed: {e}")
                    return []
                    
            else:
                # Default to text loader
                loader = TextLoader(file_path, encoding='utf-8')
                return loader.load()
        except Exception as e:
            logger.error(f"Error loading documents: {e}")
            return []
    
    @staticmethod
    def _get_mime_type(file_type: str) -> str:
        mime_types = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image': 'image/jpeg'
        }
        return mime_types.get(file_type, 'application/octet-stream')