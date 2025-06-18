"""
OCR 결과 파싱 모듈
명함 이미지에서 추출된 OCR 텍스트를 분석하여 구조화된 정보로 변환합니다.
"""

import re
import json
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class OCRParser:
    """OCR 결과를 파싱하여 명함 정보를 추출하는 클래스"""
    
    def __init__(self):
        # 회사명 관련 키워드
        self.company_keywords = [
            # 법인 형태 키워드
            '주식회사', '(주)', '㈜', '유한회사', '(유)', '㈜', '합자회사', '(합)', '합명회사',
            '유한책임회사', '(유책)', '조합', '농업회사법인', '어업회사법인',
            # 영문 법인 형태
            'Co.', 'Ltd', 'Inc', 'Corp', 'Corporation', 'Company', 'Limited', 'LLC', 'LLP',
            # 일반 회사 키워드
            '기업', '산업', '그룹', '건설', '개발', '기술', '시스템', '솔루션', '컨설팅', '서비스',
            '상사', '무역', '제조', '제작', '생산', '연구소', '연구원', '센터', '재단', '협회'
        ]
        
        # 직책 관련 키워드
        self.position_keywords = [
            '대표', '이사', '부장', '과장', '차장', '대리', '주임', '사원', '팀장', '실장', 
            'CEO', 'CTO', 'CFO', 'Manager', 'Director', 'President', '감사', '상무', '전무', 
            '본부장', '센터장', '사업부장', '팀리더', 'Lead', 'Senior', 'Principal'
        ]
        
        # 부서 관련 키워드
        self.department_keywords = [
            '부', '팀', '실', '센터', '본부', '사업부', 'Department', 'Division'
        ]
        
        # 주소 관련 키워드
        self.address_keywords = [
            '시', '구', '동', '로', '길', '번지', '층', '호', '빌딩', '타워'
        ]
        
        # 일반적인 한국 성씨
        self.common_surnames = [
            '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', 
            '권', '황', '안', '송', '류', '전', '홍', '고', '문', '양', '손', '배', '조', '백', 
            '허', '유', '남', '심', '노', '정', '하', '곽', '성', '차', '주', '우', '구', '신', 
            '임', '나', '전', '민', '유', '진', '지', '엄', '채', '원', '천', '방', '공', '강', 
            '현', '함', '변', '염', '양', '변', '여', '추', '노', '도', '소', '신', '석', '선', 
            '설', '마', '길', '연', '위', '표', '명', '기', '반', '왕', '금', '옥', '육', '인', 
            '맹', '제', '모', '장', '남', '탁', '국', '여', '진', '어', '은', '편', '구', '용'
        ]
    
    def parse(self, text_data: List[str], filename: str = None) -> Dict[str, Any]:
        """OCR 결과에서 명함 정보를 추출합니다."""
        result = {
            'company_name': None,
            'name': None,
            'name_en': None,
            'position': None,
            'department': None,
            'email': None,
            'phone': None,
            'mobile': None,
            'fax': None,
            'address': None,
            'postal_code': None,
            'original_filename': filename,
            'ocr_raw_text': json.dumps(text_data, ensure_ascii=False),
            'ocr_confidence': 80,  # 기본값, 나중에 실제 신뢰도로 교체
            'tags': None,
            'memo': None
        }
        
        # 텍스트 전처리
        text_data = self._preprocess_text(text_data)
        full_text = ' '.join(text_data)
        
        # 각 정보 추출
        result['email'] = self._extract_email(full_text)
        result['phone'], result['mobile'], result['fax'] = self._extract_phones(full_text)
        result['postal_code'] = self._extract_postal_code(full_text)
        result['name_en'] = self._extract_english_name(full_text)
        result['company_name'] = self._extract_company_name(text_data)
        result['name'] = self._extract_korean_name(text_data)
        result['position'] = self._extract_position(text_data)
        result['department'] = self._extract_department(text_data, result['position'])
        result['address'] = self._extract_address(text_data)
        
        # 결과 검증 및 로깅
        self._validate_and_log_result(result, text_data)
        
        return result
    
    def _preprocess_text(self, text_data: List[str]) -> List[str]:
        """텍스트 전처리 - 노이즈 제거"""
        # OCR 결과가 너무 짧거나 의미 없는 경우 로깅
        if len(text_data) <= 3 or all(len(text.strip()) <= 2 for text in text_data):
            logger.warning(f"OCR 결과가 부족합니다. 추출된 텍스트: {text_data}")
        
        # 텍스트 정리 - 노이즈 제거
        cleaned_texts = []
        for text in text_data:
            cleaned = text.strip()
            # 너무 짧거나 특수문자만 있는 텍스트 제거
            if len(cleaned) > 1 and not re.match(r'^[^\w가-힣]+$', cleaned):
                cleaned_texts.append(cleaned)
        
        if cleaned_texts:
            logger.info(f"정리된 OCR 텍스트: {cleaned_texts}")
            return cleaned_texts
        
        return text_data
    
    def _extract_email(self, full_text: str) -> str:
        """이메일 추출"""
        email_patterns = [
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            r'\b[가-힣A-Za-z0-9._%+-]+@[가-힣A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        ]
        
        for pattern in email_patterns:
            email_match = re.search(pattern, full_text)
            if email_match:
                return email_match.group()
        
        return None
    
    def _extract_phones(self, full_text: str) -> tuple:
        """전화번호 추출 (일반전화, 휴대폰, 팩스)"""
        phone_patterns = [
            r'(\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})',  # 02-1234-5678, 010-1234-5678
            r'(\d{3}[-\s]?\d{4}[-\s]?\d{4})',      # 010-1234-5678
            r'(\+82[-\s]?\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4})'  # +82-10-1234-5678
        ]
        
        phones_found = []
        for pattern in phone_patterns:
            phone_matches = re.findall(pattern, full_text)
            for match in phone_matches:
                phone_num = match.replace(' ', '-') if isinstance(match, str) else match[0].replace(' ', '-')
                phones_found.append(phone_num)
        
        # 전화번호 분류
        phone = None
        mobile = None
        fax = None
        
        # 팩스 우선 찾기 (Fax 키워드가 있는 라인에서)
        fax_pattern = r'Fax[.\s]*(\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})'
        fax_match = re.search(fax_pattern, full_text)
        if fax_match:
            fax = fax_match.group(1).replace(' ', '-')
            if fax in phones_found:
                phones_found.remove(fax)
        
        # 나머지 전화번호 분류
        if phones_found:
            if phones_found[0].startswith('010') or phones_found[0].startswith('+82-10'):
                mobile = phones_found[0]
                if len(phones_found) > 1:
                    phone = phones_found[1]
            else:
                phone = phones_found[0]
                if len(phones_found) > 1 and (phones_found[1].startswith('010') or phones_found[1].startswith('+82-10')):
                    mobile = phones_found[1]
        
        return phone, mobile, fax
    
    def _extract_postal_code(self, full_text: str) -> str:
        """우편번호 추출"""
        postal_patterns = [
            r'\b\d{5}\b',  # 5자리 우편번호
            r'\b\d{3}-\d{3}\b'  # 구 우편번호 형식
        ]
        
        for pattern in postal_patterns:
            postal_match = re.search(pattern, full_text)
            if postal_match:
                return postal_match.group()
        
        return None
    
    def _extract_english_name(self, full_text: str) -> str:
        """영문 이름 추출"""
        english_name_pattern = r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b'
        english_match = re.search(english_name_pattern, full_text)
        if english_match:
            return english_match.group()
        
        return None
    
    def _extract_company_name(self, text_data: List[str]) -> str:
        """회사명 추출 (법인 형태 키워드 강화)"""
        company_candidates = []
        
        # 법인 형태 키워드 리스트 (우선순위 높음)
        legal_form_keywords = ['주식회사', '(주)', '㈜', '유한회사', '(유)', '합자회사', '(합)', 
                              '합명회사', '유한책임회사', '(유책)', 'Co.', 'Ltd', 'Inc', 'Corp', 
                              'Corporation', 'Company', 'Limited', 'LLC', 'LLP']
        
        # 1. 법인 형태 키워드가 포함된 텍스트 최우선 처리
        for text in text_data:
            clean_text = text.strip()
            if any(keyword in clean_text for keyword in legal_form_keywords):
                company_candidates.append(clean_text)
                logger.info(f"법인 형태 키워드로 회사명 발견: {clean_text}")
        
        # 2. 일반적인 회사 키워드가 포함된 텍스트
        if not company_candidates:
            for text in text_data:
                clean_text = text.strip()
                if any(keyword in clean_text for keyword in self.company_keywords):
                    company_candidates.append(clean_text)
        
        # 3. 회사 키워드가 없다면, 길이가 긴 텍스트나 특정 패턴 확인
        if not company_candidates:
            for text in text_data:
                clean_text = text.strip()
                # 길이가 5글자 이상이고, 숫자가 없고, 일반적인 이름 패턴이 아닌 경우
                if (len(clean_text) > 5 and 
                    not any(char.isdigit() for char in clean_text) and
                    not re.match(r'^[가-힣]{2,4}$', clean_text) and  # 2-4글자 순수 한글이름 제외
                    '@' not in clean_text and  # 이메일 제외
                    not re.match(r'.*[대표이사부장과장차장대리주임사원팀장실장].*', clean_text)):  # 직책 제외
                    company_candidates.append(clean_text)
        
        # 4. 가장 적절한 회사명 선택
        if company_candidates:
            # 법인 형태 키워드가 포함된 것 최우선
            legal_candidates = [text for text in company_candidates 
                              if any(keyword in text for keyword in legal_form_keywords)]
            if legal_candidates:
                result = max(legal_candidates, key=len)
                logger.info(f"법인 형태 기준으로 선택된 회사명: {result}")
                return result
            
            # 일반 회사 키워드가 포함된 것 다음 우선
            keyword_candidates = [text for text in company_candidates 
                                if any(keyword in text for keyword in self.company_keywords)]
            if keyword_candidates:
                result = max(keyword_candidates, key=len)
            else:
                result = max(company_candidates, key=len)
            
            logger.info(f"회사명 후보들: {company_candidates}, 선택된 회사명: {result}")
            return result
        elif text_data:
            # 후보가 없으면 첫 번째 텍스트 사용
            result = text_data[0]
            logger.warning(f"명확한 회사명을 찾지 못해 첫 번째 텍스트를 사용: {result}")
            return result
        
        return None
    
    def _extract_korean_name(self, text_data: List[str]) -> str:
        """한국어 이름 추출 (대폭 개선된 로직)"""
        name_candidates = []
        
        # 각 텍스트에서 이름 패턴 찾기
        for text in text_data:
            clean_text = text.strip()
            
            # 1. 직책과 함께 있는 이름 패턴 (예: "대표우 태 경", "이사 김철수")
            position_name_patterns = [
                r'(?:대표|이사|부장|과장|차장|대리|주임|사원|팀장|실장|CEO|CTO|CFO|Manager|Director)\s*([가-힣]{1,2}\s*[가-힣]{1,3})',
                r'([가-힣]{1,2}\s*[가-힣]{1,3})\s*(?:대표|이사|부장|과장|차장|대리|주임|사원|팀장|실장|CEO|CTO|CFO)',
            ]
            
            for pattern in position_name_patterns:
                matches = re.findall(pattern, clean_text)
                for match in matches:
                    # 공백 제거하고 이름만 추출
                    name_candidate = re.sub(r'\s+', '', match).strip()
                    if 2 <= len(name_candidate) <= 4 and name_candidate[0] in self.common_surnames:
                        if not any(keyword in name_candidate for keyword in self.company_keywords):
                            name_candidates.append(name_candidate)
                            logger.info(f"직책-이름 패턴에서 발견: '{clean_text}' -> '{name_candidate}'")
            
            # 2. 괄호 앞의 이름 패턴 (예: "우태경 (우남철)")
            bracket_name_pattern = r'([가-힣]{2,4})\s*\([^)]+\)'
            bracket_matches = re.findall(bracket_name_pattern, clean_text)
            for match in bracket_matches:
                name_candidate = re.sub(r'\s+', '', match).strip()
                if name_candidate[0] in self.common_surnames:
                    if not any(keyword in name_candidate for keyword in self.company_keywords):
                        name_candidates.append(name_candidate)
                        logger.info(f"괄호 패턴에서 발견: '{clean_text}' -> '{name_candidate}'")
            
            # 3. 공백이 있는 한국어 이름 패턴 (예: "우 태 경")
            spaced_name_pattern = r'([가-힣]\s+[가-힣](?:\s+[가-힣])?)'
            spaced_matches = re.findall(spaced_name_pattern, clean_text)
            for match in spaced_matches:
                name_candidate = re.sub(r'\s+', '', match).strip()
                if 2 <= len(name_candidate) <= 4 and name_candidate[0] in self.common_surnames:
                    # 직책이나 회사명이 포함되지 않은 경우만
                    if not any(keyword in clean_text for keyword in self.position_keywords + self.company_keywords):
                        name_candidates.append(name_candidate)
                        logger.info(f"공백 이름 패턴에서 발견: '{clean_text}' -> '{name_candidate}'")
        
        # 4. 기본 한국어 이름 패턴 (순수 한글 2-4글자)
        if not name_candidates:
            korean_texts = [text for text in text_data if re.search(r'[가-힣]', text)]
            for text in korean_texts:
                clean_text = text.strip()
                # 순수 한글이고 2-4글자인 경우
                if 2 <= len(clean_text) <= 4 and clean_text.replace(' ', '').isalpha() and all(ord('가') <= ord(char) <= ord('힣') for char in clean_text if char != ' '):
                    # 회사명 키워드가 포함되지 않은 경우에만 이름 후보로 추가
                    if not any(keyword in clean_text for keyword in self.company_keywords):
                        name_candidates.append(clean_text)
        
        # 5. 성씨로 시작하는 패턴 확인
        if not name_candidates:
            korean_texts = [text for text in text_data if re.search(r'[가-힣]', text)]
            for text in korean_texts:
                clean_text = text.strip()
                # 성씨로 시작하는 2-4글자 텍스트 찾기
                if len(clean_text) >= 2 and clean_text[0] in self.common_surnames:
                    if len(clean_text) <= 4 and all(ord('가') <= ord(char) <= ord('힣') for char in clean_text):
                        if not any(keyword in clean_text for keyword in self.company_keywords):
                            name_candidates.append(clean_text)
        
        # 이름 후보 정리 및 선택
        if name_candidates:
            # 중복 제거
            unique_candidates = list(set(name_candidates))
            
            # 가장 적절한 이름 선택 (길이와 패턴을 고려)
            best_name = None
            for candidate in unique_candidates:
                # 3글자 이름을 우선 선택
                if len(candidate) == 3:
                    best_name = candidate
                    break
            
            # 3글자가 없으면 첫 번째 후보 사용
            if not best_name:
                best_name = unique_candidates[0]
            
            logger.info(f"이름 후보들: {unique_candidates}, 선택된 이름: {best_name}")
            return best_name
        else:
            logger.warning("이름을 찾을 수 없습니다. OCR 텍스트를 확인해주세요.")
            logger.warning(f"분석된 텍스트: {text_data}")
            return None
    
    def _extract_position(self, text_data: List[str]) -> str:
        """직책 추출"""
        # 1. 직책만 단독으로 있는 경우
        for text in text_data:
            clean_text = text.strip()
            if clean_text in self.position_keywords:
                logger.info(f"단독 직책 발견: {clean_text}")
                return clean_text
        
        # 2. 직책이 다른 텍스트와 함께 있는 경우
        for text in text_data:
            clean_text = text.strip()
            for keyword in self.position_keywords:
                if keyword in clean_text:
                    # 직책만 추출 (이름 부분 제거)
                    if keyword == '대표' and len(clean_text) > 2:
                        # "대표우태경" -> "대표"
                        logger.info(f"직책 추출: '{clean_text}' -> '대표'")
                        return '대표'
                    else:
                        logger.info(f"직책 텍스트 발견: {clean_text}")
                        return clean_text
        
        return None
    
    def _extract_department(self, text_data: List[str], position: str) -> str:
        """부서 추출"""
        for text in text_data:
            if any(keyword in text for keyword in self.department_keywords) and text != position:
                return text
        
        return None
    
    def _extract_address(self, text_data: List[str]) -> str:
        """주소 추출"""
        address_candidates = []
        
        for text in text_data:
            if len(text) > 10 or any(keyword in text for keyword in self.address_keywords):
                address_candidates.append(text)
        
        if address_candidates:
            return max(address_candidates, key=len)
        
        return None
    
    def _validate_and_log_result(self, result: Dict[str, Any], text_data: List[str]):
        """파싱 결과 검증 및 로깅"""
        missing_fields = []
        if not result['name']:
            missing_fields.append('이름')
        if not result['company_name']:
            missing_fields.append('회사명')
        if not result['email'] and not result['phone'] and not result['mobile']:
            missing_fields.append('연락처')
        
        if missing_fields:
            logger.warning(f"누락된 정보: {', '.join(missing_fields)}")
            logger.warning(f"원본 OCR 텍스트 재확인: {text_data}")
        
        logger.info(f"파싱 완료 - 이름: {result['name']}, 회사: {result['company_name']}, 이메일: {result['email']}, 전화: {result['phone']}")


# 싱글톤 인스턴스 생성
ocr_parser = OCRParser()

def parse_ocr_result(text_data: List[str], filename: str = None) -> Dict[str, Any]:
    """OCR 결과에서 명함 정보를 추출합니다. (하위 호환성을 위한 함수)"""
    return ocr_parser.parse(text_data, filename) 