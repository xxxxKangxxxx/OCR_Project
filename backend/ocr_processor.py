import os
import cv2
import numpy as np
import easyocr
import fitz  # PyMuPDF
import logging
from PIL import Image
import io

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# 외부 라이브러리 경고 메시지 줄이기
logging.getLogger("passlib").setLevel(logging.ERROR)

# HEIF 지원을 위한 pillow-heif 등록
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    logger.info("HEIF support enabled")
except ImportError:
    logger.warning("pillow-heif not installed, HEIF files will not be supported")

class OCRProcessor:
    def __init__(self, upload_folder: str):
        logger.info("Initializing OCR Processor")
        self.upload_folder = upload_folder
        logger.info("Loading EasyOCR model for Korean and English")
        self.reader = easyocr.Reader(
                        lang_list=['ko', 'en'],
                        gpu=False,
                        recog_network='korean_g2'
                    )

        if not os.path.exists(upload_folder):
            logger.info(f"Creating upload folder: {upload_folder}")
            os.makedirs(upload_folder)

    def validate_image(self, image_path: str) -> bool:
        """이미지 파일 유효성 검사"""
        try:
            with Image.open(image_path) as img:
                # HEIF 파일의 경우 특별 처리
                if img.format in ['HEIF', 'HEIC']:
                    logger.info(f"HEIF/HEIC file detected: {image_path}")
                img.verify()
            return True
        except Exception as e:
            logger.error(f"Image validation failed for {image_path}: {str(e)}")
            return False

    def detect_skew_angle(self, image: np.ndarray) -> float:
        try:
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image.copy()

            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (30, 5))
            morph = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            contours, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            angles = []
            for contour in contours:
                if cv2.contourArea(contour) > 100:
                    rect = cv2.minAreaRect(contour)
                    angle = rect[2]
                    if angle < -45:
                        angle += 90
                    elif angle > 45:
                        angle -= 90
                    angles.append(angle)

            if angles:
                median_angle = np.median(angles)
                logger.info(f"Detected skew angle: {median_angle:.2f} degrees")
                return median_angle
            else:
                logger.info("No significant skew detected")
                return 0.0

        except Exception as e:
            logger.error(f"Error detecting skew angle: {str(e)}")
            return 0.0

    def rotate_image(self, image: np.ndarray, angle: float) -> np.ndarray:
        if abs(angle) < 0.5:
            return image

        try:
            h, w = image.shape[:2]
            center = (w // 2, h // 2)
            rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
            cos_angle = abs(rotation_matrix[0, 0])
            sin_angle = abs(rotation_matrix[0, 1])
            new_w = int(h * sin_angle + w * cos_angle)
            new_h = int(h * cos_angle + w * sin_angle)

            rotation_matrix[0, 2] += (new_w - w) / 2
            rotation_matrix[1, 2] += (new_h - h) / 2

            rotated = cv2.warpAffine(image, rotation_matrix, (new_w, new_h),
                                     flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            logger.info(f"Image rotated by {angle:.2f} degrees")
            return rotated

        except Exception as e:
            logger.error(f"Error rotating image: {str(e)}")
            return image

    def correct_orientation(self, image: np.ndarray) -> np.ndarray:
        def get_confidence_score(img: np.ndarray) -> float:
            temp_path = "temp_orientation_test.png"
            cv2.imwrite(temp_path, img)
            result = self.reader.readtext(temp_path)
            os.remove(temp_path)
            if not result:
                return 0.0
            return np.mean([r[2] for r in result])  # 평균 신뢰도

        # 0, 90, 180, 270 회전 이미지 생성
        rotations = {
            0: image,
            90: cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE),
            180: cv2.rotate(image, cv2.ROTATE_180),
            270: cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
        }

        scores = {angle: get_confidence_score(rot_img) for angle, rot_img in rotations.items()}
        best_angle = max(scores, key=scores.get)

        logger.info(f"📐 방향 감지 (신뢰도 기준): {scores}")
        logger.info(f"🔄 최종 선택된 방향: {best_angle}도")

        return rotations[best_angle]

    def correct_skew(self, image_path: str) -> tuple[np.ndarray, str]:
        try:
            # PIL로 이미지 열기
            with Image.open(image_path) as pil_img:
                # HEIF/HEIC 파일의 경우 로그 출력
                if pil_img.format in ['HEIF', 'HEIC']:
                    logger.info(f"Processing HEIF/HEIC file: {image_path}")
                
                # RGBA인 경우 RGB로 변환
                if pil_img.mode == 'RGBA':
                    pil_img = pil_img.convert('RGB')
                elif pil_img.mode not in ['RGB', 'L']:  # HEIF의 경우 다양한 모드 가능
                    pil_img = pil_img.convert('RGB')
                
                # 이미지가 너무 큰 경우 리사이징
                if max(pil_img.size) > 4000:
                    ratio = 4000 / max(pil_img.size)
                    new_size = tuple(int(dim * ratio) for dim in pil_img.size)
                    pil_img = pil_img.resize(new_size, Image.Resampling.LANCZOS)
                
                # PIL 이미지를 OpenCV 형식으로 변환
                img_array = np.array(pil_img)
                orig_image = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

            if orig_image is None:
                logger.error(f"Failed to load image: {image_path}")
                return None, image_path

            # 텍스트 방향 보정
            base_image = self.correct_orientation(orig_image)

            # 기울기 보정
            skew_angle = self.detect_skew_angle(base_image)
            if abs(skew_angle) > 0.5:
                corrected_image = self.rotate_image(base_image, -skew_angle)
            else:
                corrected_image = base_image

            corrected_path = f"{image_path}_corrected.png"
            cv2.imwrite(corrected_path, corrected_image)
            logger.info(f"Skew + 회전 보정 이미지 저장 완료: {corrected_path}")
            return corrected_image, corrected_path

        except Exception as e:
            logger.error(f"Error in skew correction: {str(e)}")
            return None, image_path

    async def process_image(self, image_path: str) -> list:
        """이미지 처리 및 OCR 수행"""
        logger.info(f"Processing image: {image_path}")
        corrected_path = None

        try:
            if not self.validate_image(image_path):
                raise ValueError("Invalid or corrupted image file")

            # 이미지 보정
            corrected_image, corrected_path = self.correct_skew(image_path)
            if corrected_image is None:
                logger.warning("Using original image as correction failed")
                final_path = image_path
            else:
                final_path = corrected_path

            # OCR 수행
            result = self.reader.readtext(final_path)
            extracted_text = [text[1] for text in result]
            logger.info(f"Successfully extracted {len(extracted_text)} text segments from image")

            return extracted_text

        except Exception as e:
            logger.error(f"Error processing image {image_path}: {str(e)}", exc_info=True)
            raise
        finally:
            if corrected_path and corrected_path != image_path and os.path.exists(corrected_path):
                os.remove(corrected_path)
                logger.info(f"Removed temporary corrected image: {corrected_path}")

    async def process_pdf(self, pdf_path: str) -> list:
        """PDF 파일에서 텍스트 추출"""
        logger.info(f"Processing PDF: {pdf_path}")
        doc = fitz.open(pdf_path)
        extracted_text = []
        
        try:
            for page_num, page in enumerate(doc):
                logger.info(f"Processing page {page_num + 1} of PDF")
                try:
                    # PDF 페이지를 이미지로 변환
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 해상도 2배 증가
                    
                    # 이미지 데이터를 PIL Image로 변환
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    
                    # 이미지 저장
                    temp_image_path = os.path.join(self.upload_folder, f'temp_image_{page_num}.png')
                    img.save(temp_image_path, format='PNG')
                    
                    try:
                        # OCR 처리
                        result = self.reader.readtext(temp_image_path)
                        page_text = [text[1] for text in result]
                        extracted_text.extend(page_text)
                        logger.info(f"Successfully extracted {len(page_text)} text segments from page {page_num + 1}")
                    finally:
                        # 임시 이미지 파일 삭제
                        if os.path.exists(temp_image_path):
                            os.remove(temp_image_path)
                            logger.info(f"Removed temporary image: {temp_image_path}")
                
                except Exception as e:
                    logger.error(f"Error processing page {page_num + 1}: {str(e)}")
                    continue  # 한 페이지 처리 실패 시 다음 페이지로 진행
            
            return extracted_text
        except Exception as e:
            logger.error(f"Error processing PDF {pdf_path}: {str(e)}", exc_info=True)
            raise
        finally:
            doc.close()
            logger.info("PDF processing completed")

    @staticmethod
    def allowed_file(filename: str) -> bool:
        """허용된 파일 확장자 검사"""
        ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'heic', 'heif'}
        is_allowed = '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
        logger.info(f"File extension check for {filename}: {'allowed' if is_allowed else 'not allowed'}")
        return is_allowed 