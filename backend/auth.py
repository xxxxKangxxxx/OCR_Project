from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import get_database
from models import UserInDB, TokenData
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
import logging
from bson import ObjectId

logger = logging.getLogger(__name__)

# 패스워드 해싱 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Bearer 토큰 스키마
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """패스워드 검증"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """패스워드 해싱"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """JWT 액세스 토큰 생성"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user_by_email(email: str) -> Optional[UserInDB]:
    """이메일로 사용자 조회"""
    try:
        db = get_database()
        user_data = await db.users.find_one({"email": email})
        if user_data:
            return UserInDB(**user_data)
        return None
    except Exception as e:
        logger.error(f"사용자 조회 실패: {e}")
        return None

async def get_user_by_username(username: str) -> Optional[UserInDB]:
    """사용자명으로 사용자 조회"""
    try:
        db = get_database()
        user_data = await db.users.find_one({"username": username})
        if user_data:
            return UserInDB(**user_data)
        return None
    except Exception as e:
        logger.error(f"사용자 조회 실패: {e}")
        return None

async def get_user_by_id(user_id: str) -> Optional[UserInDB]:
    """ID로 사용자 조회"""
    try:
        db = get_database()
        user_data = await db.users.find_one({"_id": ObjectId(user_id)})
        if user_data:
            return UserInDB(**user_data)
        return None
    except Exception as e:
        logger.error(f"사용자 조회 실패: {e}")
        return None

async def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    """사용자 인증"""
    user = await get_user_by_username(username)
    if not user:
        user = await get_user_by_email(username)  # 이메일로도 로그인 가능
    
    if not user or not verify_password(password, user.hashed_password):
        return None
    
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserInDB:
    """현재 로그인된 사용자 정보 가져오기"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보를 확인할 수 없습니다",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = await get_user_by_username(token_data.username)
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """현재 활성 사용자 확인"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="비활성 사용자입니다")
    return current_user

async def create_user(username: str, email: str, password: str, full_name: Optional[str] = None) -> UserInDB:
    """새 사용자 생성"""
    try:
        db = get_database()
        logger.info(f"사용자 생성 시작: {username}, {email}")
        
        # 중복 사용자 확인
        existing_user = await db.users.find_one({
            "$or": [
                {"username": username},
                {"email": email}
            ]
        })
        
        if existing_user:
            if existing_user.get("username") == username:
                logger.warning(f"중복 사용자명: {username}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="이미 존재하는 사용자명입니다"
                )
            else:
                logger.warning(f"중복 이메일: {email}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="이미 존재하는 이메일입니다"
                )
        
        # 새 사용자 생성
        hashed_password = get_password_hash(password)
        user_data = {
            "username": username,
            "email": email,
            "full_name": full_name,
            "hashed_password": hashed_password,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        logger.info(f"사용자 데이터 생성 완료, DB 삽입 시작: {username}")
        result = await db.users.insert_one(user_data)
        user_data["_id"] = result.inserted_id
        
        logger.info(f"사용자 생성 완료: {username}, ID: {result.inserted_id}")
        return UserInDB(**user_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"사용자 생성 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"사용자 생성 중 오류가 발생했습니다: {str(e)}"
        ) 