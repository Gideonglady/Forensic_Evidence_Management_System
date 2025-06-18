from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
import subprocess
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import shutil
import json
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PipelineResponse(BaseModel):
    message: str
    output: str = None
    error: str = None

@app.post("/api/run-pipeline", response_model=PipelineResponse)
def run_pipeline():
    notebook_path = os.path.join(os.path.dirname(__file__), 'Untitled8.ipynb')
    output_path = os.path.join(os.path.dirname(__file__), 'output.ipynb')
    try:
        result = subprocess.run([
            'papermill', notebook_path, output_path
        ], capture_output=True, text=True, check=False)
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail={
                "message": "Pipeline execution failed",
                "error": result.stderr or result.stdout
            })
        return PipelineResponse(message="Pipeline executed successfully", output=result.stdout)
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "message": "Pipeline execution failed",
            "error": str(e)
        })

@app.get("/")
def root():
    return {"message": "FastAPI backend server is running!", "status": "healthy"}

@app.post("/process-photo")
async def process_photo(photo: UploadFile = File(...), caseNumber: str = Form(None)):
    try:
        # Create uploads directory if it doesn't exist
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Save the uploaded photo
        photo_path = os.path.join(uploads_dir, f"{caseNumber}_{photo.filename}")
        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

        # Mock processing logic (replace with actual processing)
        return {
            "id": f"photo_{datetime.now().timestamp()}",
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "location": "Mock Location",
                "size": "1024x768",
                "format": "JPEG",
                "filename": photo.filename,
                "caseNumber": caseNumber,
            },
            "analysis": {
                "objects": ["evidence", "document"],
                "confidence": 0.95,
                "processing_status": "completed",
            },
        }
    except Exception as e:
        print(f"Error processing photo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/retrieve-photo")
async def retrieve_photo(jsonData: dict):
    try:
        # Mock retrieval logic (replace with actual retrieval)
        # For now, return a success response
        return {
            "status": "success",
            "message": "Photo retrieved successfully",
            "data": jsonData
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
