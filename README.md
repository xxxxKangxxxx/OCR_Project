# 🃏 Cardlet - AI 기반 명함 OCR 서비스

AI 기술을 활용한 스마트 명함 스캔 및 관리 서비스입니다.

## 🚀 주요 기능

### 📱 명함 OCR 스캔
- 사진으로 찍은 명함에서 자동으로 텍스트 추출
- 한국어/영어 명함 지원
- 높은 정확도의 AI OCR 엔진

### 💾 로컬스토리지 기반 데이터 관리
- **서버 없이 브라우저에서 동작**: 개인정보 보호 및 빠른 접근
- **완전한 오프라인 지원**: 인터넷 연결 없이도 사용 가능
- **데이터 백업/복원**: JSON 파일로 데이터 내보내기/가져오기
- **실시간 검색**: 이름, 이메일, 전화번호, 회사명으로 빠른 검색

### 🎯 스마트 명함 관리
- 즐겨찾기 기능
- 회사별 자동 그룹화
- 명함 수정 및 삭제
- 연락처 정보 관리

## 🛠 기술 스택

### 프론트엔드
- **React 19** + **Vite** - 최신 React 프레임워크
- **React Router** - 클라이언트 사이드 라우팅
- **로컬스토리지 API** - 브라우저 내장 저장소

### 백엔드 (선택사항)
- **FastAPI** - 고성능 Python 웹 프레임워크
- **EasyOCR** - AI 기반 광학 문자 인식
- **OpenCV** - 이미지 처리

## 📦 로컬스토리지 구조

```javascript
// 명함 데이터 구조
{
  "id": "1703123456789",
  "name": "홍길동",
  "email": "hong@example.com", 
  "phone": "010-1234-5678",
  "position": "부장",
  "company": {
    "name": "삼성전자"
  },
  "is_favorite": false,
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

## 🚀 설치 및 실행

### 프론트엔드만 사용 (로컬스토리지 모드)

```bash
# 프론트엔드 설치
cd frontend
npm install

# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:5174 접속
```

### 로컬스토리지 데모 페이지
- 브라우저에서 `http://localhost:5174/demo` 접속
- 명함 추가, 수정, 삭제, 검색 기능 테스트
- 데이터 백업/복원 기능 테스트

### 백엔드 포함 사용 (OCR 기능)

```bash
# 백엔드 설치
cd backend
pip install -r requirements.txt

# 백엔드 서버 실행
uvicorn main:app --reload

# 프론트엔드 실행 (별도 터미널)
cd frontend
npm run dev
```

## 📚 사용법

### 1. 로컬스토리지 기능 사용

#### 명함 추가
```javascript
import { useBusinessCards } from './utils/useLocalStorage.js';

function MyComponent() {
  const { saveCard } = useBusinessCards();
  
  const handleSave = () => {
    const cardData = {
      name: '홍길동',
      email: 'hong@example.com',
      phone: '010-1234-5678',
      position: '부장',
      company: { name: '삼성전자' }
    };
    
    saveCard(cardData);
  };
}
```

#### 명함 검색
```javascript
import { useSearch } from './utils/useLocalStorage.js';

function SearchComponent() {
  const { searchResults, performSearch } = useSearch();
  
  const handleSearch = (query) => {
    performSearch(query); // 이름, 이메일, 전화번호로 검색
  };
}
```

#### 데이터 백업/복원
```javascript
import { DataManager } from './utils/localStorage.js';

// 데이터 내보내기 (JSON 파일 다운로드)
DataManager.exportData();

// 데이터 가져오기
const handleImport = (file) => {
  DataManager.importData(file)
    .then(() => console.log('가져오기 완료'))
    .catch(error => console.error('가져오기 실패:', error));
};
```

### 2. 로컬스토리지 장점

✅ **개인정보 보호**: 데이터가 사용자 기기에만 저장  
✅ **빠른 성능**: 서버 통신 없이 즉시 접근  
✅ **오프라인 지원**: 인터넷 없이도 완전한 기능 사용  
✅ **무료 사용**: 서버 비용 없음  
✅ **간단한 배포**: 정적 파일만으로 배포 가능  

### 3. 고려사항

⚠️ **용량 제한**: 브라우저당 5-10MB 제한  
⚠️ **기기 종속**: 다른 기기에서 접근 불가  
⚠️ **백업 필요**: 브라우저 데이터 삭제 시 손실 가능  

## 🔧 커스터마이징

### 로컬스토리지 키 변경
```javascript
// utils/localStorage.js
const STORAGE_KEYS = {
  BUSINESS_CARDS: 'your_app_business_cards',
  COMPANIES: 'your_app_companies',
  SETTINGS: 'your_app_settings'
};
```

### 데이터 스키마 확장
```javascript
// 새로운 필드 추가
const cardData = {
  // 기본 필드
  name: '홍길동',
  email: 'hong@example.com',
  
  // 커스텀 필드
  linkedin: 'https://linkedin.com/in/hong',
  memo: '중요한 거래처 담당자',
  tags: ['VIP', '기술팀']
};
```

## 📋 향후 계획

- [ ] IndexedDB 지원으로 대용량 데이터 처리
- [ ] PWA 지원으로 앱 형태 설치
- [ ] 클라우드 동기화 옵션 추가
- [ ] 명함 템플릿 시스템
- [ ] 고급 검색 필터 기능

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

---

**Cardlet**으로 스마트하게 명함을 관리하세요! 🚀
