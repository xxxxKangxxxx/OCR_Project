import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { apiFormData } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [isUploadingCards, setIsUploadingCards] = useState(false);
  const [ocrFileInfo, setOcrFileInfo] = useState(null);

  // 토큰 유효성 검증 및 사용자 정보 로드
  const loadUser = async (isInitialLoad = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data);
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
      if (!isUploadingCards) {
        logout();
      }
    } finally {
      // 초기 로딩일 때만 loading 상태를 false로 설정
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  // 로그인
  const login = async (username, password) => {
    try {
      const { data } = await api.post('/api/auth/login', 
        new URLSearchParams({
          username,
          password
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        }
      );

      const newToken = data.access_token;
      setToken(newToken);
      localStorage.setItem('access_token', newToken);
      localStorage.setItem('token_type', data.token_type);
      
      await loadUserWithToken(newToken);
      return { success: true };
    } catch (error) {
      console.error('로그인 오류:', error);
      const errorMessage = error.response?.data?.detail || '로그인에 실패했습니다.';
      return { success: false, error: errorMessage };
    }
  };

  // 회원가입
  const register = async (userData) => {
    try {
      const { data } = await api.post('/api/auth/register', userData);
      return { success: true, message: '회원가입이 완료되었습니다. 로그인해주세요.' };
    } catch (error) {
      console.error('회원가입 오류:', error);
      const errorMessage = error.response?.data?.detail || '회원가입에 실패했습니다.';
      return { success: false, error: errorMessage };
    }
  };

  // 특정 토큰으로 사용자 정보 로드
  const loadUserWithToken = async (authToken) => {
    try {
      const { data } = await api.get('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        }
      });
      setUser(data);
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    }
  };

  // 로그아웃
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
  };

  // API 요청 헬퍼 함수
  const apiRequest = async (url, options = {}) => {
    try {
      const isCardUpload = url.includes('/api/cards/ocr');
      if (isCardUpload) {
        // 파일 정보 추출
        let fileCount = 0;
        let totalSize = 0;
        if (options.body instanceof FormData) {
          const files = options.body.getAll('files');
          fileCount = files.length;
          totalSize = files.reduce((sum, file) => sum + file.size, 0);
        }
        
        setOcrFileInfo({ fileCount, totalSize });
        setIsUploadingCards(true);
        // OCR 처리 중에는 loading을 true로 설정하지 않음 (isUploadingCards로 처리)
      }

      const isFormData = options.body instanceof FormData;
      
      if (isFormData) {
        if (options.method === 'POST') {
          const { data } = await apiFormData.post(url, options.body);
          return data;
        } else if (options.method === 'PUT') {
          const { data } = await apiFormData.put(url, options.body);
          return data;
        } else {
          throw new Error('FormData는 POST 또는 PUT 메서드만 지원됩니다.');
        }
      } else {
        const config = {
          method: options.method || 'GET',
          url: url,
          ...(options.body && { data: JSON.parse(options.body) }),
          ...options
        };
        
        const { data } = await api(config);
        return data;
      }
    } catch (error) {
      throw error;
    }
  };

  // 401 에러 이벤트 리스너
  useEffect(() => {
    const handleUnauthorized = () => {
      if (!isUploadingCards) {
        logout();
      }
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, [isUploadingCards]);

  // 컴포넌트 마운트 시 사용자 정보 로드
  useEffect(() => {
    loadUser(true); // 초기 로딩임을 표시
  }, []);

  // 토큰 변경 시 사용자 정보 업데이트
  useEffect(() => {
    if (token && !user) {
      loadUser(false); // 초기 로딩이 아님
    }
  }, [token]);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    apiRequest,
    isAuthenticated: !!user && !!token,
    isUploadingCards,
    setIsUploadingCards,
    ocrFileInfo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 