from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Query, Request
from pydantic import BaseModel
import subprocess
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import shutil
import json
from datetime import datetime
import socket

# Make blockchain import optional
try:
    from blockchain import BlockchainService
    BLOCKCHAIN_AVAILABLE = True
except ImportError:
    BLOCKCHAIN_AVAILABLE = False
    BlockchainService = None

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

class EvidenceRequest(BaseModel):
    caseNumber: str
    hash: str
    metadata: dict

class EvidenceRetrievalRequest(BaseModel):
    caseNumber: str
    transactionHash: str

class CreateCaseRequest(BaseModel):
    caseNumber: str
    description: str = ""

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

@app.post("/store-evidence")
async def store_evidence(request: EvidenceRequest):
    try:
        # Create blockchain service instance
        blockchain_service = BlockchainService()
        
        # Store evidence on blockchain
        result = blockchain_service.store_evidence(request.caseNumber, request.hash)
        
        return {
            "status": "success",
            "message": "Evidence stored on blockchain successfully",
            "transaction_hash": result["transaction_hash"],
            "block_number": result["block_number"]
        }
    except ConnectionError as e:
        print(f"Blockchain connection error: {str(e)}")
        return {
            "status": "error",
            "message": f"Blockchain service unavailable: {str(e)}",
            "details": "Make sure Ganache is running and the contract is deployed"
        }
    except FileNotFoundError as e:
        print(f"Contract file not found: {str(e)}")
        return {
            "status": "error",
            "message": f"Smart contract not deployed: {str(e)}",
            "details": "Run 'npm run blockchain:deploy' to deploy the contract"
        }
    except Exception as e:
        print(f"Error storing evidence on blockchain: {str(e)}")
        return {
            "status": "error",
            "message": f"Blockchain storage failed: {str(e)}",
            "details": "Check Ganache and contract deployment"
        }

@app.post("/get-evidence")
async def get_evidence(request: EvidenceRetrievalRequest):
    try:
        if not BLOCKCHAIN_AVAILABLE:
            return {
                "status": "error",
                "message": "Blockchain service not available"
            }
        
        # Create blockchain service instance
        blockchain_service = BlockchainService()
        
        # Retrieve evidence from blockchain
        result = blockchain_service.get_evidence(request.caseNumber)
        
        return {
            "status": "success",
            "message": "Evidence retrieved from blockchain successfully",
            "case_number": result["case_number"],
            "hash": result["hash"]
        }
    except Exception as e:
        print(f"Error retrieving evidence from blockchain: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/blockchain-status")
async def blockchain_status():
    try:
        if not BLOCKCHAIN_AVAILABLE:
            return {
                "status": "unavailable",
                "message": "Blockchain service not available"
            }
        
        # Create blockchain service instance
        blockchain_service = BlockchainService()
        
        # Check if blockchain connection is working
        is_connected = blockchain_service.web3.is_connected()
        return {
            "status": "connected" if is_connected else "disconnected",
            "network": "localhost" if is_connected else "unknown",
            "contract_address": blockchain_service.contract_address
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@app.get("/download-evidence")
def download_evidence(case_number: str = Query(..., description="Case number to download evidence for")):
    try:
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        # Find all files for the given case number
        files = [f for f in os.listdir(uploads_dir) if f.startswith(f"{case_number}_")]
        if not files:
            return {"status": "error", "message": "No evidence files found for this case.", "files": []}
        
        # Get the current server's IP address dynamically
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        
        # Return file names and download URLs with dynamic backend URL
        file_infos = [
            {
                "filename": f,
                "url": f"http://{local_ip}:8000/download-file/{f}"
            }
            for f in files
        ]
        return {"status": "success", "files": file_infos}
    except Exception as e:
        return {"status": "error", "message": str(e), "files": []}

@app.get("/download-file/{filename}")
def download_file(filename: str):
    uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
    file_path = os.path.join(uploads_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="application/octet-stream", filename=filename)

@app.post("/delete-evidence-file")
async def delete_evidence_file(request: Request):
    try:
        data = await request.json()
        filename = data.get("filename")
        if not filename:
            return {"status": "error", "message": "Filename is required."}
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        file_path = os.path.join(uploads_dir, filename)
        if not os.path.exists(file_path):
            return {"status": "error", "message": "File not found."}
        os.remove(file_path)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/create-case")
async def create_case(request: CreateCaseRequest):
    try:
        # Create a new case with the provided data
        new_case = {
            "id": f"case_{datetime.now().timestamp()}",
            "caseNumber": request.caseNumber,
            "description": request.description,
            "createdAt": datetime.now().isoformat(),
            "photoCount": 0,
            "processedCount": 0,
            "thumbnails": []
        }
        
        # Save to cases.json file
        cases_file = os.path.join(os.path.dirname(__file__), "cases.json")
        cases = []
        
        # Load existing cases if file exists
        if os.path.exists(cases_file):
            with open(cases_file, 'r') as f:
                cases = json.load(f)
        
        # Add new case
        cases.append(new_case)
        
        # Save updated cases
        with open(cases_file, 'w') as f:
            json.dump(cases, f, indent=2)
        
        return {
            "status": "success",
            "message": "Case created successfully",
            "case": new_case
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to create case: {str(e)}"
        }

@app.get("/cases")
async def get_cases():
    try:
        # In a real app, you would fetch this from a database
        # For now, we'll return an empty list or mock data
        # You can extend this to read from a JSON file or database
        cases = []
        
        # Check if there's a cases.json file to load existing cases
        cases_file = os.path.join(os.path.dirname(__file__), "cases.json")
        if os.path.exists(cases_file):
            with open(cases_file, 'r') as f:
                cases = json.load(f)
        
        return {
            "status": "success",
            "cases": cases
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to fetch cases: {str(e)}",
            "cases": []
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
