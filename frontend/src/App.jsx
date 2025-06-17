import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react'
import './App.css'
import CardGroup from './components/CardGroup'
import Navigation from './components/Navigation'
import CompanyCards from './components/CompanyCards';

function App() {
  const [groupBy, setGroupBy] = useState('company');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customColors, setCustomColors] = useState(() => {
    // localStorage에서 저장된 색상 데이터 불러오기
    const savedColors = localStorage.getItem('cardletCustomColors');
    return savedColors ? JSON.parse(savedColors) : {};
  });
  const dropdownRef = useRef(null);

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

  // customColors가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('cardletCustomColors', JSON.stringify(customColors));
  }, [customColors]);

  // 회사별 색상 매핑
  const companyColors = useMemo(() => {
    const baseColors = [
      '#4A90E2', // 파란색
      '#D35400', // 주황색
      '#27AE60', // 초록색
      '#8E44AD', // 보라색
      '#C0392B', // 빨간색
      '#16A085', // 청록색
      '#F39C12', // 노란색
      '#2C3E50', // 남색
      '#E74C3C', // 연빨강
      '#2980B9', // 하늘색
    ];

    const colorMap = new Map();
    let colorIndex = 0;

    return (company) => {
      if (!company) return baseColors[0];
      // 사용자가 지정한 색상이 있으면 그 색상을 사용
      if (customColors[company]) {
        return customColors[company];
      }
      // 없으면 기본 색상 할당
      if (!colorMap.has(company)) {
        colorMap.set(company, baseColors[colorIndex % baseColors.length]);
        colorIndex++;
      }
      return colorMap.get(company);
    };
  }, [customColors]);

  const handleColorChange = (company, color) => {
    setCustomColors(prev => ({
      ...prev,
      [company]: color
    }));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const options = [
    { value: 'company', label: '회사별' },
    { value: 'date', label: '날짜별' },
    { value: 'department', label: '부서별' }
  ];

  const handleOptionClick = (value) => {
    setGroupBy(value);
    setIsDropdownOpen(false);
  };

  // 임시 데이터
  const cardGroups = [
    {
      id: 1,
      title: "삼성전자",
      cards: [
        { id: 1, name: "홍길동", position: "과장", department: "영업1팀" },
        { id: 2, name: "김철수", position: "대리", department: "영업2팀" },
      ]
    },
    {
      id: 2,
      title: "LG전자",
      cards: [
        { id: 3, name: "이영희", position: "부장", department: "마케팅팀" },
      ]
    },
    {
      id: 3,
      title: '네이버',
      cards: [
        { id: 4, name: '박지성', position: '책임연구원' },
        { id: 5, name: '손흥민', position: '선임연구원' },
        { id: 6, name: '김민재', position: '연구원' },
      ]
    },
    {
      id: 4,
      title: '카카오',
      cards: [
        { id: 7, name: '이강인', position: '팀장' },
        { id: 8, name: '황희찬', position: '매니저' },
      ]
    },
    {
      id: 5,
      title: 'SK하이닉스',
      cards: [
        { id: 9, name: '김연아', position: '수석' },
        { id: 10, name: '박태환', position: '책임' },
        { id: 11, name: '이상화', position: '선임' },
      ]
    }
  ];

  return (
    <Router>
      <div className="app">
        <header className="header">
          <div className="header-content">
            <img src="/Cardlet_Logo.png" alt="Cardlet" className="logo" />
            <img src="/bell.png" alt="Notifications" className="notification-icon" />
          </div>
        </header>

        <div className="content-container">
          <Routes>
            <Route path="/company/:companyName" element={<CompanyCards />} />
            <Route path="/" element={
              <main className="main-content">
                <div className="filter-section">
                  <div className="custom-dropdown" ref={dropdownRef}>
                    <button 
                      className="dropdown-button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      {options.find(opt => opt.value === groupBy)?.label || '선택'}
                      <span className="dropdown-arrow"></span>
                    </button>
                    {isDropdownOpen && (
                      <div className="dropdown-menu">
                        {options.map((option) => (
                          <div
                            key={option.value}
                            className={`dropdown-item ${option.value === groupBy ? 'active' : ''}`}
                            onClick={() => handleOptionClick(option.value)}
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="card-groups">
                  {cardGroups.map(group => (
                    <CardGroup 
                      key={group.id} 
                      title={group.title} 
                      cards={group.cards}
                      backgroundColor={companyColors(group.title)}
                      onColorChange={handleColorChange}
                    />
                  ))}
                </div>
              </main>
            } />
          </Routes>
        </div>

        <nav className="navigation">
          <Navigation />
        </nav>
      </div>
    </Router>
  );
}

export default App;
