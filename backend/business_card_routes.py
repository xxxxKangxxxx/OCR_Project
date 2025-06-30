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

@router.get("/stats")
async def get_cards_stats(current_user: UserInDB = Depends(get_current_active_user)):
    """사용자의 명함 통계 조회"""
    try:
        db = get_database()
        
        # 전체 명함 수
        total_cards = await db.business_cards.count_documents({"user_id": current_user.id})
        
        # 즐겨찾기 명함 수
        favorite_cards = await db.business_cards.count_documents({
            "user_id": current_user.id,
            "isFavorite": True
        })
        
        # 회사별 명함 수 집계
        pipeline = [
            {"$match": {"user_id": current_user.id}},
            {"$group": {
                "_id": "$company_name",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        company_stats_cursor = db.business_cards.aggregate(pipeline)
        company_stats = {}
        async for item in company_stats_cursor:
            company_name = item["_id"] or "미지정"
            company_stats[company_name] = item["count"]
        
        # 최근 추가된 명함 수 (7일 이내)
        from datetime import datetime, timedelta
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recently_added = await db.business_cards.count_documents({
            "user_id": current_user.id,
            "created_at": {"$gte": seven_days_ago}
        })
        
        # 최근 스캔한 명함 목록 (최대 10개, 최신순)
        recent_scans_cursor = db.business_cards.find({
            "user_id": current_user.id,
            "created_at": {"$gte": seven_days_ago}
        }).sort("created_at", -1).limit(10)
        
        recent_scans = []
        async for card_data in recent_scans_cursor:
            recent_scans.append({
                "id": str(card_data["_id"]),
                "name": card_data.get("name"),
                "company_name": card_data.get("company_name"),
                "created_at": card_data["created_at"],
                "createdAt": card_data["created_at"]  # 프론트엔드 호환성
            })
        
        return {
            "total": total_cards,
            "favorites": favorite_cards,
            "byCompany": company_stats,
            "recentlyAdded": recently_added,
            "recentScans": recent_scans
        }
        
    except Exception as e:
        logger.error(f"통계 조회 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="통계 조회 중 오류가 발생했습니다"
        )

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
                processing_status=card_data.get("processing_status"),
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
            processing_status=card_data.get("processing_status"),
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
            "processing_status": "processing",
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
            processing_status=updated_card.get("processing_status"),
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
                processing_status=card_data.get("processing_status"),
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

        # 고유한 파일명 생성 (사용자별 + 타임스탬프)
        import uuid
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{current_user.username}_{uuid.uuid4().hex[:8]}_{int(datetime.utcnow().timestamp())}{file_extension}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"📁 파일 저장: {file_path}")
            
            # 🚨 중요: 먼저 빈 명함을 생성하여 즉시 응답
            db = get_database()
            now = datetime.utcnow()
            
            # 임시 명함 생성 (처리 중 상태)
            temp_card_dict = {
                "user_id": current_user.id,
                "name": None,
                "name_en": None,
                "email": None,
                "phone_number": None,
                "mobile_phone_number": None,
                "fax_number": None,
                "position": None,
                "department": None,
                "company_name": None,
                "address": None,
                "postal_code": None,
                "ocr_raw_text": "처리 중...",
                "ocr_confidence": None,
                "original_filename": file.filename,
                "stored_filename": unique_filename,
                "file_path": file_path,
                "processing_status": "processing",  # 처리 상태 추가
                "isFavorite": False,
                "created_at": now,
                "updated_at": now
            }
            
            result = await db.business_cards.insert_one(temp_card_dict)
            card_id = str(result.inserted_id)
            logger.info(f"💾 임시 명함 생성: {card_id}")
            
            # 백그라운드에서 OCR 처리 시작
            import asyncio
            asyncio.create_task(process_ocr_background(file_path, card_id, file.filename))
            
            # 즉시 응답 반환 (처리 중 상태)
            return OCRResult(
                text=["처리 중입니다..."],
                name="처리 중",
                ocr_raw_text="OCR 처리가 진행 중입니다. 잠시 후 새로고침해주세요.",
                error=None,
                processing_status="processing",
                card_id=card_id
            )
            
        except Exception as e:
            logger.error(f"❌ 파일 저장 오류 {file.filename}: {str(e)}", exc_info=True)
            # 파일 저장 실패 시 파일 삭제
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"🗑 실패한 파일 삭제: {file_path}")
            except Exception as cleanup_error:
                logger.error(f"파일 삭제 오류 {file_path}: {str(cleanup_error)}")
            return OCRResult(text=[], error=f"파일 저장 중 오류가 발생했습니다: {str(e)}")
                
    except Exception as e:
        logger.error(f"❌ OCR 엔드포인트 오류: {str(e)}", exc_info=True)
        return OCRResult(text=[], error=f"서버 오류가 발생했습니다: {str(e)}")

async def process_ocr_background(file_path: str, card_id: str, original_filename: str):
    """백그라운드에서 OCR 처리"""
    try:
        logger.info(f"🔄 백그라운드 OCR 시작: {original_filename}")
        logger.info(f"📁 파일 경로: {file_path}")
        logger.info(f"🆔 카드 ID: {card_id}")
        
        # 파일 존재 확인
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")
        
        logger.info(f"📄 파일 크기: {os.path.getsize(file_path)} bytes")
        
        # OCR 처리
        logger.info("🔄 OCR 프로세서 호출 중...")
        ocr_result = await ocr_processor.process_image(file_path)
        logger.info(f"✅ OCR 처리 완료: {len(ocr_result)}개 텍스트 추출")
        
        # OCR 결과 로깅 (처음 5개만)
        if ocr_result:
            logger.info("📋 추출된 텍스트 샘플:")
            for i, text in enumerate(ocr_result[:5]):
                logger.info(f"  {i+1}. {text}")
        else:
            logger.warning("⚠️ OCR 결과가 비어있습니다")
        
        # OCR 결과 파싱
        logger.info("🔄 파싱 시작...")
        parsed_result = parse_ocr_result(ocr_result, original_filename)
        logger.info("✅ 파싱 완료")
        
        # 파싱 결과 로깅
        logger.info("📊 파싱된 정보:")
        logger.info(f"  📛 이름: {parsed_result.get('name')}")
        logger.info(f"  🏢 회사: {parsed_result.get('company_name')}")
        logger.info(f"  📧 이메일: {parsed_result.get('email')}")
        logger.info(f"  📞 전화: {parsed_result.get('phone')}")
        logger.info(f"  💼 직책: {parsed_result.get('position')}")
        
        # MongoDB 업데이트
        logger.info("💾 데이터베이스 업데이트 시작...")
        db = get_database()
        now = datetime.utcnow()
        
        update_dict = {
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
            "processing_status": "completed",  # 처리 완료
            "updated_at": now
        }
        
        await db.business_cards.update_one(
            {"_id": ObjectId(card_id)},
            {"$set": update_dict}
        )
        
        logger.info(f"💾 명함 업데이트 완료: {card_id}")
        
    except Exception as e:
        logger.error(f"❌ 백그라운드 OCR 처리 오류: {str(e)}", exc_info=True)
        
        # 오류 상태로 업데이트
        try:
            db = get_database()
            await db.business_cards.update_one(
                {"_id": ObjectId(card_id)},
                {"$set": {
                    "processing_status": "failed",
                    "ocr_raw_text": f"처리 실패: {str(e)}",
                    "updated_at": datetime.utcnow()
                }}
            )
            logger.info(f"💾 실패 상태 업데이트 완료: {card_id}")
        except Exception as update_error:
            logger.error(f"상태 업데이트 실패: {str(update_error)}")
    
    finally:
        # 임시 파일 정리
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"🗑 임시 파일 삭제: {file_path}")
        except Exception as cleanup_error:
            logger.error(f"파일 정리 오류: {str(cleanup_error)}")

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
                processing_status=card_data.get("processing_status"),
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