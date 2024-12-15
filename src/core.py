# src/core.py
import json
import logging
import os
import re
from typing import List
from flask import jsonify
import langchain
import langchain_community
import langchain_core
from langchain.chains.retrieval_qa.base import RetrievalQA
from langchain.schema.runnable import Runnable
from langchain_core.prompts import PromptTemplate  
from langchain.chains.combine_documents.stuff import create_stuff_documents_chain
from langchain.chains.qa_with_sources import load_qa_with_sources_chain
from langchain.chains.conversational_retrieval.prompts import CONDENSE_QUESTION_PROMPT
from langchain.chains.question_answering import load_qa_chain
from langchain.prompts.chat import (
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever

from src.prompt_manager import evaluate_question

from .utils import chunk_text, read_pdf
from .progress_tracking import progress_tracker

logger = logging.getLogger(__name__)

load_dotenv()
BASE_UPLOAD_FOLDER = os.getenv('BASE_UPLOAD_FOLDER')
PROJECTS_FILE = os.getenv('PROJECTS_FILE')
ALLOWED_EXTENSIONS = os.getenv('ALLOWED_EXTENSIONS')
os.makedirs(BASE_UPLOAD_FOLDER, exist_ok=True)

# Load pre-defined question sets with error handling
try:
    with open('evaluations/tech_eval_req_res.json') as f:
        question_set_1 = json.load(f)

    with open('evaluations/tech_eval_work_products.json') as f:
        question_set_2 = json.load(f)
except (FileNotFoundError, json.JSONDecodeError) as e:
    raise SystemExit(f"Error loading JSON files: {e}")

# Ensure the results directory exists
results_directory = 'results'
os.makedirs(results_directory, exist_ok=True)

def generate_evaluations(project_id, filename, question_set):
    try:
        logger.info(f"Generating evaluations for {filename}...")
        # Get file paths from metadata
        metadata_file = os.path.join(get_project_folder(project_id), "metadata.json")
        with open(metadata_file, "r") as f:
            metadata = json.load(f)

        # Convert to absolute path and ensure it exists
        response_path = os.path.abspath(metadata.get("responsePath"))
        if not os.path.exists(response_path):
            logger.error(f"Response file not found at: {response_path}")
            return (
                jsonify({"error": f"Response file not found at: {response_path}"}),
                404,
            )

        # Initialize progress tracking with total number of questions
        total_questions = len(question_set)
        progress_tracker.initialize_progress(project_id, total_questions)

        # Read the PDF
        try:
            sole_source_response = read_pdf(response_path)
        except Exception as pdf_error:
            logger.error(f"Error reading PDF: {str(pdf_error)}")
            progress_tracker.set_error(project_id, f"Error reading PDF: {str(pdf_error)}")
            return jsonify({"error": f"Error reading PDF: {str(pdf_error)}"}), 500

        evaluation_results = []
        logger.info(f"generate_evaluations for: {question_set}...")

        # Call your evaluate_work_products function
        for idx, question in enumerate(question_set):
            try:
                # Update progress with current question
                question_number = idx + 1
                progress_tracker.update_progress(
                    project_id,
                    question_number,
                    f"Evaluating question {question_number} of {total_questions}"
                )
                
                logger.info(f"Evaluating question: {question}")
                answer_with_justification = evaluate_question(
                    question, sole_source_response
                )
                parsed_response = parse_ai_response(question, answer_with_justification)
                evaluation_results.append(parsed_response)
                logger.info(
                    f"Evaluated question {question_number}/{total_questions} in {filename} successfully."
                )

                # Incrementally save results to avoid data loss
                metadata[filename] = evaluation_results
                with open(metadata_file, "w") as f:
                    json.dump(metadata, f)

            except Exception as e:
                error_msg = f"Error evaluating question {question_number} in {filename}: {e}"
                logger.error(error_msg)
                # Don't fail completely on individual question errors
                continue

        # Mark progress as complete
        progress_tracker.complete_progress(project_id)

        return jsonify({"success": True, "evaluation_results": evaluation_results})

    except Exception as e:
        error_msg = f"Error evaluating: {str(e)}"
        logger.error(error_msg)
        progress_tracker.set_error(project_id, error_msg)
        return jsonify({"error": str(e), "message": "Error evaluating"}), 500

def save_vectordb(vector_db, index_path='vectorstore/faiss_index'):
    """
    Saves the FAISS index and metadata to disk.
    """
    os.makedirs(os.path.dirname(index_path), exist_ok=True)
    vector_db.save_local(index_path)
    logger.info(f"VectorDB saved to {index_path}.")

def load_vectordb(index_path='vectorstore/faiss_index'):
    """
    Loads the FAISS index and metadata from disk.
    """
    if os.path.exists(index_path):
        vector_db = FAISS.load_local(index_path, OpenAIEmbeddings(), allow_dangerous_deserialization=True)
        logger.info(f"VectorDB loaded from {index_path}.")
        return vector_db
    else:
        logger.warning(f"No existing VectorDB found at {index_path}. Starting fresh.")
        return None
 
 
def parse_ai_response(question, answer_with_justification):
    """
    Parses the AI response into structured data.
    """

    logger.info("Parsing AI response...")
    logger.info(f"Question: {question}")
    if not answer_with_justification:
        logger.warning("Empty AI response provided for parsing.")
        return {'answer': '', 'justification': ''}

    try:
        lines = answer_with_justification.split('\n')
        answer = lines[0].replace('Answer:', '').strip()
        justification = ' '.join(lines[1:]).replace('Justification:', '').strip()
        logger.info("AI response parsed successfully.")
        question["answer"] = answer
        question["justification"] = justification
        # return question.append({
        #     'answer': answer,
        #     'justification': justification
        # })
        return question
    except Exception as e:
        logger.error(f"Error parsing AI response: {e}")
        raise e
    
# Helper functions
def check_project_documents(project_id):
    """Check if both request and response documents exist for a project."""
    metadata_file = os.path.join(get_project_folder(project_id), 'metadata.json')
    if os.path.exists(metadata_file):
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
            return bool(metadata.get('requestName')) and bool(metadata.get('responseName'))
    return False

def parse_requirements(requirements_str):
    """Parse requirements from a string."""
    try:
        cleaned_str = re.sub(r"```json|```", "", requirements_str).strip()
        return json.loads(cleaned_str) if cleaned_str else []
    except json.JSONDecodeError:
        return []
        
def strip_metadata(responses):
    """Removes 'id' and 'query' keys from each response object."""
    return [{k: v for k, v in response.items() if k not in ['id', 'query']} for response in responses]

def get_project_folder(project_id):
    return os.path.join(BASE_UPLOAD_FOLDER, project_id)

def load_projects():
    if os.path.exists(PROJECTS_FILE):
        with open(PROJECTS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_projects(projects):
    with open(PROJECTS_FILE, 'w') as f:
        json.dump(projects, f)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_documents_into_vectordb(docs_directory, vector_store):
    """
    Loads all PDFs from the docs directory into the VectorDB.
    """
    if not os.path.isdir(docs_directory):
        logger.error(f"Provided docs directory '{docs_directory}' does not exist.")
        raise FileNotFoundError(f"Directory '{docs_directory}' not found.")

    pdf_files = [f for f in os.listdir(docs_directory) if f.endswith('.pdf')]
    if not pdf_files:
        logger.warning(f"No PDF files found in directory '{docs_directory}'.")
        return

    for filename in pdf_files:
        doc_path = os.path.join(docs_directory, filename)
        try:
            text = read_pdf(doc_path)
            if not text:
                logger.warning(f"No text extracted from {filename}. Skipping this file.")
                continue

            chunks = chunk_text(text)
            create_and_store_embeddings(chunks, vector_store)
            logger.info(f"Successfully loaded and processed {filename} into the VectorDB.")
        except Exception as e:
            logger.error(f"Error processing file '{filename}': {e}")

def create_and_store_embeddings(chunks, vector_db):
    """
    Creates embeddings for the given text chunks and stores them in the VectorDB.
    """
    if not chunks:
        logger.warning("No chunks provided for embedding. Skipping embedding creation.")
        return

    try:
        # Convert chunks to Document objects
        documents = [Document(page_content=chunk) for chunk in chunks]
        logger.info(f"Creating embeddings for {len(documents)} chunks.")

        # Use OpenAIEmbeddings directly for embedding creation
        embeddings_model = OpenAIEmbeddings()
        embeddings = embeddings_model.embed_documents([doc.page_content for doc in documents])
        
        # Store the documents with embeddings in the vector store
        vector_db.add_documents(documents)  # Only pass the documents
        logger.info(f"Stored {len(documents)} chunks in the VectorDB.")
    except Exception as e:
        logger.error(f"Error creating embeddings or storing in VectorDB: {e}")
        raise e
