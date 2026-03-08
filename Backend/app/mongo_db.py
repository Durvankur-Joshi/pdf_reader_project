from pymongo import MongoClient
import gridfs
import os
from dotenv import load_dotenv
import logging

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI not found in environment variables")

try:
    client = MongoClient(MONGO_URI)
    # Test connection
    client.admin.command('ping')
    logging.info("Connected to MongoDB successfully")
except Exception as e:
    logging.error(f"Failed to connect to MongoDB: {e}")
    raise

db = client["pdf_ai"]
collection = db["documents"]

# Add GridFS for file storage
fs = gridfs.GridFS(db)

# Store file metadata
files_collection = db["files"]