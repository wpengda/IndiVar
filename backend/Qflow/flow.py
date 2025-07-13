import os
import json
import openai
import anthropic
import pandas as pd
from datetime import datetime
from .config import get_api_key, get_llm_config
from .constants import DEFAULT_MODEL, DEFAULT_SEED, DEFAULT_TEMPERATURE
import random
from typing import List, Dict, Optional, Any
import sys

from .constants import TERMINATION_MSG

#############################
# --- QflowSystem class --- #
"""
QflowSystem for managing conversational question flows with specific function structure.

Functions:
1. start_greeting() - Initial greeting and readiness check
2. detect_user_reply() - Handle yes/no responses
3. get_user_input() - Accept user input
4. select_next_question() - AI-powered question selection via Claude/OpenAI API
5. generate_ai_reply() - AI-generated transitions via Claude/OpenAI API
6. track_questions() - Track used/unused questions
7. end_conversation() - AI-generated closing
"""

class QflowSystem:
    
    def __init__(self):
        self.api_key = get_api_key()
        self.model = DEFAULT_MODEL
        self.question_bank = []
        self.used_questions = set()
        self.conversation_log = []
        
        # Determine which client to use based on model
        model_lower = self.model.lower()
        
        if "claude" in model_lower or "anthropic" in model_lower:
            # Use Anthropic client for Claude models
            self.client_type = "anthropic"
            try:
                self.client = anthropic.Anthropic(api_key=self.api_key)
                print(f"Initialized Anthropic client for model: {self.model}", file=sys.stderr)
            except Exception as e:
                print(f"Error initializing Anthropic client: {e}", file=sys.stderr)
                raise ValueError(f"Failed to initialize Anthropic client: {e}")
        elif "gpt" in model_lower or "openai" in model_lower:
            # Use OpenAI client for GPT models  
            self.client_type = "openai"
            try:
                openai.api_key = self.api_key
                self.client = openai.OpenAI(api_key=self.api_key)
                print(f"Initialized OpenAI client for model: {self.model}", file=sys.stderr)
            except Exception as e:
                print(f"Error initializing OpenAI client: {e}", file=sys.stderr)
                raise ValueError(f"Failed to initialize OpenAI client: {e}")
        else:
            # Warn about unknown model but default to OpenAI
            print(f"Warning: Unknown model type '{self.model}'. Defaulting to OpenAI client.", file=sys.stderr)
            self.client_type = "openai"
            try:
                openai.api_key = self.api_key
                self.client = openai.OpenAI(api_key=self.api_key)
                print(f"Defaulting to OpenAI client for model: {self.model}", file=sys.stderr)
            except Exception as e:
                print(f"Error initializing OpenAI client: {e}", file=sys.stderr)
                raise ValueError(f"Failed to initialize OpenAI client: {e}")
        
        # Question management
        self.unused_questions = set()
        self.current_question_index = None
        
        # Conversation state
        self.conversation_started = False
        self.user_ready = False
        

    #####################################
    # --- Universal API call method --- #
    """
    Make API calls that work with both OpenAI and Anthropic clients.
    """
    def _make_api_call(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        try:
            if self.client_type == "anthropic":
                # Convert messages format for Claude
                system_message = ""
                user_messages = []
                
                for msg in messages:
                    if msg["role"] == "system":
                        system_message = msg["content"]
                    else:
                        user_messages.append(msg)
                
                # Make Claude API call
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=2048,  # Increased for better response quality
                    temperature=temperature,
                    system=system_message,
                    messages=user_messages
                )
                
                return response.content[0].text.strip()
                
            else:
                # OpenAI API call
                response = self.client.chat.completions.create(
                    model=self.model,
                    temperature=temperature,
                    messages=messages
                )
                
                return response.choices[0].message.content.strip()
                
        except Exception as e:
            print(f"API call error: {e}", file=sys.stderr)
            raise e


    #####################################
    # --- Load questions from excel --- #
    """
    Load questions and their cluster_id from an Excel file.
    """
    def load_questions_from_excel(self, file_path: str, question_column: str = "Final_Question", id_column: str = "question_id") -> bool:
        try:
            print(f"Reading Excel file: {file_path}", file=sys.stderr)
            df = pd.read_excel(file_path)
            print(f"Excel columns: {df.columns.tolist()}", file=sys.stderr)
            
            if question_column not in df.columns or id_column not in df.columns:
                print(f"Error: Required columns ('{question_column}', '{id_column}') not found.", file=sys.stderr)
                print(f"Available columns: {df.columns.tolist()}", file=sys.stderr)
                return False
            
            # Create a list of question objects
            question_data = []
            for index, row in df.iterrows():
                question_text = row[question_column]
                cluster_id = row[id_column]
                
                if pd.notna(question_text) and pd.notna(cluster_id):
                    cleaned_q = str(question_text).strip()
                    if TERMINATION_MSG in cleaned_q:
                        cleaned_q = cleaned_q.replace(TERMINATION_MSG, "").strip()
                    
                    question_data.append({
                        "question": cleaned_q,
                        "cluster_id": int(cluster_id) if str(cluster_id).isdigit() else index
                    })
            
            print(f"Cleaned questions count: {len(question_data)}", file=sys.stderr)
            if len(question_data) > 0:
                print(f"First question: {question_data[0]['question']}", file=sys.stderr)
            
            self.question_bank = question_data
            self.used_questions = set()
            self.unused_questions = set(range(len(self.question_bank)))
            
            print(f"Final question bank size: {len(self.question_bank)}", file=sys.stderr)
            print(f"Unused questions set size: {len(self.unused_questions)}", file=sys.stderr)
            
            return len(self.question_bank) > 0
                
        except Exception as e:
            print(f"Error loading questions: {e}", file=sys.stderr)
            import traceback
            print(traceback.format_exc(), file=sys.stderr)
            return False
    



    ##########################
    # --- Start greeting --- #
    """
    Provide the beginning of the chat with greeting and readiness question.
    Returns the greeting message.
    """
    def start_greeting(self) -> str:
        
        greeting = "Hello! I'd like to ask you some questions to better understand your personality and work style. Are you ready to begin (yes/no)?"
        return greeting
    



    #############################
    # --- Detect user reply --- #
    """
    Detect yes/no reply. If yes, select random starting question. If no, end process.
    Returns: {"action": "start"/"end", "question": "...", "message": "..."}
    """
    def detect_user_reply(self, user_input: str) -> Dict[str, Any]:
        print(f"Detecting user reply for input: {user_input}", file=sys.stderr)
        print(f"Current question bank size: {len(self.question_bank)}", file=sys.stderr)
        print(f"Unused questions: {self.unused_questions}", file=sys.stderr)
        
        user_input_clean = user_input.strip().lower()
        
        # Check for yes responses
        yes_responses = ["yes", "y", "yeah", "yep", "sure", "ok", "okay", "ready", "let's go", "let's start"]
        no_responses = ["no", "n", "nope", "not ready", "maybe later", "not now"]
        
        if any(response in user_input_clean for response in yes_responses):
            # User is ready - select random starting question
            if not self.unused_questions:
                print("No unused questions available", file=sys.stderr)
                return {"action": "end", "message": "No questions available."}
            
            # Select random starting question
            question_idx = random.choice(list(self.unused_questions))
            print(f"Selected question index: {question_idx}", file=sys.stderr)
            self.current_question_index = question_idx
            # Don't mark as used yet - wait until user answers
            self.conversation_started = True
            self.user_ready = True
            
            return {
                "action": "start",
                "question": self.question_bank[question_idx]['question'],
                "question_index": question_idx,
                "message": "Great! Let's begin."
            }
            
        elif any(response in user_input_clean for response in no_responses):
            # User not ready - end process
            return {
                "action": "end",
                "message": "No problem! Feel free to come back when you're ready. Have a great day!"
            }
        else:
            # Unclear response - ask for clarification
            return {
                "action": "clarify",
                "message": "I didn't quite catch that. Could you please respond with 'yes' if you're ready to begin, or 'no' if you'd prefer to stop here?"
            }
    



    ##########################
    # --- Get user input --- #
    """
    Accept user input with specified prompt.
    Returns the user's input string.
    """
    def get_user_input(self, prompt: str = "Your response: ") -> str:
        
        user_input = input(prompt).strip()
        return user_input
    



    ################################
    # --- Select next question --- #
    """
    Select the next question based on user input using AI API (OpenAI/Claude).
    Returns: {"question": "...", "question_index": int, "reasoning": "...", "finished": bool}
    """
    def select_next_question(self, user_response: str) -> Dict[str, Any]:
        print(f"[DEBUG] Used questions before selection: {self.used_questions}", file=sys.stderr)
        print(f"[DEBUG] Unused questions before selection: {self.unused_questions}", file=sys.stderr)
        if not self.unused_questions:
            return {"finished": True, "message": "All questions completed!"}
        
        # Prepare available questions for AI
        available_questions = []
        for idx in self.unused_questions:
            # Each item in question_bank is now a dict
            available_questions.append(f"{idx}: {self.question_bank[idx]['question']}")
        
        available_questions_text = "\n".join(available_questions)
        
        # Previous question context
        previous_question = ""
        if self.current_question_index is not None:
            previous_question = self.question_bank[self.current_question_index]['question']
        
        # AI API call for question selection
        try:
            messages = [
                {
                    "role": "system",
                    "content": """You are an expert conversational interviewer. Your task is to select the most appropriate next question from the available question bank based on the user's response.

                    Analyze the user's response for:
                    - Communication style and personality indicators
                    - Key themes and topics mentioned
                    - Emotional tone and depth of response
                    - Areas that warrant deeper exploration

                    Select the question that would:
                    - Build naturally on their previous response
                    - Explore complementary personality dimensions
                    - Maintain conversational flow
                    - Provide meaningful insights

                    Respond with a JSON object containing:
                    {
                    "selected_question_index": "the index number of the selected question",
                    "reasoning": "brief explanation of why this question was selected based on response analysis"
                    }

                    Only return the JSON object, nothing else."""
                },
                {
                    "role": "user",
                    "content": f"""Previous question: {previous_question}

                    User's response: {user_response}

                    Available questions to choose from:
                    {available_questions_text}

                    Please select the most appropriate next question based on the user's response."""
                }
            ]
            
            # Parse AI response
            ai_response = self._make_api_call(messages, temperature=0.7)
            
            # Clean JSON response
            if ai_response.startswith("```json"):
                ai_response = ai_response.replace("```json", "").replace("```", "").strip()
            elif ai_response.startswith("```"):
                ai_response = ai_response[3:-3].strip()
            
            selection_data = json.loads(ai_response)
            selected_idx = int(selection_data["selected_question_index"])
            reasoning = selection_data["reasoning"]
            
            # Validate selection
            if selected_idx in self.unused_questions:
                # Don't mark as used yet - wait until user answers
                # Just track which question is currently being asked
                self.current_question_index = selected_idx
                
                return {
                    "question": self.question_bank[selected_idx]['question'],
                    "question_index": selected_idx,
                    "reasoning": reasoning,
                    "finished": False
                }
            else:
                # Fallback to random selection if AI selected invalid question
                fallback_idx = random.choice(list(self.unused_questions))
                # Don't mark as used yet - wait until user answers
                self.current_question_index = fallback_idx
                
                return {
                    "question": self.question_bank[fallback_idx]['question'],
                    "question_index": fallback_idx,
                    "reasoning": "Fallback selection due to AI selection error",
                    "finished": False
                }
                
        except Exception as e:
            # Fallback to random selection on API error
            if self.unused_questions:
                fallback_idx = random.choice(list(self.unused_questions))
                # Don't mark as used yet - wait until user answers
                self.current_question_index = fallback_idx
                
                return {
                    "question": self.question_bank[fallback_idx]['question'],
                    "question_index": fallback_idx,
                    "reasoning": f"Fallback selection due to API error: {str(e)}",
                    "finished": False
                }
            else:
                return {"finished": True, "message": "All questions completed!"}
            



    #############################
    # --- Generate AI reply --- #
    """
    Generate AI reply based on user input to improve user experience.
    Returns the AI-generated transition/reply.
    """
    def generate_ai_reply(self, user_response: str, next_question: str = "") -> str:
       
        try:
            # Determine if this is a transition or acknowledgment
            if next_question:
                prompt_type = "transition to next question"
                context = f"The next question is: {next_question}"
            else:
                prompt_type = "acknowledgment"
                context = "This is an acknowledgment without a follow-up question."
            
            messages = [
                {
                    "role": "system",
                    "content": f"""You are a warm, professional interviewer conducting a personality assessment conversation. Your role is to create a {prompt_type} that:

                    1. Acknowledges what the user shared in a genuine way
                    2. Shows you're actively listening and understanding their response
                    3. Identifies key themes or insights from their answer
                    4. **Creates a natural bridge to continue the conversation by ending with the original, unmodified question-do not rephrase, summarize, or modify it in any way**

                    Be conversational, empathetic, and professional. Keep responses concise but meaningful (2-3 sentences max). 
                    Avoid being overly formal or robotic. Show genuine interest in their perspective.

                    {context}
                    

                    """
                },
                {
                    "role": "user",
                    "content": f"User just responded: {user_response}\n\nGenerate an appropriate {prompt_type}."
                }
            ]
            
            ai_reply = self._make_api_call(messages, temperature=0.7)
            return ai_reply
            
        except Exception as e:
            # Fallback responses
            if next_question:
                fallback_replies = [
                    "Thank you for sharing that insight. Let me ask you about another situation.",
                    "I appreciate your perspective on that. Here's another question I'm curious about.",
                    "That's helpful to understand. Let me explore another dimension with you."
                ]
            else:
                fallback_replies = [
                    "Thank you for sharing that with me.",
                    "I appreciate your thoughtful response.",
                    "That gives me good insight into your approach."
                ]
            
            return random.choice(fallback_replies)
    


    ###########################
    # --- Track questions --- #
    """
    Track which questions have been used and which haven't to avoid repetition.
    Returns current question usage statistics.
    """
    def track_questions(self) -> Dict[str, Any]:
        
        total_questions = len(self.question_bank)
        used_count = len(self.used_questions)
        unused_count = len(self.unused_questions)
        
        return {
            "total_questions": total_questions,
            "used_questions": used_count,
            "unused_questions": unused_count,
            "used_question_indices": list(self.used_questions),
            "unused_question_indices": list(self.unused_questions),
            "progress_percentage": (used_count / total_questions * 100) if total_questions > 0 else 0,
            "all_questions_used": unused_count == 0
        }
    
    ###########################
    # --- Mark current question as used --- #
    """
    Mark the current question as used when the user answers it.
    This should be called after the user provides a response.
    """
    def mark_current_question_as_used(self) -> bool:
        result = False
        if self.current_question_index is not None and self.current_question_index in self.unused_questions:
            self.unused_questions.remove(self.current_question_index)
            self.used_questions.add(self.current_question_index)
            print(f"Marked question {self.current_question_index} as used", file=sys.stderr)
            result = True
        print(f"[DEBUG] Used questions after marking: {self.used_questions}", file=sys.stderr)
        print(f"[DEBUG] Unused questions after marking: {self.unused_questions}", file=sys.stderr)
        return result

    ############################
    # --- End conversation --- #
    """
    End the conversation with AI-generated thank you message.
    Returns the closing message.
    """
    def end_conversation(self) -> str:
        
        try:
            # Get conversation statistics for context
            stats = self.track_questions()
            
            messages = [
                {
                    "role": "system",
                    "content": """You are concluding a personality assessment conversation. Generate a warm, professional closing message that:

                    1. Thanks the participant for their time and thoughtful responses
                    2. Acknowledges the value of their insights
                    3. Provides a sense of completion and accomplishment
                    4. Ends on a positive, encouraging note

                    Keep it genuine, concise (2-3 sentences), and avoid being overly formal. Make them feel good about participating."""
                },
                {
                    "role": "user",
                    "content": f"Generate a closing message for someone who just completed {stats['used_questions']} out of {stats['total_questions']} personality assessment questions. They provided thoughtful responses throughout the conversation."
                }
            ]
            
            closing_message = self._make_api_call(messages, temperature=0.7)
            
            # Mark conversation as ended
            self.conversation_started = False
            
            return closing_message
            
        except Exception as e:
            # Fallback closing message
            stats = self.track_questions()
            if stats['all_questions_used']:
                return "Thank you so much for taking the time to answer all the questions! Your thoughtful responses provide valuable insights into your personality and work style. I really appreciate your participation and openness throughout our conversation."
            else:
                return f"Thank you for participating in our conversation! You've shared valuable insights through your responses. I appreciate your time and thoughtfulness."
    




    ########################################## Additional utility functions #######################################################

    ############################
    # --- Log interaction  --- #
    """
    Log the interaction for conversation history.
    """
    def log_interaction(self, question: str, response: str, question_index: int, transition: str = ""):
        
        self.conversation_log.append({
            "question_index": question_index,
            "question": question,
            "user_response": response,
            "ai_transition": transition,
            "timestamp": pd.Timestamp.now()
        })
    



    #################################
    # --- Get conversation log  --- #
    """
    Get the complete conversation log.
    """
    def get_conversation_log(self) -> List[Dict[str, Any]]:
        
        return self.conversation_log.copy()
    



    ###############################
    # --- Reset conversation  --- #
    """
    Reset the conversation state for a new session.
    """
    def reset_conversation(self):
        
        if self.question_bank:
            self.used_questions = set()
            self.unused_questions = set(range(len(self.question_bank)))
        self.current_question_index = None
        self.conversation_started = False
        self.conversation_log = []
        self.user_ready = False
    



    ##################################
    # --- Save conversation log  --- #
    """
    Save conversation log to Excel file.
    """
    def save_conversation_log(self, output_file_path: str):
       
        try:
            if not self.conversation_log:
                return False
                
            df = pd.DataFrame(self.conversation_log)
            df.to_excel(output_file_path, index=False)
            return True
            
        except Exception as e:
            print(f"Error saving conversation log: {e}")
            return False 