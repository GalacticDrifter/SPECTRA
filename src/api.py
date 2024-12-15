import logging
import colorlog
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_file, send_from_directory
import json
import os
from datetime import datetime
import uuid
import openai
from .prompt_manager import generate_requirements, generate_summary_assessment
from .progress_tracking import progress_tracker
from .core import (
    allowed_file,
    generate_evaluations,
    get_project_folder,
    load_projects,
    parse_requirements,
    save_projects,
    strip_metadata,
)
from .req_res_processor import EvaluationResult, evaluate_technical_proposal
from .utils import (
    flatten_evaluation_object,
    get_mime_type,
    read_pdf,
)
from werkzeug.utils import secure_filename
from flask_cors import CORS

handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    '%(log_color)s%(levelname)s:%(name)s:%(message)s'
))
logger = logging.getLogger(__name__)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
app = Flask(__name__, static_folder=os.path.join("..", "frontend", "dist", "browser"))
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_angular(path):
    if path != "" and os.path.exists(app.static_folder + "/" + path):
        return send_from_directory(app.static_folder, path)
    return send_file(os.path.join(app.static_folder, 'index.html'))

@app.after_request
def set_cross_origin_headers(response):
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
    return response

# Load the pre-defined question sets with error handling
try:
    with open("evaluations/tech_eval_req_res.json") as f:
        question_set_1 = json.load(f)
    logger.info("Loaded tech_eval_req_res.json successfully.")

    with open("evaluations/tech_eval_work_products.json") as f:
        question_set_2 = json.load(f)
    logger.info("Loaded tech_eval_work_products.json successfully.")
except (FileNotFoundError, json.JSONDecodeError) as e:
    logger.error(f"Error loading JSON files: {e}")
    raise SystemExit("Failed to load question sets. Exiting.")

# Ensure the results directory exists
results_directory = "results"
os.makedirs(results_directory, exist_ok=True)

def check_project_documents(project_id):
    """Check if both request and response documents exist for a project"""
    metadata_file = os.path.join(get_project_folder(project_id), "metadata.json")
    if os.path.exists(metadata_file):
        with open(metadata_file, "r") as f:
            metadata = json.load(f)
            return bool(metadata.get("requestName")) and bool(
                metadata.get("responseName")
            )
    return False

@app.route("/api/projects/<project_id>/progress", methods=["GET"])
def get_evaluation_progress(project_id):
    """Get the current progress of evaluation for a project"""
    try:
        progress = progress_tracker.get_progress(project_id)
        return jsonify(progress)
    except Exception as e:
        logger.error(f"Error getting progress: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
# Derive requirements from a project's request document
@app.route("/api/projects/<project_id>/derive-requirements", methods=["GET"])
def check_documents(project_id):
    """Check if project has both documents and derive requirements if they do"""
    try:
        has_both_documents = check_project_documents(project_id)

        if has_both_documents:
            # Get file paths from metadata
            project_folder = get_project_folder(project_id)
            metadata_file = os.path.join(project_folder, "metadata.json")

            with open(metadata_file, "r") as f:
                metadata = json.load(f)

            # Convert to absolute path and ensure it exists
            request_path = os.path.abspath(metadata.get("requestPath"))
            if not os.path.exists(request_path):
                logger.error(f"Request file not found at: {request_path}")
                return (
                    jsonify({"error": f"Request file not found at: {request_path}"}),
                    404,
                )

            # Read the PDF
            try:
                sole_source_request = read_pdf(request_path)
            except Exception as pdf_error:
                logger.error(f"Error reading PDF: {str(pdf_error)}")
                return jsonify({"error": f"Error reading PDF: {str(pdf_error)}"}), 500

            # Generate and parse requirements
            derived_requirements_str = generate_requirements(
                sole_source_request
            )
            logger.info(f"Derived requirements: {derived_requirements_str}")
            requirements = parse_requirements(derived_requirements_str)

            # Store derived requirements in project metadata
            metadata["derived_requirements"] = requirements
            with open(metadata_file, "w") as f:
                json.dump(metadata, f)

            return jsonify(
                {
                    "has_both_documents": True,
                    "requirements_derived": True,
                    "requirements": requirements,
                }
            )

        return jsonify(
            {
                "has_both_documents": False,
                "message": "Both request and response documents are required",
            }
        )

    except Exception as e:
        logger.error(f"Error in derive requirements: {str(e)}")
        return (
            jsonify(
                {
                    "error": str(e),
                    "message": "Error checking documents or deriving requirements",
                }
            ),
            500,
        )

# Generate answers to derived requirements
@app.route("/api/projects/<project_id>/evaluate-derived-requirements", methods=["POST"])
def evaluate_derived_requirements(project_id):
    """Endpoint to evaluate derived requirements"""
    try:

        # Get file paths from metadata
        metadata_file = os.path.join(get_project_folder(project_id), "metadata.json")
        with open(metadata_file, "r") as f:
            metadata = json.load(f)

        requirements = metadata.get("derived_requirements", [])
        logger.info(f"Derived requirements: {requirements}")

        metadata["derived_requirements_evaluation"] = []
        with open(metadata_file, "w") as f:
            json.dump(metadata, f)

        return generate_evaluations(
            project_id, "derived_requirements_evaluation", requirements
        )

    except Exception as e:
        logger.error(f"Error evaluating derived requirements: {str(e)}")
        return (
            jsonify({"error": str(e), "message": "Error evaluating work products"}),
            500,
        )


# Generate answers to technical evaluation Work Products form
@app.route("/api/projects/<project_id>/evaluate-work-products", methods=["POST"])
def evaluate_work_products(project_id):
    """Endpoint to evaluate work products"""
    try:

        # Get file paths from metadata
        metadata_file = os.path.join(get_project_folder(project_id), "metadata.json")
        with open(metadata_file, "r") as f:
            metadata = json.load(f)

        metadata["work_products_evaluation"] = []
        with open(metadata_file, "w") as f:
            json.dump(metadata, f)

        return generate_evaluations(
            project_id, "work_products_evaluation", question_set_2
        )

    except Exception as e:
        return (
            jsonify({"error": str(e), "message": "Error evaluating work products"}),
            500,
        )
    
def serialize_response(response):
    if isinstance(response, EvaluationResult):
        return response.to_dict()
    elif isinstance(response, dict):
        return {k: serialize_response(v) for k, v in response.items()}
    elif isinstance(response, list):
        return [serialize_response(item) for item in response]
    else:
        return response
    
# Format section name for progress_tracker display
def format_section_name(section_name):
    """
    Convert camelCase to Title Case with spaces.
    Example: 'supportingInformation' -> 'Supporting Information'
    """
    # Add space before capital letters
    formatted = ''.join(' ' + c if c.isupper() else c for c in section_name).strip()
    # Convert first character to uppercase and the rest of words
    return ' '.join(word.capitalize() for word in formatted.split())

# Generate answers to technical evaluation Request and Response form
@app.route("/api/projects/<project_id>/evaluate-req-res", methods=["POST"])
def evaluate_requirements_response(project_id):
    """Endpoint to evaluate requirements response"""
    try:
        # Get file paths from metadata
        metadata_file = os.path.join(get_project_folder(project_id), "metadata.json")
        with open(metadata_file, "r") as f:
            metadata = json.load(f)

        metadata["req_res_evaluation"] = []

        response_path = os.path.abspath(metadata.get("responsePath"))
        if not os.path.exists(response_path):
            logger.error(f"Response file not found at: {response_path}")
            return jsonify({"error": f"Response file not found at: {response_path}"}), 404

        try:
            sole_source_response = read_pdf(response_path)
        except Exception as pdf_error:
            logger.error(f"Error reading PDF: {str(pdf_error)}")
            return jsonify({"error": f"Error reading PDF: {str(pdf_error)}"}), 500
        
        with open('evaluations/tech_eval_req_res.json', 'r') as f:
            schema = json.load(f)

        # Calculate total questions for progress tracking (including subsections)
        total_questions = 0
        for section in schema.get("evaluationQuestions", {}).values():
            # Count main section questions
            total_questions += len(section.get("questions", []))
            
            # Count subsection questions
            for subsection in section.get("subsections", {}).values():
                total_questions += len(subsection.get("questions", []))

        progress_tracker.initialize_progress(project_id, total_questions)

        # Modify the evaluate_technical_proposal function to accept a progress callback
        evaluation_results = evaluate_technical_proposal(
            schema, 
            sole_source_response,
            project_id=project_id,
            progress_callback=lambda section, count: progress_tracker.update_progress(
                project_id, 
                count, 
                f"Evaluating {format_section_name(section)}"
            )
        )

        serializable_results = {
            "metadata": evaluation_results["metadata"],
            "sections": {
                section: {
                    "sectionId": data["sectionId"],
                    "title": data["title"],
                    "responses": {
                        qid: serialize_response(response)
                        for qid, response in data.get("responses", {}).items()
                    },
                    "subsections": {
                        subsec_name: {
                            "sectionId": subsec_data["sectionId"],
                            "title": subsec_data["title"],
                            "responses": {
                                qid: serialize_response(response)
                                for qid, response in subsec_data.get("responses", {}).items()
                            }
                        }
                        for subsec_name, subsec_data in data.get("subsections", {}).items()
                    }
                }
                for section, data in evaluation_results["sections"].items()
            }
        }

        # Store evaluation results
        metadata["req_res_evaluation"] = serializable_results
        with open(metadata_file, "w") as f:
            json.dump(metadata, f)

        # Mark progress as complete
        progress_tracker.complete_progress(project_id)

        return jsonify({
            "success": True, 
            "evaluation_results": serializable_results
        })

    except Exception as e:
        logger.error(f"Error evaluating requirements response: {str(e)}")
        progress_tracker.set_error(project_id, str(e))
        return jsonify({
            "error": str(e), 
            "message": "Error evaluating requirements response"
        }), 500



@app.route("/api/projects/<project_id>/generate_summary", methods=["POST"])
def generate_summary(project_id):
    try:
        logger.info(f"Generating summary for project {project_id}...")

        # Initialize progress tracker with 4 total steps
        progress_tracker.initialize_progress(project_id, 4)

        metadata_file = os.path.join(get_project_folder(project_id), "metadata.json")
        with open(metadata_file, "r") as f:
            metadata = json.load(f)

        flatReqResData = flatten_evaluation_object(
            metadata.get("req_res_evaluation", {})
        )

        logger.info(f"Flattened req_res_evaluation: {flatReqResData}")

        evaluation_results = {
            "req_res_evaluation": flatReqResData,
            "work_products_evaluation": metadata.get("work_products_evaluation"),
            "derived_requirements_evaluation": metadata.get(
                "derived_requirements_evaluation"
            ),
        }

        summaries = {}
        current_step = 0
        
        # Generate individual summaries with progress updates
        for key, value in evaluation_results.items():
            progress_tracker.update_progress(
                project_id, 
                current_step + 1,
                f"Generating summary for {key.replace('_', ' ').title()}"
            )
            
            cleaned_responses = strip_metadata(value)
            summaries[f"summary_{key}"] = generate_summary_assessment(
                cleaned_responses
            )
            logger.info(f"Generated summary for {key} successfully.")
            current_step += 1

        # Generate combined summary with progress update
        progress_tracker.update_progress(
            project_id, 
            4,
            "Generating combined summary"
        )
        
        combined_summary = generate_summary_assessment(list(summaries.values()))
        summaries["combined_summary"] = combined_summary

        # Update the JSON file with the summaries
        metadata["summaries"] = summaries
        with open(metadata_file, "w") as f:
            json.dump(metadata, f)

        # Mark progress as complete
        progress_tracker.complete_progress(project_id)

        return jsonify(
            {
                "success": True,
                "summaries": summaries,
                "combined_summary": combined_summary,
            }
        )

    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        progress_tracker.set_error(project_id, str(e))
        return jsonify({"error": str(e), "message": "Error generating summary"}), 500

# DASHBOARD ENDPOINTS
@app.route("/api/projects", methods=["GET"])
def get_projects():
    return jsonify(load_projects())


@app.route("/api/projects", methods=["POST"])
def create_project():
    data = request.json
    if not data or "name" not in data:
        return jsonify({"error": "Project name is required"}), 400

    project_id = str(uuid.uuid4())
    project = {
        "id": project_id,
        "name": data["name"],
        "created_date": datetime.now().isoformat(),
    }

    # Create project directory
    project_folder = get_project_folder(project_id)
    os.makedirs(project_folder, exist_ok=True)

    # Save project metadata
    projects = load_projects()
    projects.append(project)
    save_projects(projects)

    return jsonify(project), 201


@app.route("/api/projects/<project_id>/data")
def get_project_data(project_id):
    project_folder = get_project_folder(project_id)

    # Load project metadata from a JSON file in the project folder
    metadata_file = os.path.join(project_folder, "metadata.json")
    if os.path.exists(metadata_file):
        with open(metadata_file, "r") as f:
            return jsonify(json.load(f))

    return jsonify(
        {
            "requestName": None,
            "responseName": None,
            "requestUrl": None,
            "responseUrl": None,
            "stats": {
                "techEvalScore": 0,
                "workProductScore": 0,
                "requirementsScore": 0,
                "totalScore": 0,
            },
        }
    )


@app.route("/api/upload/<type>", methods=["POST"])
def upload_file(type):
    if "file" not in request.files or "projectId" not in request.form:
        return jsonify({"error": "Missing file or project ID"}), 400

    project_id = request.form["projectId"]
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        project_folder = get_project_folder(project_id)
        filename = secure_filename(
            f"{type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        )
        filepath = os.path.join(project_folder, filename)
        file.save(filepath)

        # Update project metadata
        metadata_file = os.path.join(project_folder, "metadata.json")
        metadata = {}
        if os.path.exists(metadata_file):
            with open(metadata_file, "r") as f:
                metadata = json.load(f)

        metadata[f"{type}Name"] = file.filename
        metadata[f"{type}Path"] = filepath
        metadata[f"{type}Url"] = f"/api/documents/{project_id}/{filename}"

        with open(metadata_file, "w") as f:
            json.dump(metadata, f)

        return jsonify(
            {
                "message": "File uploaded successfully",
                "filename": filename,
                "url": f"/api/documents/{project_id}/{filename}",
            }
        )

    return jsonify({"error": "Invalid file type"}), 400

# Download a file from a project folder
@app.route("/api/documents/<project_id>/<filename>")
def get_document(project_id, filename):
    try:
        project_folder = get_project_folder(project_id)
        file_path = os.path.join(project_folder, filename)

        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404

        return send_from_directory(
            project_folder,
            filename,
            as_attachment=False,
            mimetype=get_mime_type(filename),
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects/<project_id>/form-update-work-products", methods=["POST"])
def form_update_work_products(project_id):
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        metadata_file = os.path.join(get_project_folder(project_id), "metadata.json")
        with open(metadata_file, "r") as f:
            metadata = json.load(f)

        metadata["work_products_evaluation"] = data
        with open(metadata_file, "w") as f:
            json.dump(metadata, f)

        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Error updating work products: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects/<project_id>/form-update-req-res", methods=["POST"])
def form_update_req_res(project_id):
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        metadata_file = os.path.join(get_project_folder(project_id), "metadata.json")
        with open(metadata_file, "r") as f:
            metadata = json.load(f)

        metadata["req_res_evaluation"] = data
        with open(metadata_file, "w") as f:
            json.dump(metadata, f)

        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Error updating req res: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Clear generated project data
@app.route("/api/projects/<project_id>/clear-generated-data", methods=["POST"])
def clear_generated_data(project_id):
    logger.info(f"Cleared generated data for project {project_id}")
    try:
        metadata_file = os.path.join(get_project_folder(project_id), "metadata.json")
        with open(metadata_file, "r") as f:
            metadata = json.load(f)
        if "derived_requirements" in metadata:
            del metadata["derived_requirements"]
        if "derived_requirements_evaluation" in metadata:
            del metadata["derived_requirements_evaluation"]
        if "work_products_evaluation" in metadata:
            del metadata["work_products_evaluation"]
        if "req_res_evaluation" in metadata:
            del metadata["req_res_evaluation"]
        if "summaries" in metadata:
            del metadata["summaries"]
        
        with open(metadata_file, "w") as f:
            json.dump(metadata, f)

        logger.info(f"Cleared data: {metadata}")

        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Error clearing generated data: {str(e)}")
        return jsonify({"error": str(e)}), 500