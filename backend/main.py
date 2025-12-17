from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Query, Request, Body
from pydantic import BaseModel
import subprocess
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
import shutil
import json
from datetime import datetime
import socket
from web3 import Web3
from merkle_utils import get_merkle_root, get_merkle_proof, verify_merkle_proof
import hashlib
import zipfile
import io
from blake3 import blake3
from PIL import Image, ExifTags
import geocoder

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
except Exception as e:
    print(f"[main.py] BlockchainService import failed: {e}")
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

class DeleteCaseRequest(BaseModel):
    id: str

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
        if not caseNumber or not caseNumber.strip():
            raise HTTPException(status_code=400, detail="caseNumber is required.")
        if not photo:
            raise HTTPException(status_code=400, detail="Photo file is required.")
        # Create uploads directory if it doesn't exist
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        # Sanitize filename
        safe_filename = os.path.basename(photo.filename)
        photo_path = os.path.join(uploads_dir, f"{caseNumber}_{safe_filename}")
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
                "filename": safe_filename,
                "caseNumber": caseNumber,
            },
            "analysis": {
                "objects": ["evidence", "document"],
                "confidence": 0.95,
                "processing_status": "completed",
            },
        }
    except HTTPException as e:
        print(f"[process-photo] {e.detail}")
        raise
    except Exception as e:
        print(f"[process-photo] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while processing photo.")

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
        if not request.caseNumber or not request.caseNumber.strip():
            raise HTTPException(status_code=400, detail="caseNumber is required.")
        if not request.hash or not request.hash.strip():
            raise HTTPException(status_code=400, detail="Evidence hash is required.")
        # Load existing Merkle trees
        merkle_trees = load_merkle_trees()
        # Get or initialize case data
        case_data = merkle_trees.get(request.caseNumber, {
            "evidence_hashes": [],
            "merkle_root": None
        })
        # Add new evidence hash
        case_data["evidence_hashes"].append(request.hash)
        # Calculate new Merkle root
        new_root = get_merkle_root(case_data["evidence_hashes"])
        case_data["merkle_root"] = new_root
        # Update Merkle trees data
        merkle_trees[request.caseNumber] = case_data
        save_merkle_trees(merkle_trees)
        try:
            if not hasattr(contract, 'functions') or contract is None:
                raise HTTPException(status_code=503, detail="Blockchain contract is not initialized. Please check deployment and configuration.")
            blockchain_service = BlockchainService()
            print(f"[store-evidence] Calling addEvidence with caseNumber={request.caseNumber}, hash={request.hash}")
            tx_result = blockchain_service.contract.functions.addEvidence(
                request.caseNumber,
                bytes.fromhex(request.hash)
            ).transact({'from': blockchain_service.account})
            print(f"[store-evidence] addEvidence tx hash: {tx_result.hex()}")
            print(f"[store-evidence] Calling storeMerkleRoot with caseNumber={request.caseNumber}, new_root={new_root}")
            root_result = blockchain_service.contract.functions.storeMerkleRoot(
                request.caseNumber,
                bytes.fromhex(new_root)
            ).transact({'from': blockchain_service.account})
            print(f"[store-evidence] storeMerkleRoot tx hash: {root_result.hex()}")
            tx_receipt = blockchain_service.web3.eth.wait_for_transaction_receipt(tx_result)
            root_receipt = blockchain_service.web3.eth.wait_for_transaction_receipt(root_result)
            print(f"[store-evidence] addEvidence receipt: {tx_receipt}")
            print(f"[store-evidence] storeMerkleRoot receipt: {root_receipt}")
            return {
                "status": "success",
                "message": "Evidence stored and Merkle root updated successfully",
                "transaction_hash": tx_receipt.transactionHash.hex(),
                "root_transaction_hash": root_receipt.transactionHash.hex(),
                "block_number": tx_receipt.blockNumber,
                "merkle_root": new_root
            }
        except HTTPException as e:
            print(f"[store-evidence] {e.detail}")
            raise
        except Exception as e:
            print(f"[store-evidence] Blockchain error: {str(e)}")
            import traceback; traceback.print_exc()
            return JSONResponse(status_code=502, content={
                "status": "partial_success",
                "message": "Evidence stored locally but blockchain update failed",
                "error": str(e),
                "merkle_root": new_root
            })
    except HTTPException as e:
        print(f"[store-evidence] {e.detail}")
        raise
    except Exception as e:
        print(f"[store-evidence] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while storing evidence.")

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
        if not case_number or not case_number.strip():
            raise HTTPException(status_code=400, detail="case_number is required.")
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        files = [f for f in os.listdir(uploads_dir) if f.startswith(f"{case_number}_")]
        if not files:
            return JSONResponse(status_code=404, content={"status": "error", "message": "No evidence files found for this case.", "files": []})
        local_ip = socket.gethostbyname(socket.gethostname())

        # Load Merkle tree to get hashes
        merkle_trees = load_merkle_trees()
        case_data = merkle_trees.get(case_number, {})
        evidence_hashes = case_data.get("evidence_hashes", [])

        file_infos = []
        for i, f in enumerate(files):
            file_info = {
                "filename": f,
                "url": f"http://{local_ip}:8000/download-file/{f}"
            }
            # Attach the salted hash if available (assume order matches for now)
            if i < len(evidence_hashes):
                file_info["hash"] = evidence_hashes[i]
            file_infos.append(file_info)

        return {"status": "success", "files": file_infos}
    except HTTPException as e:
        print(f"[download-evidence] {e.detail}")
        raise
    except Exception as e:
        print(f"[download-evidence] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching evidence files.")

@app.post("/delete-evidence-file")
async def delete_evidence_file(request: Request):
    try:
        data = await request.json()
        filename = data.get("filename")
        if not filename or not filename.strip():
            raise HTTPException(status_code=400, detail="Filename is required.")
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        safe_filename = os.path.basename(filename)
        file_path = os.path.join(uploads_dir, safe_filename)
        if not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"status": "error", "message": "File not found."})
        try:
            os.remove(file_path)
            return {"status": "success"}
        except Exception as e:
            print(f"[delete-evidence-file] Error deleting {safe_filename}: {str(e)}")
            return JSONResponse(status_code=500, content={"status": "error", "message": f"Failed to delete file: {str(e)}"})
    except HTTPException as e:
        print(f"[delete-evidence-file] {e.detail}")
        raise
    except Exception as e:
        print(f"[delete-evidence-file] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while deleting evidence file.")

@app.get("/download-file/{filename}")
def download_file(filename: str):
    try:
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        safe_filename = os.path.basename(filename)
        file_path = os.path.join(uploads_dir, safe_filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found.")
        return FileResponse(file_path, media_type="application/octet-stream", filename=safe_filename)
    except HTTPException as e:
        print(f"[download-file] {e.detail}")
        raise
    except Exception as e:
        print(f"[download-file] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while downloading file.")

@app.post("/create-case")
async def create_case(request: CreateCaseRequest):
    try:
        # Save to cases.json file
        cases_file = os.path.join(os.path.dirname(__file__), "cases.json")
        cases = []
        # Load existing cases if file exists
        if os.path.exists(cases_file):
            with open(cases_file, 'r') as f:
                cases = json.load(f)
        # Check for duplicate caseNumber
        if any(case["caseNumber"] == request.caseNumber for case in cases):
            return JSONResponse(status_code=409, content={
                "status": "error",
                "message": f"Case number '{request.caseNumber}' already exists. Please use a unique case number."
            })
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
        return JSONResponse(status_code=500, content={
            "status": "error",
            "message": f"Failed to create case: {str(e)}"
        })

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
        if not case_number or not case_number.strip():
            raise HTTPException(status_code=400, detail="case_number is required.")
        if not FORENSIC_AVAILABLE:
            return JSONResponse(status_code=503, content={"status": "error", "message": "Forensic analysis service not available"})
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        case_files = [f for f in os.listdir(uploads_dir) if f.startswith(f"{case_number}_")]
        if not case_files:
            return JSONResponse(status_code=404, content={"status": "error", "message": f"No evidence files found for case {case_number}"})
        image_paths = [os.path.join(uploads_dir, f) for f in case_files]
        analysis_result = forensic_analysis(image_paths)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"forensic_report_{case_number}_{timestamp}.txt"
        report_path = os.path.join(uploads_dir, report_filename)
        # Generate the report content
        report_content = f"""
FORENSIC ANALYSIS REPORT
========================
Case Number: {case_number}
Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Total Evidence Files: {len(case_files)}
Analysis Mode: {analysis_result.get('mode', 'unknown').upper()}

EVIDENCE FILES ANALYZED:
{chr(10).join([f'- {f}' for f in case_files])}

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
Analysis completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
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
    except HTTPException as e:
        print(f"[ai-analyze-case] {e.detail}")
        raise
    except Exception as e:
        print(f"[ai-analyze-case] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during AI analysis.")

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

@app.get("/get-merkle-root")
async def get_merkle_root_api(case_number: str):
    try:
        merkle_trees = load_merkle_trees()
        case_data = merkle_trees.get(case_number)
        if not case_data or not case_data.get("merkle_root"):
            raise HTTPException(status_code=404, detail="Merkle root not found for this case.")
        return {"status": "success", "merkle_root": case_data["merkle_root"]}
    except HTTPException as e:
        print(f"[get-merkle-root] {e.detail}")
        raise
    except Exception as e:
        print(f"[get-merkle-root] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching Merkle root.")

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

@app.get("/download-all-evidence/{case_number}")
async def download_all_evidence(case_number: str):
    try:
        # Create a BytesIO object to store the ZIP file
        zip_buffer = io.BytesIO()
        
        # Create a ZIP file
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
            
            # Get all files for this case
            case_files = [f for f in os.listdir(uploads_dir) if f.startswith(f"{case_number}_")]
            
            if not case_files:
                raise HTTPException(status_code=404, detail="No evidence files found for this case")
            
            # Add each file to the ZIP
            for filename in case_files:
                file_path = os.path.join(uploads_dir, filename)
                zip_file.write(file_path, filename)
        
        # Seek to the beginning of the BytesIO buffer
        zip_buffer.seek(0)
        
        # Return the ZIP file as a streaming response
        return StreamingResponse(
            iter([zip_buffer.getvalue()]),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="evidence_{case_number}.zip"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/delete-case")
async def delete_case(request: DeleteCaseRequest):
    try:
        # Load cases data
        cases_file = os.path.join(os.path.dirname(__file__), "cases.json")
        with open(cases_file, 'r') as f:
            cases = json.load(f)
        
        # Find the case by unique id
        case_index = next((i for i, case in enumerate(cases) if case["id"] == request.id), -1)
        if case_index == -1:
            return JSONResponse(status_code=404, content={
                "status": "error",
                "message": f"Case with id '{request.id}' not found."
            })
        case = cases[case_index]
        case_number = case["caseNumber"]
        
        # Remove case from cases.json
        cases.pop(case_index)
        with open(cases_file, 'w') as f:
            json.dump(cases, f, indent=2)
        
        # Delete evidence files
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        deleted_files = []
        failed_files = []
        if os.path.exists(uploads_dir):
            case_files = [f for f in os.listdir(uploads_dir) if f.startswith(f"{case_number}_")]
            for file in case_files:
                try:
                    os.remove(os.path.join(uploads_dir, file))
                    deleted_files.append(file)
                except Exception as e:
                    failed_files.append(file)
        
        # Remove from Merkle trees data
        merkle_cleanup_error = None
        try:
            merkle_trees = load_merkle_trees()
            if case_number in merkle_trees:
                del merkle_trees[case_number]
                save_merkle_trees(merkle_trees)
        except Exception as e:
            merkle_cleanup_error = str(e)
        
        # Build response
        response = {
            "status": "success",
            "message": f"Case '{case_number}' (id: {request.id}) and associated evidence deleted successfully.",
            "deleted_files": deleted_files,
            "failed_files": failed_files
        }
        if merkle_cleanup_error:
            response["merkle_cleanup_error"] = merkle_cleanup_error
        return JSONResponse(status_code=200, content=response)
    except Exception as e:
        # Log error with context
        print(f"[delete-case] Error deleting case id={getattr(request, 'id', None)}: {str(e)}")
        return JSONResponse(status_code=500, content={
            "status": "error",
            "message": "Internal server error while deleting case.",
            "details": str(e)
        })

@app.post("/submit-evidence-hashes")
async def submit_evidence_hashes(
    case_number: str = Body(...),
    evidence_hashes: list = Body(...)
):
    try:
        if not contract or not hasattr(contract, 'functions'):
            raise HTTPException(status_code=503, detail="Blockchain contract is not initialized. Please check deployment and configuration.")
        # Hash leaves (evidence hashes should be hex strings)
        leaves = [hashlib.sha256(h.encode()).hexdigest() for h in evidence_hashes]
        merkle_root = get_merkle_root(leaves)
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
    except HTTPException as e:
        print(f"[submit-evidence-hashes] {e.detail}")
        raise
    except Exception as e:
        print(f"[submit-evidence-hashes] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while submitting evidence hashes.")

def get_location():
    g = geocoder.ip('me')
    if g.ok:
        return round(g.latlng[0], 6), round(g.latlng[1], 6)
    return None, None

def get_image_creation_time(image_path):
    try:
        image = Image.open(image_path)
        exif_data = image._getexif()
        if not exif_data:
            return None
        for tag_id, value in exif_data.items():
            tag = ExifTags.TAGS.get(tag_id, tag_id)
            if tag == 'DateTimeOriginal':
                return value.replace(" ", "T") + "Z"
    except:
        pass
    return None

def generate_salted_hash(image_path):
    with open(image_path, 'rb') as f:
        image_data = f.read()
    lat, lng = get_location()
    timestamp = get_image_creation_time(image_path)
    if None in (lat, lng, timestamp):
        # Use hardcoded example values if metadata is missing
        lat, lng = lat or 12.9716, lng or 77.5946  # Example: Bangalore
        timestamp = timestamp or "2024-06-19T12:00:00Z"
    mid = len(image_data) // 2
    first_half = image_data[:mid]
    second_half = image_data[mid:]
    salted_input = str(lat).encode() + first_half + timestamp.encode() + second_half + str(lng).encode()
    final_hash = blake3(salted_input).hexdigest()
    return final_hash, f"{lat}, {lng}", timestamp, None

@app.post('/salted-hash')
async def salted_hash(image: UploadFile = File(...)):
    try:
        upload_dir = os.path.join(os.path.dirname(__file__), 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, image.filename)
        with open(file_path, 'wb') as f:
            f.write(await image.read())
        hash_output, location, timestamp, error = generate_salted_hash(file_path)
        if error:
            return {"error": error}
        return {"hash": hash_output, "location": location, "timestamp": timestamp}
    except Exception as e:
        print(f"[salted-hash] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while generating salted hash.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
