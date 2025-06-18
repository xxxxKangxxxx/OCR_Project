#!/usr/bin/env python3
"""
데이터베이스 연결 및 테이블 생성 테스트 스크립트
"""

import sys
import logging
from sqlalchemy import create_engine, text
from models import Base, Company, BusinessCard, DATABASE_URL

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_connection():
    """데이터베이스 연결을 테스트합니다."""
    try:
        logger.info("데이터베이스 연결 테스트 시작...")
        
        # 엔진 생성
        engine = create_engine(DATABASE_URL)
        
        # 연결 테스트
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("✅ 데이터베이스 연결 성공!")
            
        # 테이블 생성
        logger.info("테이블 생성 중...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ 테이블 생성 완료!")
        
        # 테이블 확인
        with engine.connect() as conn:
            result = conn.execute(text("SHOW TABLES"))
            tables = result.fetchall()
            logger.info(f"생성된 테이블: {[table[0] for table in tables]}")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ 데이터베이스 연결 실패: {str(e)}")
        return False

def create_sample_data():
    """샘플 데이터를 생성합니다."""
    try:
        from database import SessionLocal
        
        db = SessionLocal()
        
        # 샘플 회사 생성
        sample_company = Company(name="테스트 회사")
        db.add(sample_company)
        db.commit()
        db.refresh(sample_company)
        
        # 샘플 명함 생성
        sample_card = BusinessCard(
            company_id=sample_company.id,
            name="홍길동",
            position="대리",
            email="hong@test.com",
            phone="010-1234-5678",
            address="서울시 강남구"
        )
        db.add(sample_card)
        db.commit()
        
        logger.info("✅ 샘플 데이터 생성 완료!")
        db.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ 샘플 데이터 생성 실패: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("데이터베이스 설정 테스트")
    print("=" * 50)
    
    # 데이터베이스 연결 테스트
    if test_database_connection():
        print("\n✅ 데이터베이스 연결 및 테이블 생성 성공!")
        
        # 샘플 데이터 생성 (선택사항)
        create_sample = input("\n샘플 데이터를 생성하시겠습니까? (y/n): ")
        if create_sample.lower() == 'y':
            create_sample_data()
    else:
        print("\n❌ 데이터베이스 설정에 문제가 있습니다.")
        print("MySQL 서버가 실행 중인지, 데이터베이스가 생성되었는지 확인해주세요.")
        sys.exit(1) 