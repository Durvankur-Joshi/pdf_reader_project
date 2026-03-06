from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS


def ingest_pdf(file_path):
    # load PDF
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    # spilt into chunks
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

    splits = splitter.split_documents(documents)

    # Create embeddings
    embedding = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-mpnet-base-v2"
    )

    # Create vector DB
    vector_store = FAISS.from_documents(splits, embedding)

    vector_store.save_local("app/db")

    print("Vector is created and saved successfully")
