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
        """회사명 추출 (길이 제한 완화 및 패턴 개선, 인접 키워드 병합)"""
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
            if any(keyword in clean_text for keyword in legal_form_keywords):
                company_candidates.append(clean_text)
                logger.info(f"법인 형태 키워드로 회사명 발견: {clean_text}")
        
        # 3. 일반적인 회사 키워드가 포함된 텍스트
        if not company_candidates:
            for text in merged_texts:
                clean_text = text.strip()
                if any(keyword in clean_text for keyword in self.company_keywords):
                    company_candidates.append(clean_text)
                    logger.info(f"회사 키워드로 회사명 발견: {clean_text}")
        
        # 4. 회사 키워드가 없다면, 더 유연한 패턴으로 회사명 후보 찾기
        if not company_candidates:
            for text in merged_texts:
                clean_text = text.strip()
                
                # 제외할 패턴들
                exclude_patterns = [
                    r'^[가-힣]{2,4}$',  # 2-4글자 순수 한글 이름
                    r'.*@.*',  # 이메일
                    r'.*[0-9]{2,3}[-\s]?[0-9]{3,4}[-\s]?[0-9]{4}.*',  # 전화번호
                    r'^[0-9\-\s\(\)]+$',  # 숫자와 기호만
                    r'^[A-Za-z\s]+$'  # 순수 영문 (영문 이름일 가능성)
                ]
                
                # 직책 키워드가 포함된 경우 제외
                has_position = any(keyword in clean_text for keyword in self.position_keywords)
                
                # 제외 패턴에 해당하는지 확인
                is_excluded = any(re.match(pattern, clean_text) for pattern in exclude_patterns)
                
                # 길이 조건을 완화: 2글자 이상이면 후보로 고려
                if (len(clean_text) >= 2 and 
                    not has_position and 
                    not is_excluded and
                    clean_text[0] not in self.common_surnames):  # 성씨로 시작하지 않는 경우
                    company_candidates.append(clean_text)
                    logger.info(f"패턴 분석으로 회사명 후보 발견: {clean_text}")
        
        # 5. 여전히 후보가 없다면 더 관대한 조건으로 추가 검색
        if not company_candidates:
            for text in merged_texts:
                clean_text = text.strip()
                
                # 이메일, 전화번호, 순수 숫자가 아닌 모든 텍스트를 후보로 고려
                if (len(clean_text) >= 2 and 
                    '@' not in clean_text and
                    not re.match(r'^[0-9\-\s\(\)]+$', clean_text) and
                    not re.match(r'.*[0-9]{2,3}[-\s]?[0-9]{3,4}[-\s]?[0-9]{4}.*', clean_text)):
                    company_candidates.append(clean_text)
                    logger.info(f"관대한 조건으로 회사명 후보 발견: {clean_text}")
        
        # 6. 가장 적절한 회사명 선택
        if company_candidates:
            # 법인 형태 키워드가 포함된 것 최우선
            legal_candidates = [text for text in company_candidates 
                              if any(keyword in text for keyword in legal_form_keywords)]
            if legal_candidates:
                # 법인 형태 중에서는 가장 완전한 형태 선택
                result = max(legal_candidates, key=len)
                logger.info(f"법인 형태 기준으로 선택된 회사명: {result}")
                return result
            
            # 일반 회사 키워드가 포함된 것 다음 우선
            keyword_candidates = [text for text in company_candidates 
                                if any(keyword in text for keyword in self.company_keywords)]
            if keyword_candidates:
                # 키워드 포함 중에서는 적절한 길이 선택 (너무 길지 않게)
                keyword_candidates.sort(key=lambda x: (len(x) > 20, -len(x)))  # 20글자 이하 우선, 그 다음 긴 순서
                result = keyword_candidates[0]
                logger.info(f"회사 키워드 기준으로 선택된 회사명: {result}")
                return result
            
            # 키워드가 없는 경우, 적절한 길이의 텍스트 선택
            company_candidates.sort(key=lambda x: (
                abs(len(x) - 8),  # 8글자에 가까운 것 우선
                len(x) > 30,      # 30글자 이상은 후순위
                -len(x)           # 그 외에는 긴 것 우선
            ))
            result = company_candidates[0]
            logger.info(f"패턴 분석으로 선택된 회사명: {result}")
            return result
            
        elif text_data:
            # 후보가 없으면 첫 번째 텍스트 사용
            result = text_data[0]
            logger.warning(f"명확한 회사명을 찾지 못해 첫 번째 텍스트를 사용: {result}")
            return result
        
        return None
    
    def _merge_adjacent_company_keywords(self, text_data: List[str], legal_keywords: List[str]) -> List[str]:
        """인접한 회사명 관련 키워드들을 병합하는 함수"""
        if not text_data:
            return text_data
        
        merged_texts = []
        i = 0
        
        while i < len(text_data):
            current_text = text_data[i].strip()
            
            # 현재 텍스트가 법인 키워드인지 확인
            is_legal_keyword = any(keyword in current_text for keyword in legal_keywords)
            
            if is_legal_keyword and i + 1 < len(text_data):
                next_text = text_data[i + 1].strip()
                
                # 다음 텍스트가 회사명일 가능성이 높은지 확인
                if self._is_potential_company_name(next_text):
                    # 병합
                    merged_text = current_text + next_text
                    merged_texts.append(merged_text)
                    logger.info(f"인접 키워드 병합: '{current_text}' + '{next_text}' -> '{merged_text}'")
                    i += 2  # 두 개를 처리했으므로 2만큼 증가
                    continue
            
            # 현재 텍스트가 잠재적 회사명이고 다음이 법인 키워드인 경우
            elif (self._is_potential_company_name(current_text) and 
                  i + 1 < len(text_data)):
                next_text = text_data[i + 1].strip()
                is_next_legal = any(keyword in next_text for keyword in legal_keywords)
                
                if is_next_legal:
                    # 병합 (회사명 + 법인형태)
                    merged_text = current_text + next_text
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
        """한국어 이름 추출 (회사명/직책 제외 후 이름 찾기)"""
        logger.info(f"이름 추출 시작 - 입력 텍스트: {text_data}")
        
        # 1. 회사명과 직책이 포함된 텍스트 제외
        filtered_texts = []
        excluded_texts = []
        
        for text in text_data:
            clean_text = text.strip()
            if not clean_text:  # 빈 텍스트 제외
                continue
                
            # 회사명 키워드가 포함된 텍스트 제외
            has_company_keyword = any(keyword in clean_text for keyword in self.company_keywords)
            
            # 직책 키워드가 포함된 텍스트 제외 (단, 공백이 있는 경우 더 정확히 확인)
            has_position_keyword = False
            for keyword in self.position_keywords:
                if keyword in clean_text:
                    # 공백이 있는 경우 (예: "이 사") 완전 일치하는지 확인
                    if ' ' in clean_text:
                        # 공백 제거한 버전으로도 확인
                        clean_no_space = re.sub(r'\s+', '', clean_text)
                        if clean_no_space == keyword:
                            has_position_keyword = True
                            break
                    else:
                        # 완전 일치하는 경우에만 직책으로 간주
                        if clean_text == keyword:
                            has_position_keyword = True
                            break
            
            # 이메일, 전화번호, 주소 등이 포함된 텍스트 제외
            has_email = '@' in clean_text
            has_phone = re.search(r'\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}', clean_text)
            has_address = any(keyword in clean_text for keyword in self.address_keywords)
            has_postal = re.search(r'\d{5}', clean_text)
            
            # 기타 제외할 패턴들
            has_tel_fax_mobile = any(label in clean_text.upper() for label in ['TEL', 'FAX', 'MOBILE', 'E-MAIL'])
            
            if has_company_keyword or has_email or has_phone or has_address or has_postal or has_tel_fax_mobile:
                excluded_texts.append(clean_text)
                logger.info(f"제외된 텍스트 (회사/연락처/주소): '{clean_text}'")
            elif has_position_keyword:
                # 직책이 포함된 텍스트는 이름+직책 조합인지 확인
                name_with_position = self._extract_name_from_position_text(clean_text)
                if name_with_position:
                    logger.info(f"직책 텍스트에서 이름 추출: '{clean_text}' -> '{name_with_position}'")
                    return name_with_position
                else:
                    excluded_texts.append(clean_text)
                    logger.info(f"제외된 텍스트 (직책만): '{clean_text}'")
            else:
                filtered_texts.append(clean_text)
                logger.info(f"이름 후보 텍스트: '{clean_text}'")
        
        logger.info(f"필터링 후 남은 텍스트: {filtered_texts}")
        logger.info(f"제외된 텍스트: {excluded_texts}")
        
        # 2. 남은 텍스트에서 이름 찾기
        name_candidates = []
        
        for text in filtered_texts:
            clean_text = text.strip()
            
            # 2-1. 순수 한글 이름 (2-4글자)
            if re.match(r'^[가-힣]+$', clean_text) and 2 <= len(clean_text) <= 4:
                if clean_text[0] in self.common_surnames:
                    name_candidates.append(clean_text)
                    logger.info(f"순수 한글 이름 발견: '{clean_text}'")
            
            # 2-2. 공백이 있는 한글 이름 (예: "김   정   훈", "성 인 근") - 개선된 패턴
            elif re.match(r'^[가-힣]\s+[가-힣](\s+[가-힣])*$', clean_text):
                name_candidate = re.sub(r'\s+', '', clean_text)
                if 2 <= len(name_candidate) <= 4 and name_candidate[0] in self.common_surnames:
                    name_candidates.append(name_candidate)
                    logger.info(f"공백 포함 이름 발견: '{clean_text}' -> '{name_candidate}'")
            
            # 2-3. 괄호가 있는 경우 괄호 앞 이름 확인
            elif '(' in clean_text:
                bracket_match = re.search(r'^([가-힣\s]{2,})\s*\(', clean_text)
                if bracket_match:
                    name_candidate = re.sub(r'\s+', '', bracket_match.group(1))
                    if 2 <= len(name_candidate) <= 4 and name_candidate[0] in self.common_surnames:
                        name_candidates.append(name_candidate)
                        logger.info(f"괄호 앞 이름 발견: '{clean_text}' -> '{name_candidate}'")
        
        # 3. 이름 후보 선택
        if name_candidates:
            unique_candidates = list(set(name_candidates))
            logger.info(f"발견된 이름 후보들: {unique_candidates}")
            
            # 3글자 이름 우선, 그 다음 2글자
            best_name = None
            for candidate in unique_candidates:
                if len(candidate) == 3:
                    best_name = candidate
                    break
            
            if not best_name:
                for candidate in unique_candidates:
                    if len(candidate) == 2:
                        best_name = candidate
                        break
            
            if not best_name:
                best_name = unique_candidates[0]
            
            logger.info(f"최종 선택된 이름: {best_name}")
            return best_name
        
        # 4. 이름을 못 찾은 경우 마지막 시도 - 더 관대한 조건
        logger.warning("필터링된 텍스트에서 이름을 찾지 못했습니다. 전체 텍스트 재검토...")
        for text in text_data:
            clean_text = text.strip()
            
            # 공백이 포함된 한글 패턴도 포함하여 재검토
            if re.match(r'^[가-힣\s]+$', clean_text):
                # 공백 제거하고 확인
                name_candidate = re.sub(r'\s+', '', clean_text)
                if (2 <= len(name_candidate) <= 4 and 
                    name_candidate[0] in self.common_surnames):
                    
                    # 명백한 비이름 패턴 제외
                    exclude_keywords = ['주식회사', '㈜', '(주)', '대표', '이사', '부장', '과장', 
                                      '산업', '기업', '그룹', '회사', '센터']
                    if not any(exclude in name_candidate for exclude in exclude_keywords):
                        logger.info(f"마지막 시도로 발견된 이름: '{clean_text}' -> '{name_candidate}'")
                        return name_candidate
        
        logger.warning("이름을 찾을 수 없습니다.")
        return None
    
    def _extract_name_from_position_text(self, text: str) -> str:
        """직책이 포함된 텍스트에서 이름 추출"""
        # "대표이사 성인근" 또는 "성인근 대표이사" 패턴
        
        # 직책 뒤에 이름
        position_name_match = re.search(r'(?:대표이사|대표|이사|부장|과장|차장|대리|주임|사원|팀장|실장|CEO|CTO|CFO|Manager|Director)\s+([가-힣]{2,4})', text)
        if position_name_match:
            name_candidate = position_name_match.group(1)
            if name_candidate[0] in self.common_surnames:
                return name_candidate
        
        # 이름 뒤에 직책
        name_position_match = re.search(r'([가-힣]{2,4})\s+(?:대표이사|대표|이사|부장|과장|차장|대리|주임|사원|팀장|실장|CEO|CTO|CFO)', text)
        if name_position_match:
            name_candidate = name_position_match.group(1)
            if name_candidate[0] in self.common_surnames:
                return name_candidate
        
        # 공백 없이 붙어있는 경우 (예: "대표성인근")
        attached_match = re.search(r'(?:대표이사|대표|이사)([가-힣]{2,4})', text)
        if attached_match:
            name_candidate = attached_match.group(1)
            if name_candidate[0] in self.common_surnames:
                return name_candidate
        
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