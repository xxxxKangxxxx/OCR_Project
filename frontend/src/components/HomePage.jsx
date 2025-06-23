import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { ko } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import CardGroup from './CardGroup';
import { useBusinessCardsAPI } from '../hooks/useBusinessCardsAPI.js';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialFilter = searchParams.get('filter') || '';
  
  const [groupBy, setGroupBy] = useState(initialFilter);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customColors, setCustomColors] = useState(() => {
    // localStorage에서 저장된 색상 데이터 불러오기
    const savedColors = localStorage.getItem('cardletCustomColors');
    return savedColors ? JSON.parse(savedColors) : {};
  });
  const dropdownRef = useRef(null);
  
  // MongoDB API에서 실제 명함 데이터 가져오기
  const { cards, loading } = useBusinessCardsAPI();

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
    const defaultColor = '#d3d3d3'; // 연한 회색을 기본값으로 설정
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
      if (!company) return defaultColor;
      // 사용자가 지정한 색상이 있으면 그 색상을 사용
      if (customColors[company]) {
        return customColors[company];
      }
      // 모든 필터 옵션에서 기본 색상 사용
      return defaultColor;
    };
  }, [customColors, groupBy]);

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
    { value: '', label: '선택' },
    { value: 'company', label: '회사' },
    { value: 'date', label: '등록 날짜' }
  ];

  const handleOptionClick = (value) => {
    setGroupBy(value);
    setIsDropdownOpen(false);
    // URL 파라미터 업데이트
    const newSearchParams = new URLSearchParams(location.search);
    if (value) {
      newSearchParams.set('filter', value);
    } else {
      newSearchParams.delete('filter');
    }
    navigate(`?${newSearchParams.toString()}`, { replace: true });
  };

  // MongoDB API의 실제 데이터를 그룹화
  const cardGroups = useMemo(() => {
    if (loading) {
      return [{
        id: 'loading',
        title: '명함 데이터를 불러오는 중...',
        cards: []
      }];
    }
    
    if (!cards || cards.length === 0) {
      return [{
        id: 'empty',
        title: '저장된 명함이 없습니다',
        cards: []
      }];
    }

    if (groupBy === 'date' && selectedDate) {
      // 선택된 날짜의 명함만 필터링
      const filteredCards = cards.filter(card => {
        if (!card.created_at) return false;
        const cardDate = new Date(card.created_at);
        const filterDate = new Date(selectedDate);
        return cardDate.toLocaleDateString() === filterDate.toLocaleDateString();
      });

      if (filteredCards.length === 0) {
        return [{
          id: 'empty',
          title: '해당 날짜에 등록된 명함이 없습니다',
          cards: []
        }];
      }

      return [{
        id: 'date',
        title: `${new Date(selectedDate).toLocaleDateString()} 등록`,
        cards: filteredCards
      }];
    }

    // 회사별로 그룹화
    if (groupBy === 'company') {
      const groupedByCompany = cards.reduce((acc, card) => {
        const companyName = card.company_name || '회사명 없음';
        if (!acc[companyName]) {
          acc[companyName] = [];
        }
        acc[companyName].push(card);
        return acc;
      }, {});

      return Object.entries(groupedByCompany).map(([companyName, companyCards], index) => ({
        id: index + 1,
        title: companyName,
        cards: companyCards
      }));
    }

    // 필터가 선택되지 않은 경우 모든 명함 표시
    return [{
      id: 'all',
      title: '전체 명함',
      cards: cards
    }];
  }, [cards, groupBy, selectedDate, loading]);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  return (
    <div className="homepage">
      <div className="filter-section">
        <div className="filter-container">
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
          {groupBy === 'date' && (
            <div className="date-picker-container">
              <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="yyyy년 MM월 dd일"
                placeholderText="날짜 선택"
                className="date-picker"
                showPopperArrow={false}
                locale={ko}
                maxDate={new Date()}
              />
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