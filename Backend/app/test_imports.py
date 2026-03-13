# test_imports.py
print("Testing imports...")
try:
    from app.main import app
    print("✅ main.py imported")
except Exception as e:
    print(f"❌ main.py import failed: {e}")

try:
    from app.file_processor import FileProcessor
    print("✅ file_processor.py imported")
except Exception as e:
    print(f"❌ file_processor.py import failed: {e}")

try:
    from app.query import ask_question
    print("✅ query.py imported")
except Exception as e:
    print(f"❌ query.py import failed: {e}")

try:
    from app.mongo_db import client
    print("✅ mongo_db.py imported")
except Exception as e:
    print(f"❌ mongo_db.py import failed: {e}")