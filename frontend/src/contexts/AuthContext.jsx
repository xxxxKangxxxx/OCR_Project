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

  // 토큰 유효성 검증 및 사용자 정보 로드
  const loadUser = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data);
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // 로그인
  const login = async (username, password) => {
    try {
      // 로그인은 form-urlencoded 형태로 전송 (FastAPI OAuth2PasswordRequestForm 요구사항)
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
      
      // 사용자 정보 로드
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
      
      // 회원가입 성공 시 자동 로그인하지 않고 성공만 반환
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

  // API 요청 헬퍼 함수 - 훨씬 간단해짐!
  const apiRequest = async (url, options = {}) => {
    try {
      // FormData인지 확인
      const isFormData = options.body instanceof FormData;
      
      if (isFormData) {
        // FormData는 apiFormData 인스턴스 사용
        const { data } = await apiFormData({
          url,
          method: options.method || 'GET',
          data: options.body,
          ...options
        });
        return data;
      } else {
        // 일반 JSON 요청은 기본 api 인스턴스 사용
        const { data } = await api({
          url,
          method: options.method || 'GET',
          data: options.body ? JSON.parse(options.body) : undefined,
          ...options
        });
        return data;
      }
    } catch (error) {
      throw error;
    }
  };

  // 401 에러 이벤트 리스너
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, []);

  // 컴포넌트 마운트 시 사용자 정보 로드
  useEffect(() => {
    loadUser();
  }, []);

  // 토큰 변경 시 사용자 정보 업데이트
  useEffect(() => {
    if (token && !user) {
      loadUser();
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
    isAuthenticated: !!user && !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 