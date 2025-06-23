from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from auth import (
    authenticate_user, 
    create_access_token, 
    get_current_active_user,
    create_user
)
from models import Token, User, UserCreate, UserInDB
from config import ACCESS_TOKEN_EXPIRE_MINUTES
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """사용자 로그인"""
    logger.info(f"로그인 시도: {form_data.username}")
    
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        logger.warning(f"로그인 실패: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자명 또는 비밀번호가 올바르지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    logger.info(f"로그인 성공: {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    """사용자 회원가입"""
    logger.info(f"회원가입 시도: {user_data.username} ({user_data.email})")
    
    try:
        # 새 사용자 생성
        new_user = await create_user(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name
        )
        
        # 자동 로그인을 위한 토큰 생성
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": new_user.username}, expires_delta=access_token_expires
        )
        
        logger.info(f"회원가입 성공: {new_user.username}")
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"회원가입 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="회원가입 처리 중 오류가 발생했습니다"
        )

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: UserInDB = Depends(get_current_active_user)):
    """현재 로그인된 사용자 정보 조회"""
    return User(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )

@router.post("/logout")
async def logout():
    """로그아웃 (클라이언트 측에서 토큰 삭제)"""
    return {"message": "로그아웃되었습니다"}

@router.get("/verify")
async def verify_token(current_user: UserInDB = Depends(get_current_active_user)):
    """토큰 유효성 검증"""
    return {"valid": True, "username": current_user.username} 