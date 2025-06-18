from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, index=True, nullable=False)  # 회사명 길이 증가
    industry = Column(String(100), nullable=True)  # 업종
    website = Column(String(255), nullable=True)   # 웹사이트
    description = Column(Text, nullable=True)      # 회사 설명
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    
    # 관계 설정
    business_cards = relationship("BusinessCard", back_populates="company", cascade="all, delete-orphan")

class BusinessCard(Base):
    __tablename__ = "business_cards"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 개인 정보
    name = Column(String(100), nullable=True, index=True)           # 이름 (검색용 인덱스)
    name_en = Column(String(100), nullable=True)                   # 영문 이름
    position = Column(String(100), nullable=True)                  # 직책
    department = Column(String(100), nullable=True)                # 부서
    
    # 연락처 정보
    email = Column(String(255), nullable=True, index=True)          # 이메일 (검색용 인덱스)
    phone = Column(String(30), nullable=True, index=True)           # 전화번호 (검색용 인덱스)
    mobile = Column(String(30), nullable=True)                     # 휴대폰
    fax = Column(String(30), nullable=True)                        # 팩스
    
    # 주소 정보
    address = Column(Text, nullable=True)                          # 주소
    postal_code = Column(String(20), nullable=True)               # 우편번호
    
    # OCR 관련 정보
    original_filename = Column(String(255), nullable=True)          # 원본 파일명
    ocr_raw_text = Column(Text, nullable=True)                     # OCR 원본 텍스트 (JSON 형태)
    ocr_confidence = Column(Integer, nullable=True)                # OCR 신뢰도 (0-100)
    
    # 추가 정보
    tags = Column(String(500), nullable=True)                      # 태그 (쉼표로 구분)
    memo = Column(Text, nullable=True)                             # 메모
    is_favorite = Column(Boolean, default=False, nullable=False)   # 즐겨찾기
    is_active = Column(Boolean, default=True, nullable=False)      # 활성 상태
    
    # 타임스탬프
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    
    # 관계 설정
    company = relationship("Company", back_populates="business_cards")

# 새로운 테이블: 명함 이력 관리
class BusinessCardHistory(Base):
    __tablename__ = "business_card_history"
    
    id = Column(Integer, primary_key=True, index=True)
    business_card_id = Column(Integer, ForeignKey("business_cards.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)  # 'created', 'updated', 'deleted'
    field_name = Column(String(100), nullable=True)  # 변경된 필드명
    old_value = Column(Text, nullable=True)      # 이전 값
    new_value = Column(Text, nullable=True)      # 새 값
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    
    # 관계 설정
    business_card = relationship("BusinessCard")

# 데이터베이스 연결 설정
DATABASE_URL = "mysql+pymysql://root:1005@localhost/business_cards_db"

def get_db_engine():
    return create_engine(
        DATABASE_URL,
        pool_pre_ping=True,      # 연결 상태 확인
        pool_recycle=3600,       # 1시간마다 연결 재생성
        echo=False               # SQL 쿼리 로그 (개발시에만 True)
    ) 