from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 관계 설정
    business_cards = relationship("BusinessCard", back_populates="company")

class BusinessCard(Base):
    __tablename__ = "business_cards"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    name = Column(String(50))
    position = Column(String(50))
    email = Column(String(100))
    phone = Column(String(20))
    address = Column(String(200))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 관계 설정
    company = relationship("Company", back_populates="business_cards")

# 데이터베이스 연결 설정
DATABASE_URL = "mysql+pymysql://root:1005@localhost/business_cards_db"

def get_db_engine():
    return create_engine(DATABASE_URL) 