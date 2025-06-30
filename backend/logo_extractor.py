"""
YOLO 기반 명함 로고 추출기
EasyOCR과 함께 사용하여 명함에서 회사 로고만 추출합니다.
"""

import cv2
import numpy as np
import os
import time
import logging
from typing import Dict, List, Optional, Tuple
from ultralytics import YOLO
import torch

logger = logging.getLogger(__name__)

class LogoExtractor:
    """YOLO 기반 로고 추출기"""
    
    def __init__(self, upload_folder: str):
        self.upload_folder = upload_folder
        self.logo_dir = os.path.join(upload_folder, 'logos')
        os.makedirs(self.logo_dir, exist_ok=True)
        
        # YOLO 모델 초기화
        self._initialize_yolo()
        
        # 로고 후보 필터링을 위한 설정
        self.min_logo_size = (30, 30)  # 최소 로고 크기
        self.max_logo_ratio = 0.3      # 이미지 대비 최대 로고 비율
        self.confidence_threshold = 0.3 # 신뢰도 임계값
    
    def _initialize_yolo(self):
        """YOLO 모델 초기화"""
        try:
            # YOLOv8 nano 모델 사용 (가볍고 빠름)
            self.yolo = YOLO('yolov8n.pt')
            logger.info("YOLO 모델 로드 완료")
            
            # GPU 사용 가능 여부 확인
            if torch.cuda.is_available():
                logger.info("GPU 사용 가능 - CUDA 가속 활성화")
            else:
                logger.info("CPU 모드로 실행")
                
        except Exception as e:
            logger.error(f"YOLO 모델 초기화 실패: {str(e)}")
            self.yolo = None
    
    def extract_logo(self, image_path: str) -> Optional[Dict]:
        """명함에서 로고 추출"""
        if not self.yolo:
            logger.error("YOLO 모델이 초기화되지 않았습니다")
            return None
        
        try:
            logger.info(f"로고 추출 시작: {image_path}")
            
            # 이미지 로드
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"이미지 로드 실패: {image_path}")
                return None
            
            height, width = image.shape[:2]
            
            # 1. YOLO로 객체 탐지
            logo_candidates = self._detect_logo_candidates(image_path, image)
            
            # 2. 휴리스틱 기반 로고 후보 추가
            heuristic_candidates = self._detect_logo_heuristic(image)
            
            # 3. 후보들 통합 및 필터링
            all_candidates = logo_candidates + heuristic_candidates
            best_logo = self._select_best_logo(all_candidates, width, height)
            
            if best_logo:
                # 4. 로고 이미지 저장
                logo_path = self._save_logo_image(image, best_logo['bbox'])
                
                result = {
                    'bbox': best_logo['bbox'],
                    'confidence': best_logo['confidence'],
                    'method': best_logo['method'],
                    'logo_path': logo_path,
                    'logo_size': (best_logo['bbox'][2] - best_logo['bbox'][0], 
                                best_logo['bbox'][3] - best_logo['bbox'][1])
                }
                
                logger.info(f"로고 추출 성공: {result}")
                return result
            else:
                logger.info("로고를 찾을 수 없습니다")
                return None
                
        except Exception as e:
            logger.error(f"로고 추출 중 오류: {str(e)}")
            return None
    
    def _detect_logo_candidates(self, image_path: str, image: np.ndarray) -> List[Dict]:
        """YOLO로 로고 후보 탐지"""
        candidates = []
        
        try:
            # YOLO 추론 실행
            results = self.yolo(image_path, verbose=False)
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        class_id = int(box.cls[0])
                        class_name = self.yolo.names[class_id]
                        confidence = float(box.conf[0])
                        bbox = box.xyxy[0].tolist()
                        
                        # 로고 가능성이 있는 객체들 필터링
                        if self._is_potential_logo_object(class_name, confidence, bbox, image.shape):
                            candidates.append({
                                'bbox': bbox,
                                'confidence': confidence,
                                'method': 'yolo',
                                'class_name': class_name
                            })
                            logger.info(f"YOLO 로고 후보: {class_name} (신뢰도: {confidence:.2f})")
            
        except Exception as e:
            logger.error(f"YOLO 탐지 오류: {str(e)}")
        
        return candidates
    
    def _detect_logo_heuristic(self, image: np.ndarray) -> List[Dict]:
        """휴리스틱 기반 로고 탐지"""
        candidates = []
        height, width = image.shape[:2]
        
        try:
            # 상단 영역에서 로고 후보 탐지 (일반적으로 로고가 위치하는 곳)
            search_regions = [
                (0, 0, width//2, height//3),           # 좌상단
                (width//2, 0, width, height//3),       # 우상단
                (0, 0, width//3, height//2),           # 좌측 상단 확장
                (width*2//3, 0, width, height//2),     # 우측 상단 확장
            ]
            
            for i, (x1, y1, x2, y2) in enumerate(search_regions):
                roi = image[y1:y2, x1:x2]
                logo_bbox = self._find_logo_in_region(roi, x1, y1)
                
                if logo_bbox:
                    candidates.append({
                        'bbox': logo_bbox,
                        'confidence': 0.6,  # 휴리스틱 기본 신뢰도
                        'method': f'heuristic_region_{i}',
                        'class_name': 'logo_candidate'
                    })
                    logger.info(f"휴리스틱 로고 후보 발견: 영역 {i}")
            
        except Exception as e:
            logger.error(f"휴리스틱 탐지 오류: {str(e)}")
        
        return candidates
    
    def _find_logo_in_region(self, roi: np.ndarray, offset_x: int, offset_y: int) -> Optional[List[float]]:
        """특정 영역에서 로고 후보 찾기"""
        try:
            # 그레이스케일 변환
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            
            # 엣지 검출
            edges = cv2.Canny(gray, 50, 150)
            
            # 윤곽선 검출
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                return None
            
            # 가장 큰 윤곽선들 중에서 로고 후보 선택
            large_contours = [c for c in contours if cv2.contourArea(c) > 500]
            
            if not large_contours:
                return None
            
            # 가장 큰 윤곽선 선택
            largest_contour = max(large_contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            
            # 로고 크기 조건 확인
            if w >= self.min_logo_size[0] and h >= self.min_logo_size[1]:
                # 절대 좌표로 변환
                abs_bbox = [
                    offset_x + x,
                    offset_y + y, 
                    offset_x + x + w,
                    offset_y + y + h
                ]
                return abs_bbox
            
        except Exception as e:
            logger.error(f"영역 내 로고 탐지 오류: {str(e)}")
        
        return None
    
    def _is_potential_logo_object(self, class_name: str, confidence: float, bbox: List[float], image_shape: Tuple) -> bool:
        """YOLO 탐지 객체가 로고 가능성이 있는지 판단"""
        
        # 신뢰도 체크
        if confidence < self.confidence_threshold:
            return False
        
        # 크기 체크
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        
        if width < self.min_logo_size[0] or height < self.min_logo_size[1]:
            return False
        
        # 이미지 대비 크기 비율 체크 (너무 크면 로고가 아님)
        img_area = image_shape[0] * image_shape[1]
        obj_area = width * height
        
        if obj_area / img_area > self.max_logo_ratio:
            return False
        
        # 로고 가능성이 있는 클래스들
        logo_potential_classes = [
            'book',        # 책/문서 형태
            'laptop',      # 전자기기
            'cell phone',  # 모바일 기기
            'clock',       # 시계/원형 로고
            'sports ball', # 원형 로고
            'frisbee',     # 원형/타원형 로고
            'scissors',    # 도구류 로고
            'teddy bear',  # 캐릭터 로고
            'vase',        # 장식품
            'bottle',      # 제품 로고
        ]
        
        # 위치 기반 필터링 (상단 영역에 있는 것 우선)
        y_center = (bbox[1] + bbox[3]) / 2
        relative_y = y_center / image_shape[0]
        
        # 상단 50% 영역에 있으면 로고 가능성 높음
        if relative_y > 0.5:
            return False
        
        return class_name in logo_potential_classes
    
    def _select_best_logo(self, candidates: List[Dict], img_width: int, img_height: int) -> Optional[Dict]:
        """최적의 로고 후보 선택"""
        if not candidates:
            return None
        
        # 점수 계산 기준
        scored_candidates = []
        
        for candidate in candidates:
            score = 0
            bbox = candidate['bbox']
            
            # 1. 신뢰도 점수 (0-40점)
            score += candidate['confidence'] * 40
            
            # 2. 위치 점수 (0-30점) - 상단일수록 높은 점수
            y_center = (bbox[1] + bbox[3]) / 2
            relative_y = y_center / img_height
            position_score = max(0, 30 * (1 - relative_y * 2))  # 상단 50%에서 최고점
            score += position_score
            
            # 3. 크기 점수 (0-20점) - 적절한 크기일수록 높은 점수
            width = bbox[2] - bbox[0]
            height = bbox[3] - bbox[1]
            area_ratio = (width * height) / (img_width * img_height)
            
            # 이미지의 5-15% 크기가 적절
            if 0.05 <= area_ratio <= 0.15:
                size_score = 20
            elif 0.02 <= area_ratio <= 0.25:
                size_score = 10
            else:
                size_score = 0
            score += size_score
            
            # 4. 방법별 보너스 점수 (0-10점)
            if candidate['method'] == 'yolo':
                method_score = 10
            else:
                method_score = 5
            score += method_score
            
            scored_candidates.append((score, candidate))
            logger.info(f"로고 후보 점수: {score:.1f} (방법: {candidate['method']}, 신뢰도: {candidate['confidence']:.2f})")
        
        # 최고 점수 후보 선택
        best_candidate = max(scored_candidates, key=lambda x: x[0])[1]
        logger.info(f"최종 선택된 로고: {best_candidate['method']} (점수: {max(scored_candidates, key=lambda x: x[0])[0]:.1f})")
        
        return best_candidate
    
    def _save_logo_image(self, image: np.ndarray, bbox: List[float]) -> str:
        """로고 이미지를 별도 파일로 저장"""
        try:
            # 바운딩 박스 좌표
            x1, y1, x2, y2 = map(int, bbox)
            
            # 로고 영역 추출
            logo_roi = image[y1:y2, x1:x2]
            
            # 파일명 생성
            timestamp = int(time.time() * 1000)
            logo_filename = f"logo_{timestamp}.png"
            logo_path = os.path.join(self.logo_dir, logo_filename)
            
            # 이미지 저장
            cv2.imwrite(logo_path, logo_roi)
            logger.info(f"로고 이미지 저장: {logo_path}")
            
            return logo_path
            
        except Exception as e:
            logger.error(f"로고 이미지 저장 오류: {str(e)}")
            return None
    
    def extract_multiple_logos(self, image_path: str, max_logos: int = 3) -> List[Dict]:
        """여러 로고 후보 추출 (최대 3개)"""
        if not self.yolo:
            return []
        
        try:
            image = cv2.imread(image_path)
            if image is None:
                return []
            
            height, width = image.shape[:2]
            
            # 모든 후보 수집
            logo_candidates = self._detect_logo_candidates(image_path, image)
            heuristic_candidates = self._detect_logo_heuristic(image)
            all_candidates = logo_candidates + heuristic_candidates
            
            if not all_candidates:
                return []
            
            # 점수 기반 정렬
            scored_candidates = []
            for candidate in all_candidates:
                score = self._calculate_logo_score(candidate, width, height)
                scored_candidates.append((score, candidate))
            
            # 상위 N개 선택
            sorted_candidates = sorted(scored_candidates, key=lambda x: x[0], reverse=True)
            top_candidates = sorted_candidates[:max_logos]
            
            # 결과 생성
            results = []
            for score, candidate in top_candidates:
                logo_path = self._save_logo_image(image, candidate['bbox'])
                result = {
                    'bbox': candidate['bbox'],
                    'confidence': candidate['confidence'],
                    'method': candidate['method'],
                    'logo_path': logo_path,
                    'score': score
                }
                results.append(result)
            
            logger.info(f"다중 로고 추출 완료: {len(results)}개")
            return results
            
        except Exception as e:
            logger.error(f"다중 로고 추출 오류: {str(e)}")
            return []
    
    def _calculate_logo_score(self, candidate: Dict, img_width: int, img_height: int) -> float:
        """로고 후보의 점수 계산"""
        score = 0
        bbox = candidate['bbox']
        
        # 신뢰도 점수
        score += candidate['confidence'] * 40
        
        # 위치 점수
        y_center = (bbox[1] + bbox[3]) / 2
        relative_y = y_center / img_height
        position_score = max(0, 30 * (1 - relative_y * 2))
        score += position_score
        
        # 크기 점수
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        area_ratio = (width * height) / (img_width * img_height)
        
        if 0.05 <= area_ratio <= 0.15:
            size_score = 20
        elif 0.02 <= area_ratio <= 0.25:
            size_score = 10
        else:
            size_score = 0
        score += size_score
        
        # 방법별 점수
        if candidate['method'] == 'yolo':
            score += 10
        else:
            score += 5
        
        return score 