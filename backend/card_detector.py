import cv2
import numpy as np
from typing import Tuple, Optional

class BusinessCardDetector:
    @staticmethod
    def preprocess_image(image: np.ndarray) -> np.ndarray:
        """이미지 전처리를 수행합니다."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        return blur

    @staticmethod
    def find_card_contour(preprocessed_image: np.ndarray) -> Optional[np.ndarray]:
        """명함의 윤곽선을 찾습니다."""
        # Canny 엣지 검출
        edges = cv2.Canny(preprocessed_image, 75, 200)
        
        # 윤곽선 찾기
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # 가장 큰 윤곽선 찾기
        if not contours:
            return None
            
        max_contour = max(contours, key=cv2.contourArea)
        
        # 윤곽선을 근사화하여 직사각형 형태로 만들기
        epsilon = 0.02 * cv2.arcLength(max_contour, True)
        approx = cv2.approxPolyDP(max_contour, epsilon, True)
        
        # 근사화된 윤곽선이 4개의 꼭지점을 가지면 명함으로 간주
        if len(approx) == 4:
            return approx
        return None

    @staticmethod
    def order_points(pts: np.ndarray) -> np.ndarray:
        """윤곽선의 꼭지점들을 순서대로 정렬합니다."""
        rect = np.zeros((4, 2), dtype=np.float32)
        
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]  # Top-left
        rect[2] = pts[np.argmax(s)]  # Bottom-right
        
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]  # Top-right
        rect[3] = pts[np.argmax(diff)]  # Bottom-left
        
        return rect

    @staticmethod
    def perspective_transform(image: np.ndarray, pts: np.ndarray) -> Tuple[np.ndarray, Tuple[int, int]]:
        """투시 변환을 적용하여 명함을 정면에서 본 것처럼 변환합니다."""
        rect = BusinessCardDetector.order_points(pts.reshape(4, 2))
        
        # 명함의 너비와 높이 계산
        width_a = np.sqrt(((rect[2] - rect[3])**2).sum())
        width_b = np.sqrt(((rect[1] - rect[0])**2).sum())
        max_width = max(int(width_a), int(width_b))
        
        height_a = np.sqrt(((rect[1] - rect[2])**2).sum())
        height_b = np.sqrt(((rect[0] - rect[3])**2).sum())
        max_height = max(int(height_a), int(height_b))
        
        # 변환 행렬 계산
        dst = np.array([
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1]
        ], dtype=np.float32)
        
        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(image, M, (max_width, max_height))
        
        return warped, (max_width, max_height)

    def detect_and_crop(self, image: np.ndarray) -> Optional[np.ndarray]:
        """이미지에서 명함을 감지하고 크롭합니다."""
        preprocessed = self.preprocess_image(image)
        contour = self.find_card_contour(preprocessed)
        
        if contour is None:
            return None
            
        warped, _ = self.perspective_transform(image, contour)
        return warped 