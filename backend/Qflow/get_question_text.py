import sys
import os
import argparse
import json
import pandas as pd

# Add the parent directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

def get_question_text(question_index):
    try:
        # Load questions from Excel file
        questions_file = os.path.join(current_dir, "MJ_cluster_based_generated_questions.xlsx")
        
        if not os.path.exists(questions_file):
            print(json.dumps({"error": f"Questions file not found at {questions_file}"}))
            sys.exit(1)
        
        df = pd.read_excel(questions_file)
        
        if 'Final_Question' not in df.columns:
            print(json.dumps({"error": "Final_Question column not found in Excel file"}))
            sys.exit(1)
        
        # Get question at the specified index
        if question_index < 0 or question_index >= len(df):
            print(json.dumps({"error": f"Question index {question_index} out of range"}))
            sys.exit(1)
        
        question_text = df.iloc[question_index]['Final_Question']
        
        # Clean the question text
        if pd.notna(question_text):
            cleaned_question = str(question_text).strip()
            # Remove termination message if present
            from .constants import TERMINATION_MSG
            if TERMINATION_MSG in cleaned_question:
                cleaned_question = cleaned_question.replace(TERMINATION_MSG, "").strip()
            
            print(json.dumps({"question": cleaned_question}))
            return True
        else:
            print(json.dumps({"error": f"Question at index {question_index} is empty"}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"error": f"Error getting question text: {e}"}))
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Get question text by index')
    parser.add_argument('--index', type=int, required=True, help='Question index')
    
    args = parser.parse_args()
    
    get_question_text(args.index)

if __name__ == "__main__":
    main() 