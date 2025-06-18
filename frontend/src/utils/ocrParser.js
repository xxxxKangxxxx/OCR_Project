/**
 * OCR 결과를 파싱하여 구조화된 명함 정보로 변환하는 모듈
 */

// 회사명 관련 키워드
const COMPANY_KEYWORDS = [
  // 법인 형태 키워드
  '주식회사', '(주)', '㈜', '유한회사', '(유)', '합자회사', '(합)', '합명회사',
  '유한책임회사', '(유책)', '조합', '농업회사법인', '어업회사법인',
  // 영문 법인 형태
  'Co.', 'Ltd', 'Inc', 'Corp', 'Corporation', 'Company', 'Limited', 'LLC', 'LLP',
  // 일반 회사 키워드
  '기업', '산업', '그룹', '건설', '개발', '기술', '시스템', '솔루션', '컨설팅', '서비스',
  '상사', '무역', '제조', '제작', '생산', '연구소', '연구원', '센터', '재단', '협회'
];

// 직책 관련 키워드
const POSITION_KEYWORDS = [
  '대표', '이사', '부장', '과장', '차장', '대리', '주임', '사원', '팀장', '실장',
  'CEO', 'CTO', 'CFO', 'Manager', 'Director', 'President', '감사', '상무', '전무',
  '본부장', '센터장', '사업부장', '팀리더', 'Lead', 'Senior', 'Principal'
];

// 부서 관련 키워드
const DEPARTMENT_KEYWORDS = [
  '부', '팀', '실', '센터', '본부', '사업부', 'Department', 'Division'
];

// 주소 관련 키워드
const ADDRESS_KEYWORDS = [
  '시', '구', '동', '로', '길', '번지', '층', '호', '빌딩', '타워'
];

// 일반적인 한국 성씨
const COMMON_SURNAMES = [
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신',
  '권', '황', '안', '송', '류', '전', '홍', '고', '문', '양', '손', '배', '조', '백',
  '허', '유', '남', '심', '노', '정', '하', '곽', '성', '차', '주', '우', '구', '신',
  '임', '나', '전', '민', '유', '진', '지', '엄', '채', '원', '천', '방', '공', '강',
  '현', '함', '변', '염', '양', '변', '여', '추', '노', '도', '소', '신', '석', '선',
  '설', '마', '길', '연', '위', '표', '명', '기', '반', '왕', '금', '옥', '육', '인',
  '맹', '제', '모', '장', '남', '탁', '국', '여', '진', '어', '은', '편', '구', '용'
];

/**
 * OCR 결과 텍스트를 파싱하여 구조화된 명함 정보를 반환합니다.
 */
export function parseOCRText(ocrText) {
  // 텍스트를 줄 단위로 분리
  const lines = typeof ocrText === 'string' 
    ? ocrText.split('\n').map(line => line.trim()).filter(Boolean)
    : Array.isArray(ocrText) 
      ? ocrText.map(line => line.trim()).filter(Boolean)
      : [];

  const result = {
    company_name: null,
    name: null,
    name_en: null,
    position: null,
    department: null,
    email: null,
    phone: null,
    mobile: null,
    fax: null,
    address: null,
    postal_code: null,
    ocr_raw_text: JSON.stringify(lines),
    ocr_confidence: 80
  };

  // 이메일 추출
  const emailMatch = lines.join(' ').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // 전화번호 추출
  lines.forEach(line => {
    const phoneMatch = line.match(/(\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})/);
    if (phoneMatch) {
      const number = phoneMatch[1].replace(/\s/g, '-');
      if (line.toLowerCase().includes('fax')) {
        result.fax = number;
      } else if (line.toLowerCase().includes('mobile') || number.startsWith('010')) {
        result.mobile = number;
      } else {
        result.phone = number;
      }
    }
  });

  // 영문 이름 추출
  const englishNamePattern = /[A-Z][a-z]+\s+[A-Z][a-z]+/;
  for (const line of lines) {
    const match = line.match(englishNamePattern);
    if (match) {
      result.name_en = match[0];
      break;
    }
  }

  // 회사명 추출
  for (const line of lines) {
    if (COMPANY_KEYWORDS.some(keyword => line.includes(keyword))) {
      result.company_name = line;
      break;
    }
  }
  if (!result.company_name) {
    // 키워드가 없는 경우, 길이가 긴 텍스트 중에서 찾기
    const candidates = lines.filter(line => 
      line.length > 4 && 
      !line.includes('@') && 
      !line.match(/\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}/)
    );
    if (candidates.length > 0) {
      result.company_name = candidates[0];
    }
  }

  // 한글 이름 추출
  for (const line of lines) {
    // 직책과 함께 있는 이름 패턴
    const nameWithPosition = line.match(new RegExp(`(?:${POSITION_KEYWORDS.join('|')})\\s*([가-힣]{2,4})`));
    if (nameWithPosition) {
      result.name = nameWithPosition[1];
      break;
    }
    // 일반적인 한글 이름 패턴
    if (line.match(/^[가-힣]{2,4}$/) && COMMON_SURNAMES.some(surname => line.startsWith(surname))) {
      result.name = line;
      break;
    }
  }

  // 직책 추출
  for (const line of lines) {
    if (POSITION_KEYWORDS.some(keyword => line.includes(keyword))) {
      result.position = line;
      break;
    }
  }

  // 부서 추출
  for (const line of lines) {
    if (DEPARTMENT_KEYWORDS.some(keyword => line.includes(keyword)) && line !== result.position) {
      result.department = line;
      break;
    }
  }

  // 주소 추출
  const addressLines = lines.filter(line => 
    line.length > 10 || ADDRESS_KEYWORDS.some(keyword => line.includes(keyword))
  );
  if (addressLines.length > 0) {
    result.address = addressLines[0];
  }

  return result;
} 