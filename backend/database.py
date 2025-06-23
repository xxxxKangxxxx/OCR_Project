from motor.motor_asyncio import AsyncIOMotorClient
import pymongo
from config import MONGODB_URL, DATABASE_NAME
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    database = None

# MongoDB 연결
async def connect_to_mongo():
    """MongoDB에 연결"""
    try:
        Database.client = AsyncIOMotorClient(MONGODB_URL)
        Database.database = Database.client[DATABASE_NAME]
        
        # 연결 테스트
        await Database.client.admin.command('ping')
        logger.info(f"✅ MongoDB 연결 성공: {DATABASE_NAME}")
        
        # 인덱스 생성
        await create_indexes()
        
    except Exception as e:
        logger.error(f"❌ MongoDB 연결 실패: {e}")
        raise

async def close_mongo_connection():
    """MongoDB 연결 종료"""
    if Database.client:
        Database.client.close()
        logger.info("🔌 MongoDB 연결 종료")

async def create_indexes():
    """필요한 인덱스들을 생성"""
    try:
        # 사용자 컬렉션 인덱스
        await Database.database.users.create_index("email", unique=True)
        await Database.database.users.create_index("username", unique=True)
        
        # 명함 컬렉션 인덱스
        await Database.database.business_cards.create_index([
            ("user_id", pymongo.ASCENDING),
            ("created_at", pymongo.DESCENDING)
        ])
        await Database.database.business_cards.create_index([
            ("user_id", pymongo.ASCENDING),
            ("company_name", pymongo.TEXT),
            ("name", pymongo.TEXT),
            ("email", pymongo.TEXT)
        ])
        
        logger.info("✅ MongoDB 인덱스 생성 완료")
        
    except Exception as e:
        logger.error(f"❌ 인덱스 생성 실패: {e}")

def get_database():
    """데이터베이스 인스턴스 반환"""
    if Database.database is None:
        raise Exception("데이터베이스가 연결되지 않았습니다. connect_to_mongo()를 먼저 호출하세요.")
    return Database.database

async def get_database_async():
    """비동기 데이터베이스 인스턴스 반환"""
    if Database.database is None:
        raise Exception("데이터베이스가 연결되지 않았습니다. connect_to_mongo()를 먼저 호출하세요.")
    return Database.database 