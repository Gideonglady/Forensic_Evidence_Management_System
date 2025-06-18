from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import shutil
import os
import torch
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration, T5Tokenizer, T5ForConditionalGeneration, pipeline

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models ONCE at startup
BLIP_MODEL_NAME = "Salesforce/blip-image-captioning-base"
T5_MODEL_NAME = "t5-small"
GPT_MODEL_NAME = "gpt2"

device = "cuda" if torch.cuda.is_available() else "cpu"

# BLIP for image captioning
blip_processor = BlipProcessor.from_pretrained(BLIP_MODEL_NAME)
blip_model = BlipForConditionalGeneration.from_pretrained(BLIP_MODEL_NAME, from_tf=True).to(device)

# T5 for sequence ordering
order_tokenizer = T5Tokenizer.from_pretrained(T5_MODEL_NAME)
order_model = T5ForConditionalGeneration.from_pretrained(T5_MODEL_NAME).to(device)

# GPT for narrative generation
story_gen = pipeline("text-generation", model=GPT_MODEL_NAME, device=0 if device == "cuda" else -1)

def forensic_analysis(image_paths: list):
    captions = []
    image_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.gif')
    # Step 1: Caption extraction with BLIP
    for img_path in image_paths:
        try:
            raw_image = Image.open(img_path).convert('RGB')
            inputs = blip_processor(raw_image, return_tensors="pt").to(device)
            out = blip_model.generate(**inputs)
            caption = blip_processor.decode(out[0], skip_special_tokens=True)
            captions.append(caption)
        except Exception as e:
            captions.append(f"Error processing {os.path.basename(img_path)}: {e}")
    unique_captions = list(dict.fromkeys(captions))
    
    # Step 2: Sequence ordering with T5
    max_captions = 20
    input_text = " ; ".join(unique_captions[:max_captions])
    input_ids = order_tokenizer(f"order the events: {input_text}", return_tensors="pt", max_length=512, truncation=True).input_ids.to(device)
    outputs = order_model.generate(
        input_ids,
        num_return_sequences=3,
        num_beams=5,
        output_scores=True,
        return_dict_in_generate=True,
        max_length=128
    )
    ordered_scenarios = []
    for seq, score in zip(outputs.sequences, outputs.sequences_scores):
        ordered_text = order_tokenizer.decode(seq, skip_special_tokens=True)
        confidence = torch.exp(score).item()
        ordered_scenarios.append((ordered_text, confidence))
    best_order, best_score = ordered_scenarios[0]
    clean_order = best_order.replace('; order the events :', '').strip()
    
    # Step 3: Narrative generation with GPT
    prompt = (
        "You are a forensic analyst. Based on the following sequence of events, "
        "write a formal, third-person forensic report. Do not include dialogue or instructions. "
        "Clearly describe the sequence of events, highlight any suspicious activities, and conclude with an 'Alerts for Further Investigation' section.\n\n"
        f"Chronological Events:\n{clean_order}\n\n"
        "Forensic Scenario:"
    )
    result = story_gen(prompt, max_new_tokens=200)
    generated_text = result[0]['generated_text']
    if prompt in generated_text:
        narrative_only = generated_text[len(prompt):].strip()
    else:
        narrative_only = generated_text.strip()
    return {
        "status": "success",
        "captions": unique_captions,
        "ordered_scenarios": ordered_scenarios,
        "best_order": clean_order,
        "confidence": best_score,
        "narrative": narrative_only
    }

@app.post("/analyze")
async def analyze_images(files: List[UploadFile] = File(...)):
    try:
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        image_paths = []
        for file in files:
            file_path = os.path.join(upload_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            image_paths.append(file_path)
        result = forensic_analysis(image_paths)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {"message": "Forensic FastAPI backend is running!"}
