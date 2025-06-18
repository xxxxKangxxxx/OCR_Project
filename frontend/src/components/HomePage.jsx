import React, { useState, useEffect, useRef, useMemo } from 'react';
import CardGroup from './CardGroup';
import { useBusinessCards } from '../utils/useLocalStorage.js';
import './HomePage.css';

const HomePage = () => {
  const [groupBy, setGroupBy] = useState('company');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customColors, setCustomColors] = useState(() => {
    // localStorage에서 저장된 색상 데이터 불러오기
    const savedColors = localStorage.getItem('cardletCustomColors');
    return savedColors ? JSON.parse(savedColors) : {};
  });
  const dropdownRef = useRef(null);
  
  // 로컬스토리지에서 실제 명함 데이터 가져오기
  const { cards } = useBusinessCards();

  // 컴포넌트 마운트 시 스크롤 초기화
  useEffect(() => {
    // 자체 스크롤 초기화 (독립적 컨테이너이므로 간단함)
    const resetScroll = () => {
      const homepage = document.querySelector('.homepage');
      if (homepage) {
        homepage.scrollTop = 0;
      }
      console.log('HomePage 마운트 - 스크롤 초기화');
    };

    resetScroll();
    setTimeout(resetScroll, 0);
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

  // 로컬스토리지의 실제 데이터를 회사별로 그룹화
  const cardGroups = useMemo(() => {
    if (!cards || cards.length === 0) {
      return [{
        id: 'empty',
        title: '저장된 명함이 없습니다',
        cards: []
      }];
    }

    // 회사별로 그룹화
    const groupedByCompany = cards.reduce((acc, card) => {
      const companyName = card.company_name || '회사명 없음';
      if (!acc[companyName]) {
        acc[companyName] = [];
      }
      acc[companyName].push(card);
      return acc;
    }, {});

    console.log('Grouped Cards:', groupedByCompany);

    // 배열 형태로 변환
    return Object.entries(groupedByCompany).map(([companyName, companyCards], index) => ({
      id: index + 1,
      title: companyName,
      cards: companyCards
    }));
  }, [cards, groupBy]);

  return (
    <div className="homepage">
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
    </div>
  );
};

export default HomePage; 