#!/usr/bin/env python3
"""
데이터베이스 마이그레이션 스크립트
기존 테이블을 새로운 스키마로 업데이트합니다.
"""

import sys
import logging
from sqlalchemy import create_engine, text, inspect
from models import Base, Company, BusinessCard, BusinessCardHistory, DATABASE_URL

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def backup_existing_data(engine):
    """기존 데이터를 백업합니다."""
    try:
        logger.info("기존 데이터 백업 중...")
        
        with engine.connect() as conn:
            # 기존 테이블 존재 확인
            inspector = inspect(engine)
            existing_tables = inspector.get_table_names()
            
            if 'business_cards' in existing_tables:
                # 기존 데이터 조회
                result = conn.execute(text("SELECT * FROM business_cards"))
                cards = result.fetchall()
                logger.info(f"백업할 명함 데이터: {len(cards)}개")
                
                result = conn.execute(text("SELECT * FROM companies"))
                companies = result.fetchall()
                logger.info(f"백업할 회사 데이터: {len(companies)}개")
                
                return {'cards': cards, 'companies': companies}
            else:
                logger.info("기존 테이블이 없습니다. 새로운 데이터베이스를 생성합니다.")
                return None
                
    except Exception as e:
        logger.error(f"데이터 백업 실패: {str(e)}")
        return None

def migrate_database():
    """데이터베이스 마이그레이션을 수행합니다."""
    try:
        logger.info("데이터베이스 마이그레이션 시작...")
        
        # 엔진 생성
        engine = create_engine(DATABASE_URL)
        
        # 기존 데이터 백업
        backup_data = backup_existing_data(engine)
        
        # 기존 테이블 삭제 (주의: 실제 운영환경에서는 더 신중해야 함)
        logger.info("기존 테이블 삭제 중...")
        with engine.connect() as conn:
            # 외래키 제약조건 때문에 순서 중요
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
            conn.execute(text("DROP TABLE IF EXISTS business_card_history"))
            conn.execute(text("DROP TABLE IF EXISTS business_cards"))
            conn.execute(text("DROP TABLE IF EXISTS companies"))
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
            conn.commit()
        
        # 새로운 테이블 생성
        logger.info("새로운 테이블 생성 중...")
        Base.metadata.create_all(bind=engine)
        
        # 기존 데이터가 있다면 마이그레이션
        if backup_data:
            logger.info("기존 데이터 마이그레이션 중...")
            migrate_existing_data(engine, backup_data)
        
        logger.info("✅ 데이터베이스 마이그레이션 완료!")
        return True
        
    except Exception as e:
        logger.error(f"❌ 마이그레이션 실패: {str(e)}")
        return False

def migrate_existing_data(engine, backup_data):
    """기존 데이터를 새로운 스키마로 마이그레이션합니다."""
    try:
        from database import SessionLocal
        
        db = SessionLocal()
        
        # 회사 데이터 마이그레이션
        company_mapping = {}  # old_id -> new_id 매핑
        
        for old_company in backup_data['companies']:
            new_company = Company(
                name=old_company[1],  # name
                # created_at=old_company[2],  # 기존 생성일
                # updated_at=old_company[3]   # 기존 수정일
            )
            db.add(new_company)
            db.commit()
            db.refresh(new_company)
            
            company_mapping[old_company[0]] = new_company.id  # old_id -> new_id
            logger.info(f"회사 마이그레이션: {old_company[1]} (ID: {old_company[0]} -> {new_company.id})")
        
        # 명함 데이터 마이그레이션
        for old_card in backup_data['cards']:
            # 기존 필드 매핑 (인덱스 기반)
            # old_card: [id, company_id, name, position, email, phone, address, created_at, updated_at]
            
            new_card = BusinessCard(
                company_id=company_mapping.get(old_card[1]),  # 새로운 company_id
                name=old_card[2],        # name
                position=old_card[3],    # position
                email=old_card[4],       # email
                phone=old_card[5],       # phone
                address=old_card[6],     # address
                # created_at=old_card[7],  # 기존 생성일
                # updated_at=old_card[8]   # 기존 수정일
            )
            db.add(new_card)
            db.commit()
            db.refresh(new_card)
            
            # 마이그레이션 이력 저장
            history = BusinessCardHistory(
                business_card_id=new_card.id,
                action='migrated',
                new_value=f"Migrated from old database (old_id: {old_card[0]})"
            )
            db.add(history)
            
            logger.info(f"명함 마이그레이션: {old_card[2]} (ID: {old_card[0]} -> {new_card.id})")
        
        db.commit()
        db.close()
        
        logger.info("✅ 기존 데이터 마이그레이션 완료!")
        
    except Exception as e:
        logger.error(f"❌ 데이터 마이그레이션 실패: {str(e)}")
        db.rollback()
        db.close()
        raise e

def create_sample_data_enhanced():
    """향상된 샘플 데이터를 생성합니다."""
    try:
        from database import SessionLocal
        
        db = SessionLocal()
        
        # 샘플 회사들 생성
        companies_data = [
            {
                'name': '테크이노베이션',
                'industry': 'IT/소프트웨어',
                'website': 'https://techinnovation.co.kr',
                'description': '혁신적인 AI 솔루션을 제공하는 기술 기업'
            },
            {
                'name': '글로벌마케팅',
                'industry': '마케팅/광고',
                'website': 'https://globalmarketing.com',
                'description': '글로벌 마케팅 전문 컨설팅 회사'
            },
            {
                'name': '스마트솔루션',
                'industry': 'IT/시스템통합',
                'website': 'https://smartsolution.co.kr',
                'description': '기업용 스마트 솔루션 개발 및 구축'
            }
        ]
        
        created_companies = []
        for company_data in companies_data:
            company = Company(**company_data)
            db.add(company)
            db.commit()
            db.refresh(company)
            created_companies.append(company)
            logger.info(f"샘플 회사 생성: {company.name}")
        
        # 샘플 명함들 생성
        cards_data = [
            {
                'company_id': created_companies[0].id,
                'name': '김철수',
                'name_en': 'Kim Chul-soo',
                'position': 'CTO',
                'department': '기술본부',
                'email': 'chulsoo.kim@techinnovation.co.kr',
                'phone': '02-1234-5678',
                'mobile': '010-1234-5678',
                'address': '서울시 강남구 테헤란로 123',
                'postal_code': '06142',
                'tags': 'AI,머신러닝,기술리더',
                'memo': 'AI 전문가, 기술 파트너십 논의 가능',
                'is_favorite': True
            },
            {
                'company_id': created_companies[1].id,
                'name': '박영희',
                'name_en': 'Park Young-hee',
                'position': '마케팅 디렉터',
                'department': '마케팅팀',
                'email': 'younghee.park@globalmarketing.com',
                'phone': '02-9876-5432',
                'mobile': '010-9876-5432',
                'address': '서울시 서초구 강남대로 456',
                'postal_code': '06789',
                'tags': '디지털마케팅,브랜딩,글로벌',
                'memo': '글로벌 마케팅 전략 전문가'
            },
            {
                'company_id': created_companies[2].id,
                'name': '이민수',
                'position': '프로젝트 매니저',
                'department': '솔루션사업부',
                'email': 'minsu.lee@smartsolution.co.kr',
                'phone': '02-5555-1234',
                'mobile': '010-5555-1234',
                'address': '서울시 마포구 월드컵북로 789',
                'postal_code': '03789',
                'tags': '프로젝트관리,시스템구축,ERP',
                'memo': 'ERP 시스템 구축 전문가, 대기업 프로젝트 경험 풍부'
            }
        ]
        
        for card_data in cards_data:
            card = BusinessCard(**card_data)
            db.add(card)
            db.commit()
            db.refresh(card)
            
            # 생성 이력 저장
            history = BusinessCardHistory(
                business_card_id=card.id,
                action='created',
                new_value=f"Sample business card created for {card.name}"
            )
            db.add(history)
            
            logger.info(f"샘플 명함 생성: {card.name} ({card.company.name})")
        
        db.commit()
        db.close()
        
        logger.info("✅ 향상된 샘플 데이터 생성 완료!")
        return True
        
    except Exception as e:
        logger.error(f"❌ 샘플 데이터 생성 실패: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("데이터베이스 마이그레이션 도구")
    print("=" * 60)
    
    print("\n선택하세요:")
    print("1. 데이터베이스 마이그레이션 (기존 데이터 보존)")
    print("2. 새로운 데이터베이스 생성 + 샘플 데이터")
    print("3. 샘플 데이터만 추가")
    
    choice = input("\n선택 (1-3): ").strip()
    
    if choice == "1":
        if migrate_database():
            print("\n✅ 마이그레이션이 성공적으로 완료되었습니다!")
        else:
            print("\n❌ 마이그레이션에 실패했습니다.")
            sys.exit(1)
            
    elif choice == "2":
        if migrate_database():
            print("\n✅ 새로운 데이터베이스가 생성되었습니다!")
            if create_sample_data_enhanced():
                print("✅ 샘플 데이터도 생성되었습니다!")
        else:
            print("\n❌ 데이터베이스 생성에 실패했습니다.")
            sys.exit(1)
            
    elif choice == "3":
        if create_sample_data_enhanced():
            print("\n✅ 샘플 데이터가 생성되었습니다!")
        else:
            print("\n❌ 샘플 데이터 생성에 실패했습니다.")
            sys.exit(1)
            
    else:
        print("잘못된 선택입니다.")
        sys.exit(1) 