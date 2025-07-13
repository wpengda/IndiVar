import sys
import os
import argparse
import json

# Add the parent directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from Qflow import QflowSystem
except ImportError as e:
    print(f"Error importing QflowSystem: {e}")
    print(f"Current sys.path: {sys.path}")
    print(f"Current directory: {current_dir}")
    print(f"Parent directory: {parent_dir}")
    sys.exit(1)

def start_conversation():
    try:
        print("Initializing QflowSystem for 32 Life Narrative Questions...", file=sys.stderr)
        qflow = QflowSystem()
        
        # Load questions from Excel file
        questions_file = os.path.join(current_dir, "life_narrative_32_questions.xlsx")
        print(f"Looking for questions file at: {questions_file}", file=sys.stderr)
        
        if not os.path.exists(questions_file):
            print(f"Error: Questions file not found at {questions_file}", file=sys.stderr)
            return False
        
        print("Loading questions from Excel file...", file=sys.stderr)
        if not qflow.load_questions_from_excel(questions_file):
            print("Error: Failed to load questions from Excel file.", file=sys.stderr)
            return False
        
        print(f"Successfully loaded {len(qflow.question_bank)} questions.", file=sys.stderr)
        print(f"First few questions: {qflow.question_bank[:3]}", file=sys.stderr)
        print(f"Unused questions set size: {len(qflow.unused_questions)}", file=sys.stderr)
        
        greeting = qflow.start_greeting()
        print(greeting)
        return True
    except Exception as e:
        print(f"Error in start_conversation: {e}", file=sys.stderr)
        import traceback
        print(traceback.format_exc(), file=sys.stderr)
        return False

def process_response(user_response, used_indices=None, current_question_index=None):
    try:
        print(f"=== PYTHON DEBUG ===", file=sys.stderr)
        print(f"Received user_response: {user_response}", file=sys.stderr)
        print(f"Received used_indices: {used_indices}", file=sys.stderr)
        print(f"Received current_question_index: {current_question_index}", file=sys.stderr)
        
        qflow = QflowSystem()
        # Load questions from Excel file
        questions_file = os.path.join(current_dir, "life_narrative_32_questions.xlsx")
        if not os.path.exists(questions_file):
            print(json.dumps({"error": f"Questions file not found at {questions_file}"}))
            return False
        if not qflow.load_questions_from_excel(questions_file):
            print(json.dumps({"error": "Failed to load questions from Excel file."}))
            return False

        # Restore state from arguments if provided
        if used_indices is not None:
            try:
                if isinstance(used_indices, str):
                    used_indices = json.loads(used_indices)
                qflow.used_questions = set(used_indices)
                qflow.unused_questions = set(range(len(qflow.question_bank))) - qflow.used_questions
                print(f"Restored used_questions: {qflow.used_questions}", file=sys.stderr)
                print(f"Restored unused_questions: {qflow.unused_questions}", file=sys.stderr)
            except Exception as e:
                print(f"Error restoring used_indices: {e}", file=sys.stderr)
        
        if current_question_index is not None:
            qflow.current_question_index = current_question_index
            print(f"Restored current_question_index: {qflow.current_question_index}", file=sys.stderr)

        print(f"Total questions loaded: {len(qflow.question_bank)}", file=sys.stderr)
        print(f"Initial unused_questions: {qflow.unused_questions}", file=sys.stderr)
        print(f"Initial used_questions: {qflow.used_questions}", file=sys.stderr)

        # Check if this is the first response (greeting response)
        if user_response.strip().lower() in ["yes", "y", "yeah", "yep", "sure", "ok", "okay", "ready", "let's go", "let's start"]:
            # User is ready to start - detect user reply
            detection_result = qflow.detect_user_reply(user_response)
            
            if detection_result["action"] == "end":
                print(json.dumps({
                    "message": detection_result["message"],
                    "progress": {
                        "used_questions": len(qflow.used_questions),
                        "total_questions": len(qflow.question_bank),
                        "used_question_indices": list(qflow.used_questions)
                    },
                    "question_index": None
                }))
                return True
            elif detection_result["action"] == "clarify":
                print(json.dumps({
                    "message": detection_result["message"],
                    "progress": {
                        "used_questions": len(qflow.used_questions),
                        "total_questions": len(qflow.question_bank),
                        "used_question_indices": list(qflow.used_questions)
                    },
                    "question_index": None
                }))
                return True
            
            # If we get here, user is ready to start
            if detection_result["action"] == "start":
                current_question = detection_result["question"]
                current_question_index = detection_result["question_index"]
                
                print(f"Selected first question index: {current_question_index}", file=sys.stderr)
                print(f"Selected question: {current_question}", file=sys.stderr)
                
                # Set the current question index but DON'T mark as used yet
                # It will be marked as used when the user answers it
                qflow.current_question_index = current_question_index
                
                # Get cluster_id for the selected question
                next_question_data = qflow.question_bank[current_question_index]
                cluster_id = next_question_data.get('cluster_id', current_question_index)
                print(f"Selected cluster_id: {cluster_id}", file=sys.stderr)
                
                message = f"Great! Let's begin with the first question.\n\nQuestion 1 of 32:\n{current_question}"
                
                progress = qflow.track_questions()
                response_data = {
                    "message": message,
                    "progress": {
                        "used_questions": progress["used_questions"],
                        "total_questions": progress["total_questions"],
                        "used_question_indices": list(qflow.used_questions)
                    },
                    "cluster_id": cluster_id,
                    "question_index": current_question_index
                }
                
                print(f"Final response data: {response_data}", file=sys.stderr)
                print(f"=== END PYTHON DEBUG ===", file=sys.stderr)
                
                print(json.dumps(response_data))
                return True
        else:
            # User is answering a question - mark the current question as used
            print(f"[DEBUG] About to mark as used: current_question_index={qflow.current_question_index}", file=sys.stderr)
            print(f"[DEBUG] Unused before marking: {qflow.unused_questions}", file=sys.stderr)
            
            # If current_question_index is None, this might be the first question after greeting
            # In this case, we need to select the first question and then mark it as used
            if qflow.current_question_index is None:
                print("No current question index provided - selecting first question", file=sys.stderr)
                # Select the first question
                next_question_result = qflow.select_next_question(user_response)
                next_question = next_question_result["question"]
                next_question_index = next_question_result["question_index"]
                qflow.current_question_index = next_question_index
                print(f"Selected first question index: {next_question_index}", file=sys.stderr)
                
                # Mark it as used since user is answering it
                qflow.mark_current_question_as_used()
                print(f"Marked question {qflow.current_question_index} as used after user answered", file=sys.stderr)
                
                # Calculate progress immediately after marking as used
                progress = qflow.track_questions()
                # Select the next question for the user
                next_question_result = qflow.select_next_question(user_response)
                # Check if all questions are finished
                if next_question_result.get("finished"):
                    # Get the last answered question's cluster_id
                    last_answered_index = max(qflow.used_questions) if qflow.used_questions else None
                    last_answer_cluster_id = None
                    if last_answered_index is not None:
                        last_answer_cluster_id = qflow.question_bank[last_answered_index].get('cluster_id', last_answered_index)
                    print(json.dumps({
                        "message": "🎉 Congratulations! You've completed all 32 questions. Your life story responses have been saved and will be analyzed to provide insights into your personality traits. Thank you for sharing your experiences!",
                        "progress": progress,
                        "cluster_id": None,
                        "question_index": None,
                        "finished": True,
                        "last_answer_cluster_id": last_answer_cluster_id
                    }))
                    return True
                next_question = next_question_result["question"]
                next_question_index = next_question_result["question_index"]
                qflow.current_question_index = next_question_index
                next_question_data = qflow.question_bank[next_question_index]
                cluster_id = next_question_data.get('cluster_id', next_question_index)
                message = qflow.generate_ai_reply(user_response, next_question)
                
                # Add question number to message
                question_number = len(qflow.used_questions) + 1
                message = f"{message}\n\nQuestion {question_number} of 32:\n{next_question}"
                
                response_data = {
                    "message": message,
                    "progress": progress,
                    "cluster_id": cluster_id,
                    "question_index": next_question_index
                }
                
                print(f"Final response data: {response_data}", file=sys.stderr)
                print(f"=== END PYTHON DEBUG ===", file=sys.stderr)
                
                print(json.dumps(response_data))
                return True
            else:
                # Normal flow - mark current question as used and select next
                qflow.mark_current_question_as_used()
                print(f"Marked question {qflow.current_question_index} as used after user answered", file=sys.stderr)
                
                # Calculate progress immediately after marking as used
                progress = qflow.track_questions()
                
                # Select the next question for the user
                next_question_result = qflow.select_next_question(user_response)
                
                # Check if all questions are finished
                if next_question_result.get("finished"):
                    # Get the last answered question's cluster_id
                    last_answered_index = max(qflow.used_questions) if qflow.used_questions else None
                    last_answer_cluster_id = None
                    if last_answered_index is not None:
                        last_answer_cluster_id = qflow.question_bank[last_answered_index].get('cluster_id', last_answered_index)
                    print(json.dumps({
                        "message": "🎉 Congratulations! You've completed all 32 questions. Your life story responses have been saved and will be analyzed to provide insights into your personality traits. Thank you for sharing your experiences!",
                        "progress": progress,
                        "cluster_id": None,
                        "question_index": None,
                        "finished": True,
                        "last_answer_cluster_id": last_answer_cluster_id
                    }))
                    return True
                
                next_question = next_question_result["question"]
                next_question_index = next_question_result["question_index"]
                qflow.current_question_index = next_question_index
                next_question_data = qflow.question_bank[next_question_index]
                cluster_id = next_question_data.get('cluster_id', next_question_index)
                
                # Generate AI response
                message = qflow.generate_ai_reply(user_response, next_question)
                
                # Add question number to message
                question_number = len(qflow.used_questions) + 1
                message = f"{message}\n\nQuestion {question_number} of 32:\n{next_question}"
                
                response_data = {
                    "message": message,
                    "progress": progress,
                    "cluster_id": cluster_id,
                    "question_index": next_question_index
                }
                
                print(f"Final response data: {response_data}", file=sys.stderr)
                print(f"=== END PYTHON DEBUG ===", file=sys.stderr)
                
                print(json.dumps(response_data))
                return True
        
    except Exception as e:
        print(f"Error in process_response: {e}", file=sys.stderr)
        import traceback
        print(traceback.format_exc(), file=sys.stderr)
        print(json.dumps({"error": str(e)}))
        return False

def main():
    parser = argparse.ArgumentParser(description='Life Narrative Chatbot using Qflow')
    parser.add_argument('--start', action='store_true', help='Start the conversation')
    parser.add_argument('--respond', help='User response to process')
    parser.add_argument('--used_indices', help='JSON string of used question indices')
    parser.add_argument('--current_question_index', type=int, help='Current question index')
    
    args = parser.parse_args()
    
    if args.start:
        return start_conversation()
    elif args.respond:
        return process_response(args.respond, args.used_indices, args.current_question_index)
    else:
        print("Usage: python qflow_conversation.py --start | --respond <response> [--used_indices <indices>] [--current_question_index <index>]")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)