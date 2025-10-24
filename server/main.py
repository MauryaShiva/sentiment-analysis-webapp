from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import asyncio
from transformers import pipeline
from pydantic import BaseModel

# --- App Setup ---
app = FastAPI()

# --- CORS Setup ---
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "*" 
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REAL AI MODEL LOADING ---
try:
    print("--- Loading Sentiment Analysis AI Model... ---")
    sentiment_pipeline = pipeline(
        "sentiment-analysis", 
        model="cardiffnlp/twitter-roberta-base-sentiment"
    )
    print("--- Model Loaded Successfully ---")
    
    label_map = {
        "LABEL_0": "negative",
        "LABEL_1": "neutral",
        "LABEL_2": "positive"
    }

except Exception as e:
    print(f"--- Error loading model: {e} ---")
    sentiment_pipeline = None
    label_map = {}

# --- Request Body Model (For Single Text) ---
class TextItem(BaseModel):
    text: str

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "Sentiment Analysis Backend is running!"}

# --- Endpoint 1: WebSocket for File Analysis (UPDATED) ---
@app.websocket("/ws/analyze/")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
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
            # --- DYNAMIC COLUMN CHECK ---
            if selected_column not in df.columns:
                raise ValueError(f"CSV file must contain a '{selected_column}' column.")
            
            # --- DYNAMIC COLUMN SELECTION ---
            # Replace NaNs (empty cells) with an empty string so the model doesn't crash
            df[selected_column] = df[selected_column].fillna('') 
            texts = df[selected_column].tolist()
            
        except Exception as e:
            await websocket.send_json({"type": "error", "message": f"Error parsing CSV: {str(e)}"})
            return

        # 3. Start batch processing
        total_texts = len(texts)
        BATCH_SIZE = 10 
        all_results = []
        
        await websocket.send_json({"type": "info", "message": f"Processing {total_texts} texts from column '{selected_column}'..."})

        for i in range(0, total_texts, BATCH_SIZE):
            batch_texts = texts[i:min(i + BATCH_SIZE, total_texts)]
            
            # Don't analyze empty strings, consider them 'neutral'
            processed_texts = [text for text in batch_texts if str(text).strip()]
            model_results = []
            if processed_texts:
                model_results = sentiment_pipeline(processed_texts)

            # Map the results
            model_result_index = 0
            sentiments = []
            for text in batch_texts:
                if str(text).strip():
                    sentiment_label = model_results[model_result_index]['label']
                    sentiments.append(label_map.get(sentiment_label, 'unknown'))
                    model_result_index += 1
                else:
                    sentiments.append('neutral') # Consider empty rows as neutral
            
            # Store the results
            for j, text in enumerate(batch_texts):
                all_results.append({"text": text, "sentiment": sentiments[j]})

            # Calculate progress and send it to the frontend
            progress = min(100, int(((i + len(batch_texts)) / total_texts) * 100))
            await websocket.send_json({"type": "progress", "progress": progress})
            
            await asyncio.sleep(0.01)

        # 4. When the whole process is done, send the final data
        await websocket.send_json({"type": "complete", "data": all_results})

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": f"An unexpected error occurred: {str(e)}"})
        except RuntimeError:
            pass
    finally:
        try:
            await websocket.close()
        except RuntimeError:
            pass


# --- Endpoint 2: Single Text Analysis (HTTP - Same as before) ---
@app.post("/analyze-text/")
async def analyze_text(item: TextItem):
    
    if not sentiment_pipeline:
        return {"error": "Model not loaded. Check server logs."}

    try:
        text_to_analyze = item.text
        result = sentiment_pipeline([text_to_analyze])[0] 
        sentiment = label_map.get(result['label'], 'unknown')
        
        return {
            "text": text_to_analyze,
            "sentiment": sentiment
        }

    except Exception as e:
        print(f"Error processing single text: {e}")
        return {"error": f"An error occurred: {str(e)}"}