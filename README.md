# Sole Source Request Evaluation AI Pipeline

## Overview

SPECTRA is designed to evaluate sole-source contract requests and responses using an AI-powered pipeline. The pipeline automates the analysis of vendor responses, generates requirements checklists, assesses compliance, and provides a summary report. It integrates with a web-based frontend (Angular) and a Flask-based backend, utilizing the OpenAI API and LangChain for prompt management and data analysis.

## Project Structure

│                                   # SPECTRA Project Directory\
├── app.py                          # Main entry point for the SPECTRA app, logging and environment setup.\
├── requirements.txt                # Python dependencies.\
├── README.md                       # Documentation for the project.\
├── docs/                           # Directory containing all PDF files for VectorDB.\
│   ├── doc1.pdf\
│   ├── doc2.pdf\
│   └── ...                         # Additional documents to supplement VectorDB.\
├── evaluations/                    # JSON files for standard and custom question sets.\
│   ├── question_set_1.json         # Standard question set JSON file.\
│   ├── question_set_2.json         # Custom question set for technical evaluation.\
│   └── derived_requirements.json   # JSON file storing AI-generated requirements.\
├── mock/                           # Mock data for testing.\
│   ├── mock_request.pdf            # Sample mock request document.\
│   └── mock_response.pdf           # Sample mock response document.\
├── vector_db/                      # Directory containing VectorDB files.\
│   ├── vector_db.index             # FAISS index file for document retrieval.\
│   ├── vector_db.meta              # Metadata file for document retrieval.\
|__ src/\
│   ├── api.py                      # Flask app handling API requests.\
│   ├── core.py                     # Core functions for AI interactions and data processing.\
│   ├── utils.py                    # Utility functions for text processing and embeddings.\
│   ├── prompt_manager.py           # Manages prompt creation for AI interactions.\
│   ├── tech_eval_processor.py      # Python script for processing technical evaluations.\
│   ├── file_type_hanlder.py        # Python script for handling file types.\
├── frontend/\
│   ├── src/                        # Angular frontend source code.\
│   ├── dist/                       # Angular frontend build files.\
│   ├── node_modules/               # Node.js dependencies.\
│   ├── package.json                # Node.js dependencies.\
│   ├── angular.json                # Angular configuration file.\
│   ├── .angular/                   # Additional Angular files.\

## Features

- Extract requirements from sole-source requests using GPT-powered AI.
- Evaluate vendor responses against standard and derived requirements.
- Generate detailed justifications with supporting text snippets.
- Provide a summary assessment, including areas of strength, weaknesses, and final recommendations.
- Integrate with VectorDB (e.g., FAISS) for document retrieval to enhance AI context during evaluation.

## Prerequisites

- Python 3.8+ (3.11 recommended)
- Node.js and Angular CLI (for the frontend)
- OpenAI API Key (for GPT interactions)
- Flask for the backend server

## Authors

Quinn Lawrence, Jared Sullivan
