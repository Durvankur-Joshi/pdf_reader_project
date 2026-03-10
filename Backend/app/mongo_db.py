from pymongo import MongoClient, ASCENDING
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
users_collection = db["users"]
files_collection = db["files"]

# Create indexes
users_collection.create_index([("email", ASCENDING)], unique=True)
files_collection.create_index([("user_id", ASCENDING), ("filename", ASCENDING)])
collection.create_index([("user_id", ASCENDING), ("file", ASCENDING)])

# Add GridFS for file storage
fs = gridfs.GridFS(db)