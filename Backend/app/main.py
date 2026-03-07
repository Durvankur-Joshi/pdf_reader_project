from fastapi import FastAPI, UploadFile, File
import os
import shutil
from app.ingest import ingest_pdf
from app.query import ask_question
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

class QuestionRequest(BaseModel):
    question: str


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "data"


@app.get("/")
def home():
    return {"message": "RAG API running"}


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    ingest_pdf(file_path)

    return {"message": f"File {file.filename} uploaded successfully"}


@app.post("/ask")
async def ask(request: QuestionRequest):

    answer = ask_question(request.question)

    return {"question": request.question, "answer": answer}
