from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any, Tuple
import os
import shutil
from pydantic import BaseModel
from ocr_processor import OCRProcessor
from ocr_parser import parse_ocr_result
import logging
import sys
from datetime import datetime
from contextlib import asynccontextmanager

# 새로운 import들
from database import connect_to_mongo, close_mongo_connection
from auth_routes import router as auth_router
from business_card_routes import router as cards_router

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

# 애플리케이션 수명주기 관리
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 실행
    logger.info("🚀 FastAPI 애플리케이션 시작")
    
    # MongoDB 연결
    try:
        await connect_to_mongo()
        logger.info("✅ MongoDB 연결 완료")
    except Exception as e:
        logger.error(f"❌ MongoDB 연결 실패: {e}")
        raise
    
    yield
    
    # 종료 시 실행
    logger.info("🔌 FastAPI 애플리케이션 종료")
    await close_mongo_connection()

# FastAPI 앱 생성
app = FastAPI(
    title="Cardlet OCR API",
    description="AI 기반 명함 스캔 및 OCR 서비스 API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서는 모든 origin 허용
    allow_credentials=False,  # allow_origins=["*"]일 때는 False여야 함
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# 라우터 등록
app.include_router(auth_router)
app.include_router(cards_router)

# OCR 프로세서 초기화
UPLOAD_FOLDER = 'uploads'
ocr_processor = OCRProcessor(UPLOAD_FOLDER)

# 기존 모델들 (하위 호환성을 위해 유지)
class ProcessingResult(BaseModel):
    filename: str
    parsed: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class LogoResult(BaseModel):
    bbox: Optional[List[float]] = None
    confidence: Optional[float] = None
    method: Optional[str] = None
    logo_path: Optional[str] = None
    logo_size: Optional[Tuple[int, int]] = None

class OCRResult(BaseModel):
    text: List[str]
    name: Optional[str] = None
    name_en: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    position: Optional[str] = None
    company_name: Optional[str] = None
    address: Optional[str] = None
    mobile_phone_number: Optional[str] = None
    fax_number: Optional[str] = None
    department: Optional[str] = None
    postal_code: Optional[str] = None
    ocr_raw_text: Optional[str] = None
    logo: Optional[LogoResult] = None
    error: Optional[str] = None

@app.get("/")
async def root():
    """서버 상태 확인"""
    return {
        "message": "✅ Cardlet OCR 서버가 정상적으로 실행 중입니다!",
        "version": "2.0.0",
        "status": "running",
        "features": [
            "JWT 인증 시스템",
            "MongoDB 데이터베이스",
            "사용자별 명함 관리",
            "OCR 처리 및 파싱"
        ],
        "available_endpoints": [
            "/api/auth/login (POST) - 로그인",
            "/api/auth/register (POST) - 회원가입", 
            "/api/auth/me (GET) - 사용자 정보",
            "/api/cards/ (GET) - 명함 목록 조회",
            "/api/cards/ocr (POST) - OCR 처리 및 저장",
            "/api/ocr (POST) - 레거시 OCR 처리",
            "/docs - API 문서"
        ]
    }

# 하위 호환성을 위한 레거시 엔드포인트들
@app.post("/api/ocr", response_model=OCRResult)
async def process_ocr_legacy(files: List[UploadFile] = File(...)):
    """레거시 OCR 엔드포인트 - 인증 없이 OCR만 처리 (하위 호환성)"""
    try:
        # 첫 번째 파일만 처리 (단일 파일 OCR용)
        file = files[0] if files else None
        if not file:
            return OCRResult(text=[], error="파일이 없습니다.")
        
        logger.info(f"📥 레거시 OCR 요청: {file.filename}")
        
        if not file.filename:
            logger.warning("⚠️ 파일명이 없습니다")
            return OCRResult(text=[], error="파일명이 없습니다.")
            
        if not ocr_processor.allowed_file(file.filename):
            logger.warning(f"⚠️ 지원하지 않는 파일 형식: {file.filename}")
            return OCRResult(text=[], error="지원하지 않는 파일 형식입니다.")

        # uploads 폴더가 없으면 생성
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)

        # 파일 저장
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"📁 파일 저장: {file_path}")
            
            # OCR + 로고 처리
            enhanced_result = await ocr_processor.process_image_with_logo(file_path)
            ocr_result = enhanced_result['text']
            logo_result = enhanced_result.get('logo')
            
            logger.info(f"✅ OCR + 로고 처리 완료: {file.filename}")
            
            # OCR 결과 파싱
            parsed_result = parse_ocr_result(ocr_result, file.filename)
            logger.info(f"✅ 파싱 완료: {file.filename}")
            
            # 로고 결과 처리
            logo_data = None
            if logo_result:
                logo_data = LogoResult(
                    bbox=logo_result.get('bbox'),
                    confidence=logo_result.get('confidence'),
                    method=logo_result.get('method'),
                    logo_path=logo_result.get('logo_path'),
                    logo_size=logo_result.get('logo_size')
                )
            
            # OCR 결과와 파싱 결과 합치기
            return OCRResult(
                text=ocr_result,
                name=parsed_result.get('name'),
                name_en=parsed_result.get('name_en'),
                email=parsed_result.get('email'),
                phone_number=parsed_result.get('phone'),
                position=parsed_result.get('position'),
                company_name=parsed_result.get('company_name'),
                address=parsed_result.get('address'),
                mobile_phone_number=parsed_result.get('mobile'),
                fax_number=parsed_result.get('fax'),
                department=parsed_result.get('department'),
                postal_code=parsed_result.get('postal_code'),
                ocr_raw_text=parsed_result.get('ocr_raw_text'),
                logo=logo_data,
                error=None
            )
            
        except Exception as e:
            logger.error(f"❌ OCR 처리 오류 {file.filename}: {str(e)}", exc_info=True)
            return OCRResult(text=[], error=f"OCR 처리 중 오류가 발생했습니다: {str(e)}")
            
        finally:
            # 임시 파일 삭제
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"🗑 임시 파일 삭제: {file_path}")
            except Exception as e:
                logger.error(f"임시 파일 삭제 오류 {file_path}: {str(e)}")
                
    except Exception as e:
        logger.error(f"❌ 레거시 OCR 엔드포인트 오류: {str(e)}", exc_info=True)
        return OCRResult(text=[], error=f"서버 오류가 발생했습니다: {str(e)}")

@app.post("/api/upload", response_model=List[ProcessingResult])
async def upload_files_legacy(files: List[UploadFile] = File(...)):
    """레거시 업로드 엔드포인트 - 하위 호환성"""
    logger.warning("⚠️ 레거시 업로드 엔드포인트 사용됨. /api/cards/ocr 사용을 권장합니다.")
    
    results = []
    
    # uploads 폴더가 없으면 생성
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    
    for file in files:
        logger.info(f"📥 레거시 업로드: {file.filename}")
        
        if not file.filename:
            logger.warning("⚠️ 파일명이 없습니다")
            continue
            
        if not ocr_processor.allowed_file(file.filename):
            logger.warning(f"⚠️ 지원하지 않는 파일 형식: {file.filename}")
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
            logger.info(f"📁 파일 저장: {file_path}")
            
            # OCR 처리
            ocr_result = await ocr_processor.process_image(file_path)
            logger.info(f"✅ OCR 처리 완료: {file.filename}")
            
            # OCR 결과 파싱
            parsed_result = parse_ocr_result(ocr_result)
            logger.info(f"✅ 파싱 완료: {file.filename}")
            
            results.append(ProcessingResult(
                filename=file.filename,
                parsed=parsed_result
            ))
            
        except Exception as e:
            logger.error(f"❌ 파일 처리 오류 {file.filename}: {str(e)}", exc_info=True)
            results.append(ProcessingResult(
                filename=file.filename,
                error=f"파일 처리 중 오류가 발생했습니다: {str(e)}"
            ))
            
        finally:
            # 임시 파일 삭제
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"🗑 임시 파일 삭제: {file_path}")
            except Exception as e:
                logger.error(f"임시 파일 삭제 오류 {file_path}: {str(e)}")

    return results

@app.post("/api/extract-logo", response_model=LogoResult)
async def extract_logo_only(file: UploadFile = File(...)):
    """로고만 추출하는 엔드포인트"""
    logger.info(f"🔍 로고 추출 요청: {file.filename}")
    
    if not ocr_processor.allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다.")
    
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    
    try:
        # 파일 저장
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"📁 파일 저장: {file_path}")
        
        # 로고 추출
        logo_result = ocr_processor.extract_logo_only(file_path)
        
        if logo_result:
            logger.info(f"✅ 로고 추출 성공: {file.filename}")
            return LogoResult(
                bbox=logo_result.get('bbox'),
                confidence=logo_result.get('confidence'),
                method=logo_result.get('method'),
                logo_path=logo_result.get('logo_path'),
                logo_size=logo_result.get('logo_size')
            )
        else:
            logger.info(f"❌ 로고를 찾을 수 없음: {file.filename}")
            return LogoResult()  # 빈 결과 반환
            
    except Exception as e:
        logger.error(f"❌ 로고 추출 오류 {file.filename}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"로고 추출 중 오류가 발생했습니다: {str(e)}")
        
    finally:
        # 임시 파일 삭제
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"🗑 임시 파일 삭제: {file_path}")
        except Exception as e:
            logger.error(f"임시 파일 삭제 오류 {file_path}: {str(e)}")

# 헬스 체크 엔드포인트
@app.get("/health")
async def health_check():
    """서버 헬스 체크"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0"
    }

@app.get("/api/schema")
async def get_database_schema():
    """데이터베이스 스키마 정보 조회"""
    return {
        "collections": {
            "users": {
                "description": "사용자 정보",
                "fields": {
                    "_id": "ObjectId - 고유 ID",
                    "username": "str - 사용자명 (고유)",
                    "email": "str - 이메일 주소 (고유)",
                    "full_name": "str - 전체 이름 (선택사항)",
                    "hashed_password": "str - 해시된 비밀번호",
                    "is_active": "bool - 활성 상태",
                    "created_at": "datetime - 생성일시",
                    "updated_at": "datetime - 수정일시"
                }
            },
            "business_cards": {
                "description": "명함 정보 (사용자별)",
                "fields": {
                    "_id": "ObjectId - 고유 ID",
                    "user_id": "ObjectId - 사용자 ID (참조)",
                    "name": "str - 이름",
                    "name_en": "str - 영문 이름",
                    "email": "str - 이메일",
                    "phone_number": "str - 전화번호",
                    "mobile_phone_number": "str - 휴대폰",
                    "fax_number": "str - 팩스",
                    "position": "str - 직책",
                    "department": "str - 부서",
                    "company_name": "str - 회사명",
                    "address": "str - 주소",
                    "postal_code": "str - 우편번호",
                    "ocr_raw_text": "str - 원본 OCR 텍스트",
                    "ocr_confidence": "float - OCR 신뢰도",
                    "isFavorite": "bool - 즐겨찾기 여부",
                    "created_at": "datetime - 생성일시",
                    "updated_at": "datetime - 수정일시"
                }
            },
            "companies": {
                "description": "회사 정보 (사용자별)",
                "fields": {
                    "_id": "ObjectId - 고유 ID",
                    "user_id": "ObjectId - 사용자 ID (참조)",
                    "name": "str - 회사명",
                    "address": "str - 회사 주소",
                    "phone": "str - 회사 전화",
                    "website": "str - 웹사이트",
                    "industry": "str - 업종",
                    "created_at": "datetime - 생성일시",
                    "updated_at": "datetime - 수정일시"
                }
            }
        },
        "indexes": {
            "users": ["username", "email"],
            "business_cards": ["user_id", "company_name", "created_at"],
            "companies": ["user_id", "name"]
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 