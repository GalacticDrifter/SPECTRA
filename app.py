# app.py
import logging
import os
import subprocess
import faiss
from langchain_community.vectorstores import FAISS
from langchain_community.docstore.in_memory import InMemoryDocstore
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
import openai
import colorlog
from src.api import app  # Import the configured Flask app with routes from api.py
from src.core import load_documents_into_vectordb, load_vectordb, save_vectordb

# Load environment variables and set OpenAI API key
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# Configure Logging
handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    '%(log_color)s%(levelname)s:%(name)s:%(message)s'
))
logger = logging.getLogger("spectra")
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Main entry point to run the Flask app
if __name__ == '__main__':
    try:
        # VectorDB Setup
        index_path = 'vectorstore/faiss_index'
        docs_directory = 'docs'
        vector_store = load_vectordb(index_path)

        if vector_store is None:
            index = faiss.IndexFlatL2(len(OpenAIEmbeddings().embed_query("hello world")))
            vector_store = FAISS(
                embedding_function=OpenAIEmbeddings(),
                index=index,
                docstore=InMemoryDocstore(),
                index_to_docstore_id={}
            )
            load_documents_into_vectordb(docs_directory, vector_store)
            save_vectordb(vector_store, index_path)
            logger.info("VectorDB setup complete.")

        # Start Flask app
        app.run(host='127.0.0.1', port=8080, debug=False)
        logger.info("Flask server started successfully, serving Angular frontend.")
    except subprocess.CalledProcessError as build_error:
        logger.error(f"Error building Angular frontend: {build_error}")
    except Exception as e:
        logger.error(f"Error starting SPECTRA: {e}")
