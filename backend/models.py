from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any, Annotated
from datetime import datetime
from bson import ObjectId
from pydantic import BeforeValidator

def validate_object_id(v):
    if isinstance(v, ObjectId):
        return v
    if isinstance(v, str) and ObjectId.is_valid(v):
        return ObjectId(v)
    raise ValueError("Invalid ObjectId")

# Pydantic v2 호환 ObjectId 타입
PyObjectId = Annotated[ObjectId, BeforeValidator(validate_object_id)]

# 사용자 모델
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None

class UserInDB(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class User(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

# 명함 모델 (기존 로컬스토리지 구조 유지 + 파일 저장 기능 추가)
class BusinessCardBase(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    mobile_phone_number: Optional[str] = None
    fax_number: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    company_name: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    ocr_raw_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    original_filename: Optional[str] = None
    stored_filename: Optional[str] = None
    file_path: Optional[str] = None
    processing_status: Optional[str] = None  # "processing", "completed", "failed"
    isFavorite: bool = False

class BusinessCardCreate(BusinessCardBase):
    pass

class BusinessCardUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    mobile_phone_number: Optional[str] = None
    fax_number: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    company_name: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    ocr_raw_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    isFavorite: Optional[bool] = None

class BusinessCardInDB(BusinessCardBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class BusinessCard(BusinessCardBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

# 회사 모델
class CompanyBase(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyInDB(CompanyBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Company(CompanyBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

# JWT 토큰 모델
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# API 응답 모델
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
    processing_status: Optional[str] = None  # "processing", "completed", "failed"
    card_id: Optional[str] = None  # 생성된 명함 ID
    error: Optional[str] = None 