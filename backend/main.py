from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import os
import shutil
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from ocr_processor import OCRProcessor
import logging
import sys
from datetime import datetime

# 로깅 설정
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# 시작 로그
logger.info("Starting FastAPI application")

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://192.168.0.102:5174",
        "http://192.168.45.205:5174",
        # 개발 환경의 다른 출처들도 필요한 경우 여기에 추가
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# OCR 프로세서 초기화
UPLOAD_FOLDER = 'uploads'
ocr_processor = OCRProcessor(UPLOAD_FOLDER)

class ProcessingResult(BaseModel):
    filename: str
    extracted_text: List[str] = []
    error: str = None

class ClientLog(BaseModel):
    message: str
    level: str = "info"
    metadata: Dict = {}

@app.post("/api/log")
async def client_log(log_data: ClientLog):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_message = f"[{timestamp}] 📱 Client Log ({log_data.level}): {log_data.message}"
    if log_data.metadata:
        log_message += f"\nMetadata: {log_data.metadata}"
    
    if log_data.level == "error":
        logger.error(log_message)
    else:
        logger.info(log_message)
    return {"status": "ok"}

@app.post("/api/upload", response_model=List[ProcessingResult])
async def upload_files(files: List[UploadFile] = File(...)):
    results = []
    
    # uploads 폴더가 없으면 생성
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    
    for file in files:
        logger.info(f"📥 Received file: {file.filename}")
        logger.info(f"Content-Type: {file.content_type}")
        
        try:
            size = await file.read()
            await file.seek(0)  # 파일 포인터를 다시 처음으로
            logger.info(f"File size: {len(size)} bytes")
        except Exception as e:
            logger.error(f"Error reading file size: {str(e)}")
        
        if not file.filename:
            logger.warning("⚠️ Empty filename received")
            continue
            
        if not ocr_processor.allowed_file(file.filename):
            logger.warning(f"⚠️ Unsupported file type: {file.filename}")
            results.append(ProcessingResult(
                filename=file.filename,
                error="지원하지 않는 파일 형식입니다."
            ))
            continue

        # 파일 저장
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        try:
            logger.info(f"💾 Saving file to: {file_path}")
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # 파일 처리
            logger.info(f"🔍 Starting OCR processing for: {file.filename}")
            if file.filename.lower().endswith('.pdf'):
                extracted_text = await ocr_processor.process_pdf(file_path)
            else:
                extracted_text = await ocr_processor.process_image(file_path)
            
            logger.info(f"✅ OCR processing completed for: {file.filename}")
            logger.info(f"📝 Extracted text: {extracted_text}")
            
            results.append(ProcessingResult(
                filename=file.filename,
                extracted_text=extracted_text
            ))
            
        except Exception as e:
            logger.error(f"❌ Error processing file {file.filename}: {str(e)}", exc_info=True)
            results.append(ProcessingResult(
                filename=file.filename,
                error=f"파일 처리 중 오류가 발생했습니다: {str(e)}"
            ))
            
        finally:
            # 임시 파일 삭제
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"🗑 Temporary file removed: {file_path}")
            except Exception as e:
                logger.error(f"Error removing temporary file {file_path}: {str(e)}")
            
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 