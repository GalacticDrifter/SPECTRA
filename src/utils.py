import os
import json
import logging
from PyPDF2 import PdfReader

logger = logging.getLogger(__name__)


def read_pdf(pdf_path):
    """
    Reads the text content of a PDF file.
    """
    if not os.path.isfile(pdf_path):
        logger.error(f"PDF file '{pdf_path}' not found.")
        raise FileNotFoundError(f"PDF file '{pdf_path}' not found.")

    try:
        reader = PdfReader(pdf_path)
        text = ''
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text
            else:
                logger.warning(f"No text found on a page in '{pdf_path}'. It may be an image-based PDF.")
        if not text:
            logger.warning(f"No extractable text found in the entire PDF '{pdf_path}'.")
        return text
    except Exception as e:
        logger.error(f"Failed to read PDF '{pdf_path}': {e}")
        raise e

def chunk_text(text, chunk_size=100):
    """
    Splits text into chunks of approximately the specified number of sentences.
    """
    if not text:
        logger.warning("Empty text provided to chunking function. Returning an empty list.")
        return []

    sentences = text.split('.')
    chunks = ['.'.join(sentences[i:i + chunk_size]) for i in range(0, len(sentences), chunk_size)]
    logger.info(f"Text split into {len(chunks)} chunks.")
    return chunks

def save_to_json(data, file_name):
    """
    Saves the given data to a JSON file.
    """
    try:
        with open(file_name, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"Data successfully saved to {file_name}.")
    except Exception as e:
        logger.error(f"Failed to save data to {file_name}: {e}")
        raise e

def convert_to_nested(flat_obj):
    """
    Convert a flat JSON object with dot notation keys into a nested object structure.
    
    Args:
        flat_obj (dict): A dictionary with dot notation keys
        
    Returns:
        dict: A nested dictionary structure
    """
    nested = {}
    
    for key, value in flat_obj.items():
        # Split the key into parts based on dots
        parts = key.split('.')
        
        # Start at the root of the nested structure
        current = nested
        
        # Navigate through each part of the key except the last one
        for part in parts[:-1]:
            # Create the nested dictionary if it doesn't exist
            if part not in current:
                current[part] = {}
            current = current[part]
        
        # Set the value at the final level
        current[parts[-1]] = value
    
    return nested

def flatten_evaluation_object(nested_obj):
    """
    Convert a nested evaluation object into a flat array of evaluation items.
    Each item in the array will contain the evaluation data without the nested structure.
    
    Args:
        nested_obj (dict): A nested dictionary containing evaluation data
        
    Returns:
        list: A flat array of evaluation items
    """
    flattened_array = []
    
    def extract_evaluation_item(obj, parent_key=""):
        """
        Recursively extract evaluation items from nested structure.
        Looking for objects that contain typical evaluation fields like 
        'value', 'confidence', 'location', etc.
        """
        if isinstance(obj, dict):
            # Check if this object is an evaluation item
            if all(key in obj for key in ['value', 'confidence']) or \
               all(key in obj for key in ['status', 'justification']):
                # Create evaluation item
                evaluation_item = {
                    'key': parent_key,
                    **obj
                }
                flattened_array.append(evaluation_item)
            else:
                # Continue searching deeper in the structure
                for key, value in obj.items():
                    new_key = f"{parent_key}.{key}" if parent_key else key
                    extract_evaluation_item(value, new_key)
    
    # Start the recursive extraction
    extract_evaluation_item(nested_obj)
    
    return flattened_array

def get_mime_type(filename):
    """Determine MIME type based on file extension"""
    extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    mime_types = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    return mime_types.get(extension, 'application/octet-stream')

def strip_metadata(responses):
    """a
    Removes 'id' and 'query' keys from each response object.
    """
    return [{k: v for k, v in response.items() if k not in ['id', 'query']} for response in responses]

