from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from database import get_database
from auth import get_current_active_user
from models import (
    UserInDB, 
    BusinessCard, 
    BusinessCardCreate, 
    BusinessCardUpdate,
    BusinessCardInDB,
    OCRResult
)
from ocr_processor import OCRProcessor
from ocr_parser import parse_ocr_result
import os
import shutil
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cards", tags=["business_cards"])

# OCR 프로세서 초기화
UPLOAD_FOLDER = 'uploads'
ocr_processor = OCRProcessor(UPLOAD_FOLDER)

@router.get("/", response_model=List[BusinessCard])
async def get_user_cards(current_user: UserInDB = Depends(get_current_active_user)):
    """현재 사용자의 모든 명함 조회"""
    try:
        db = get_database()
        cards_cursor = db.business_cards.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1)
        
        cards = []
        async for card_data in cards_cursor:
            cards.append(BusinessCard(
                id=str(card_data["_id"]),
                user_id=str(card_data["user_id"]),
                name=card_data.get("name"),
                name_en=card_data.get("name_en"),
                email=card_data.get("email"),
                phone_number=card_data.get("phone_number"),
                mobile_phone_number=card_data.get("mobile_phone_number"),
                fax_number=card_data.get("fax_number"),
                position=card_data.get("position"),
                department=card_data.get("department"),
                company_name=card_data.get("company_name"),
                address=card_data.get("address"),
                postal_code=card_data.get("postal_code"),
                ocr_raw_text=card_data.get("ocr_raw_text"),
                ocr_confidence=card_data.get("ocr_confidence"),
                isFavorite=card_data.get("isFavorite", False),
                created_at=card_data["created_at"],
                updated_at=card_data["updated_at"]
            ))
        
        logger.info(f"사용자 {current_user.username}의 명함 {len(cards)}개 조회")
        return cards
        
    except Exception as e:
        logger.error(f"명함 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="명함 조회 중 오류가 발생했습니다"
        )

@router.get("/{card_id}", response_model=BusinessCard)
async def get_card(card_id: str, current_user: UserInDB = Depends(get_current_active_user)):
    """특정 명함 조회"""
    try:
        db = get_database()
        card_data = await db.business_cards.find_one({
            "_id": ObjectId(card_id),
            "user_id": current_user.id
        })
        
        if not card_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="명함을 찾을 수 없습니다"
            )
        
        return BusinessCard(
            id=str(card_data["_id"]),
            user_id=str(card_data["user_id"]),
            name=card_data.get("name"),
            name_en=card_data.get("name_en"),
            email=card_data.get("email"),
            phone_number=card_data.get("phone_number"),
            mobile_phone_number=card_data.get("mobile_phone_number"),
            fax_number=card_data.get("fax_number"),
            position=card_data.get("position"),
            department=card_data.get("department"),
            company_name=card_data.get("company_name"),
            address=card_data.get("address"),
            postal_code=card_data.get("postal_code"),
            ocr_raw_text=card_data.get("ocr_raw_text"),
            ocr_confidence=card_data.get("ocr_confidence"),
            isFavorite=card_data.get("isFavorite", False),
            created_at=card_data["created_at"],
            updated_at=card_data["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"명함 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="명함 조회 중 오류가 발생했습니다"
        )

@router.post("/", response_model=BusinessCard)
async def create_card(
    card_data: BusinessCardCreate,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """새 명함 생성"""
    try:
        db = get_database()
        now = datetime.utcnow()
        
        card_dict = {
            "user_id": current_user.id,
            "name": card_data.name,
            "name_en": card_data.name_en,
            "email": card_data.email,
            "phone_number": card_data.phone_number,
            "mobile_phone_number": card_data.mobile_phone_number,
            "fax_number": card_data.fax_number,
            "position": card_data.position,
            "department": card_data.department,
            "company_name": card_data.company_name,
            "address": card_data.address,
            "postal_code": card_data.postal_code,
            "ocr_raw_text": card_data.ocr_raw_text,
            "ocr_confidence": card_data.ocr_confidence,
            "isFavorite": card_data.isFavorite,
            "created_at": now,
            "updated_at": now
        }
        
        result = await db.business_cards.insert_one(card_dict)
        card_dict["_id"] = result.inserted_id
        
        logger.info(f"새 명함 생성: {card_data.name} (사용자: {current_user.username})")
        
        return BusinessCard(
            id=str(result.inserted_id),
            user_id=str(current_user.id),
            **{k: v for k, v in card_dict.items() if k not in ["_id", "user_id"]}
        )
        
    except Exception as e:
        logger.error(f"명함 생성 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="명함 생성 중 오류가 발생했습니다"
        )

@router.put("/{card_id}", response_model=BusinessCard)
async def update_card(
    card_id: str,
    card_data: BusinessCardUpdate,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """명함 정보 수정"""
    try:
        db = get_database()
        
        # 기존 명함 확인
        existing_card = await db.business_cards.find_one({
            "_id": ObjectId(card_id),
            "user_id": current_user.id
        })
        
        if not existing_card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="명함을 찾을 수 없습니다"
            )
        
        # 업데이트할 데이터 준비
        update_data = {}
        for field, value in card_data.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        update_data["updated_at"] = datetime.utcnow()
        
        # 명함 업데이트
        await db.business_cards.update_one(
            {"_id": ObjectId(card_id)},
            {"$set": update_data}
        )
        
        # 업데이트된 명함 조회
        updated_card = await db.business_cards.find_one({"_id": ObjectId(card_id)})
        
        logger.info(f"명함 수정: {card_id} (사용자: {current_user.username})")
        
        return BusinessCard(
            id=str(updated_card["_id"]),
            user_id=str(updated_card["user_id"]),
            name=updated_card.get("name"),
            name_en=updated_card.get("name_en"),
            email=updated_card.get("email"),
            phone_number=updated_card.get("phone_number"),
            mobile_phone_number=updated_card.get("mobile_phone_number"),
            fax_number=updated_card.get("fax_number"),
            position=updated_card.get("position"),
            department=updated_card.get("department"),
            company_name=updated_card.get("company_name"),
            address=updated_card.get("address"),
            postal_code=updated_card.get("postal_code"),
            ocr_raw_text=updated_card.get("ocr_raw_text"),
            ocr_confidence=updated_card.get("ocr_confidence"),
            isFavorite=updated_card.get("isFavorite", False),
            created_at=updated_card["created_at"],
            updated_at=updated_card["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"명함 수정 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="명함 수정 중 오류가 발생했습니다"
        )

@router.delete("/{card_id}")
async def delete_card(card_id: str, current_user: UserInDB = Depends(get_current_active_user)):
    """명함 삭제"""
    try:
        db = get_database()
        
        result = await db.business_cards.delete_one({
            "_id": ObjectId(card_id),
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="명함을 찾을 수 없습니다"
            )
        
        logger.info(f"명함 삭제: {card_id} (사용자: {current_user.username})")
        return {"message": "명함이 삭제되었습니다"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"명함 삭제 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="명함 삭제 중 오류가 발생했습니다"
        )

@router.post("/{card_id}/favorite")
async def toggle_favorite(card_id: str, current_user: UserInDB = Depends(get_current_active_user)):
    """즐겨찾기 토글"""
    try:
        db = get_database()
        
        card = await db.business_cards.find_one({
            "_id": ObjectId(card_id),
            "user_id": current_user.id
        })
        
        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="명함을 찾을 수 없습니다"
            )
        
        new_favorite_status = not card.get("isFavorite", False)
        
        await db.business_cards.update_one(
            {"_id": ObjectId(card_id)},
            {
                "$set": {
                    "isFavorite": new_favorite_status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"즐겨찾기 토글: {card_id} -> {new_favorite_status}")
        return {"isFavorite": new_favorite_status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"즐겨찾기 토글 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="즐겨찾기 설정 중 오류가 발생했습니다"
        )

@router.get("/favorites/list", response_model=List[BusinessCard])
async def get_favorite_cards(current_user: UserInDB = Depends(get_current_active_user)):
    """즐겨찾기 명함 목록 조회"""
    try:
        db = get_database()
        cards_cursor = db.business_cards.find({
            "user_id": current_user.id,
            "isFavorite": True
        }).sort("updated_at", -1)
        
        cards = []
        async for card_data in cards_cursor:
            cards.append(BusinessCard(
                id=str(card_data["_id"]),
                user_id=str(card_data["user_id"]),
                name=card_data.get("name"),
                name_en=card_data.get("name_en"),
                email=card_data.get("email"),
                phone_number=card_data.get("phone_number"),
                mobile_phone_number=card_data.get("mobile_phone_number"),
                fax_number=card_data.get("fax_number"),
                position=card_data.get("position"),
                department=card_data.get("department"),
                company_name=card_data.get("company_name"),
                address=card_data.get("address"),
                postal_code=card_data.get("postal_code"),
                ocr_raw_text=card_data.get("ocr_raw_text"),
                ocr_confidence=card_data.get("ocr_confidence"),
                isFavorite=card_data.get("isFavorite", False),
                created_at=card_data["created_at"],
                updated_at=card_data["updated_at"]
            ))
        
        return cards
        
    except Exception as e:
        logger.error(f"즐겨찾기 목록 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="즐겨찾기 목록 조회 중 오류가 발생했습니다"
        )

@router.post("/ocr", response_model=OCRResult)
async def process_ocr_and_save(
    files: List[UploadFile] = File(...),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """OCR 처리 및 명함 자동 저장"""
    try:
        file = files[0] if files else None
        if not file:
            return OCRResult(text=[], error="파일이 없습니다.")
        
        logger.info(f"📥 OCR 요청: {file.filename} (사용자: {current_user.username})")
        
        if not file.filename:
            logger.warning("⚠️ 파일명이 없습니다")
            return OCRResult(text=[], error="파일명이 없습니다.")
            
        if not ocr_processor.allowed_file(file.filename):
            logger.warning(f"⚠️ 지원하지 않는 파일 형식: {file.filename}")
            return OCRResult(text=[], error="지원하지 않는 파일 형식입니다.")

        # uploads 폴더가 없으면 생성
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)

        # 파일 저장
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"📁 파일 저장: {file_path}")
            
            # OCR 처리
            ocr_result = await ocr_processor.process_image(file_path)
            logger.info(f"✅ OCR 처리 완료: {file.filename}")
            
            # OCR 결과 파싱
            parsed_result = parse_ocr_result(ocr_result, file.filename)
            logger.info(f"✅ 파싱 완료: {file.filename}")
            
            # MongoDB에 명함 저장
            db = get_database()
            now = datetime.utcnow()
            
            card_dict = {
                "user_id": current_user.id,
                "name": parsed_result.get('name'),
                "name_en": parsed_result.get('name_en'),
                "email": parsed_result.get('email'),
                "phone_number": parsed_result.get('phone'),
                "mobile_phone_number": parsed_result.get('mobile'),
                "fax_number": parsed_result.get('fax'),
                "position": parsed_result.get('position'),
                "department": parsed_result.get('department'),
                "company_name": parsed_result.get('company_name'),
                "address": parsed_result.get('address'),
                "postal_code": parsed_result.get('postal_code'),
                "ocr_raw_text": parsed_result.get('ocr_raw_text'),
                "ocr_confidence": None,
                "isFavorite": False,
                "created_at": now,
                "updated_at": now
            }
            
            result = await db.business_cards.insert_one(card_dict)
            logger.info(f"💾 명함 저장 완료: {result.inserted_id}")
            
            # OCR 결과 반환
            return OCRResult(
                text=ocr_result,
                name=parsed_result.get('name'),
                name_en=parsed_result.get('name_en'),
                email=parsed_result.get('email'),
                phone_number=parsed_result.get('phone'),
                position=parsed_result.get('position'),
                company_name=parsed_result.get('company_name'),
                address=parsed_result.get('address'),
                mobile_phone_number=parsed_result.get('mobile'),
                fax_number=parsed_result.get('fax'),
                department=parsed_result.get('department'),
                postal_code=parsed_result.get('postal_code'),
                ocr_raw_text=parsed_result.get('ocr_raw_text'),
                error=None
            )
            
        except Exception as e:
            logger.error(f"❌ OCR 처리 오류 {file.filename}: {str(e)}", exc_info=True)
            return OCRResult(text=[], error=f"OCR 처리 중 오류가 발생했습니다: {str(e)}")
            
        finally:
            # 임시 파일 삭제
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"🗑 임시 파일 삭제: {file_path}")
            except Exception as e:
                logger.error(f"임시 파일 삭제 오류 {file_path}: {str(e)}")
                
    except Exception as e:
        logger.error(f"❌ OCR 엔드포인트 오류: {str(e)}", exc_info=True)
        return OCRResult(text=[], error=f"서버 오류가 발생했습니다: {str(e)}")

@router.get("/search/{query}", response_model=List[BusinessCard])
async def search_cards(query: str, current_user: UserInDB = Depends(get_current_active_user)):
    """명함 검색"""
    try:
        db = get_database()
        
        # 텍스트 검색 쿼리
        search_filter = {
            "user_id": current_user.id,
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}},
                {"phone_number": {"$regex": query, "$options": "i"}},
                {"company_name": {"$regex": query, "$options": "i"}},
                {"position": {"$regex": query, "$options": "i"}},
                {"department": {"$regex": query, "$options": "i"}}
            ]
        }
        
        cards_cursor = db.business_cards.find(search_filter).sort("created_at", -1)
        
        cards = []
        async for card_data in cards_cursor:
            cards.append(BusinessCard(
                id=str(card_data["_id"]),
                user_id=str(card_data["user_id"]),
                name=card_data.get("name"),
                name_en=card_data.get("name_en"),
                email=card_data.get("email"),
                phone_number=card_data.get("phone_number"),
                mobile_phone_number=card_data.get("mobile_phone_number"),
                fax_number=card_data.get("fax_number"),
                position=card_data.get("position"),
                department=card_data.get("department"),
                company_name=card_data.get("company_name"),
                address=card_data.get("address"),
                postal_code=card_data.get("postal_code"),
                ocr_raw_text=card_data.get("ocr_raw_text"),
                ocr_confidence=card_data.get("ocr_confidence"),
                isFavorite=card_data.get("isFavorite", False),
                created_at=card_data["created_at"],
                updated_at=card_data["updated_at"]
            ))
        
        logger.info(f"검색 완료: '{query}' -> {len(cards)}개 결과")
        return cards
        
    except Exception as e:
        logger.error(f"검색 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="검색 중 오류가 발생했습니다"
        ) 