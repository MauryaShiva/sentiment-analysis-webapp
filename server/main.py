from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import asyncio
from transformers import pipeline
from pydantic import BaseModel

# --- Application Setup ---
app = FastAPI()

# --- CORS Middleware Setup ---
# Allow requests from the frontend development server
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "*"  # Allows all origins (for development/testing)
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AI Model Loading ---
sentiment_pipeline = None
label_map = {}

try:
    print("--- Loading Sentiment Analysis AI Model... ---")
    """
    Load the pre-trained sentiment analysis model from Hugging Face.
    This model is optimized for Twitter data and works well for general sentiment.
    """
    sentiment_pipeline = pipeline(
        "sentiment-analysis",
        model="cardiffnlp/twitter-roberta-base-sentiment"
    )
    print("--- Model Loaded Successfully ---")

    """
    Map the model's output labels (LABEL_0, LABEL_1, LABEL_2)
    to human-readable sentiment strings.
    """
    label_map = {
        "LABEL_0": "negative",
        "LABEL_1": "neutral",
        "LABEL_2": "positive"
    }

except Exception as e:
    print(f"--- Error loading model: {e} ---")
    # sentiment_pipeline remains None if loading fails

# --- Pydantic Models ---

class TextItem(BaseModel):
    """
    Defines the expected request body for the /analyze-text/ endpoint.
    Ensures the incoming JSON has a 'text' field.
    """
    text: str

# --- API Endpoints ---

@app.get("/")
def read_root():
    """
    Root endpoint for health checks.
    """
    return {"message": "Sentiment Analysis Backend is running!"}


@app.websocket("/ws/analyze/")
async def websocket_endpoint(websocket: WebSocket):
    """
    Handles file analysis over a WebSocket connection.
    
    This endpoint:
    1. Accepts a WebSocket connection.
    2. Receives a JSON payload containing 'columnName' and 'csvData' (as a string).
    3. Parses the CSV data into a Pandas DataFrame.
    4. Processes the text in batches to avoid overwhelming the model.
    5. Sends 'progress' messages back to the client.
    6. Handles empty/NaN values gracefully.
    7. Sends a 'complete' message with the full analysis results.
    8. Sends 'error' messages if anything goes wrong.
    """
    await websocket.accept()

    # Guard clause: Check if the model was loaded successfully on startup
    if not sentiment_pipeline:
        await websocket.send_json({"type": "error", "message": "Model not loaded on server."})
        await websocket.close()
        return

    try:
        # 1. Receive JSON data from the frontend
        data = await websocket.receive_json()
        selected_column = data.get('columnName')
        csv_data_string = data.get('csvData')

        if not selected_column or not csv_data_string:
            raise ValueError("Invalid request. 'columnName' and 'csvData' are required.")

        # 2. Parse the string into a Pandas DataFrame
        try:
            df = pd.read_csv(io.StringIO(csv_data_string))
            
            # Validate that the user-selected column exists in the CSV
            if selected_column not in df.columns:
                raise ValueError(f"CSV file must contain a '{selected_column}' column.")
            
            # Handle empty cells (NaN) by replacing with empty strings
            df[selected_column] = df[selected_column].fillna('')
            texts = df[selected_column].tolist()
            
        except Exception as e:
            await websocket.send_json({"type": "error", "message": f"Error parsing CSV: {str(e)}"})
            return

        # 3. Start batch processing
        total_texts = len(texts)
        BATCH_SIZE = 10  # Process 10 texts at a time
        all_results = []
        
        await websocket.send_json({"type": "info", "message": f"Processing {total_texts} texts from column '{selected_column}'..."})

        for i in range(0, total_texts, BATCH_SIZE):
            batch_texts = texts[i:min(i + BATCH_SIZE, total_texts)]
            
            # Filter out empty strings to avoid sending them to the model
            processed_texts = [text for text in batch_texts if str(text).strip()]
            model_results = []
            
            if processed_texts:
                model_results = sentiment_pipeline(processed_texts)

            # Map results back to the original batch, re-inserting 'neutral' for empty strings
            model_result_index = 0
            sentiments = []
            for text in batch_texts:
                if str(text).strip():
                    # This was a processed text
                    sentiment_label = model_results[model_result_index]['label']
                    sentiments.append(label_map.get(sentiment_label, 'unknown'))
                    model_result_index += 1
                else:
                    # This was an empty string
                    sentiments.append('neutral') # Consider empty rows as neutral
            
            # Store the results for this batch
            for j, text in enumerate(batch_texts):
                all_results.append({"text": text, "sentiment": sentiments[j]})

            # Calculate and send progress update
            progress = min(100, int(((i + len(batch_texts)) / total_texts) * 100))
            await websocket.send_json({"type": "progress", "progress": progress})
            
            # Yield control to the event loop to allow messages to be sent
            await asyncio.sleep(0.01)

        # 4. Send the final complete dataset
        await websocket.send_json({"type": "complete", "data": all_results})

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket Error: {e}")
        try:
            # Try to send a final error message to the client
            await websocket.send_json({"type": "error", "message": f"An unexpected error occurred: {str(e)}"})
        except RuntimeError:
            pass  # Client likely already disconnected
    finally:
        try:
            # Ensure the connection is always closed
            await websocket.close()
        except RuntimeError:
            pass  # Connection already closed


@app.post("/analyze-text/")
async def analyze_text(item: TextItem):
    """
    Handles sentiment analysis for a single piece of text via a standard
    HTTP POST request.
    """
    
    # Guard clause: Check if model is loaded
    if not sentiment_pipeline:
        return {"error": "Model not loaded. Check server logs."}

    try:
        text_to_analyze = item.text
        # Pass text as a list and get the first result
        result = sentiment_pipeline([text_to_analyze])[0] 
        sentiment = label_map.get(result['label'], 'unknown')
        
        return {
            "text": text_to_analyze,
            "sentiment": sentiment
        }

    except Exception as e:
        print(f"Error processing single text: {e}")
        return {"error": f"An error occurred: {str(e)}"}