from datetime import datetime
import logging
from typing import Dict, Any, List
import json
import colorlog
handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    '%(log_color)s%(levelname)s:%(name)s:%(message)s'
))
logger = logging.getLogger(__name__)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

from .prompt_manager import evaluate_req_res_question, validate_evaluation_result


class TechnicalEvaluationProcessor:
    def __init__(self, form_structure: Dict[str, Any], sole_source_response: str):
        self.form_structure = form_structure
        self.sole_source_response = sole_source_response
        self.evaluations = {}
        
    def process_form(self) -> Dict[str, Any]:
        """Process the entire form structure and collect evaluations"""
        return self.process_sections(self.form_structure['sections'])
    
    def process_sections(self, sections: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively process sections and their fields"""
        result = {}
        
        for section_key, section_data in sections.items():
            logger.info(f"Starting processing of section: {section_key}")
            
            try:
                # Handle different section types
                if 'subsections' in section_data:
                    # Handle technical evaluation style sections
                    logger.info(f"Processing subsections for {section_key}")
                    result[section_key] = self.process_subsections(
                        section_data['subsections'],
                        section_key
                    )
                    
                elif 'sections' in section_data:
                    # Handle supporting info and recommendation style sections
                    logger.info(f"Processing section groups for {section_key}")
                    result[section_key] = self.process_section_groups(
                        section_data['sections'],
                        section_key
                    )
                    
                else:
                    # Handle regular sections
                    logger.info(f"Processing fields for section: {section_key}")
                    result[section_key] = self.process_fields(
                        section_data.get('fields', []),
                        form_prefix=section_key
                    )
                    
            except Exception as e:
                logger.error(f"Error processing section {section_key}: {str(e)}")
                result[section_key] = {}
                
            logger.info(f"Completed processing of section: {section_key}")
            
        return result

    def process_subsections(self, subsections: Dict[str, Any], parent_key: str) -> Dict[str, Any]:
        """Process subsections like those in technical evaluation"""
        results = {}
        for sub_key, sub_data in subsections.items():
            logger.info(f"Processing subsection: {sub_key}")
            results[sub_key] = self.process_fields(
                sub_data.get('fields', []),
                form_prefix=f"{parent_key}.{sub_key}"
            )
        return results

    def process_section_groups(self, sections: Dict[str, Any], parent_key: str) -> Dict[str, Any]:
        """Process section groups like those in supporting info and recommendation"""
        results = {}
        for section_key, section_data in sections.items():
            logger.info(f"Processing section group: {section_key}")
            
            if 'sections' in section_data:
                # Handle nested sections
                results[section_key] = self.process_section_groups(
                    section_data['sections'],
                    f"{parent_key}.{section_key}"
                )
            else:
                # Process fields
                results[section_key] = self.process_fields(
                    section_data.get('fields', []),
                    form_prefix=f"{parent_key}.{section_key}"
                )
                
        return results

    def process_fields(self, fields: List[Dict[str, Any]], form_prefix: str = '') -> Dict[str, Any]:
        """Process individual fields and collect evaluations"""
        field_results = {}
        
        for field in fields:
            field_id = field['id']
            
            # Add form prefix to field config
            field_with_prefix = {
                **field,
                'formPrefix': form_prefix
            }

            # Skip fields without a 'query' key, as they may not require evaluation
            if 'query' not in field:
                logger.warning(f"Skipping field '{field_id}' in '{form_prefix}' - missing 'query' key.")
                continue
            
            if field['responseType'] == 'object':
                # Handle object types with subfields
                subfield_results = self.process_subfields(
                    field_with_prefix,
                    f"{form_prefix}.{field_id}"
                )
                field_results[field_id] = subfield_results
                
            elif field['responseType'] == 'dynamicArray':
                # Handle dynamic arrays
                array_results = self.process_dynamic_array(
                    field_with_prefix,
                    f"{form_prefix}.{field_id}"
                )
                field_results[field_id] = array_results
                
            else:
                # Process regular field
                evaluation = self.evaluate_field(field_with_prefix)
                if evaluation:
                    field_results[field_id] = evaluation
                    
        return field_results

    def evaluate_field(self, field_config: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate individual field using GPT"""
        if field_config.get('hidden') or not field_config.get('query'):
            return {}
            
        try:
            # Create complete form control path
            form_prefix = field_config.get('formPrefix', '')
            field_id = field_config['id']
            complete_form_control = (
                f"{form_prefix}.{field_id}" if form_prefix 
                else field_id
            )
            
            # Add complete path to config
            evaluation_config = {
                **field_config,
                'formControl': complete_form_control
            }
            
            evaluation = evaluate_req_res_question(
                evaluation_config, 
                self.sole_source_response
            )

            if not validate_evaluation_result(evaluation, evaluation_config):
                logger.warning(f"Evaluation failed validation for {complete_form_control}")
                return {}

            return evaluation
            
        except Exception as e:
            logger.error(f"Error evaluating field {field_config.get('id')}: {str(e)}")
            return {}
    
    def process_subfields(self, field: Dict[str, Any], form_prefix: str) -> Dict[str, Any]:
        """Process fields that contain subfields"""
        subfield_results = {}
        
        for subfield in field.get('subfields', []):
            # Add form prefix to subfield config
            subfield_with_prefix = {
                **subfield,
                'formPrefix': form_prefix
            }
            
            # Evaluate the subfield
            evaluation = self.evaluate_field(subfield_with_prefix)
            if evaluation:
                subfield_id = subfield['id']
                subfield_results[subfield_id] = evaluation
        
        logger.info(f"Subfield results for {form_prefix}: {subfield_results}")
        return subfield_results
    
    def process_dynamic_array(self, field: Dict[str, Any], form_prefix: str) -> Dict[str, Any]:
        """Process dynamic array fields"""
        logger.info(f"Processing dynamic array: {field['id']} with prefix: {form_prefix}")
        
        array_structure = field.get('arrayItemStructure', {})
        array_fields = array_structure.get('fields', [])
        
        # Initialize results array
        array_results = []
        
        # Process each field in the array structure
        for array_field in array_fields:
            # Create a new field config that combines the array context with the field
            field_config = {
                **array_field,
                'formPrefix': form_prefix,
                'formControl': f"{form_prefix}.{field['id']}.{array_field['id']}",
                'arrayContext': {
                    'arrayId': field['id'],
                    'arrayStructure': array_structure
                }
            }
            
            # Evaluate the field
            field_result = self.evaluate_field(field_config)
            if field_result:
                array_results.append(field_result)
        
        logger.info(f"Array results for {field['id']}: {len(array_results)} items")
        
        # Return the results in the structure expected by the form
        return array_results  # Changed to return just the array results

    def evaluate_field(self, field_config: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate individual field using GPT"""
        # logger.info(f"EVALUATE_FIELD: {field_config}")
        # Skip evaluation for certain field types
        if field_config.get('hidden') or not field_config.get('query'):
            return {}
            
        try:
            # Check if this is part of an array
            is_array_field = 'arrayContext' in field_config
            
            # Modify the evaluation context for array fields
            if is_array_field:
                field_config['arrayField'] = True
                
            evaluation = evaluate_req_res_question(field_config, self.sole_source_response)
            # logger.info(f"{field_config} response: {evaluation}")

            # Validate the result
            if not validate_evaluation_result(evaluation, field_config):
                logger.warning("Evaluation failed validation")
                return {}
                
            # Transform array field results if needed
            if is_array_field:
                return self.transform_array_field_result(evaluation, field_config)
                
            return evaluation
        except Exception as e:
            logger.error(f"Error evaluating field {field_config.get('id')}: {str(e)}")
            return {}
        
    def transform_array_field_result(self, evaluation: Dict[str, Any], field_config: Dict[str, Any]) -> Dict[str, Any]:
        """Transform results for array fields into the expected structure"""
        array_context = field_config['arrayContext']
        field_id = field_config['id']
        
        # Create the proper nested structure for array fields
        return {
            'id': field_id,
            'value': evaluation.get('value', ''),
            'arrayId': array_context['arrayId'],
            'metadata': {
                'confidence': evaluation.get('confidence', 'Low'),
                'location': evaluation.get('location', '')
            }
        }

def process_technical_evaluation(form_structure: Dict[str, Any], sole_source_response: str) -> Dict[str, Any]:
    """Main function to process technical evaluation"""
    processor = TechnicalEvaluationProcessor(form_structure, sole_source_response)
    
    try:
        # Process the entire form
        evaluations = processor.process_form()
        
        # Transform results into final format
        return {
            "success": True,
            "evaluations": evaluations,
            "metadata": {
                "processedAt": datetime.now().isoformat(),
                "formVersion": form_structure.get('metadata', {}).get('version', '1.0')
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "metadata": {
                "processedAt": datetime.now().isoformat()
            }
        }

# Example usage:
def evaluate_technical_response(sole_source_response: str):
    # Load form structure from JSON
    with open('evaluations/tech_eval_req_res.json', 'r') as f:
        form_structure = json.load(f)
    
    # Process the evaluation
    results = process_technical_evaluation(form_structure, sole_source_response)
    
    if results['success']:
        logger.info("Evaluation successful")
        logger.info(json.dumps(results['evaluations'], indent=2))
        # Transform results for frontend if needed
        frontend_data = transform_for_frontend(results['evaluations'])
        return frontend_data
    else:
        raise Exception(f"Evaluation failed: {results['error']}")

def transform_for_frontend(evaluations: Dict[str, Any]) -> Dict[str, Any]:
    """Transform evaluation results into frontend-compatible format"""
    def flatten_dict(d: Dict[str, Any], parent_key: str = '', sep: str = '.') -> Dict[str, Any]:
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            
            if isinstance(v, dict):
                items.extend(flatten_dict(v, new_key, sep=sep).items())
            else:
                items.append((new_key, v))
                
        return dict(items)
    
    # Flatten nested structure
    flattened = flatten_dict(evaluations)
    
    # Transform to match form controls
    transformed = {}
    for key, value in flattened.items():
        # Only transform if value is not a dict/list
        if not isinstance(value, (dict, list)):
            transformed[key] = value
            
    return transformed