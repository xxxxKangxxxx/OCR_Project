"""
OCR 결과 파싱 모듈
명함 이미지에서 추출된 OCR 텍스트를 분석하여 구조화된 정보로 변환합니다.
"""

import re
import json
import logging
from typing import List, Dict, Any, Optional

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
            '대표', '이사', '대표이사', '부장', '과장', '차장', '대리', '주임', '사원', '팀장', '실장', 
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
            'mobile_phone_number': None,
            'phone_number': None,
            'fax_number': None,
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
        """회사명 추출 (주소 필터링 및 엄격한 조건 적용)"""
        company_candidates = []
        
        # 법인 형태 키워드 리스트 (우선순위 높음)
        legal_form_keywords = ['주식회사', '(주)', '㈜', '유한회사', '(유)', '합자회사', '(합)', 
                            '합명회사', '유한책임회사', '(유책)', 'Co.', 'Ltd', 'Inc', 'Corp', 
                            'Corporation', 'Company', 'Limited', 'LLC', 'LLP', '사무소']
        
        # 1. 인접 키워드 병합 처리 (OCR 띄어쓰기 오류 대응)
        merged_texts = self._merge_adjacent_company_keywords(text_data, legal_form_keywords)
        logger.info(f"병합 후 텍스트: {merged_texts}")
        
        # 2. 법인 형태 키워드가 포함된 텍스트 최우선 처리
        for text in merged_texts:
            clean_text = text.strip()
            if (any(keyword in clean_text for keyword in legal_form_keywords) and
                not self._is_address_text(clean_text) and
                not self._is_excluded_text(clean_text)):
                company_candidates.append(clean_text)
                logger.info(f"법인 형태 키워드로 회사명 발견: {clean_text}")
        
        # 3. 일반적인 회사 키워드가 포함된 텍스트
        if not company_candidates:
            for text in merged_texts:
                clean_text = text.strip()
                if (any(keyword in clean_text for keyword in self.company_keywords) and
                    not self._is_address_text(clean_text) and
                    not self._is_excluded_text(clean_text)):
                    company_candidates.append(clean_text)
                    logger.info(f"회사 키워드로 회사명 발견: {clean_text}")
        
        # 4. 가장 적절한 회사명 선택
        if company_candidates:
            # 법인 형태 키워드가 포함된 것 최우선
            legal_candidates = [text for text in company_candidates 
                            if any(keyword in text for keyword in legal_form_keywords)]
            if legal_candidates:
                # 법인 형태 중에서는 가장 완전한 형태 선택 (하지만 너무 길지는 않게)
                legal_candidates.sort(key=lambda x: (len(x) > 50, -len(x)))  # 50글자 이상은 후순위
                result = legal_candidates[0]
                logger.info(f"법인 형태 기준으로 선택된 회사명: {result}")
                return result
            
            # 일반 회사 키워드가 포함된 것 다음 우선
            keyword_candidates = [text for text in company_candidates 
                                if any(keyword in text for keyword in self.company_keywords)]
            if keyword_candidates:
                # 키워드 포함 중에서는 적절한 길이 선택 (너무 길지 않게)
                keyword_candidates.sort(key=lambda x: (len(x) > 30, -len(x)))  # 30글자 이하 우선
                result = keyword_candidates[0]
                logger.info(f"회사 키워드 기준으로 선택된 회사명: {result}")
                return result
        
        # 5. 후보가 없는 경우에만 제한적으로 다른 텍스트 고려
        if not company_candidates:
            logger.warning("법인/회사 키워드가 포함된 회사명을 찾을 수 없습니다.")
            
            # 명확히 제외되지 않는 텍스트 중에서 선택 (매우 제한적)
            for text in text_data:
                clean_text = text.strip()
                if (len(clean_text) >= 3 and  # 최소 3글자 이상
                    not self._is_address_text(clean_text) and
                    not self._is_excluded_text(clean_text) and
                    not self._is_personal_name(clean_text)):
                    logger.info(f"제한적 조건으로 회사명 후보 발견: {clean_text}")
                    return clean_text
            
            logger.warning("적절한 회사명을 찾을 수 없습니다.")
        
        return None

    def _is_address_text(self, text: str) -> bool:
        """텍스트가 주소인지 판단하는 함수"""
        if not text:
            return False
        
        # 주소 관련 강력한 지표들
        strong_address_indicators = [
            # 행정구역 패턴
            r'[가-힣]*시\s*[가-힣]*구',  # 서울시 강남구
            r'[가-힣]*도\s*[가-힣]*시',  # 경기도 성남시
            r'[가-힣]*구\s*[가-힣]*동',  # 강남구 역삼동
            r'[가-힣]*시\s*[가-힣]*동',  # 부산시 해운대동
            # 도로명 패턴
            r'[가-힣]*로\s*\d+',         # 테헤란로 123
            r'[가-힣]*길\s*\d+',         # 강남대로길 45
            r'\d+번길',                   # 15번길
            r'[가-힣]*대로\s*\d+',       # 강남대로 567
            # 건물 정보 패턴
            r'\d+층',                     # 5층
            r'\d+호',                     # 301호
            r'[가-힣]*빌딩',              # 삼성빌딩
            r'[가-힣]*타워',              # 63타워
            r'[가-힣]*센터',              # 월드트레이드센터 (단, 회사명의 센터와 구분 필요)
            # 기타 주소 패턴
            r'\d+-\d+',                   # 123-45 (번지)
            r'[가-힣]*아파트',            # 래미안아파트
            r'[가-힣]*오피스텔',          # 강남오피스텔
        ]
        
        # 강력한 지표가 있으면 주소로 판단
        for pattern in strong_address_indicators:
            if re.search(pattern, text):
                logger.info(f"강력한 주소 지표로 주소 판단: '{text}' (패턴: {pattern})")
                return True
        
        # 주소 키워드 개수 확인 (시, 구, 동, 로, 길 등)
        address_keyword_count = sum(1 for keyword in self.address_keywords if keyword in text)
        
        # 주소 키워드가 2개 이상이고 길이가 10글자 이상인 경우 주소로 판단
        if address_keyword_count >= 2 and len(text) >= 10:
            logger.info(f"주소 키워드 다수 포함으로 주소 판단: '{text}' (키워드 수: {address_keyword_count})")
            return True
        
        # 우편번호가 포함된 경우
        if re.search(r'\b\d{5}\b', text):
            logger.info(f"우편번호 포함으로 주소 판단: '{text}'")
            return True
        
        return False

    def _is_excluded_text(self, text: str) -> bool:
        """제외해야 할 텍스트인지 판단하는 함수"""
        if not text:
            return True
        
        # 제외할 패턴들
        exclude_patterns = [
            r'.*@.*',  # 이메일
            r'.*[0-9]{2,3}[-\s]?[0-9]{3,4}[-\s]?[0-9]{4}.*',  # 전화번호
            r'^[0-9\-\s\(\)]+$',  # 숫자와 기호만
            r'^\d{5}$',  # 우편번호
            r'^[A-Za-z]{1,3}$',  # 너무 짧은 영문 (CEO, CTO 등 직책 제외)
            r'^www\.',  # 웹사이트
            r'^http',   # URL
        ]
        
        # 제외 패턴에 해당하는지 확인
        for pattern in exclude_patterns:
            if re.match(pattern, text):
                logger.info(f"제외 패턴으로 텍스트 제외: '{text}' (패턴: {pattern})")
                return True
        
        # 직책 키워드가 포함된 경우 제외 (단독 직책인 경우)
        if text.strip() in self.position_keywords:
            logger.info(f"직책 키워드로 텍스트 제외: '{text}'")
            return True
        
        return False

    def _is_personal_name(self, text: str) -> bool:
        """개인 이름인지 판단하는 함수"""
        if not text:
            return False
        
        # 공백 제거 후 순수 한글 확인
        no_space_text = re.sub(r'\s+', '', text)
        
        # 2-4글자 순수 한글이고 성씨로 시작하는 경우
        if (2 <= len(no_space_text) <= 4 and 
            re.match(r'^[가-힣]+$', no_space_text) and 
            no_space_text[0] in self.common_surnames):
            logger.info(f"개인 이름으로 판단: '{text}'")
            return True
        
        return False

    def _merge_adjacent_company_keywords(self, text_data: List[str], legal_keywords: List[str]) -> List[str]:
        """인접한 회사명 관련 키워드들을 병합하는 함수 (주소 필터링 추가)"""
        if not text_data:
            return text_data
        
        merged_texts = []
        i = 0
        
        while i < len(text_data):
            current_text = text_data[i].strip()
            
            # 현재 텍스트가 주소인 경우 병합하지 않고 그대로 추가
            if self._is_address_text(current_text):
                merged_texts.append(current_text)
                i += 1
                continue
            
            # 현재 텍스트가 법인 키워드인지 확인
            is_legal_keyword = any(keyword in current_text for keyword in legal_keywords)
            
            if is_legal_keyword and i + 1 < len(text_data):
                next_text = text_data[i + 1].strip()
                
                # 다음 텍스트가 주소가 아니고 회사명일 가능성이 높은지 확인
                if (not self._is_address_text(next_text) and 
                    not self._is_excluded_text(next_text) and
                    self._is_potential_company_name(next_text)):
                    # 병합
                    merged_text = current_text + ' ' + next_text
                    merged_texts.append(merged_text)
                    logger.info(f"인접 키워드 병합: '{current_text}' + '{next_text}' -> '{merged_text}'")
                    i += 2  # 두 개를 처리했으므로 2만큼 증가
                    continue
            
            # 현재 텍스트가 잠재적 회사명이고 다음이 법인 키워드인 경우
            elif (not self._is_address_text(current_text) and 
                not self._is_excluded_text(current_text) and
                self._is_potential_company_name(current_text) and 
                i + 1 < len(text_data)):
                next_text = text_data[i + 1].strip()
                is_next_legal = any(keyword in next_text for keyword in legal_keywords)
                
                # 다음 텍스트가 주소가 아니고 법인 키워드인 경우
                if is_next_legal and not self._is_address_text(next_text):
                    # 병합 (회사명 + 법인형태)
                    merged_text = current_text + ' ' + next_text
                    merged_texts.append(merged_text)
                    logger.info(f"인접 키워드 병합: '{current_text}' + '{next_text}' -> '{merged_text}'")
                    i += 2
                    continue
            
            # 병합하지 않는 경우 그대로 추가
            merged_texts.append(current_text)
            i += 1
        
        # 원본 텍스트도 포함 (병합된 것과 원본 모두 후보로 고려)
        all_texts = list(text_data) + merged_texts
        return all_texts
    
    def _is_potential_company_name(self, text: str) -> bool:
        """텍스트가 잠재적 회사명인지 판단"""
        if not text or len(text) < 2:
            return False
        
        # 명백히 회사명이 아닌 패턴들
        exclude_patterns = [
            r'^[가-힣]{2,4}$',  # 2-4글자 순수 한글 이름 (성씨로 시작)
            r'.*@.*',  # 이메일
            r'.*[0-9]{2,3}[-\s]?[0-9]{3,4}[-\s]?[0-9]{4}.*',  # 전화번호
            r'^[0-9\-\s\(\)]+$',  # 숫자와 기호만
            r'^[A-Za-z]{1,3}$',  # 짧은 영문 (KIA, TO 등은 제외)
        ]
        
        # 제외 패턴에 해당하면 회사명이 아님
        if any(re.match(pattern, text) for pattern in exclude_patterns):
            return False
        
        # 직책 키워드가 포함되면 회사명이 아님
        if any(keyword in text for keyword in self.position_keywords):
            return False
        
        # 성씨로 시작하는 2-4글자 한글이면 이름일 가능성이 높음
        if (2 <= len(text) <= 4 and 
            re.match(r'^[가-힣]+$', text) and 
            text[0] in self.common_surnames):
            return False
        
        return True
    
    def _extract_korean_name(self, text_data: List[str]) -> str:
        """한국어 이름 추출 (공백 처리 및 필터링 개선)"""
        logger.info(f"이름 추출 시작 - 입력 텍스트: {text_data}")

        name_candidates = []
        for text in text_data:
            clean_text = text.strip()
            no_space_text = re.sub(r'\s+', '', clean_text)

            # 제외 조건 검사
            if any(keyword in clean_text for keyword in self.company_keywords + self.position_keywords):
                continue
            if '@' in clean_text or re.search(r'\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}', clean_text):
                continue

            # 순수 한글 공백 포함 + 제거 후 이름 조건 확인
            if re.match(r'^[가-힣\s]{2,}$', clean_text):
                if 2 <= len(no_space_text) <= 4 and no_space_text[0] in self.common_surnames:
                    name_candidates.append(no_space_text)
                    logger.info(f"이름 후보 발견: '{clean_text}' → '{no_space_text}'")

        if name_candidates:
            # 가장 많은 공백 제거 이름 중 3글자 > 2글자 > 나머지 순으로 선택
            for length in [3, 2]:
                for name in name_candidates:
                    if len(name) == length:
                        logger.info(f"최종 선택된 이름: {name}")
                        return name
            logger.info(f"최종 선택된 이름: {name_candidates[0]}")
            return name_candidates[0]

        logger.warning("이름을 찾을 수 없습니다.")
        logger.info(f"모든 후보: {name_candidates}")
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
    
    def _extract_address(self, text_data: List[str]) -> Optional[str]:
        """주소 추출 (우편번호 제거 + 정규표현식 + 키워드 + 괄호 줄 병합)"""

        address_keywords = self.address_keywords
        address_regex = re.compile(
            r'\b(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s?[^\s]{0,15}(시|도)\s?[^\s]{0,15}(구|군|시)?[^\s]*(로|길|번길)[^\s]*'
        )
        zipcode_regex = re.compile(r'\b\d{5}\b')  # 우편번호 제거용

        candidates = []

        for i, text in enumerate(text_data):
            cleaned = text.strip()
            cleaned = zipcode_regex.sub('', cleaned).strip()  # ✅ 우편번호 제거

            score = 0
            if any(k in cleaned for k in address_keywords):
                score += 1
            if address_regex.search(cleaned):
                score += 2

            if score > 0:
                appended_text = cleaned
                if i + 1 < len(text_data):
                    next_line = text_data[i + 1].strip()
                    if re.match(r'^\(.+\)$', next_line):  # 괄호로만 구성된 문장
                        appended_text += f' {next_line}'
                candidates.append((score, appended_text))

        if not candidates:
            return None

        sorted_candidates = sorted(candidates, key=lambda x: (x[0], len(x[1])), reverse=True)
        return sorted_candidates[0][1]
    
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