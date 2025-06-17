from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from models import DATABASE_URL

# 데이터베이스 엔진 생성
engine = create_engine(DATABASE_URL)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 데이터베이스 세션 컨텍스트 매니저
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 