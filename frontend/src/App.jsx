import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react'
import './App.css'
import Layout from './components/Layout'
import HomePage from './components/HomePage';
import CompanyCards from './components/CompanyCards';
import CardList from './components/CardList';
import MyPage from './components/MyPage';
import Login from './components/Login';
import Register from './components/Register';
import ImageEditorPage from './components/ImageEditorPage';
import AuthProvider from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import ProtectedRoute from './components/ProtectedRoute';

// 페이지 이동 시 스크롤을 맨 위로 이동시키는 컴포넌트
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 페이지 전환 시에만 스크롤 초기화 (한 번만)
    const resetScroll = () => {
      // Layout content 영역의 스크롤 초기화
      const layoutContent = document.querySelector('.layout-content');
      if (layoutContent) {
        layoutContent.scrollTop = 0;
      }
      
      // 개별 페이지 스크롤 초기화
      const homepage = document.querySelector('.homepage');
      const mypage = document.querySelector('.mypage');
      const companyCards = document.querySelector('.company-cards');
      
      if (homepage) homepage.scrollTop = 0;
      if (mypage) mypage.scrollTop = 0;
      if (companyCards) companyCards.scrollTop = 0;
      
      console.log(`페이지 전환 완료: ${pathname}`);
    };

    // 컴포넌트 마운트 후 한 번만 실행
    setTimeout(resetScroll, 0);

    console.log('페이지 스크롤 초기화:', pathname);
  }, [pathname]);

  return null;
}

// 메인 앱 컴포넌트를 별도로 분리하여 useLocation 사용
function AppContent() {
  const location = useLocation();

  // 실제 뷰포트 높이 계산
  useEffect(() => {
    const setViewHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setViewHeight();
    window.addEventListener('resize', setViewHeight);
    window.addEventListener('orientationchange', setViewHeight);

    return () => {
      window.removeEventListener('resize', setViewHeight);
      window.removeEventListener('orientationchange', setViewHeight);
    };
  }, []);

  return (
    <>
      <Routes>
        {/* 인증이 필요 없는 페이지들 - ScrollToTop 적용 안함 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* 이미지 편집 페이지 - Layout 없이 전체 화면 */}
        <Route path="/image-editor" element={
          <ProtectedRoute>
            <ImageEditorPage />
          </ProtectedRoute>
        } />
        
        {/* 인증이 필요한 페이지들 - ScrollToTop 적용 */}
        <Route path="/*" element={
          <ProtectedRoute>
            <ScrollToTop />
            <Layout>
              <Routes>
                <Route 
                  path="/company/:companyName" 
                  element={<CompanyCards key={`company-${location.pathname}-${Date.now()}`} />} 
                />
                <Route 
                  path="/cards/:type" 
                  element={<CardList key={`cards-${location.pathname}-${Date.now()}`} />} 
                />
                <Route 
                  path="/cards/date/:date" 
                  element={<CardList key={`cards-date-${location.pathname}-${Date.now()}`} />} 
                />
                <Route 
                  path="/mypage" 
                  element={<MyPage key={`mypage-${location.pathname}-${Date.now()}`} />} 
                />
                <Route 
                  path="/" 
                  element={<HomePage key={`home-${location.pathname}-${Date.now()}`} />} 
                />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <LoadingProvider>
          <AppContent />
        </LoadingProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
