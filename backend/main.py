from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Query, Request, Body
from pydantic import BaseModel
import subprocess
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import shutil
import json
from datetime import datetime
import socket
from web3 import Web3
from merkle_utils import get_merkle_root, get_merkle_proof, verify_merkle_proof
import hashlib

# Import forensic analysis functionality
try:
    from forensic_api import forensic_analysis
    FORENSIC_AVAILABLE = True
except ImportError as e:
    print(f"Forensic API not available: {e}")
    FORENSIC_AVAILABLE = False

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

MERKLE_CONTRACT_ABI_PATH = os.path.join(os.path.dirname(__file__), "merkle_contract_abi.json")
MERKLE_TREES_PATH = os.path.join(os.path.dirname(__file__), "merkle_trees.json")
MERKLE_CONTRACT_ADDRESS = os.getenv("MERKLE_CONTRACT_ADDRESS")  # Set this in your .env or environment
WEB3_PROVIDER = os.getenv("WEB3_PROVIDER", "http://127.0.0.1:8545")

# Load contract ABI
with open(MERKLE_CONTRACT_ABI_PATH) as f:
    MERKLE_CONTRACT_ABI = json.load(f)

# Connect to web3
web3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER))
contract = None
if MERKLE_CONTRACT_ADDRESS:
    contract = web3.eth.contract(address=MERKLE_CONTRACT_ADDRESS, abi=MERKLE_CONTRACT_ABI)

# Helper to load/save Merkle trees off-chain

def load_merkle_trees():
    if os.path.exists(MERKLE_TREES_PATH):
        with open(MERKLE_TREES_PATH, 'r') as f:
            return json.load(f)
    return {}

def save_merkle_trees(data):
    with open(MERKLE_TREES_PATH, 'w') as f:
        json.dump(data, f, indent=2)

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

@app.post("/ai-analyze-case")
async def ai_analyze_case(case_number: str = Form(...)):
    try:
        if not FORENSIC_AVAILABLE:
            return {
                "status": "error",
                "message": "Forensic analysis service not available"
            }
        
        # Get all evidence files for the case
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        case_files = [f for f in os.listdir(uploads_dir) if f.startswith(f"{case_number}_")]
        
        if not case_files:
            return {
                "status": "error",
                "message": f"No evidence files found for case {case_number}"
            }
        
        # Create full paths to the image files
        image_paths = [os.path.join(uploads_dir, f) for f in case_files]
        
        # Perform forensic analysis
        analysis_result = forensic_analysis(image_paths)
        
        # Generate report filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"forensic_report_{case_number}_{timestamp}.txt"
        report_path = os.path.join(uploads_dir, report_filename)
        
        # Create the report content
        report_content = f"""
FORENSIC ANALYSIS REPORT
========================
Case Number: {case_number}
Analysis Date: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
Total Evidence Files: {len(case_files)}
Analysis Mode: {analysis_result.get('mode', 'unknown').upper()}

EVIDENCE FILES ANALYZED:
{chr(10).join([f"- {f}" for f in case_files])}

FILE ANALYSIS DETAILS:
"""
        
        # Add file analysis details if available
        if 'file_analysis' in analysis_result:
            for file_info in analysis_result['file_analysis']:
                report_content += f"""
File: {file_info.get('filename', 'Unknown')}
Size: {file_info.get('size_mb', 0)} MB
Status: {file_info.get('status', 'Unknown')}
"""
                if 'caption' in file_info:
                    report_content += f"AI Caption: {file_info['caption']}\n"
                report_content += "---\n"
        
        report_content += f"""
TOTAL FILES: {analysis_result.get('total_files', len(case_files))}
TOTAL SIZE: {analysis_result.get('total_size_mb', 0):.2f} MB

IMAGE CAPTIONS:
{chr(10).join([f"{i+1}. {caption}" for i, caption in enumerate(analysis_result.get('captions', []))])}

CHRONOLOGICAL SEQUENCE:
{analysis_result.get('best_order', 'No sequence determined')}

CONFIDENCE SCORE: {analysis_result.get('confidence', 0):.4f}

AI MODELS USED: {', '.join(analysis_result.get('ai_models_used', ['Basic Analysis']))}

FORENSIC NARRATIVE:
{analysis_result.get('narrative', 'No narrative generated')}

ALERTS FOR FURTHER INVESTIGATION:
- Review all evidence files for consistency
- Verify chronological sequence with additional sources
- Cross-reference with witness statements
- Check for any digital artifacts or metadata
- Perform additional digital forensics analysis
- Validate file integrity and authenticity

Report generated by AI Forensic Analysis System
Analysis completed at: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
"""
        
        # Save the report
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        return {
            "status": "success",
            "message": "AI analysis completed successfully",
            "analysis": analysis_result,
            "report_filename": report_filename,
            "case_files_analyzed": case_files
        }
        
    except Exception as e:
        print(f"Error in AI analysis: {str(e)}")
        return {
            "status": "error",
            "message": f"AI analysis failed: {str(e)}"
        }

@app.get("/download-report/{filename}")
def download_report(filename: str):
    try:
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        file_path = os.path.join(uploads_dir, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Report file not found")
        
        return FileResponse(
            file_path, 
            media_type="text/plain", 
            filename=filename,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/submit-evidence-hashes")
async def submit_evidence_hashes(
    case_number: str = Body(...),
    evidence_hashes: list = Body(...)
):
    """
    Accepts a case number and a list of evidence hashes, builds a Merkle tree, stores the root on-chain, and saves the tree/proofs off-chain.
    """
    if not contract:
        return {"status": "error", "message": "Contract not configured"}
    # Hash leaves (evidence hashes should be hex strings)
    leaves = [hashlib.sha256(h.encode()).hexdigest() for h in evidence_hashes]
    merkle_root = get_merkle_root(leaves)  # This is a string, not a coroutine
    if not merkle_root:
        return {"status": "error", "message": "Could not build Merkle tree"}
    # Store Merkle root on-chain
    try:
        account = web3.eth.accounts[0]
        merkle_root_bytes = bytes.fromhex(merkle_root)
        tx = contract.functions.storeMerkleRoot(case_number, merkle_root_bytes).build_transaction({
            'from': account,
            'nonce': web3.eth.get_transaction_count(account),
            'gas': 3000000,
            'gasPrice': web3.to_wei('1', 'gwei')
        })
        tx_hash = web3.eth.send_transaction(tx)
    except ValueError as e:
        return {"status": "error", "message": f"Invalid Merkle root hex: {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": f"Blockchain error: {str(e)}"}
    # Save Merkle tree and proofs off-chain
    merkle_trees = load_merkle_trees()
    merkle_trees[case_number] = {
        "evidence_hashes": evidence_hashes,
        "leaves": leaves,
        "merkle_root": merkle_root,
        "proofs": {h: get_merkle_proof(leaves, i) for i, h in enumerate(leaves)}
    }
    save_merkle_trees(merkle_trees)
    return {"status": "success", "merkle_root": merkle_root, "tx_hash": tx_hash.hex()}

@app.get("/get-merkle-root")
async def get_merkle_root_api(case_number: str):
    if not contract:
        return {"status": "error", "message": "Contract not configured"}
    merkle_root = contract.functions.getMerkleRoot(case_number).call()
    # Convert bytes to hex string if needed
    if isinstance(merkle_root, (bytes, bytearray)):
        merkle_root = merkle_root.hex()
    return {"status": "success", "merkle_root": merkle_root}

@app.get("/get-merkle-proof")
async def get_merkle_proof_api(case_number: str, evidence_hash: str):
    """
    Returns the Merkle proof for a given evidence hash and case number (from off-chain storage).
    """
    merkle_trees = load_merkle_trees()
    case_data = merkle_trees.get(case_number)
    if not case_data:
        return {"status": "error", "message": "Case not found"}
    # Hash the evidence_hash to match the leaf
    leaf = hashlib.sha256(evidence_hash.encode()).hexdigest()
    leaves = case_data["leaves"]
    if leaf not in leaves:
        return {"status": "error", "message": "Evidence hash not found in case"}
    index = leaves.index(leaf)
    proof = get_merkle_proof(leaves, index)
    return {"status": "success", "proof": proof, "merkle_root": case_data["merkle_root"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
