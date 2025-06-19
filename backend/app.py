from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import cv2
import numpy as np
from PIL import Image
import io
import os
import tempfile
from datetime import datetime
import logging
from pydantic import BaseModel
from ocr_processor import OCRProcessor

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OCR 프로세서 초기화
upload_folder = "uploads"
ocr_processor = OCRProcessor(upload_folder)

class ProcessingResult(BaseModel):
    filename: str
    extracted_text: List[str]
    error: str = None

class OCRResult(BaseModel):
    text: List[str]
    error: str = None

@app.post("/api/ocr", response_model=OCRResult)
async def process_ocr(file: UploadFile = File(...)):
    temp_file = None
    try:
        # 임시 파일 생성
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as temp_file:
            contents = await file.read()
            temp_file.write(contents)
            temp_file_path = temp_file.name
        
        # OCR 처리 (고급 전처리 포함)
        extracted_text = await ocr_processor.process_image(temp_file_path)
        
        return {
            "text": extracted_text,
            "error": None
        }
        
    except Exception as e:
        return {
            "text": [],
            "error": str(e)
        }
    finally:
        # 임시 파일 삭제
        if temp_file and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/api/upload", response_model=List[ProcessingResult])
async def upload_files(files: List[UploadFile] = File(...)):
    results = []
    
    for file in files:
        temp_file = None
        try:
            # 임시 파일 생성
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as temp_file:
                contents = await file.read()
                temp_file.write(contents)
                temp_file_path = temp_file.name
            
            # OCR 처리 (고급 전처리 포함)
            extracted_text = await ocr_processor.process_image(temp_file_path)
            
            results.append({
                "filename": file.filename,
                "extracted_text": extracted_text,
                "error": None
            })
            
        except Exception as e:
            results.append({
                "filename": file.filename,
                "extracted_text": [],
                "error": str(e)
            })
        finally:
            # 임시 파일 삭제
            if temp_file and os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 