import os
from dotenv import load_dotenv
from .constants import DEFAULT_MODEL



##########################
# --- find env files --- #
def find_env_file(start_path: str = None, filename: str = '.env', max_depth: int = 5) -> str:
    if start_path is None:
        start_path = os.path.dirname(os.path.abspath(__file__))

    current_path = start_path
    for _ in range(max_depth):
        env_path = os.path.join(current_path, filename)
        if os.path.exists(env_path):
            return env_path
        parent_path = os.path.dirname(current_path)
        if parent_path == current_path:
            break
        current_path = parent_path
    return None




#######################
# --- get api key --- #
"""
Retrieves the API key with a clear priority order.
It robustly finds the .env file in the project's root directory.
"""
def get_api_key(api_key_input: str = None) -> str:

    if api_key_input:
        return api_key_input

    env_path = find_env_file()
    if env_path:
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()  # default

    env_api_key = os.getenv("API_KEY")
    if env_api_key:
        return env_api_key

    print("Warning: API key not found via input argument, .env file, or environment variables.")
    return None



############################
# --- validate api key --- #
"""
Validate the api key
"""
def validate_api_key(api_key: str):

    if not api_key:
        print("Error:API Key is missing.")
        return False
    # Add more sophisticated validation if needed (e.g., length, prefix)
    return True


##########################
# --- get LLM config --- #
"""
Prepares the LLM configuration for Autogen.
"""
# def get_llm_config(api_key: str, model: str, seed: int, temperature: float):
    
#     if not validate_api_key(api_key):
#         raise ValueError("Invalid or missing API Key.")
#     return {
#         "config_list": [{"model": model, "api_key": api_key}],
#         "seed": seed,
#         "temperature": temperature,
#     }

def get_llm_config(api_key: str, model: str, seed: int, temperature: float):
    """
    Prepares the LLM configuration for Autogen.
    Detects if the model is for Google Gemini, Anthropic Claude, or OpenAI,
    and adjusts the config list accordingly.
    """
    if not validate_api_key(api_key):
        raise ValueError("Invalid or missing API Key.")

    config_list = []
    
    # turn to lower case to check
    model_lower = model.lower()

    # check if is Google Gemini model
    if "gemini" in model_lower:
        print(f"Detected Google Gemini model '{model}'. Configuring for Google AI.")
        # Gemini config
        config_list.append({
            "model": model,
            "api_key": api_key,
            "api_type": "google" 
        })

    # check if is Anthropic model
    elif "claude" in model_lower:
        print(f"Detected Anthropic model '{model}'. Configuring for Anthropic API.")
        # Anthropic config
        config_list.append({
            "model": model,
            "api_key": api_key,
            "api_type": "anthropic"
        })

    # Default is openai model
    elif "gpt" in model_lower:
        print(f"Assuming OpenAI '{model}'. Configuring for OpenAI API.")
        # OpenAI config
        config_list.append({
            "model": model,
            "api_key": api_key,
            "api_type": "openai"
        })

    return {
        "config_list": config_list,
        "seed": seed,
        "temperature": temperature,
    }