from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
import os
import shutil
from pydantic import BaseModel
from ocr_processor import OCRProcessor
from ocr_parser import parse_ocr_result
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
    allow_origins=["*"],  # 개발 환경에서는 모든 origin 허용
    allow_credentials=False,  # allow_origins=["*"]일 때는 False여야 함
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# OCR 프로세서 초기화
UPLOAD_FOLDER = 'uploads'
ocr_processor = OCRProcessor(UPLOAD_FOLDER)

class ProcessingResult(BaseModel):
    filename: str
    parsed: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class OCRResult(BaseModel):
    text: List[str]
    error: Optional[str] = None

@app.get("/")
async def root():
    """OCR 서버 상태 확인"""
    return {
        "message": "✅ OCR 서버가 정상적으로 실행 중입니다!",
        "status": "running",
        "available_endpoints": [
            "/api/ocr (POST) - OCR 처리",
            "/api/upload (POST) - 파일 업로드 및 OCR",
            "/docs - API 문서"
        ]
    }

@app.post("/api/ocr", response_model=OCRResult)
async def process_ocr(files: List[UploadFile] = File(...)):
    """OCR 전용 엔드포인트 - 프론트엔드 호환성을 위해 추가"""
    try:
        # 첫 번째 파일만 처리 (단일 파일 OCR용)
        file = files[0] if files else None
        if not file:
            return OCRResult(text=[], error="파일이 없습니다.")
        
        logger.info(f"📥 OCR request for file: {file.filename}")
        
        if not file.filename:
            logger.warning("⚠️ Empty filename received")
            return OCRResult(text=[], error="파일명이 없습니다.")
            
        if not ocr_processor.allowed_file(file.filename):
            logger.warning(f"⚠️ Unsupported file type: {file.filename}")
            return OCRResult(text=[], error="지원하지 않는 파일 형식입니다.")

        # uploads 폴더가 없으면 생성
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)

        # 파일 저장
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"📁 File saved: {file_path}")
            
            # OCR 처리
            ocr_result = await ocr_processor.process_image(file_path)
            logger.info(f"✅ OCR processing completed for {file.filename}")
            
            return OCRResult(text=ocr_result, error=None)
            
        except Exception as e:
            logger.error(f"❌ Error processing OCR for {file.filename}: {str(e)}", exc_info=True)
            return OCRResult(text=[], error=f"OCR 처리 중 오류가 발생했습니다: {str(e)}")
            
        finally:
            # 임시 파일 삭제
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"🗑 Temporary file removed: {file_path}")
            except Exception as e:
                logger.error(f"Error removing temporary file {file_path}: {str(e)}")
                
    except Exception as e:
        logger.error(f"❌ OCR endpoint error: {str(e)}", exc_info=True)
        return OCRResult(text=[], error=f"서버 오류가 발생했습니다: {str(e)}")

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
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"📁 File saved: {file_path}")
            
            # OCR 처리
            ocr_result = await ocr_processor.process_image(file_path)
            logger.info(f"✅ OCR processing completed for {file.filename}")
            
            # OCR 결과 파싱
            parsed_result = parse_ocr_result(ocr_result)
            logger.info(f"✅ Parsing completed for {file.filename}")
            logger.info(f"Parsed result: {parsed_result}")
            
            results.append(ProcessingResult(
                filename=file.filename,
                parsed=parsed_result
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