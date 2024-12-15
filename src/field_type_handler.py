from datetime import datetime
import logging
from typing import Any, Dict

# Setup logging for the utility module
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class FieldTypeHandlers:
    @staticmethod
    def handle_acceptability(evaluation: Dict[str, Any], field_config: Dict[str, Any]) -> Dict[str, Any]:
        """Handle acceptability type fields"""
        result = {
            'acceptable': evaluation['status'] == 'Acceptable',
            'justification': evaluation.get('justification', '')
        }
        
        if 'acceptanceCriteria' in field_config and result['acceptable']:
            result['basis'] = evaluation.get('basis', '')
            
        if not result['acceptable'] and 'questionedItemsStructure' in field_config:
            result['questionedItems'] = evaluation.get('questionedItems', [])
            
        return result
    
    @staticmethod
    def handle_dynamic_array(evaluation: Dict[str, Any], field_config: Dict[str, Any]) -> Dict[str, Any]:
        """Handle dynamic array type fields"""
        if 'rows' not in evaluation:
            return []
            
        array_structure = field_config.get('arrayItemStructure', {})
        field_mappings = {
            field['id']: field['responseType'] 
            for field in array_structure.get('fields', [])
        }
        
        processed_rows = []
        for row in evaluation['rows']:
            processed_row = {}
            for key, value in row.items():
                if key in field_mappings:
                    processed_row[key] = FieldTypeHandlers.transform_value(
                        value, 
                        field_mappings[key]
                    )
            processed_rows.append(processed_row)
            
        return processed_rows
    
    @staticmethod
    def transform_value(value: Any, response_type: str) -> Any:
        """Transform values based on response type"""
        transformers = {
            'number': float,
            'boolean': bool,
            'date': lambda x: datetime.strptime(x, '%Y-%m-%d').date(),
            'text': str
        }
        
        transformer = transformers.get(response_type, lambda x: x)
        try:
            return transformer(value)
        except:
            return value