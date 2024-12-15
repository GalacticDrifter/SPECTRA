import logging
import os
from typing import Any, Dict
from dotenv import load_dotenv
import openai
import json
import colorlog
from .utils import read_pdf
handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    '%(log_color)s%(levelname)s:%(name)s:%(message)s'
))
logger = logging.getLogger(__name__)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

load_dotenv()

# Set up your OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")
model_name  = os.getenv("MODEL_NAME")

# Function to generate the requirements checklist/questions from the sole-source request
def generate_requirements(sole_source_request):
    prompt = f"""
    You are an expert contract analyst. Your task is to carefully analyze the following sole-source request and extract a comprehensive list of requirements, specifications, and goals that the vendor must meet. Consider technical, delivery, compliance, and any other important factors. Provide the list in a structured format, breaking down each requirement into a clear statement or question that can be used for further evaluation. Focus on identifying both explicit and implicit needs.

    Here is the sole-source request document:
    {sole_source_request}

     Please generate a list of requirements in the following JSON format:
    [
        {{ "id": 0, "query": "[Detailed requirement]" }},
        {{ "id": 1, "query": "[Detailed requirement]" }},
        ...
    ]
    Ensure each requirement is a clear and concise statement.
    """

    response = openai.chat.completions.create(
        model=model_name, 
        messages=[{"role": "system", "content": prompt}], 
        max_tokens=1500
    )

    return response.choices[0].message.content.strip()

def evaluate_req_res_question(question_config, sole_source_response):
    """
    Enhanced evaluation function that provides structured responses matching form requirements
    
    Args:
        question_config: Dictionary containing question configuration from JSON
        sole_source_response: The vendor's response text
    
    Returns:
        Dictionary matching the form structure for easy injection
    """
    # Define the expected response structure based on response type
    response_structure = {
        'acceptability': {
            'status': 'string (Acceptable/Not Acceptable)',
            'basis': 'string (if applicable)',
            'justification': 'string',
            'questionedItems': 'array (if not acceptable)',
            'recommendedChanges': 'object (if not acceptable)'
        },
        'text': {
            'value': 'string',
            'location': 'string',
            'confidence': 'string (High/Medium/Low)',
            'additionalContext': 'string (optional)'
        },
        'textarea': {
            'value': 'string',
            'location': 'string',
            'confidence': 'string (High/Medium/Low)',
            'additionalContext': 'string (optional)'
        },
        'boolean': {
            'value': 'boolean',
            'confidence': 'string (High/Medium/Low)',
            'location': 'string',
            'additionalContext': 'string (optional)'
        },
        'table': {
            'rows': 'array of objects matching column structure',
            'justification': 'string per row',
            'sourceLocation': 'string per row'
        },
        'date': {
            'value': 'string (date format)',
            'confidence': 'string (High/Medium/Low)',
            'location': 'string'
        },
    }

    base_prompt = f"""
    You are performing a technical evaluation of a vendor's response for a government contract.
    Analyze the response and provide a JSON output matching the specified structure.

    Field Being Evaluated: {question_config['query']}
    Response Type: {question_config['responseType']}
    
    Vendor's Response:
    {sole_source_response}

    Provide your evaluation as a JSON object with the following structure:

    {json.dumps(response_structure[question_config['responseType']], indent=2)}

    For example, for an acceptability question, respond with:
    {{
        "status": "Acceptable",
        "basis": "same or similar effort",
        "justification": "The vendor's response demonstrates...",
        "questionedItems": [],
        "recommendedChanges": null
    }}

    Ensure all responses are factual and directly supported by the source material.
    """

    system_prompt = """You are a technical evaluator for government contracts. 
    Analyze the provided response and return a JSON object matching the specified structure."""

    response = openai.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": base_prompt}
        ],
        temperature=0.1,  # Lower temperature for more consistent responses
        max_tokens=1500,
        response_format={ "type": "json_object" }
    )

    # Parse the response into a structured format
    evaluation = json.loads(response.choices[0].message.content)

    # Transform the evaluation into form-compatible structure
    # form_data = transform_evaluation_to_form_data(evaluation, question_config)
    
    return evaluation

def transform_evaluation_to_form_data(evaluation, question_config):
    """
    Transforms the GPT evaluation into a structure that matches your Angular form
    """
    logger.info(f"Transforming evaluation for {question_config.get('id')}")
    logger.debug(f"Evaluation data: {evaluation}")
    
    form_data = {}
    
    # Get form control information
    form_prefix = question_config.get('formPrefix', '')
    field_id = question_config.get('id', '')
    form_control = question_config.get('formControl', '')
    
    if not form_control and form_prefix:
        form_control = f"{form_prefix}.{field_id}"
    elif not form_control:
        form_control = field_id
        
    logger.info(f"Form control path: {form_control}")
    
    if not form_control:
        logger.warning("No form control path available")
        return form_data
        
    parts = form_control.split('.')
    current = form_data
    
    # Build the nested structure
    for i, part in enumerate(parts[:-1]):
        current[part] = current.get(part, {})
        current = current[part]
    
    # Handle different response types
    try:
        if question_config['responseType'] == 'acceptability':
            current[parts[-1]] = {
                'acceptable': evaluation['status'] == 'Acceptable',
                'basis': evaluation.get('basis', ''),
                'justification': evaluation.get('justification', ''),
                'questionedItems': evaluation.get('questionedItems', []),
                'recommendedChanges': evaluation.get('recommendedChanges', None)
            }
        elif question_config['responseType'] == 'table':
            current[parts[-1]] = evaluation.get('rows', [])
        elif question_config['responseType'] == 'dynamicArray':
            # Handle dynamic arrays
            array_data = []
            for item in evaluation.get('items', []):
                array_data.append({
                    'value': item.get('value', ''),
                    'metadata': {
                        'confidence': item.get('confidence', 'Low'),
                        'location': item.get('location', '')
                    }
                })
            current[parts[-1]] = array_data
        elif question_config['responseType'] == 'object':
            # Handle object types with subfields
            current[parts[-1]] = {
                subfield.get('id'): evaluation.get(subfield.get('id'), '')
                for subfield in question_config.get('subfields', [])
            }
        else:
            # Handle basic field types
            current[parts[-1]] = evaluation.get('value', '')
            
            # Include metadata if available
            if any(key in evaluation for key in ['confidence', 'location', 'additionalContext']):
                current[f"{parts[-1]}_metadata"] = {
                    'confidence': evaluation.get('confidence', 'Low'),
                    'location': evaluation.get('location', ''),
                    'additionalContext': evaluation.get('additionalContext', '')
                }
    
    except Exception as e:
        logger.error(f"Error transforming evaluation data: {str(e)}")
        current[parts[-1]] = None
    
    logger.debug(f"Transformed data: {form_data}")
    return form_data

# Add validation for the evaluation results
def validate_evaluation_result(evaluation: Dict[str, Any], question_config: Dict[str, Any]) -> bool:
    """
    Validates that the evaluation result matches the expected structure
    """
    try:
        if question_config['responseType'] == 'acceptability':
            required_fields = ['status', 'justification']
            if evaluation['status'] == 'Acceptable' and 'acceptanceCriteria' in question_config:
                required_fields.append('basis')
            if evaluation['status'] == 'Not Acceptable' and 'questionedItemsStructure' in question_config:
                required_fields.extend(['questionedItems', 'recommendedChanges'])
                
            return all(field in evaluation for field in required_fields)
            
        elif question_config['responseType'] == 'table':
            if 'rows' not in evaluation:
                return False
            required_columns = [col['id'] for col in question_config['questionedItemsStructure']['columns']]
            return all(all(col in row for col in required_columns) for row in evaluation['rows'])
            
        else:  # text/data field
            return 'value' in evaluation and 'confidence' in evaluation
            
    except (KeyError, TypeError):
        return False

# Helper function to format error messages
def format_evaluation_error(question_config: Dict[str, Any], error_type: str) -> str:
    error_messages = {
        'missing_required': f"Missing required fields for {question_config['responseType']} evaluation",
        'invalid_format': f"Invalid format for {question_config['responseType']} evaluation",
        'validation_failed': f"Validation failed for field: {question_config.get('id', 'unknown')}"
    }
    return error_messages.get(error_type, 'Unknown error in evaluation')


# Function to evaluate a single question against the response
def evaluate_question(question, sole_source_response):
    prompt = f"""
    You are analyzing a vendor's response to a set of requirements. For each requirement, your goal is to determine if the vendor's response meets the specified criteria. Analyze the provided response document to give a detailed answer for each question, referencing relevant sections or sentences directly from the response.

    Requirement: {question}
    Vendor Response: {sole_source_response}

    Please provide:
    1. A clear answer stating whether the requirement is met, partially met, or not met.
    2. A brief justification for your conclusion, referencing specific sentences or paragraphs from the vendor's response that support your determination.

    Answer in this format:
    Answer: [Your determination: Met/Partially Met/Not Met]
    Justification: [Relevant sentences or text snippets from the response]
    """

    response = openai.chat.completions.create(
        model=model_name, 
        messages=[{"role": "system", "content": prompt}], 
        max_tokens=1500
    )
    return response.choices[0].message.content.strip()

# Function to generate the final summary/assessment
def generate_summary_assessment(analysis_results):
    prompt = f"""
    Based on the detailed analysis of the vendor's response to the sole-source request, your goal is to create a summary assessment. Review the answers to each requirement, noting where the vendor meets the expectations and where there are gaps. Highlight any missing information, areas where the vendor exceeds the requirements, and overall readiness or suitability of the vendor.

    Here is the analysis of each question:
    {json.dumps(analysis_results, indent=2)}

    Please provide the summary in this format:
    1. Overview: [General overview of the vendor's response]
    2. Strengths: [Key strengths or areas where the vendor meets or exceeds requirements]
    3. Weaknesses: [Requirements or areas where the vendor fails to meet expectations]
    4. Missing Information: [Any requirements that are partially met or not addressed]
    5. Overall Assessment: [Final judgment on the vendor's readiness and qualification for the sole-source request, including a recommended score out of 10]
    """

    response = openai.chat.completions.create(
        model=model_name, 
        messages=[{"role": "system", "content": prompt}], 
        max_tokens=1500
    )
    return response.choices[0].message.content.strip()
