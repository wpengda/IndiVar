#!/usr/bin/env python3
"""
Audio transcription script using local Whisper model
"""

import sys
import json
import whisper
import torch
import os
from pathlib import Path
import numpy as np
import math

def transcribe_audio(audio_path):
    """
    Transcribe audio file using local Whisper model, chunking if longer than 30 seconds
    """
    try:
        # Load the Whisper model (will download on first use)
        print("Loading Whisper model...", file=sys.stderr)
        model = whisper.load_model("base")  # Using base model for faster processing
        
        # Load and preprocess the audio
        print("Loading audio file...", file=sys.stderr)
        audio = whisper.load_audio(audio_path)
        sample_rate = 16000  # Whisper expects 16kHz audio
        chunk_length = 30 * sample_rate  # 30 seconds in samples
        num_chunks = math.ceil(len(audio) / chunk_length)
        print(f"Audio length: {len(audio) / sample_rate:.2f} seconds, splitting into {num_chunks} chunk(s)...", file=sys.stderr)

        full_transcript = []
        detected_lang = None
        for i in range(num_chunks):
            start = i * chunk_length
            end = min((i + 1) * chunk_length, len(audio))
            chunk = audio[start:end]
            chunk = whisper.pad_or_trim(chunk)

            print(f"Processing chunk {i+1}/{num_chunks}...", file=sys.stderr)
            mel = whisper.log_mel_spectrogram(chunk).to(model.device)

            if i == 0:
                print("Detecting language...", file=sys.stderr)
                _, probs = model.detect_language(mel)
                detected_lang = max(probs, key=probs.get)
                print(f"Detected language: {detected_lang}", file=sys.stderr)

            print("Transcribing chunk...", file=sys.stderr)
            options = whisper.DecodingOptions(fp16=False)
            result = whisper.decode(model, mel, options)
            full_transcript.append(result.text.strip())

        return {
            "transcript": " ".join(full_transcript),
            "language": detected_lang,
            "success": True
        }
        
    except Exception as e:
        print(f"Error during transcription: {str(e)}", file=sys.stderr)
        return {
            "transcript": "",
            "error": str(e),
            "success": False
        }

def main():
    """
    Main function to handle command line arguments and transcribe audio
    """
    if len(sys.argv) != 2:
        print(json.dumps({
            "transcript": "",
            "error": "Usage: python transcribe_audio.py <audio_file_path>",
            "success": False
        }))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    
    # Check if audio file exists
    if not os.path.exists(audio_path):
        print(json.dumps({
            "transcript": "",
            "error": f"Audio file not found: {audio_path}",
            "success": False
        }))
        sys.exit(1)
    
    # Transcribe the audio
    result = transcribe_audio(audio_path)
    
    # Output result as JSON
    print(json.dumps(result))
    
    # Exit with appropriate code
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main() 