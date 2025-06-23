import axios from 'axios';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: '', // 빈 문자열로 변경하여 프록시가 정상 작동하도록 함
  timeout: 10000, // 10초 타임아웃
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - JWT 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 401 에러 자동 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 시 자동 로그아웃
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_type');
      
      // 로그인 페이지로 리다이렉트 (AuthContext에서 처리되도록)
      window.dispatchEvent(new CustomEvent('unauthorized'));
    }
    return Promise.reject(error);
  }
);

// FormData 전용 API (Content-Type 헤더 제외)
export const apiFormData = axios.create({
  baseURL: '', // 빈 문자열로 변경하여 프록시가 정상 작동하도록 함
  timeout: 30000, // 파일 업로드는 더 긴 타임아웃
});

// FormData용 요청 인터셉터
apiFormData.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Content-Type은 자동으로 설정되도록 제거
    delete config.headers['Content-Type'];
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// FormData용 응답 인터셉터 (동일한 401 처리)
apiFormData.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_type');
      window.dispatchEvent(new CustomEvent('unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api; 