from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
import os
import shutil
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from ocr_processor import OCRProcessor
import logging
import sys
from datetime import datetime
from sqlalchemy.orm import Session
from models import Company, BusinessCard, BusinessCardHistory, Base, get_db_engine
from database import get_db
import re
import json

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

# 데이터베이스 초기화
engine = get_db_engine()
Base.metadata.create_all(bind=engine)
logger.info("Database initialized")

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
    extracted_text: List[str] = []
    error: str = None
    saved_to_db: bool = False
    business_card_id: int = None

class ClientLog(BaseModel):
    message: str
    level: str = "info"
    metadata: Dict = {}

class CompanyResponse(BaseModel):
    id: int
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    cardCount: int

    class Config:
        from_attributes = True

class BusinessCardResponse(BaseModel):
    id: int
    company_name: str
    name: Optional[str] = None
    name_en: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    fax: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    original_filename: Optional[str] = None
    tags: Optional[str] = None
    memo: Optional[str] = None
    is_favorite: bool = False
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True

@app.get("/")
async def root():
    return {"message": "OCR Server is running", "status": "ok"}

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
async def upload_files(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
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
            
            # OCR 결과를 데이터베이스에 저장
            saved_to_db = False
            business_card_id = None
            
            if extracted_text and len(extracted_text) > 0:
                try:
                    logger.info("💾 Starting database save process")
                    parsed_data = parse_ocr_result(extracted_text, file.filename)
                    business_card = save_business_card(parsed_data, db, file.filename)
                    saved_to_db = True
                    business_card_id = business_card.id
                    logger.info(f"✅ Successfully saved to database with ID: {business_card_id}")
                except Exception as e:
                    logger.error(f"❌ Failed to save to database: {str(e)}")
                    # 데이터베이스 저장 실패해도 OCR 결과는 반환
            
            results.append(ProcessingResult(
                filename=file.filename,
                extracted_text=extracted_text,
                saved_to_db=saved_to_db,
                business_card_id=business_card_id
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

def parse_ocr_result(text_data: List[str], filename: str = None) -> Dict[str, any]:
    """OCR 결과에서 명함 정보를 추출합니다."""
    result = {
        'company_name': None,
        'name': None,
        'name_en': None,
        'position': None,
        'department': None,
        'email': None,
        'phone': None,
        'mobile': None,
        'fax': None,
        'address': None,
        'postal_code': None,
        'original_filename': filename,
        'ocr_raw_text': json.dumps(text_data, ensure_ascii=False),
        'ocr_confidence': 80,  # 기본값, 나중에 실제 신뢰도로 교체
        'tags': None,
        'memo': None
    }
    
    # 모든 텍스트를 하나의 문자열로 합치기
    full_text = ' '.join(text_data)
    
    # 이메일 추출
    email_patterns = [
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        r'\b[가-힣A-Za-z0-9._%+-]+@[가-힣A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    ]
    
    for pattern in email_patterns:
        email_match = re.search(pattern, full_text)
        if email_match:
            result['email'] = email_match.group()
            break
    
    # 전화번호 추출 (한국 전화번호 패턴)
    phone_patterns = [
        r'(\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})',  # 02-1234-5678, 010-1234-5678
        r'(\d{3}[-\s]?\d{4}[-\s]?\d{4})',      # 010-1234-5678
        r'(\+82[-\s]?\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4})'  # +82-10-1234-5678
    ]
    
    phones_found = []
    for pattern in phone_patterns:
        phone_matches = re.findall(pattern, full_text)
        for match in phone_matches:
            phone_num = match.replace(' ', '-') if isinstance(match, str) else match[0].replace(' ', '-')
            phones_found.append(phone_num)
    
    # 첫 번째를 일반 전화번호로, 두 번째를 휴대폰으로 분류
    if phones_found:
        if phones_found[0].startswith('010') or phones_found[0].startswith('+82-10'):
            result['mobile'] = phones_found[0]
            if len(phones_found) > 1:
                result['phone'] = phones_found[1]
        else:
            result['phone'] = phones_found[0]
            if len(phones_found) > 1 and (phones_found[1].startswith('010') or phones_found[1].startswith('+82-10')):
                result['mobile'] = phones_found[1]
    
    # 우편번호 추출
    postal_patterns = [
        r'\b\d{5}\b',  # 5자리 우편번호
        r'\b\d{3}-\d{3}\b'  # 구 우편번호 형식
    ]
    
    for pattern in postal_patterns:
        postal_match = re.search(pattern, full_text)
        if postal_match:
            result['postal_code'] = postal_match.group()
            break
    
    # 영문 이름 추출 (대문자로 시작하는 영문 단어들)
    english_name_pattern = r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b'
    english_match = re.search(english_name_pattern, full_text)
    if english_match:
        result['name_en'] = english_match.group()
    
    # 한국어 텍스트 분석을 위한 개선된 로직
    korean_texts = [text for text in text_data if re.search(r'[가-힣]', text)]
    english_texts = [text for text in text_data if re.search(r'[A-Za-z]', text) and not re.search(r'[가-힣]', text)]
    
    # 회사명 추정 (가장 긴 텍스트 또는 특정 키워드 포함)
    company_keywords = ['주식회사', '(주)', '㈜', '유한회사', '(유)', 'Co.', 'Ltd', 'Inc', 'Corp']
    company_candidates = []
    
    for text in text_data:
        if any(keyword in text for keyword in company_keywords):
            company_candidates.append(text)
        elif len(text) > 5 and not any(char.isdigit() for char in text):
            company_candidates.append(text)
    
    if company_candidates:
        result['company_name'] = max(company_candidates, key=len)
    elif text_data:
        result['company_name'] = text_data[0]
    
    # 이름 추정 (한국어 2-4글자 또는 영문 이름)
    name_candidates = []
    for text in korean_texts:
        if 2 <= len(text) <= 4 and text.replace(' ', '').isalpha():
            name_candidates.append(text)
    
    if name_candidates:
        result['name'] = name_candidates[0]
    
    # 직책 추정
    position_keywords = ['대표', '이사', '부장', '과장', '차장', '대리', '주임', '사원', '팀장', '실장', 
                        'CEO', 'CTO', 'CFO', 'Manager', 'Director', 'President']
    
    for text in text_data:
        if any(keyword in text for keyword in position_keywords):
            result['position'] = text
            break
    
    # 부서 추정
    department_keywords = ['부', '팀', '실', '센터', '본부', '사업부', 'Department', 'Division']
    
    for text in text_data:
        if any(keyword in text for keyword in department_keywords) and text != result['position']:
            result['department'] = text
            break
    
    # 주소 추정 (긴 텍스트나 주소 키워드 포함)
    address_keywords = ['시', '구', '동', '로', '길', '번지', '층', '호', '빌딩', '타워']
    address_candidates = []
    
    for text in text_data:
        if len(text) > 10 or any(keyword in text for keyword in address_keywords):
            address_candidates.append(text)
    
    if address_candidates:
        result['address'] = max(address_candidates, key=len)
    
    logger.info(f"Parsed OCR result: {result}")
    return result

def save_business_card(parsed_data: Dict[str, any], db: Session, filename: str = None) -> BusinessCard:
    """파싱된 명함 정보를 데이터베이스에 저장합니다."""
    try:
        company_name = parsed_data.get('company_name')
        if not company_name:
            logger.warning("Company name not found, using default")
            company_name = "Unknown Company"
        
        # 회사 정보 저장/조회
        company = db.query(Company).filter(Company.name == company_name).first()
        if not company:
            company = Company(name=company_name)
            db.add(company)
            db.commit()
            db.refresh(company)
            logger.info(f"Created new company: {company_name}")
        else:
            logger.info(f"Found existing company: {company_name}")
        
        # 명함 정보 저장
        business_card = BusinessCard(
            company_id=company.id,
            name=parsed_data.get('name'),
            name_en=parsed_data.get('name_en'),
            position=parsed_data.get('position'),
            department=parsed_data.get('department'),
            email=parsed_data.get('email'),
            phone=parsed_data.get('phone'),
            mobile=parsed_data.get('mobile'),
            fax=parsed_data.get('fax'),
            address=parsed_data.get('address'),
            postal_code=parsed_data.get('postal_code'),
            original_filename=filename,
            ocr_raw_text=parsed_data.get('ocr_raw_text'),
            ocr_confidence=parsed_data.get('ocr_confidence'),
            tags=parsed_data.get('tags'),
            memo=parsed_data.get('memo')
        )
        
        db.add(business_card)
        db.commit()
        db.refresh(business_card)
        
        # 이력 저장
        history = BusinessCardHistory(
            business_card_id=business_card.id,
            action='created',
            new_value=f"Created business card for {parsed_data.get('name', 'Unknown')}"
        )
        db.add(history)
        db.commit()
        
        logger.info(f"Saved business card with ID: {business_card.id}")
        return business_card
        
    except Exception as e:
        logger.error(f"Error saving business card: {str(e)}")
        db.rollback()
        raise e

@app.get("/api/companies")
async def get_companies(db: Session = Depends(get_db)):
    """회사 목록과 각 회사별 명함 수를 조회합니다."""
    try:
        companies = db.query(Company).all()
        
        response = []
        for company in companies:
            active_cards = [card for card in company.business_cards if card.is_active]
            response.append(CompanyResponse(
                id=company.id,
                name=company.name,
                industry=company.industry,
                website=company.website,
                cardCount=len(active_cards)
            ))
        
        logger.info(f"Retrieved {len(response)} companies")
        return response
    except Exception as e:
        logger.error(f"Error retrieving companies: {str(e)}")
        raise HTTPException(status_code=500, detail="회사 목록을 불러오는 중 오류가 발생했습니다.")

@app.get("/api/companies/{company_id}/cards")
async def get_company_cards(company_id: int, db: Session = Depends(get_db)):
    """특정 회사의 명함 목록을 조회합니다."""
    try:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="회사를 찾을 수 없습니다.")
        
        cards = []
        for card in company.business_cards:
            if card.is_active:  # 활성 상태인 명함만 조회
                cards.append(BusinessCardResponse(
                    id=card.id,
                    company_name=company.name,
                    name=card.name,
                    name_en=card.name_en,
                    position=card.position,
                    department=card.department,
                    email=card.email,
                    phone=card.phone,
                    mobile=card.mobile,
                    fax=card.fax,
                    address=card.address,
                    postal_code=card.postal_code,
                    original_filename=card.original_filename,
                    tags=card.tags,
                    memo=card.memo,
                    is_favorite=card.is_favorite,
                    is_active=card.is_active,
                    created_at=card.created_at
                ))
        
        logger.info(f"Retrieved {len(cards)} cards for company {company.name}")
        return cards
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving company cards: {str(e)}")
        raise HTTPException(status_code=500, detail="명함 목록을 불러오는 중 오류가 발생했습니다.")

@app.get("/api/cards")
async def get_all_cards(db: Session = Depends(get_db)):
    """모든 명함 목록을 조회합니다."""
    try:
        cards = db.query(BusinessCard).join(Company).filter(BusinessCard.is_active == True).all()
        
        response = []
        for card in cards:
            response.append(BusinessCardResponse(
                id=card.id,
                company_name=card.company.name,
                name=card.name,
                name_en=card.name_en,
                position=card.position,
                department=card.department,
                email=card.email,
                phone=card.phone,
                mobile=card.mobile,
                fax=card.fax,
                address=card.address,
                postal_code=card.postal_code,
                original_filename=card.original_filename,
                tags=card.tags,
                memo=card.memo,
                is_favorite=card.is_favorite,
                is_active=card.is_active,
                created_at=card.created_at
            ))
        
        logger.info(f"Retrieved {len(response)} total cards")
        return response
    except Exception as e:
        logger.error(f"Error retrieving all cards: {str(e)}")
        raise HTTPException(status_code=500, detail="명함 목록을 불러오는 중 오류가 발생했습니다.")

@app.get("/api/cards/{card_id}")
async def get_card_detail(card_id: int, db: Session = Depends(get_db)):
    """특정 명함의 상세 정보를 조회합니다."""
    try:
        card = db.query(BusinessCard).join(Company).filter(BusinessCard.id == card_id).first()
        if not card:
            raise HTTPException(status_code=404, detail="명함을 찾을 수 없습니다.")
        
        response = BusinessCardResponse(
            id=card.id,
            company_name=card.company.name,
            name=card.name,
            name_en=card.name_en,
            position=card.position,
            department=card.department,
            email=card.email,
            phone=card.phone,
            mobile=card.mobile,
            fax=card.fax,
            address=card.address,
            postal_code=card.postal_code,
            original_filename=card.original_filename,
            tags=card.tags,
            memo=card.memo,
            is_favorite=card.is_favorite,
            is_active=card.is_active,
            created_at=card.created_at
        )
        
        logger.info(f"Retrieved card detail for ID: {card_id}")
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving card detail: {str(e)}")
        raise HTTPException(status_code=500, detail="명함 정보를 불러오는 중 오류가 발생했습니다.")

@app.delete("/api/cards/{card_id}")
async def delete_card(card_id: int, db: Session = Depends(get_db)):
    """명함을 삭제합니다 (소프트 삭제)."""
    try:
        card = db.query(BusinessCard).filter(BusinessCard.id == card_id).first()
        if not card:
            raise HTTPException(status_code=404, detail="명함을 찾을 수 없습니다.")
        
        # 소프트 삭제 (is_active를 False로 설정)
        card.is_active = False
        db.commit()
        
        # 이력 저장
        history = BusinessCardHistory(
            business_card_id=card.id,
            action='deleted',
            old_value=f"Card for {card.name} was active",
            new_value="Card was deactivated"
        )
        db.add(history)
        db.commit()
        
        logger.info(f"Soft deleted card with ID: {card_id}")
        return {"message": "명함이 성공적으로 삭제되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting card: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="명함 삭제 중 오류가 발생했습니다.")

# 새로운 API 엔드포인트들 추가
@app.put("/api/cards/{card_id}/favorite")
async def toggle_favorite(card_id: int, db: Session = Depends(get_db)):
    """명함 즐겨찾기 상태를 토글합니다."""
    try:
        card = db.query(BusinessCard).filter(BusinessCard.id == card_id).first()
        if not card:
            raise HTTPException(status_code=404, detail="명함을 찾을 수 없습니다.")
        
        old_status = card.is_favorite
        card.is_favorite = not card.is_favorite
        db.commit()
        
        # 이력 저장
        history = BusinessCardHistory(
            business_card_id=card.id,
            action='updated',
            field_name='is_favorite',
            old_value=str(old_status),
            new_value=str(card.is_favorite)
        )
        db.add(history)
        db.commit()
        
        status = "추가" if card.is_favorite else "제거"
        logger.info(f"Toggled favorite status for card ID: {card_id}")
        return {"message": f"즐겨찾기에서 {status}되었습니다.", "is_favorite": card.is_favorite}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling favorite: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="즐겨찾기 상태 변경 중 오류가 발생했습니다.")

@app.get("/api/cards/favorites")
async def get_favorite_cards(db: Session = Depends(get_db)):
    """즐겨찾기 명함 목록을 조회합니다."""
    try:
        cards = db.query(BusinessCard).join(Company).filter(
            BusinessCard.is_active == True,
            BusinessCard.is_favorite == True
        ).all()
        
        response = []
        for card in cards:
            response.append(BusinessCardResponse(
                id=card.id,
                company_name=card.company.name,
                name=card.name,
                name_en=card.name_en,
                position=card.position,
                department=card.department,
                email=card.email,
                phone=card.phone,
                mobile=card.mobile,
                fax=card.fax,
                address=card.address,
                postal_code=card.postal_code,
                original_filename=card.original_filename,
                tags=card.tags,
                memo=card.memo,
                is_favorite=card.is_favorite,
                is_active=card.is_active,
                created_at=card.created_at
            ))
        
        logger.info(f"Retrieved {len(response)} favorite cards")
        return response
    except Exception as e:
        logger.error(f"Error retrieving favorite cards: {str(e)}")
        raise HTTPException(status_code=500, detail="즐겨찾기 명함 목록을 불러오는 중 오류가 발생했습니다.")

@app.get("/api/search")
async def search_cards(q: str, db: Session = Depends(get_db)):
    """명함을 검색합니다."""
    try:
        # 이름, 회사명, 이메일, 전화번호로 검색
        cards = db.query(BusinessCard).join(Company).filter(
            BusinessCard.is_active == True,
            (BusinessCard.name.like(f"%{q}%")) |
            (Company.name.like(f"%{q}%")) |
            (BusinessCard.email.like(f"%{q}%")) |
            (BusinessCard.phone.like(f"%{q}%")) |
            (BusinessCard.mobile.like(f"%{q}%")) |
            (BusinessCard.position.like(f"%{q}%"))
        ).all()
        
        response = []
        for card in cards:
            response.append(BusinessCardResponse(
                id=card.id,
                company_name=card.company.name,
                name=card.name,
                name_en=card.name_en,
                position=card.position,
                department=card.department,
                email=card.email,
                phone=card.phone,
                mobile=card.mobile,
                fax=card.fax,
                address=card.address,
                postal_code=card.postal_code,
                original_filename=card.original_filename,
                tags=card.tags,
                memo=card.memo,
                is_favorite=card.is_favorite,
                is_active=card.is_active,
                created_at=card.created_at
            ))
        
        logger.info(f"Search '{q}' returned {len(response)} results")
        return response
    except Exception as e:
        logger.error(f"Error searching cards: {str(e)}")
        raise HTTPException(status_code=500, detail="명함 검색 중 오류가 발생했습니다.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 