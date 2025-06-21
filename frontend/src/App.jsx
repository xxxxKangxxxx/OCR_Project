import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react'
import './App.css'
import Layout from './components/Layout'
import HomePage from './components/HomePage';
import CompanyCards from './components/CompanyCards';
import CardList from './components/CardList';
import MyPage from './components/MyPage';

// 페이지 이동 시 스크롤을 맨 위로 이동시키는 컴포넌트
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 브라우저의 스크롤 복원 기능 활성화 (각 페이지가 독립적이므로)
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'auto';
    }

    // 간단한 스크롤 초기화 (각 페이지가 독립적이므로 자동으로 초기화됨)
    const resetScroll = () => {
      // 윈도우 스크롤 초기화
      window.scrollTo(0, 0);
      
      // document 스크롤 초기화
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      console.log(`페이지 전환 완료: ${pathname}`);
    };

    // 즉시 실행
    resetScroll();
    
    // React 렌더링 완료 후 한 번 더 실행
    setTimeout(resetScroll, 0);
    setTimeout(resetScroll, 100);

    console.log('독립적 페이지 스크롤 관리:', pathname);
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
    <Layout>
      <ScrollToTop />
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
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
