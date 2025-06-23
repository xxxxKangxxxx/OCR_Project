import React, { createContext, useContext, useState, useEffect } from 'react';

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

  // API 호출을 위한 헤더 생성
  const getAuthHeaders = () => {
    if (!token) return {};
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // 토큰 유효성 검증 및 사용자 정보 로드
  const loadUser = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // 토큰이 유효하지 않은 경우
        logout();
      }
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username,
          password
        })
      });

      const data = await response.json();

      if (response.ok) {
        const newToken = data.access_token;
        setToken(newToken);
        localStorage.setItem('access_token', newToken);
        localStorage.setItem('token_type', data.token_type);
        
        // 사용자 정보 로드
        await loadUserWithToken(newToken);
        return { success: true };
      } else {
        return { success: false, error: data.detail || '로그인에 실패했습니다.' };
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      return { success: false, error: '서버 연결에 실패했습니다.' };
    }
  };

  // 회원가입
  const register = async (userData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        // 회원가입 성공 시 자동 로그인하지 않고 성공만 반환
        return { success: true, message: '회원가입이 완료되었습니다. 로그인해주세요.' };
      } else {
        return { success: false, error: data.detail || '회원가입에 실패했습니다.' };
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      return { success: false, error: '서버 연결에 실패했습니다.' };
    }
  };

  // 특정 토큰으로 사용자 정보 로드
  const loadUserWithToken = async (authToken) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
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
    const config = {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      
      // 401 에러 시 자동 로그아웃
      if (response.status === 401) {
        logout();
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

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
    getAuthHeaders,
    isAuthenticated: !!user && !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 