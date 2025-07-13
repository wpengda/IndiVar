#!/usr/bin/env python3
"""
Personality Analysis Script
Analyzes user responses to generate personality scores for 70 dimensions using Claude API.
"""

import json
import sys
import os
from typing import Dict, List, Any
import random
from dotenv import load_dotenv
import threading
import time

# Load .env file from root directory
current_dir = os.path.dirname(os.path.abspath(__file__))
root_env_path = os.path.join(current_dir, '..', '.env')
if os.path.exists(root_env_path):
    load_dotenv(dotenv_path=root_env_path)
    print(f"Loaded .env from: {root_env_path}", file=sys.stderr)
else:
    load_dotenv()  # Try default loading
    print("Using default .env loading", file=sys.stderr)

# Add the parent directory to Python path
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Define the 70 personality dimensions
PERSONALITY_DIMENSIONS = [
    "Absorption", "Abstract thinking", "Achievement Striving", "Aesthetics", "Affability",
    "Aggression", "Altruism", "Anger", "Anxiety", "Assertive", "Attention-seeking",
    "Callous", "Courageous", "Critical", "Dependability", "Depression", "Detail Conscious",
    "Dishonest-Opportunism", "Distractibility", "Eccentricity", "Emotion-based decision making",
    "Empathy", "Envy", "Extrospection", "Fair", "Fantasy", "Forgiving", "Grandiosity",
    "Gratitude", "Hedonism", "Honesty", "Humour", "Imagination", "Impetuous", "Indecisive",
    "Inferiority", "Insecure Attachment", "Intellectual Curiosity", "Intolerance", "Introspection",
    "Manipulative", "Need for Cognition", "Need for Social Acceptance", "Novelty Seeking",
    "Orderly", "Perseverance", "Personal Disclosure", "Planful", "Positivity", "Procrastination",
    "Punitive", "Risk-aversion", "Rumination", "Self-control", "Self-Efficacy", "Self-Reliance",
    "Sensation Seeking", "Sensitivity to Criticism", "Sociability", "Social Confidence",
    "Social Dependence", "Spirituality", "Stubborn", "Suspicious", "Tolerance for Ambiguity",
    "Traditionalism", "Vengeful", "Vigour", "Warmth", "Worry"
]

DIMENSION_DEFINITIONS = {
    "Absorption": "Propensity to feel engrossed in activities",
    "Abstract thinking": "Propensity to explore and discuss abstract ideas",
    "Achievement Striving": "Propensity to be ambitious and goal-oriented",
    "Aesthetics": "Enjoyment of artistic and aesthetic activities",
    "Affability": "Propensity to get along with others",
    "Aggression": "Propensity for hostile and threatening behavior",
    "Altruism": "Propensity to enjoy helping others in an unselfish manner",
    "Anger": "Propensity to lose one's temper when frustrated",
    "Anxiety": "Propensity to feel apprehensive",
    "Assertive": "Propensity to behave in a self-assured and confident manner",
    "Attention-seeking": "Propensity to draw attention to oneself and enjoy it",
    "Callous": "Propensity to be insensitive and indifferent towards others",
    "Courageous": "Propensity to be undeterred by danger, pain, or fear",
    "Critical": "Propensity to express adverse or disapproving comments or judgments",
    "Dependability": "Propensity to act in a reliable and responsible manner",
    "Depression": "Propensity to feel extreme negative affect",
    "Detail Conscious": "Propensity to pay careful attention to details",
    "Dishonest-Opportunism": "Propensity to cheat and act dishonestly to gain an advantage",
    "Distractibility": "Propensity to be easily diverted from matters at hand",
    "Eccentricity": "Propensity to exhibit unconventional beliefs, thoughts and behaviors",
    "Emotion-based decision making": "Propensity to make decisions based on feelings rather than logical arguments",
    "Empathy": "Propensity to try to understand and vicariously experience other's problems",
    "Envy": "Propensity to feel resentful and discontented by others' wealth, qualities, or luck",
    "Extrospection": "Propensity to examine others' thoughts, feelings, motives, and behavior",
    "Fair": "Propensity to treat others equally and impartially",
    "Fantasy": "Propensity to fantasise and day dream",
    "Forgiving": "Propensity to put aside feelings of resentment",
    "Grandiosity": "Propensity to exaggerate one's importance or ability",
    "Gratitude": "Propensity to be thankful and grateful",
    "Hedonism": "Propensity to seek pleasure/fun",
    "Honesty": "Propensity to be truthful and act with integrity",
    "Humour": "Propensity to perceive or express the amusing aspects of a situation",
    "Imagination": "Propensity to generate ideas in the absence of direct sensory data",
    "Impetuous": "Propensity to act on the spur of the moment",
    "Indecisive": "Propensity to struggle to make decisions quickly and efficiently",
    "Inferiority": "Propensity to feel inadequate and incapable compared with others",
    "Insecure Attachment": "Propensity to fear and worry about being or becoming alone",
    "Intellectual Curiosity": "The desire to acquire a broad range of information",
    "Intolerance": "Propensity to reject views, beliefs, or behaviors that differ from one's own",
    "Introspection": "Propensity to examine one's thoughts, feelings, motives, and behavior",
    "Manipulative": "Propensity to try to control and influence people or situations via devious methods",
    "Need for Cognition": "Enjoyment of extensive cognitive activity",
    "Need for Social Acceptance": "Propensity to seek out positive appraisal and acceptance from others",
    "Novelty Seeking": "Propensity to seek out novel experiences",
    "Orderly": "Propensity to be neat and tidy",
    "Perseverance": "Propensity to continue with and finish a task despite obstacles",
    "Personal Disclosure": "Propensity to share personal information",
    "Planful": "Propensity to plan",
    "Positivity": "Propensity to enjoy and look forward to life",
    "Procrastination": "Propensity to postpone and delay the beginning of a task",
    "Punitive": "Propensity enforce discipline via punishment",
    "Risk-aversion": "Propensity to avoid activities or behaviors that entail danger, chance, or risk of loss",
    "Rumination": "Propensity to engage in negative repetitive thoughts",
    "Self-control": "Propensity to restrain impulses",
    "Self-Efficacy": "Propensity to hold the subjective perception that one is capable of performing",
    "Self-Reliance": "Propensity to rely on one's own resources",
    "Sensation Seeking": "The tendency to seek and enjoy thrilling and exciting activities",
    "Sensitivity to Criticism": "Propensity to respond negatively to criticism and teasing",
    "Sociability": "Propensity to enjoy the company of others",
    "Social Confidence": "Propensity to feel confident in social situations",
    "Social Dependence": "Propensity to seek out other's support during difficult times",
    "Spirituality": "Propensity to believe in supernatural or universal powers",
    "Stubborn": "Propensity to adhere to rigid opinions",
    "Suspicious": "Propensity to be apprehensive and mistrusting of others",
    "Tolerance for Ambiguity": "Propensity to be comfortable with and enjoy ambiguous, unclear or uncertain situations",
    "Traditionalism": "Propensity to oppose change and maintain tradition",
    "Vengeful": "Propensity to retaliate and seek revenge",
    "Vigour": "Propensity to exhibit physical and mental energy",
    "Warmth": "Propensity to be affectionate and kind",
    "Worry": "Propensity to feel mental distress or agitation due to concern about impending or anticipated events"
}

def clean_text_for_api(text: str) -> str:
    """Clean text to remove problematic Unicode characters and emojis."""
    import re
    
    # First, handle encoding issues
    try:
        cleaned = text.encode('utf-8', 'replace').decode('utf-8')
    except:
        cleaned = str(text)
    
    # Remove or replace emoji and special Unicode characters
    # Remove emojis and other problematic characters
    cleaned = re.sub(r'[^\w\s\.,!?;:\'\"-]', ' ', cleaned)
    
    # Replace multiple spaces with single space
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    # Strip and ensure it's clean
    cleaned = cleaned.strip()
    
    return cleaned

def generate_sample_scores() -> Dict[str, int]:
    """Generate realistic sample personality scores for demo purposes."""
    scores = {}
    for dimension in PERSONALITY_DIMENSIONS:
        # Generate scores with some variation around moderate levels
        base_score = random.randint(30, 70)
        # Add some random variation
        variation = random.randint(-15, 15)
        final_score = max(10, min(90, base_score + variation))
        scores[dimension] = final_score
    return scores

def analyze_personality_with_ai(responses: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Try to analyze personality scores using Claude API with timeout.
    """
    try:
        
        # Import with better error handling
        try:
            from Qflow.flow import QflowSystem
        except ImportError as e:
            print(f"Failed to import QflowSystem: {e}", file=sys.stderr)
            return None
        
        # Check if API key is available
        api_key = os.getenv("API_KEY")
        if not api_key:
            print("No API_KEY found in environment", file=sys.stderr)
            return None
        
        print(f"Using API key starting with: {api_key[:10]}...", file=sys.stderr)
        
        # Initialize QflowSystem to use Claude API
        qflow = QflowSystem()
        print("QflowSystem initialized successfully", file=sys.stderr)
        
        # Prepare the analysis prompt with cleaned text
        responses_text = ""
        for i, response in enumerate(responses, 1):
            # Clean text to remove problematic Unicode characters
            question_text = clean_text_for_api(response['questionText'])
            user_response = clean_text_for_api(response['userResponse'])
            
            responses_text += f"Question {i}: {question_text}\n"
            responses_text += f"User Response: {user_response}\n"
            responses_text += f"Cluster ID: {response['clusterId']}\n\n"
        
        # Create the analysis prompt
        analysis_prompt = clean_text_for_api(f"""
Based on the following personality assessment responses, please analyze and score the user on each of the 70 personality dimensions. 

IMPORTANT: Provide scores from 1-100 for each dimension, where:
- 1-20: Very Low
- 21-40: Low  
- 41-60: Moderate
- 61-80: High
- 81-100: Very High

User's Responses:
{responses_text}

Please analyze these responses and provide:
1. A score (1-100) for each of the 70 personality dimensions
2. A comprehensive personality summary (200-300 words)
3. Key strengths and areas for development

Personality Dimensions to Score:
{clean_text_for_api(', '.join(PERSONALITY_DIMENSIONS))}

Please respond in this exact JSON format:
{{
  "scores": {{
    "Absorption": 75,
    "Abstract thinking": 65,
    [... continue for all 70 dimensions]
  }},
  "summary": "Comprehensive personality analysis text here...",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "development_areas": ["Area 1", "Area 2", "Area 3"]
}}

Ensure all 70 dimensions are included in the scores object.
""")
        
        print("Sending request to Claude API...", file=sys.stderr)
        
        # Get analysis from Claude using the internal API call method
        messages = [
            {"role": "system", "content": "You are a professional personality analyst. Provide detailed, accurate personality assessments based on user responses."},
            {"role": "user", "content": analysis_prompt}
        ]
        analysis_result = qflow._make_api_call(messages, temperature=0.3)
        
        print("Received response from Claude API", file=sys.stderr)
        print(f"Response length: {len(analysis_result)} characters", file=sys.stderr)
        
        # Clean the response - remove markdown code blocks if present
        cleaned_response = analysis_result.strip()
        if cleaned_response.startswith('```json'):
            cleaned_response = cleaned_response[7:]  # Remove ```json
        if cleaned_response.startswith('```'):
            cleaned_response = cleaned_response[3:]  # Remove ```
        if cleaned_response.endswith('```'):
            cleaned_response = cleaned_response[:-3]  # Remove trailing ```
        cleaned_response = cleaned_response.strip()
        
        # Parse the JSON response
        try:
            result = json.loads(cleaned_response)
            print("Successfully parsed JSON response", file=sys.stderr)
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}", file=sys.stderr)
            print(f"Original response: {analysis_result[:500]}...", file=sys.stderr)
            print(f"Cleaned response: {cleaned_response[:500]}...", file=sys.stderr)
            return None
        
        # Validate that all dimensions are present
        missing_dimensions = []
        for dimension in PERSONALITY_DIMENSIONS:
            if dimension not in result.get('scores', {}):
                missing_dimensions.append(dimension)
        
        if missing_dimensions:
            print(f"Warning: Missing scores for dimensions: {missing_dimensions}", file=sys.stderr)
            # Fill missing dimensions with moderate scores
            for dimension in missing_dimensions:
                result['scores'][dimension] = 50
        
        # Mark as AI analysis
        result['ai_analysis'] = True
        print("AI analysis completed successfully", file=sys.stderr)
        return result
        
    except Exception as e:
        print(f"AI analysis failed with error: {e}", file=sys.stderr)
        import traceback
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
        return None

def analyze_personality(responses: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze personality scores. Try AI first, fall back to sample data.
    
    Args:
        responses: List of user responses with questions and answers
        
    Returns:
        Dict containing personality scores and analysis
    """
    
    # Try AI analysis first
    print("Attempting AI-powered personality analysis...", file=sys.stderr)
    ai_result = analyze_personality_with_ai(responses)
    if ai_result and 'scores' in ai_result:
        print("AI analysis successful!", file=sys.stderr)
        return ai_result
    
    # Fallback to sample scores if AI fails
    print("AI analysis failed, using sample personality scores", file=sys.stderr)
    
    # Generate sample scores
    sample_scores = generate_sample_scores()
    
    # Create sample analysis based on responses
    response_keywords = []
    for response in responses:
        response_keywords.extend(response['userResponse'].lower().split())
    
    # Simple keyword-based analysis for demo
    summary = f"""Based on your responses to the {len(responses)} personality assessment questions, this analysis provides insights into your character traits and behavioral tendencies. 

Your responses indicate a balanced personality profile with varied strengths across multiple dimensions. The assessment reveals patterns in how you approach challenges, interact with others, and manage your emotions and thoughts.

This analysis suggests you demonstrate thoughtful consideration in your responses, showing both self-awareness and practical thinking. Your personality profile indicates someone who values both independence and collaboration, with a healthy balance of emotional and logical decision-making.

Note: This is a demonstration analysis. AI analysis was attempted but is currently unavailable. Please check your API configuration for full AI-powered assessment."""
    
    # Generate sample strengths and development areas
    high_scores = [(dim, score) for dim, score in sample_scores.items() if score >= 70]
    low_scores = [(dim, score) for dim, score in sample_scores.items() if score <= 40]
    
    strengths = [dim.replace('_', ' ').title() for dim, _ in sorted(high_scores, key=lambda x: x[1], reverse=True)[:5]]
    if not strengths:
        strengths = ["Balanced personality profile", "Thoughtful responses", "Self-awareness"]
    
    development_areas = [dim.replace('_', ' ').title() for dim, _ in sorted(low_scores, key=lambda x: x[1])[:3]]
    if not development_areas:
        development_areas = ["Continue personal growth", "Explore new experiences", "Maintain balance"]
    
    return {
        "scores": sample_scores,
        "summary": summary,
        "strengths": strengths,
        "development_areas": development_areas,
        "ai_analysis": False,  # Flag to indicate this is sample data
        "note": "This is demonstration data. AI analysis was attempted but failed."
    }

def main():
    """Main function to process stdin and return analysis."""
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        # Validate input
        if 'responses' not in data:
            print(json.dumps({"error": "No responses provided"}))
            sys.exit(1)
        
        print(f"Processing {len(data['responses'])} responses", file=sys.stderr)
        
        # Analyze personality
        result = analyze_personality(data['responses'])
        
        # Add metadata
        result['dimensions'] = PERSONALITY_DIMENSIONS
        result['dimension_definitions'] = DIMENSION_DEFINITIONS
        result['total_dimensions'] = len(PERSONALITY_DIMENSIONS)
        
        # Output result
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": f"Script error: {str(e)}"}), file=sys.stderr)
        # Even on error, provide fallback data so the UI doesn't break
        fallback_result = {
            "scores": {dim: 50 for dim in PERSONALITY_DIMENSIONS},
            "summary": "Analysis could not be completed due to system error. Default moderate scores assigned for demonstration purposes.",
            "strengths": ["System resilience", "Error handling", "Fallback capability"],
            "development_areas": ["System configuration", "API setup", "Error resolution"],
            "dimensions": PERSONALITY_DIMENSIONS,
            "dimension_definitions": DIMENSION_DEFINITIONS,
            "total_dimensions": len(PERSONALITY_DIMENSIONS),
            "ai_analysis": False,
            "error": str(e)
        }
        print(json.dumps(fallback_result, indent=2))

if __name__ == "__main__":
    main() 