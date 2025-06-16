from fastapi import FastAPI, HTTPException, File, UploadFile
from pydantic import BaseModel
import subprocess
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import shutil

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
    return {"message": "FastAPI backend server is running!"}

@app.post("/process-photo")
async def process_photo(photo: UploadFile = File(...), caseNumber: str = None):
    try:
        # Save the uploaded photo
        photo_path = os.path.join(os.path.dirname(__file__), f"uploads/{photo.filename}")
        os.makedirs(os.path.dirname(photo_path), exist_ok=True)
        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

        # Mock processing logic (replace with actual processing)
        return {
            "id": 1,
            "metadata": {
                "timestamp": "2023-01-01T00:00:00Z",
                "location": "Mock Location",
                "size": "1024x768",
                "format": "JPEG",
            },
            "analysis": {
                "objects": ["evidence", "document"],
                "confidence": 0.95,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/retrieve-photo")
async def retrieve_photo(jsonData: dict):
    try:
        # Mock retrieval logic (replace with actual retrieval)
        return FileResponse("path/to/retrieved/photo.jpg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
