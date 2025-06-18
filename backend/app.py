from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import easyocr
import cv2
import numpy as np
from PIL import Image
import io
import os
from datetime import datetime
import logging
from pydantic import BaseModel

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OCR 리더 초기화
reader = easyocr.Reader(['ko', 'en'])

class ProcessingResult(BaseModel):
    filename: str
    extracted_text: List[str]
    error: str = None

@app.post("/api/upload", response_model=List[ProcessingResult])
async def upload_files(files: List[UploadFile] = File(...)):
    results = []
    
    for file in files:
        try:
            # 파일 읽기
            contents = await file.read()
            
            # 이미지로 변환
            image = Image.open(io.BytesIO(contents))
            image_np = np.array(image)
            
            # OCR 처리
            ocr_result = reader.readtext(image_np)
            extracted_text = [text[1] for text in ocr_result]
            
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
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 