from pymongo import MongoClient, ASCENDING, TEXT
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

# Collections
collection = db["documents"]
users_collection = db["users"]
files_collection = db["files"]
sessions_collection = db["chat_sessions"]
messages_collection = db["messages"]

# Create indexes
users_collection.create_index([("email", ASCENDING)], unique=True)

# File indexes
files_collection.create_index([
    ("user_id", ASCENDING),
    ("filename", ASCENDING)
])
files_collection.create_index([("session_id", ASCENDING)])
files_collection.create_index([("upload_date", ASCENDING)])

# Document chunks indexes
collection.create_index([
    ("user_id", ASCENDING),
    ("file", ASCENDING)
])
collection.create_index([("session_id", ASCENDING)])
collection.create_index([("timestamp", ASCENDING)])
collection.create_index([("file_type", ASCENDING)])

# Text search index for fallback
collection.create_index([
    ("text", TEXT)
])

# Chat sessions indexes
sessions_collection.create_index([
    ("user_id", ASCENDING),
    ("updated_at", -1)
])
sessions_collection.create_index([("session_id", ASCENDING)], unique=True)

# Messages indexes
messages_collection.create_index([
    ("session_id", ASCENDING),
    ("timestamp", ASCENDING)
])

# Add GridFS for file storage
fs = gridfs.GridFS(db)