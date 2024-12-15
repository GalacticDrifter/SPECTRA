import os
import re
from typing import Dict, List, Union, Optional
import json
from datetime import datetime
import openai
import logging
from dataclasses import dataclass
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
load_dotenv()
model_name  = os.getenv("MODEL_NAME")

@dataclass
class EvaluationResult:
    value: Union[str, bool, dict, list]
    confidence: str  # High, Medium, Low
    source_location: Optional[str]
    analysis: Optional[str]
    questioned_items: Optional[List[Dict]]
    justification: Optional[str]

    def to_dict(self) -> dict:
        """Convert the evaluation result to a dictionary"""
        return {
            "value": self.value,
            "confidence": self.confidence,
            "source_location": self.source_location,
            "analysis": self.analysis,
            "questioned_items": self.questioned_items,
            "justification": self.justification
        }
class TechnicalEvaluator:
    def __init__(self, model_name: str = model_name):
        self.model_name = model_name
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
    def evaluate_section(self, section_config: Dict, proposal_text: str) -> Dict:
        """
        Evaluates an entire section of the technical evaluation form
        
        Args:
            section_config: Configuration for the section from schema
            proposal_text: The relevant proposal text to evaluate
            
        Returns:
            Dict containing evaluation results for the section
        """
        # Special handling for different sections
         # Add specific handling for materials section
        if section_config.get("id") == "materialsSection":
            return self._evaluate_materials_section(section_config, proposal_text)
        elif section_config.get("id") == "laborSection":
            return self._evaluate_labor_section(section_config, proposal_text)
        elif section_config.get("id") == "travelSection":
            return self._evaluate_travel_section(section_config, proposal_text)
        elif section_config.get("id") == "odcSection":
            return self._evaluate_odc_section(section_config, proposal_text)
        elif section_config.get("id") == "section3":
            return self._evaluate_supporting_information(section_config, proposal_text)
        elif section_config.get("id") == "section4":
            return self._evaluate_recommendation_section(section_config, proposal_text)
            
        # Default handling for other sections
        self.logger.info(f"Starting evaluation of section: {section_config['title']}")
        results = {
            "sectionId": section_config["id"],
            "title": section_config["title"],
            "responses": {}
        }
        
        for question in section_config["questions"]:
            try:
                result = self.evaluate_question(question, proposal_text)
                results["responses"][question["id"]] = result
            except Exception as e:
                self.logger.error(f"Error evaluating question {question['id']}: {str(e)}")
                results["responses"][question["id"]] = {
                    "error": str(e),
                    "status": "failed"
                }
                
        return results

    def evaluate_question(self, question_config: Dict, proposal_text: str) -> EvaluationResult:
        """
        Evaluates a single question based on its type and configuration
        
        Args:
            question_config: Configuration for the specific question
            proposal_text: The relevant proposal text
            
        Returns:
            EvaluationResult containing the evaluation
        """
        response_type = question_config["responseType"]
        
        # Build the evaluation prompt
        prompt = self._build_evaluation_prompt(question_config, proposal_text)
        
        try:
            # Get response from AI model
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a technical evaluator for government contracts."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            # Parse and validate the response
            result = self._parse_evaluation_response(response.choices[0].message.content, 
                                                  question_config)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Evaluation failed for question {question_config['id']}: {str(e)}")
            raise  
    
    def _evaluate_labor_section(self, section_config: Dict, proposal_text: str) -> Dict:
        """
        Specialized handling for labor section evaluation
        """
        results = {
            "sectionId": section_config["id"],
            "title": section_config["title"],
            "responses": {}
        }

        try:
            # Evaluate labor hours summary first
            labor_summary_config = next(q for q in section_config["questions"] if q["id"] == "laborHoursSummary")
            summary_prompt = f"""
            Analyze the following proposal text for labor hours technical acceptability.
            Consider: project timeline, milestones, deliverables, and resource allocation.
            Also determine the basis for acceptance from these options:
            - Same or Similar Effort (provide contract number)
            - Estimating Method/Software Model (provide methodology)
            - Subject Matter Expertise (provide credentials)

            Required JSON Response Format:
            {{
                "value": true/false,
                "confidence": "High/Medium/Low",
                "source_location": "string",
                "analysis": "detailed analysis",
                "justification": "brief justification",
                "acceptanceBasis": {{
                    "type": "sameOrSimilar/estimatingMethod/expertise",
                    "details": {{
                        "contractNumber": "string" (if sameOrSimilar),
                        "methodology": "string" (if estimatingMethod),
                        "credentials": "string" (if expertise)
                    }}
                }}
            }}
            """

            labor_summary = self._evaluate_labor_with_prompt(labor_summary_config, proposal_text, summary_prompt)
            
            # Structure the response to include basis for acceptance
            results["responses"]["laborHoursSummary"] = {
                "value": labor_summary.get("value", False),
                "confidence": labor_summary.get("confidence", "Low"),
                "source_location": labor_summary.get("source_location"),
                "analysis": labor_summary.get("analysis"),
                "justification": labor_summary.get("justification"),
                "questioned_items": [],
                "acceptanceBasis": labor_summary.get("acceptanceBasis", {
                    "type": "estimatingMethod",
                    "details": {
                        "methodology": labor_summary.get("justification", "")
                    }
                })
            }

            # Evaluate proposed hours
            proposed_hours_config = next(q for q in section_config["questions"] if q["id"] == "proposedHours")
            proposed_hours = self.evaluate_question(proposed_hours_config, proposal_text)
            results["responses"]["proposedHours"] = proposed_hours.to_dict()

            # Evaluate recommended hours
            recommended_hours_config = next(q for q in section_config["questions"] if q["id"] == "recommendedHours")
            recommended_hours = self.evaluate_question(recommended_hours_config, proposal_text)
            results["responses"]["recommendedHours"] = recommended_hours.to_dict()

            # Handle questioned hours if necessary
            if not labor_summary.get("value", False):
                questioned_hours_config = next(q for q in section_config["questions"] if q["id"] == "questionedHours")
                questioned_hours = self.evaluate_question(questioned_hours_config, proposal_text)
                results["responses"]["questionedHours"] = questioned_hours.to_dict()
            else:
                results["responses"]["questionedHours"] = {
                    "value": [],
                    "confidence": "High",
                    "source_location": None,
                    "analysis": "No questioned hours as labor hours are technically acceptable",
                    "questioned_items": None,
                    "justification": None
                }

        except Exception as e:
            self.logger.error(f"Error in labor section evaluation: {str(e)}")
            results["error"] = str(e)

        return results
    
    def _evaluate_labor_with_prompt(self, config: Dict, proposal_text: str, prompt: str) -> Dict:
        """
        Helper method for evaluating with specific prompt
        """
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are analyzing proposal labor hours for technical evaluation. Provide response in JSON format."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            self.logger.error(f"Error in evaluation: {str(e)}")
            raise

    def _validate_labor_results(self, results: Dict) -> None:
        """
        Validates labor section results against validation rules
        """
        try:
            proposed_result = results["responses"]["proposedHours"]
            recommended_result = results["responses"]["recommendedHours"]
            
            # Access the value directly from EvaluationResult objects
            if isinstance(proposed_result, EvaluationResult) and isinstance(recommended_result, EvaluationResult):
                proposed = float(proposed_result.value)
                recommended = float(recommended_result.value)
                
                if recommended > proposed:
                    # Check if there's justification in questioned hours
                    questioned = results["responses"].get("questionedHours", EvaluationResult(
                        value=[],
                        confidence="Low",
                        source_location=None,
                        analysis=None,
                        questioned_items=None,
                        justification=None
                    ))
                    
                    if not questioned.justification:
                        results["validation_warning"] = "Recommended hours exceed proposed hours without justification"
                        
                if proposed <= 0 or recommended <= 0:
                    results["validation_warning"] = "Hours must be greater than zero"
                    
        except (KeyError, TypeError, ValueError) as e:
            self.logger.warning(f"Labor validation warning: {str(e)}")
            results["validation_warning"] = str(e)

    def _evaluate_materials_section(self, materials_config: Dict, proposal_text: str) -> Dict:
        """
        Specialized handling for materials section evaluation
        
        Args:
            materials_config: Configuration for the materials section from schema
            proposal_text: The relevant proposal text
            
        Returns:
            Dict containing evaluation results for the materials section
        """
        self.logger.info("Evaluating materials section")
        
        results = {
            "sectionId": materials_config.get("id", "materialsSection"),
            "title": materials_config.get("title", "B. MATERIALS"),
            "responses": {}
        }
        
        try:
            # Evaluate materials purpose using standard evaluate_question
            purpose_result = self.evaluate_question(
                next(q for q in materials_config["questions"] if q["id"] == "materialsPurpose"),
                proposal_text
            )
            results["responses"]["materialsPurpose"] = purpose_result.to_dict()
            
            # Evaluate technical acceptability using specialized method
            acceptability_config = next(q for q in materials_config["questions"] if q["id"] == "materialsTechnicalAcceptability")
            acceptability_result = self._evaluate_materials_acceptability(
                acceptability_config,
                proposal_text
            )
            results["responses"]["materialsTechnicalAcceptability"] = acceptability_result.to_dict()
            
            # If materials are not acceptable, evaluate questioned materials with specialized method
            if not acceptability_result.value:
                questioned_config = next(q for q in materials_config["questions"] if q["id"] == "questionedMaterials")
                questioned_result = self._evaluate_questioned_materials(
                    questioned_config,
                    proposal_text
                )
                results["responses"]["questionedMaterials"] = questioned_result.to_dict()
            else:
                results["responses"]["questionedMaterials"] = {
                    "value": [],
                    "confidence": "High",
                    "source_location": None,
                    "analysis": "No questioned materials as all materials are technically acceptable",
                    "questioned_items": None,
                    "justification": None
                }
            
            # Validate the entire section
            self._validate_materials_section(results)
            self.logger.info("Successfully evaluated materials section")
            
        except Exception as e:
            self.logger.error(f"Error in materials evaluation: {str(e)}")
            results["error"] = str(e)
            
        return results

    def _evaluate_materials_acceptability(self, config: Dict, proposal_text: str) -> EvaluationResult:
        """
        Evaluates the technical acceptability of proposed materials
        
        Args:
            config: Question configuration for materials acceptability
            proposal_text: The relevant proposal text
            
        Returns:
            EvaluationResult for materials acceptability
        """
        prompt = """
        Analyze the following proposal text and provide a JSON response evaluating materials technical acceptability. 
        
        Consider:
        1. Type of materials proposed
        2. Quantities requested, not monetary amounts but actual quantities of the materials proposed in the sole source response
        3. Technical specifications
        4. Quality standards use any pricing information to determine if the materials are of acceptable quality
        5. Compatibility with requirements
        6. Industry standards compliance
        7. Material availability and lead times 
        
        Required JSON format:
        {
            "value": true/false,
            "confidence": "High/Medium/Low",
            "sourceLocation": "string",
            "analysis": "detailed analysis of materials requirements",
            "justification": "brief technical justification",
            "evaluationPoints": {
                "types": "analysis of material types",
                "quantities": "analysis of quantities",
                "specifications": "analysis of technical specifications",
                "quality": "analysis of quality standards"
            }
        }
        """
        
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are evaluating materials for technical acceptability."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            materials_data = json.loads(response.choices[0].message.content)
            
            return EvaluationResult(
                value=materials_data.get("value", False),
                confidence=materials_data.get("confidence", "Low"),
                source_location=materials_data.get("sourceLocation"),
                analysis=materials_data.get("analysis"),
                questioned_items=None,
                justification=materials_data.get("justification")
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating materials acceptability: {str(e)}")
            raise

    def _evaluate_questioned_materials(self, config: Dict, proposal_text: str) -> EvaluationResult:
        """
        Evaluates specific materials being questioned
        
        Args:
            config: Question configuration for questioned materials
            proposal_text: The relevant proposal text
            
        Returns:
            EvaluationResult containing questioned materials details
        """
        prompt = """
        Analyze the following proposal text and provide details about questioned materials.
        
        For each questioned material, provide:
        1. Fiscal year
        2. Type of material
        3. Quantity proposed are not dollars but actual quantities of the materials proposed in the sole source response
        4. Quantity recommended are not dollars but actual quantities of the materials that the evaluator recommends should recommended if the proposed quantity is not acceptable
        5. Proposal page reference
        6. Technical specifications concerns
        7. Quality standards issues
        8. Detailed explanation for questioning
        9. Justification for recommendations
        
        Required JSON format:
        {
            "questionedItems": [
                {
                    "fiscalYear": "string",
                    "materialType": "string",
                    "proposedQty": "string",
                    "recommendedQty": "string",
                    "pageRef": "string",
                    "technicalConcerns": "string",
                    "qualityConcerns": "string",
                    "explanation": "string",
                    "justification": "string"
                }
            ],
            "confidence": "High/Medium/Low",
            "sourceLocation": "string",
            "analysis": "string"
        }
        """
        
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are identifying and analyzing questioned materials."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            questioned_data = json.loads(response.choices[0].message.content)
            
            return EvaluationResult(
                value=questioned_data.get("questionedItems", []),
                confidence=questioned_data.get("confidence", "Low"),
                source_location=questioned_data.get("sourceLocation"),
                analysis=questioned_data.get("analysis"),
                questioned_items=questioned_data.get("questionedItems"),
                justification=None
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating questioned materials: {str(e)}")
            raise

    def _validate_materials_section(self, results: Dict) -> None:
        """
        Validates the materials section results
        
        Args:
            results: The materials section evaluation results to validate
        """
        try:
            # Validate materials purpose
            if "materialsPurpose" in results["responses"]:
                purpose = results["responses"]["materialsPurpose"].value
                if not purpose or len(str(purpose).strip()) < 10:
                    results["validation_warning"] = "Materials purpose must be adequately detailed"
            
            # Validate questioned materials if present
            if "questionedMaterials" in results["responses"]:
                questioned_items = results["responses"]["questionedMaterials"].value
                if isinstance(questioned_items, list):
                    for item in questioned_items:
                        # Validate quantities
                        # if item.get("recommendedQty", 0) > item.get("proposedQty", 0):
                        #    results["validation_warning"] = "Recommended quantity cannot exceed proposed quantity without justification"
                        
                        # Ensure quantities are positive
                        # if item.get("proposedQty", 0) <= 0 or item.get("recommendedQty", 0) <= 0:
                        #    results["validation_warning"] = "Material quantities must be greater than zero"
                        
                        # Check for required fields
                        required_fields = [
                            "fiscalYear", "materialType", "proposedQty", 
                            "recommendedQty", "pageRef", "explanation", "justification"
                        ]
                        if not all(field in item for field in required_fields):
                            results["validation_warning"] = "Questioned materials missing required fields"
                        
                        # Validate explanations
                        if not item.get("explanation") or not item.get("justification"):
                            results["validation_warning"] = "Questioned materials must include explanations and justifications"
            
            # Validate technical acceptability justification
            if "materialsTechnicalAcceptability" in results["responses"]:
                acceptability = results["responses"]["materialsTechnicalAcceptability"]
                if not acceptability.value and not acceptability.justification:
                    results["validation_warning"] = "Justification required for technically unacceptable materials"
                    
        except Exception as e:
            self.logger.warning(f"Validation warning in materials section: {str(e)}")
            results["validation_warning"] = str(e)

    def _evaluate_travel_section(self, section_config: Dict, proposal_text: str) -> Dict:
        """
        Specialized handling for travel section evaluation
        
        Args:
            section_config: Configuration for the travel section from schema
            proposal_text: The relevant proposal text
            
        Returns:
            Dict containing evaluation results for the travel section
        """
        self.logger.info("Evaluating travel section")
        
        results = {
            "sectionId": section_config.get("id", "travelSection"),
            "title": section_config.get("title", "C. TRAVEL"),
            "responses": {}
        }
        
        try:
            # Evaluate travel purpose
            purpose_result = self.evaluate_question(
                next(q for q in section_config["questions"] if q["id"] == "travelPurpose"),
                proposal_text
            )
            results["responses"]["travelPurpose"] = purpose_result
            
            # Evaluate travel acceptability
            acceptability_result = self._evaluate_travel_acceptability(
                next(q for q in section_config["questions"] if q["id"] == "travelAcceptability"),
                proposal_text
            )
            results["responses"]["travelAcceptability"] = acceptability_result
            
            # If travel is not acceptable, evaluate questioned travel
            if not acceptability_result.value:
                questioned_result = self._evaluate_questioned_travel(
                    next(q for q in section_config["questions"] if q["id"] == "questionedTravel"),
                    proposal_text
                )
                results["responses"]["questionedTravel"] = questioned_result
            else:
                results["responses"]["questionedTravel"] = EvaluationResult(
                    value=[],
                    confidence="High",
                    source_location=None,
                    analysis="No questioned travel as all travel elements are technically acceptable",
                    questioned_items=None,
                    justification=None
                )
            
            self._validate_travel_section(results)
            self.logger.info("Successfully evaluated travel section")
            
        except Exception as e:
            self.logger.error(f"Error in travel evaluation: {str(e)}")
            results["error"] = str(e)
            
        return results

    def _evaluate_travel_acceptability(self, config: Dict, proposal_text: str) -> EvaluationResult:
        """
        Evaluates the technical acceptability of proposed travel
        
        Args:
            config: Question configuration for travel acceptability
            proposal_text: The relevant proposal text
            
        Returns:
            EvaluationResult for travel acceptability
        """
        prompt = """
        Analyze the following proposal text and provide a JSON response evaluating travel technical acceptability.
        
        Consider:
        1. Number of trips justification
        2. Trip duration justification
        3. Number of travelers justification
        4. Travel locations and purposes
        5. Alignment with project requirements
        
        Required JSON format:
        {
            "value": true/false,
            "confidence": "High/Medium/Low",
            "sourceLocation": "string",
            "analysis": "detailed analysis of travel requirements",
            "justification": "brief technical justification",
            "evaluationPoints": {
                "trips": "analysis of number of trips",
                "duration": "analysis of trip durations",
                "travelers": "analysis of number of travelers"
            }
        }
        """
        
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are evaluating travel requirements for technical acceptability."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            travel_data = json.loads(response.choices[0].message.content)
            
            return EvaluationResult(
                value=travel_data.get("value", False),
                confidence=travel_data.get("confidence", "Low"),
                source_location=travel_data.get("sourceLocation"),
                analysis=travel_data.get("analysis"),
                questioned_items=None,
                justification=travel_data.get("justification")
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating travel acceptability: {str(e)}")
            raise

    def _evaluate_questioned_travel(self, config: Dict, proposal_text: str) -> EvaluationResult:
        """
        Evaluates specific travel elements being questioned
        
        Args:
            config: Question configuration for questioned travel
            proposal_text: The relevant proposal text
            
        Returns:
            EvaluationResult containing questioned travel details
        """
        prompt = """
        Analyze the following proposal text and provide details about questioned travel elements.
        
        For each questioned travel element, provide:
        1. Fiscal year
        2. Destination
        3. Number of trips (proposed vs recommended)
        4. Number of days (proposed vs recommended)
        5. Number of travelers (proposed vs recommended)
        6. Proposal page reference
        7. Explanation for questioning
        8. Justification for recommendations
        
        Required JSON format:
        {
            "questionedItems": [
                {
                    "fiscalYear": "string",
                    "destination": "string",
                    "proposedTrips": number,
                    "recommendedTrips": number,
                    "proposedDays": number,
                    "recommendedDays": number,
                    "proposedTravelers": number,
                    "recommendedTravelers": number,
                    "pageRef": "string",
                    "explanation": "string",
                    "justification": "string"
                }
            ],
            "confidence": "High/Medium/Low",
            "sourceLocation": "string",
            "analysis": "string"
        }
        """
        
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are identifying and analyzing questioned travel elements."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            questioned_data = json.loads(response.choices[0].message.content)
            
            return EvaluationResult(
                value=questioned_data.get("questionedItems", []),
                confidence=questioned_data.get("confidence", "Low"),
                source_location=questioned_data.get("sourceLocation"),
                analysis=questioned_data.get("analysis"),
                questioned_items=questioned_data.get("questionedItems"),
                justification=None
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating questioned travel: {str(e)}")
            raise

    def _validate_travel_section(self, results: Dict) -> None:
        """
        Validates the travel section results
        
        Args:
            results: The travel section evaluation results to validate
        """
        try:
            # Validate questioned travel data if present
            if "questionedTravel" in results["responses"]:
                questioned_items = results["responses"]["questionedTravel"].value
                if isinstance(questioned_items, list):
                    for item in questioned_items:
                        # Validate trip numbers
                        if item.get("recommendedTrips", 0) > item.get("proposedTrips", 0):
                            results["validation_warning"] = "Recommended trips cannot exceed proposed trips without justification"
                            
                        # Validate days
                        if item.get("recommendedDays", 0) > item.get("proposedDays", 0):
                            results["validation_warning"] = "Recommended days cannot exceed proposed days without justification"
                            
                        # Validate travelers
                        if item.get("recommendedTravelers", 0) > item.get("proposedTravelers", 0):
                            results["validation_warning"] = "Recommended travelers cannot exceed proposed travelers without justification"
                            
                        # Ensure all required fields are present
                        required_fields = [
                            "fiscalYear", "destination", "proposedTrips", "recommendedTrips",
                            "proposedDays", "recommendedDays", "proposedTravelers",
                            "recommendedTravelers", "pageRef"
                        ]
                        if not all(field in item for field in required_fields):
                            results["validation_warning"] = "Questioned travel items missing required fields"
                            
                # Validate explanations for questioned items
                if questioned_items and not any(
                    item.get("explanation") and item.get("justification")
                    for item in questioned_items
                ):
                    results["validation_warning"] = "Questioned travel items must include explanations and justifications"
                    
            # Validate travel purpose
            if "travelPurpose" in results["responses"]:
                purpose = results["responses"]["travelPurpose"].value
                if not purpose or len(str(purpose).strip()) < 10:
                    results["validation_warning"] = "Travel purpose must be adequately detailed"
                    
        except Exception as e:
            self.logger.warning(f"Validation warning in travel section: {str(e)}")
            results["validation_warning"] = str(e)
    
    def _evaluate_supporting_information(self, section_config: Dict, proposal_text: str) -> Dict:
        """
        Specialized handling for supporting information section
        """
        self.logger.info("Evaluating supporting information section")
        
        results = {
            "sectionId": section_config["id"],
            "title": section_config["title"],
            "responses": {}
        }
        
        try:
            # Process references
            references_config = next(q for q in section_config["questions"] if q["id"] == "references")
            references_result = self._evaluate_references(references_config, proposal_text)
            results["responses"]["references"] = references_result
            
            # Process standard attachments
            std_attachments_config = next(q for q in section_config["questions"] if q["id"] == "standardAttachments")
            std_attachments_result = self._evaluate_standard_attachments(std_attachments_config, proposal_text)
            results["responses"]["standardAttachments"] = std_attachments_result
            
            # Process other attachments
            other_attachments_config = next(q for q in section_config["questions"] if q["id"] == "otherAttachments")
            other_attachments_result = self._evaluate_other_attachments(other_attachments_config, proposal_text)
            results["responses"]["otherAttachments"] = other_attachments_result
            
            # Validate overall section
            self._validate_supporting_information(results)
            
        except Exception as e:
            self.logger.error(f"Error in supporting information evaluation: {str(e)}")
            results["error"] = str(e)
        
        return results

    def _evaluate_odc_section(self, section_config: Dict, proposal_text: str) -> Dict:
        """
        Specialized handling for Other Direct Costs (ODC) section evaluation
        
        Args:
            section_config: Configuration for the ODC section from schema
            proposal_text: The relevant proposal text
            
        Returns:
            Dict containing evaluation results for the ODC section
        """
        self.logger.info("Evaluating ODC section")
        
        results = {
            "sectionId": section_config.get("id", "odcSection"),
            "title": section_config.get("title", "D. OTHER DIRECT COSTS (ODC)"),
            "responses": {}
        }
        
        try:
            # Evaluate ODC list
            odc_list_result = self._evaluate_odc_list(
                next(q for q in section_config["questions"] if q["id"] == "odcList"),
                proposal_text
            )
            results["responses"]["odcList"] = odc_list_result
            
            # Evaluate ODC acceptability
            acceptability_result = self._evaluate_odc_acceptability(
                next(q for q in section_config["questions"] if q["id"] == "odcAcceptability"),
                proposal_text,
                odc_list_result.value  # Pass the ODC list for context
            )
            results["responses"]["odcAcceptability"] = acceptability_result
            
            # If ODCs are not acceptable, evaluate questioned ODCs
            if not acceptability_result.value:
                questioned_result = self._evaluate_questioned_odcs(
                    next(q for q in section_config["questions"] if q["id"] == "questionedODCs"),
                    proposal_text,
                    odc_list_result.value
                )
                results["responses"]["questionedODCs"] = questioned_result
            else:
                results["responses"]["questionedODCs"] = EvaluationResult(
                    value=[],
                    confidence="High",
                    source_location=None,
                    analysis="No questioned ODCs as all ODCs are technically acceptable",
                    questioned_items=None,
                    justification=None
                )
            
            self._validate_odc_section(results)
            self.logger.info("Successfully evaluated ODC section")
            
        except Exception as e:
            self.logger.error(f"Error in ODC evaluation: {str(e)}")
            results["error"] = str(e)
            
        return results

    def _evaluate_odc_list(self, config: Dict, proposal_text: str) -> EvaluationResult:
        """
        Evaluates and extracts the list of ODCs from the proposal
        
        Args:
            config: Question configuration for ODC list
            proposal_text: The relevant proposal text
            
        Returns:
            EvaluationResult containing the list of ODCs
        """
        prompt = """
        Analyze the following proposal text and identify all Other Direct Costs (ODCs).
        
        Consider:
        1. Equipment purchases or rentals
        2. Software licenses
        3. Training materials
        4. Facility costs
        5. Special tooling or test equipment
        6. Any other direct costs not covered under labor, materials, or travel
        7. Quantity proposed are not dollars but actual quantities of the materials proposed in the sole source response
        8. Quantity recommended are not dollars but actual quantities of the materials that the evaluator recommends should recommended if the proposed quantity is not acceptable
        9. proposedOdc are not dollars or quantities, they are the name/type of ODC proposed in the sole source response
        10. recommendedOdc are not dollars or quantities, they are the name/type of ODC that the evaluator recommends should be recommended if the proposed ODC is not acceptable

        Required JSON format:
        {
            "odcItems": [
                {
                    "fiscalYear": "string",
                    "odcType": "string",
                    "proposedOdc": "string",
                    "recommendedOdc": "string",
                    "proposedQuantity": "string",
                    "recommendedQuantity": "string",
                    "pageRef": "string",
                    "explanation": "string",
                    "justification": "string"
                }
            ],
            "confidence": "High/Medium/Low",
            "sourceLocation": "string",
            "analysis": "detailed analysis of ODC requirements"
        }
        """
        
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are identifying and categorizing Other Direct Costs from a proposal."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            odc_data = json.loads(response.choices[0].message.content)
            
            return EvaluationResult(
                value=odc_data.get("odcItems", []),
                confidence=odc_data.get("confidence", "Low"),
                source_location=odc_data.get("sourceLocation"),
                analysis=odc_data.get("analysis"),
                questioned_items=None,
                justification=None
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating ODC list: {str(e)}")
            raise

    def _evaluate_odc_acceptability(self, config: Dict, proposal_text: str, odc_list: List) -> EvaluationResult:
        """
        Evaluates the technical acceptability of proposed ODCs
        
        Args:
            config: Question configuration for ODC acceptability
            proposal_text: The relevant proposal text
            odc_list: List of identified ODCs for context
            
        Returns:
            EvaluationResult for ODC acceptability
        """
        prompt = f"""
        Analyze the following proposal text and evaluate the technical acceptability of the proposed ODCs.
        
        ODCs to evaluate:
        {json.dumps(odc_list, indent=2)}
        
        Consider:
        1. Necessity for project execution
        2. Appropriate quantities
        3. Technical specifications
        4. Alignment with project requirements
        5. Cost-effectiveness compared to alternatives
        
        Required JSON format:
        {{
            "value": true/false,
            "confidence": "High/Medium/Low",
            "sourceLocation": "string",
            "analysis": "detailed analysis of ODC acceptability",
            "justification": "brief technical justification",
            "evaluationPoints": {{
                "necessity": "analysis of ODC necessity",
                "quantities": "analysis of quantities",
                "specifications": "analysis of technical specifications"
            }}
        }}
        """
        
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are evaluating ODCs for technical acceptability."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            acceptability_data = json.loads(response.choices[0].message.content)
            
            return EvaluationResult(
                value=acceptability_data.get("value", False),
                confidence=acceptability_data.get("confidence", "Low"),
                source_location=acceptability_data.get("sourceLocation"),
                analysis=acceptability_data.get("analysis"),
                questioned_items=None,
                justification=acceptability_data.get("justification")
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating ODC acceptability: {str(e)}")
            raise

    def _evaluate_questioned_odcs(self, config: Dict, proposal_text: str, odc_list: List) -> EvaluationResult:
        """
        Evaluates specific ODCs being questioned
        
        Args:
            config: Question configuration for questioned ODCs
            proposal_text: The relevant proposal text
            odc_list: List of identified ODCs for context
            
        Returns:
            EvaluationResult containing questioned ODC details
        """
        prompt = f"""
        Analyze the following proposal text and provide details about questioned ODCs.
        
        ODCs under review:
        {json.dumps(odc_list, indent=2)}
        
        For each questioned ODC, provide:
        1. Fiscal year
        2. Type of ODC
        3. proposedOdc are not dollars or quantities, they are the name/type of ODC proposed in the sole source response
        4. recommendedOdc are not dollars or quantities, they are the name/type of ODC that the evaluator recommends should be recommended if the proposed ODC is not acceptable
        3. Quantity proposed are not dollars but actual quantities of the materials proposed in the sole source response
        4. Quantity recommended are not dollars but actual quantities of the materials that the evaluator recommends should recommended if the proposed quantity is not acceptable
        5. Proposal page reference
        6. Explanation for questioning
        7. Justification for recommendations
        
        Required JSON format:
        {{
            "questionedItems": [
                {{
                    "fiscalYear": "string",
                    "odcType": "string",
                    "proposedOdc": "string",
                    "recommendedOdc": "string",
                    "proposedQuantity": "string",
                    "recommendedQuantity": "string",
                    "pageRef": "string",
                    "explanation": "string",
                    "justification": "string"
                }}
            ],
            "confidence": "High/Medium/Low",
            "sourceLocation": "string",
            "analysis": "string"
        }}
        """
        
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are identifying and analyzing questioned ODCs."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            questioned_data = json.loads(response.choices[0].message.content)
            
            return EvaluationResult(
                value=questioned_data.get("questionedItems", []),
                confidence=questioned_data.get("confidence", "Low"),
                source_location=questioned_data.get("sourceLocation"),
                analysis=questioned_data.get("analysis"),
                questioned_items=questioned_data.get("questionedItems"),
                justification=None
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating questioned ODCs: {str(e)}")
            raise

    def _validate_odc_section(self, results: Dict) -> None:
        """
        Validates the ODC section results
        
        Args:
            results: The ODC section evaluation results to validate
        """
        try:
            # Validate ODC list
            if "odcList" in results["responses"]:
                odc_items = results["responses"]["odcList"].value
                if not odc_items:
                    results["validation_warning"] = "No ODCs identified in proposal"
                
                # Check for required fields in ODC items
                for item in odc_items:
                    if not all(key in item for key in ["type", "description", "purpose"]):
                        results["validation_warning"] = "ODC items missing required fields"
            
            # Validate questioned ODCs if present
            if "questionedODCs" in results["responses"]:
                questioned_items = results["responses"]["questionedODCs"].value
                if isinstance(questioned_items, list):
                    for item in questioned_items:
                        # Validate quantities
                        # if item.get("recommendedQuantity", 0) > item.get("proposedQuantity", 0):
                        #     results["validation_warning"] = "Recommended quantity cannot exceed proposed quantity without justification"
                        
                        # Ensure all required fields are present
                        required_fields = [
                            "fiscalYear", "odcType", "proposedQuantity",
                            "recommendedQuantity", "pageRef", "explanation", "justification"
                        ]
                        if not all(field in item for field in required_fields):
                            results["validation_warning"] = "Questioned ODC items missing required fields"
                        
                        # Validate quantities are positive
                        # if item.get("proposedQuantity", 0) <= 0 or item.get("recommendedQuantity", 0) <= 0:
                        #     results["validation_warning"] = "ODC quantities must be greater than zero"
            
            # Validate acceptability justification
            if "odcAcceptability" in results["responses"]:
                if not results["responses"]["odcAcceptability"].value:
                    if not results["responses"]["odcAcceptability"].justification:
                        results["validation_warning"] = "Justification required for unacceptable ODCs"
                        
        except Exception as e:
            self.logger.warning(f"Validation warning in ODC section: {str(e)}")
            results["validation_warning"] = str(e)

    def _evaluate_references(self, config: Dict, proposal_text: str) -> EvaluationResult:
        """
        Evaluates references from the proposal
        """
        prompt = """
        Analyze the proposal text and provide a JSON response listing all referenced documents.
        
        Consider documents such as:
        - Initial contractor proposal
        - Proposal revisions
        - Independent Government Cost Estimate (IGCE)
        - Technical specifications
        - Standards referenced
        - Past performance documents
        
        Required JSON format:
        {
            "references": [
                {
                    "documentTitle": "string",
                    "date": "MM-dd-yyyy",
                    "description": "string"
                }
            ],
            "confidence": "High/Medium/Low",
            "sourceLocations": "string",
            "analysis": "string"
        }
        """
        
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are analyzing proposal documents for technical evaluation. Provide response in JSON format."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            references = json.loads(response.choices[0].message.content)
            
            return EvaluationResult(
                value=references.get("references", []),
                confidence=references.get("confidence", "Low"),
                source_location=references.get("sourceLocations"),
                analysis=references.get("analysis"),
                questioned_items=None,
                justification=None
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating references: {str(e)}")
            raise

    def _evaluate_standard_attachments(self, config: Dict, proposal_text: str) -> EvaluationResult:
        """
        Evaluates which standard attachments are required based on proposal content
        """
        prompt = """
        Analyze the proposal text and provide a JSON response indicating required attachments.
        
        Consider requirements for:
        - Security classification (DD Form 254)
        - Government furnished equipment
        - COR/TPOC requirements
        - Deliverables (CDRL)
        - Funding structure
        
        Required JSON format:
        {
            "requiredAttachments": ["string"],
            "confidence": "High/Medium/Low",
            "sourceLocations": "string",
            "analysis": "string",
            "justification": "string"
        }
        """
        
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are analyzing proposal requirements for necessary attachments. Provide response in JSON format."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            attachments = json.loads(response.choices[0].message.content)
            
            return EvaluationResult(
                value=attachments.get("requiredAttachments", []),
                confidence=attachments.get("confidence", "Low"),
                source_location=attachments.get("sourceLocations"),
                analysis=attachments.get("analysis"),
                questioned_items=None,
                justification=attachments.get("justification")
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating standard attachments: {str(e)}")
            raise

    def _evaluate_other_attachments(self, config: Dict, proposal_text: str) -> EvaluationResult:
        """
        Evaluates additional attachments that might be needed
        """
        prompt = """
        Analyze the proposal text and provide a JSON response identifying additional attachments needed.
        
        Consider:
        - Technical specifications
        - Test results
        - Certification documents
        - Supporting analysis
        - Additional technical documentation
        
        Required JSON format:
        {
            "additionalAttachments": [
                {
                    "title": "string",
                    "description": "string"
                }
            ],
            "confidence": "High/Medium/Low",
            "sourceLocations": "string",
            "analysis": "string",
            "justification": "string"
        }
        """
        
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are identifying additional documentation needs for technical evaluation. Provide response in JSON format."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            other_attachments = json.loads(response.choices[0].message.content)
            
            return EvaluationResult(
                value=other_attachments.get("additionalAttachments", []),
                confidence=other_attachments.get("confidence", "Low"),
                source_location=other_attachments.get("sourceLocations"),
                analysis=other_attachments.get("analysis"),
                questioned_items=None,
                justification=other_attachments.get("justification")
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating other attachments: {str(e)}")
            raise

    def _validate_supporting_information(self, results: Dict) -> None:
        """
        Validates the supporting information section results
        """
        try:
            references = results["responses"]["references"].value
            std_attachments = results["responses"]["standardAttachments"].value
            other_attachments = results["responses"]["otherAttachments"].value
            
            if not (references or std_attachments or other_attachments):
                results["validation_warning"] = "At least one reference or attachment should be provided"
                
            # Validate references
            if references:
                for ref in references:
                    if not all(key in ref for key in ["documentTitle", "date", "description"]):
                        results["validation_warning"] = "Some references are missing required fields"
                        break
                        
            # Validate dates in references
            for ref in references:
                if "date" in ref:
                    try:
                        date = datetime.strptime(ref["date"], "%m-%d-%Y")
                        if date > datetime.now():
                            results["validation_warning"] = "Reference dates cannot be in the future"
                    except ValueError:
                        results["validation_warning"] = "Invalid date format in references"
                        
        except Exception as e:
            self.logger.warning(f"Validation warning in supporting information: {str(e)}")
            results["validation_warning"] = str(e)

    def _build_evaluation_prompt(self, question_config: Dict, proposal_text: str) -> str:
        """
        Builds a specific prompt based on question type and configuration
        """
        base_prompt = f"""
        Analyze the following proposal text and provide a JSON response for technical evaluation.
        Keep the 'value' field concise and suitable for direct form input - use only the specific data requested.
        Include detailed analysis and context in the 'analysis' field instead.
        
        Question: {question_config['query']}
        Response Type: {question_config['responseType']}
        
        Proposal Text:
        {proposal_text}
        
        Evaluation Guidelines:
        1. The 'value' field should contain ONLY the specific data requested, not full sentences
        2. Put any explanation, context, or analysis in the 'analysis' field
        3. Provide specific evidence from the proposal to support your evaluation
        4. Follow federal acquisition guidelines
        """

        if question_config["id"] in ["proposedHours", "recommendedHours"]:
            base_prompt += """
            For labor hours evaluation:
            1. Look for explicit mentions of total labor hours
            2. Consider all labor categories and their individual hours
            3. Verify against project timeline and deliverables
            4. Ensure the number returned is the total hours, not per category
            5. Include source location and justification for the hours determination
            
            Response format:
            {
                "value": number,
                "confidence": "High/Medium/Low",
                "sourceLocation": "specific section reference",
                "analysis": "detailed explanation of how hours were determined",
                "justification": "technical basis for the hours determination"
            }
            """

        # Handle date type specifically
        if question_config["responseType"] == "date":
            base_prompt += """
            Provide your response in the following JSON format:
            {
                "value": "MM-dd-yyyy",
                "confidence": "High/Medium/Low",
                "sourceLocation": "Reference to relevant proposal sections",
                "analysis": "Context about the date"
            }
            
            Example:
            {
                "value": "10-15-2024",
                "confidence": "High",
                "sourceLocation": "Section 2.1",
                "analysis": "The response date is clearly stated in the document header"
            }
            """
        
        if question_config["responseType"] == "acceptability":
            base_prompt += """
            Provide your response in the following JSON format:
            {
                "status": "Acceptable" or "Not Acceptable",
                "confidence": "High/Medium/Low",
                "justification": "Brief technical justification",
                "questionedItems": [] (if not acceptable),
                "sourceLocation": "Reference to relevant proposal sections",
                "analysis": "Detailed technical analysis and context"
            }
            """
        elif question_config["responseType"] == "object":
            base_prompt += f"""
            Provide your response in the following JSON format:
            {{
                "value": {{
                    {', '.join(f'"{field["id"]}": "specific value only"' for field in question_config.get('subfields', []))}
                }},
                "confidence": "High/Medium/Low",
                "sourceLocation": "Reference to relevant proposal sections",
                "analysis": "Detailed context and explanation"
            }}
            
            Example:
            {{
                "value": {{
                    "name": "John Smith",
                    "code": "ABC123",
                    "telephone": "555-0123"
                }},
                "confidence": "High",
                "sourceLocation": "Section 2.1",
                "analysis": "Detailed explanation of the POC's role and qualifications..."
            }}
            """
        elif question_config["responseType"] == "text":
            base_prompt += """
            Provide your response in the following JSON format:
            {
                "value": "specific data only, no full sentences",
                "confidence": "High/Medium/Low",
                "sourceLocation": "Reference to relevant proposal sections",
                "analysis": "Detailed context and explanation"
            }
            
            Example for a contract number:
            {
                "value": "N00014-22-C-1234",
                "confidence": "High",
                "sourceLocation": "Page 1, Header",
                "analysis": "The contract number is clearly stated in the header and follows the standard format for Navy contracts..."
            }
            """
        
        if question_config.get("aiEvaluation"):
            base_prompt += f"\nSpecific Evaluation Criteria:\n"
            for criterion in question_config["aiEvaluation"].get("evaluationPoints", []):
                base_prompt += f"- {criterion}\n"
        
        base_prompt += "\nIMPORTANT: Keep 'value' fields concise and directly usable in a form - save all explanation and context for the 'analysis' field."
        
        return base_prompt
    
    def _evaluate_recommendation_section(self, section_config: Dict, proposal_text: str) -> Dict:
        """
        Specialized handling for recommendation section
        """
        self.logger.info("Evaluating recommendation section")
        
        results = {
            "sectionId": section_config["id"],
            "title": section_config["title"],
            "responses": {}
        }
        
        try:
            # Evaluate areas to negotiate
            areas_result = self._evaluate_negotiation_areas(
                next(q for q in section_config["questions"] if q["id"] == "areasToNegotiate"),
                proposal_text
            )
            results["responses"]["areasToNegotiate"] = areas_result
            
            # Evaluate additional comments
            comments_result = self._evaluate_additional_comments(
                next(q for q in section_config["questions"] if q["id"] == "additionalComments"),
                proposal_text,
                areas_result.value  # Pass negotiation areas for context
            )
            results["responses"]["additionalComments"] = comments_result
            
            # Evaluate preparer information
            preparer_result = self._evaluate_preparer_info(
                next(q for q in section_config["questions"] if q["id"] == "preparer"),
                proposal_text
            )
            results["responses"]["preparer"] = preparer_result
            
            # Handle signature (placeholder until actual signature system integration)
            signature_config = next(q for q in section_config["questions"] if q["id"] == "signature")
            results["responses"]["signature"] = EvaluationResult(
                value={
                    "signatureData": "[Placeholder for Digital Signature]",
                    "signatureId": f"SIG-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "signatureDate": datetime.now().strftime("%m-%d-%Y %H:%M:%S")
                },
                confidence="High",
                source_location=None,
                analysis="Digital signature to be captured through system",
                questioned_items=None,
                justification=None
            )
            
            # Set completion date
            results["responses"]["date"] = EvaluationResult(
                value=datetime.now().strftime("%m-%d-%Y"),
                confidence="High",
                source_location=None,
                analysis="Evaluation completion date",
                questioned_items=None,
                justification=None
            )
            
            # Validate entire recommendation section
            self._validate_recommendation_section(results)
            
        except Exception as e:
            self.logger.error(f"Error in recommendation evaluation: {str(e)}")
            results["error"] = str(e)
        
        return results

    def _evaluate_negotiation_areas(self, config: Dict, proposal_text: str) -> EvaluationResult:
        """
        Evaluates areas recommended for negotiation based on previous findings
        """
        prompt = """
        Analyze the following proposal text and provide a JSON response containing recommended negotiation areas.
        
        Consider:
        1. Identify specific areas requiring negotiation
        2. Consider standard categories: Labor Hours, Labor Categories, Material Types/Quantities, Travel, ODCs
        3. Identify any additional/custom areas needing negotiation
        4. Provide justification for each recommended negotiation area
        
        Required JSON format:
        {
            "negotiationAreas": [],
            "confidence": "High/Medium/Low",
            "sourceLocations": [],
            "analysis": "string",
            "justification": "string"
        }
        """
        
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are finalizing a technical evaluation and identifying areas for negotiation. Provide response in JSON format."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            negotiation_data = json.loads(response.choices[0].message.content)
            
            return EvaluationResult(
                value=negotiation_data.get("negotiationAreas", []),
                confidence=negotiation_data.get("confidence", "Low"),
                source_location=negotiation_data.get("sourceLocations"),
                analysis=negotiation_data.get("analysis"),
                questioned_items=None,
                justification=negotiation_data.get("justification")
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating negotiation areas: {str(e)}")
            raise

    def _evaluate_additional_comments(self, config: Dict, proposal_text: str, negotiation_areas: List) -> EvaluationResult:
        """
        Generates additional comments considering negotiation areas
        """
        prompt = f"""
        Analyze the following proposal text and provide a JSON response containing evaluation comments.
        
        Include:
        1. Overall technical assessment
        2. Key strengths and weaknesses
        3. Risk considerations
        4. Implementation concerns
        5. Address these negotiation areas: {negotiation_areas}
        
        Required JSON format:
        {{
            "comments": "string",
            "confidence": "High/Medium/Low",
            "sourceLocations": [],
            "analysis": "string"
        }}
        """
        
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are providing final technical evaluation comments. Provide response in JSON format."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            comments_data = json.loads(response.choices[0].message.content)
            
            return EvaluationResult(
                value=comments_data.get("comments", ""),
                confidence=comments_data.get("confidence", "Low"),
                source_location=comments_data.get("sourceLocations"),
                analysis=comments_data.get("analysis"),
                questioned_items=None,
                justification=None
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating additional comments: {str(e)}")
            raise

    def _evaluate_preparer_info(self, config: Dict, proposal_text: str) -> EvaluationResult:
        """
        Evaluates and validates preparer information
        """
        prompt = """
        Extract the technical evaluator's information from the proposal text and provide in JSON format.
        
        Required JSON format:
        {
            "name": "string",
            "title": "string",
            "extension": "string",
            "confidence": "High/Medium/Low",
            "sourceLocation": "string",
            "analysis": "string"
        }
        """
        
        try:
            response = openai.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are identifying the technical evaluator's information. Provide response in JSON format."},
                    {"role": "user", "content": f"{prompt}\n\nProposal Text:\n{proposal_text}"}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            preparer_data = json.loads(response.choices[0].message.content)
            
            # Validate phone extension format
            extension = preparer_data.get("extension", "")
            if not re.match(r"^[0-9-x]+$", extension):
                self.logger.warning("Invalid phone extension format")
                preparer_data["extension"] = ""
            
            return EvaluationResult(
                value={
                    "name": preparer_data.get("name", ""),
                    "title": preparer_data.get("title", ""),
                    "extension": preparer_data.get("extension", "")
                },
                confidence=preparer_data.get("confidence", "Low"),
                source_location=preparer_data.get("sourceLocation"),
                analysis=preparer_data.get("analysis"),
                questioned_items=None,
                justification=None
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating preparer information: {str(e)}")
            raise

    def _validate_recommendation_section(self, results: Dict) -> None:
        """
        Validates the recommendation section results
        """
        try:
            # Validate completion date
            if "date" in results["responses"]:
                completion_date = datetime.strptime(results["responses"]["date"].value, "%m-%d-%Y")
                if completion_date > datetime.now():
                    results["validation_warning"] = "Completion date cannot be in the future"
            
            # Validate signature date matches completion date
            if "signature" in results["responses"] and "date" in results["responses"]:
                signature_date = datetime.strptime(
                    results["responses"]["signature"].value["signatureDate"].split()[0],
                    "%m-%d-%Y"
                )
                if signature_date.date() != completion_date.date():
                    results["validation_warning"] = "Signature date must match completion date"
            
            # Validate negotiation areas and comments alignment
            if "areasToNegotiate" in results["responses"] and "additionalComments" in results["responses"]:
                negotiation_areas = results["responses"]["areasToNegotiate"].value
                additional_comments = results["responses"]["additionalComments"].value
                
                if isinstance(additional_comments, str) and isinstance(negotiation_areas, list):
                    additional_comments_lower = additional_comments.lower()
                    if negotiation_areas and not any(
                        str(area).lower() in additional_comments_lower 
                        for area in negotiation_areas
                    ):
                        results["validation_warning"] = "Additional comments should address recommended negotiation areas"
            
            # Validate preparer information
            if "preparer" in results["responses"]:
                preparer = results["responses"]["preparer"].value
                if isinstance(preparer, dict):
                    if not all([
                        preparer.get("name"), 
                        preparer.get("title"), 
                        preparer.get("extension")
                    ]):
                        results["validation_warning"] = "All preparer information fields must be completed"
            
        except Exception as e:
            self.logger.warning(f"Validation warning in recommendation section: {str(e)}")
            results["validation_warning"] = str(e)

    def _parse_evaluation_response(self, response_text: str, question_config: Dict) -> EvaluationResult:
        """
        Parses and validates the AI response into structured evaluation result
        """
        try:
            response_data = json.loads(response_text)
            
            # Basic validation
            if not isinstance(response_data, dict):
                raise ValueError("Response must be a JSON object")
                
            # Create EvaluationResult based on response type
            if question_config["responseType"] == "acceptability":
                return EvaluationResult(
                    value=response_data.get("status") == "Acceptable",
                    confidence=response_data.get("confidence", "Low"),
                    source_location=response_data.get("sourceLocation"),
                    analysis=response_data.get("analysis"),
                    questioned_items=response_data.get("questionedItems"),
                    justification=response_data.get("justification")
                )
            elif question_config["responseType"] == "table":
                return EvaluationResult(
                    value=response_data.get("rows", []),
                    confidence="High" if response_data.get("rows") else "Low",
                    source_location=response_data.get("sourceLocation"),
                    analysis=response_data.get("explanation"),
                    questioned_items=None,
                    justification=None
                )
            elif question_config["responseType"] == "object" and "subfields" in question_config:
                # Handle object types (like laborHoursSummary)
                return EvaluationResult(
                    value=response_data.get("value", {}),  # Keep the object structure
                    confidence=response_data.get("confidence", "Low"),
                    source_location=response_data.get("sourceLocation"),
                    analysis=response_data.get("analysis"),
                    questioned_items=None,
                    justification=None
                )
            else:
                return EvaluationResult(
                    value=response_data.get("value"),
                    confidence=response_data.get("confidence", "Low"),
                    source_location=response_data.get("sourceLocation"),
                    analysis=response_data.get("analysis"),
                    questioned_items=None,
                    justification=None
                )
                
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse AI response: {str(e)}")
            return EvaluationResult(
                value="",
                confidence="Low",
                source_location="",
                analysis=f"Error parsing JSON: {str(e)}",
                questioned_items=None,
                justification=None
            )
        except KeyError as e:
            self.logger.error(f"Missing required field in response: {str(e)}")
            return EvaluationResult(
                value="",
                confidence="Low",
                source_location="",
                analysis=f"Missing required field: {str(e)}",
                questioned_items=None,
                justification=None
            )
        except Exception as e:
            logging.error(f"Failed to parse response: {str(e)}")
            return EvaluationResult(
                value="",
                confidence="Low",
                source_location="",
                analysis=f"Error: {str(e)}",
                questioned_items=None,
                justification=None
            )

# def evaluate_technical_proposal(schema: Dict, proposal_text: str, model_name: str = model_name) -> Dict:
#     """
#     Enhanced main evaluation function with improved section handling
#     """
#     evaluator = TechnicalEvaluator(model_name)
#     results = {
#         "metadata": {
#             "evaluationDate": datetime.now().isoformat(),
#             "schemaVersion": schema.get("metadata", {}).get("version", "1.0"),
#             "modelUsed": model_name
#         },
#         "sections": {}
#     }
    
#     evaluation_questions = schema.get("evaluationQuestions", {})
    
#     # Process each main section
#     for section_name, section_config in evaluation_questions.items():
#         logging.info(f"Processing section: {section_name}")
        
#         try:
#             if section_name == "technicalEvaluation":
#                 subsection_results = {}
#                 subsections = section_config.get("subsections", {})
                
#                 for subsec_name, subsec_config in subsections.items():
#                     logging.info(f"Processing subsection: {subsec_name}")
#                     try:
#                         subsection_results[subsec_name] = evaluator.evaluate_section(
#                             subsec_config, proposal_text
#                         )
#                     except Exception as e:
#                         logging.error(f"Failed to evaluate {subsec_name}: {str(e)}")
#                         subsection_results[subsec_name] = {
#                             "responses": {},
#                             "sectionId": subsec_config.get("id", ""),
#                             "title": subsec_config.get("title", ""),
#                             "error": str(e)
#                         }
                
#                 results["sections"][section_name] = {
#                     "sectionId": section_config.get("id", ""),
#                     "title": section_config.get("title", ""),
#                     "subsections": subsection_results,
#                     "responses": {}
#                 }
#             else:
#                 section_result = evaluator.evaluate_section(section_config, proposal_text)
#                 results["sections"][section_name] = section_result
                
#         except Exception as e:
#             logging.error(f"Failed to evaluate section {section_name}: {str(e)}")
#             results["sections"][section_name] = {
#                 "responses": {},
#                 "sectionId": section_config.get("id", ""),
#                 "title": section_config.get("title", ""),
#                 "error": str(e)
#             }
    
#     return results

def evaluate_technical_proposal(
    schema: Dict, 
    proposal_text: str, 
    model_name: str = model_name,
    project_id: str = None,
    progress_callback: callable = None
) -> Dict:
    """
    Main function to evaluate a technical proposal using the provided schema
    
    Args:
        schema: The evaluation schema
        proposal_text: The proposal text to evaluate
        model_name: The AI model to use
        project_id: Optional project ID for progress tracking
        progress_callback: Optional callback function for progress updates
    """
    evaluator = TechnicalEvaluator(model_name)
    results = {
        "metadata": {
            "evaluationDate": datetime.now().isoformat(),
            "schemaVersion": schema.get("metadata", {}).get("version", "1.0"),
            "modelUsed": model_name
        },
        "sections": {}
    }
    
    evaluation_questions = schema.get("evaluationQuestions", {})
    completed_questions = 0
    total_sections = len(evaluation_questions)
    
    # Process each main section
    for section_name, section_config in evaluation_questions.items():
        logging.info(f"Processing section: {section_name} of {total_sections}")
        
        try:
            # Special handling for technical evaluation section with subsections
            if section_name == "technicalEvaluation":
                subsection_results = {}
                
                # Get subsections (labor, materials, etc.)
                subsections = section_config.get("subsections", {})
                logging.info(f"Found subsections: {list(subsections.keys())}")  # Add logging
                
                for subsec_name, subsec_config in subsections.items():
                    logging.info(f"Processing subsection: {subsec_name}")
                    try:
                        # Add specific logging for materials section
                        if subsec_name == "materials":
                            logging.info("Processing materials section with config:")
                            logging.info(subsec_config)
                            
                        subsection_results[subsec_name] = evaluator.evaluate_section(
                            subsec_config, proposal_text
                        )
                        # Update progress after each subsection
                        completed_questions += len(subsec_config.get("questions", []))
                        if progress_callback:
                            progress_callback(subsec_name, completed_questions)
                            
                    except Exception as e:
                        logging.error(f"Failed to evaluate {subsec_name}: {str(e)}")
                        subsection_results[subsec_name] = {
                            "responses": {},
                            "sectionId": subsec_config.get("id", ""),
                            "title": subsec_config.get("title", "")
                        }
                
                # Store technical evaluation results with subsections
                results["sections"][section_name] = {
                    "sectionId": section_config.get("id", ""),
                    "title": section_config.get("title", ""),
                    "subsections": subsection_results,
                    "responses": {}
                }
                
            else:
                # Handle regular sections
                section_result = evaluator.evaluate_section(section_config, proposal_text)
                results["sections"][section_name] = section_result
                # Update progress after each main section
                completed_questions += len(section_config.get("questions", []))
                if progress_callback:
                    progress_callback(section_name, completed_questions)
                
        except Exception as e:
            logging.error(f"Failed to evaluate section {section_name}: {str(e)}")
            results["sections"][section_name] = {
                "responses": {},
                "sectionId": section_config.get("id", ""),
                "title": section_config.get("title", "")
            }
    
    # Verify materials section is present in the results
    if "technicalEvaluation" in results["sections"]:
        tech_eval = results["sections"]["technicalEvaluation"]
        if "materials" not in tech_eval.get("subsections", {}):
            logging.warning("Materials section is missing from technical evaluation")
    
    return results


def evaluate_materials_section(materials_config: Dict, proposal_text: str) -> Dict:
    """
    Specialized function for evaluating the materials section of a proposal
    
    Args:
        materials_config: The materials section configuration from schema
        proposal_text: The relevant proposal text
        
    Returns:
        Dict containing materials evaluation results
    """
    evaluator = TechnicalEvaluator()
    
    # Evaluate materials purpose
    purpose_result = evaluator.evaluate_question(
        materials_config["questions"][0],  # materialsPurpose
        proposal_text
    )
    
    # Evaluate technical acceptability
    acceptability_result = evaluator.evaluate_question(
        materials_config["questions"][1],  # materialsTechnicalAcceptability
        proposal_text
    )
    
    # If materials are not acceptable, evaluate questioned items
    questioned_materials = []
    if not acceptability_result.value:
        questioned_result = evaluator.evaluate_question(
            materials_config["questions"][2],  # questionedMaterials
            proposal_text
        )
        questioned_materials = questioned_result.value
    
    return {
        "materialsPurpose": {
            "value": purpose_result.value,
            "confidence": purpose_result.confidence,
            "analysis": purpose_result.analysis,
            "sourceLocation": purpose_result.source_location
        },
        "technicalAcceptability": {
            "acceptable": acceptability_result.value,
            "confidence": acceptability_result.confidence,
            "justification": acceptability_result.justification,
            "analysis": acceptability_result.analysis
        },
        "questionedMaterials": questioned_materials if questioned_materials else None,
        "attachments": [],  # Populated if supporting docs are provided
        "validationStatus": "complete",
        "evaluationDate": datetime.now().isoformat()
    }