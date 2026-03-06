from fastapi import FastAPI ,UploadFile , File
import os
import shutil
from app.ingest import ingest_pdf

app = FastAPI()

UPLOAD_FOLDER= "data"

@app.get("/")
def home():
    return {"message": "RAG API running"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_FOLDER , file.filename)

    with open(file_path , 'wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    ingest_pdf(file_path)
    
    return {"message": f"File {file.filename} uploaded successfully"}