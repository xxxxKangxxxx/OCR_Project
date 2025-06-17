from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import easyocr
import cv2
import numpy as np
from PIL import Image
import io
import os
from datetime import datetime
import logging
from models import Company, BusinessCard, Base, get_db_engine
from database import get_db
from pydantic import BaseModel

# 모델 스키마 정의
class CompanyResponse(BaseModel):
    id: int
    name: str
    cardCount: int

    class Config:
        from_attributes = True

class BusinessCardResponse(BaseModel):
    id: int
    name: str
    position: str
    email: str
    phone: str
    address: str

    class Config:
        from_attributes = True

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터베이스 초기화
engine = get_db_engine()
Base.metadata.create_all(bind=engine)

# OCR 리더 초기화
reader = easyocr.Reader(['ko', 'en'])

# 회사 목록 조회 API
@app.get("/api/companies", response_model=List[CompanyResponse])
async def get_companies(db: Session = Depends(get_db)):
    # 회사별 명함 수 조회
    companies = db.query(Company).all()
    
    response = []
    for company in companies:
        response.append(CompanyResponse(
            id=company.id,
            name=company.name,
            cardCount=len(company.business_cards)
        ))
    
    return response

# 특정 회사의 명함 목록 조회 API
@app.get("/api/companies/{company_name}/cards", response_model=List[BusinessCardResponse])
async def get_company_cards(company_name: str, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.name == company_name).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return [BusinessCardResponse(
        id=card.id,
        name=card.name,
        position=card.position,
        email=card.email,
        phone=card.phone,
        address=card.address
    ) for card in company.business_cards]

# OCR 결과를 데이터베이스에 저장하는 함수
def save_ocr_result(text_data: List[str], db: Session):
    # OCR 결과에서 필요한 정보 추출 (이 부분은 OCR 결과 형식에 따라 수정 필요)
    company_name = None
    name = None
    position = None
    email = None
    phone = None
    address = None
    
    for text in text_data:
        # 여기에 OCR 결과 파싱 로직 구현
        # 예: 이메일, 전화번호, 회사명 등을 정규식으로 추출
        pass
    
    if company_name:
        # 회사 정보 저장/조회
        company = db.query(Company).filter(Company.name == company_name).first()
        if not company:
            company = Company(name=company_name)
            db.add(company)
            db.commit()
            db.refresh(company)
        
        # 명함 정보 저장
        business_card = BusinessCard(
            company_id=company.id,
            name=name,
            position=position,
            email=email,
            phone=phone,
            address=address
        )
        db.add(business_card)
        db.commit()
        db.refresh(business_card)
        
        return business_card
    return None

# 파일 업로드 및 OCR 처리 API
@app.post("/api/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
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
            
            # 데이터베이스에 저장
            business_card = save_ocr_result(extracted_text, db)
            
            results.append({
                "filename": file.filename,
                "extracted_text": extracted_text,
                "saved": bool(business_card)
            })
            
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 