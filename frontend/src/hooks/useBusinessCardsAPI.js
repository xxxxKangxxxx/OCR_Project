import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

// 전역 상태 관리 - 싱글톤 패턴
let globalCards = [];
let globalLoading = false;
let globalProcessingInterval = null;
let globalIntervalCount = 0;
let globalLoadPromise = null;
const globalListeners = new Set();

// 전역 상태 업데이트 함수
const updateGlobalState = (newCards, newLoading) => {
  globalCards = newCards;
  globalLoading = newLoading;
  globalListeners.forEach(listener => listener({ cards: newCards, loading: newLoading }));
};

// 전역 데이터 로드 함수 (중복 호출 방지)
const globalLoadCards = async () => {
  if (globalLoadPromise) {
    return globalLoadPromise;
  }

  globalLoadPromise = (async () => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      updateGlobalState([], false);
      return;
    }

    try {
      updateGlobalState(globalCards, true);
      const { data } = await api.get('/api/cards/');
      
      if (Array.isArray(data)) {
        updateGlobalState(data, false);
      } else {
        console.error('잘못된 응답 형식:', data);
        updateGlobalState([], false);
      }
    } catch (error) {
      console.error('명함 데이터 로드 실패:', error);
      updateGlobalState([], false);
    }
  })();

  await globalLoadPromise;
  globalLoadPromise = null;
};

// MongoDB API를 사용하는 명함 데이터 관리 훅
export function useBusinessCardsAPI() {
  const [cards, setCards] = useState(globalCards);
  const [loading, setLoading] = useState(globalLoading);
  const { isAuthenticated, setIsUploadingCards } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 처리 중인 명함들을 주기적으로 체크
  const checkProcessingCards = async () => {
    if (!isAuthenticated) return;
    
    const processingCards = cards.filter(card => card.processing_status === 'processing');
    
    if (processingCards.length === 0) {
      return;
    }
    
    try {
      // 처리 중인 명함들만 다시 조회
      let hasUpdates = false;
      for (const card of processingCards) {
        const { data } = await api.get(`/api/cards/${card.id}`);
        
        if (data.processing_status !== 'processing') {
          hasUpdates = true;
        }
      }
      
      // 업데이트가 있으면 전체 목록 새로고침
      if (hasUpdates) {
        await loadCards();
        
        // OCR 처리 완료 - 상태 초기화
        setIsUploadingCards(false);
        
        // OCR 처리 중 페이지에 있다면 홈으로 이동
        if (location.pathname === '/ocr-processing') {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('처리 상태 확인 실패:', error);
    }
  };

  // 처리 중인 카드 개수 계산 (메모이제이션)
  const processingCardCount = cards.filter(card => card.processing_status === 'processing').length;

  // 전역 interval 관리 - 여러 컴포넌트가 사용해도 하나의 interval만 유지
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // 처리 중인 카드가 있고, 아직 전역 interval이 없을 때만 생성
    if (processingCardCount > 0 && !globalProcessingInterval) {
      globalProcessingInterval = setInterval(checkProcessingCards, 5000);
    }
    
    // 처리 중인 카드가 없으면 전역 interval 정리
    if (processingCardCount === 0 && globalProcessingInterval) {
      clearInterval(globalProcessingInterval);
      globalProcessingInterval = null;
    }
    
    // 컴포넌트가 사용 중임을 표시
    globalIntervalCount++;
    
    return () => {
      globalIntervalCount--;
      // 마지막 컴포넌트가 언마운트될 때 interval 정리
      if (globalIntervalCount === 0 && globalProcessingInterval) {
        clearInterval(globalProcessingInterval);
        globalProcessingInterval = null;
      }
    };
  }, [isAuthenticated, processingCardCount]);

  // 로컬 데이터 로드 함수 (전역 함수 호출)
  const loadCards = () => globalLoadCards();

  // 전역 상태 리스너 등록
  useEffect(() => {
    const updateLocalState = ({ cards: newCards, loading: newLoading }) => {
      setCards(newCards);
      setLoading(newLoading);
    };
    
    globalListeners.add(updateLocalState);
    
    return () => {
      globalListeners.delete(updateLocalState);
    };
  }, []);

  // 컴포넌트 마운트 시 및 인증 상태 변경 시 데이터 로드 (중복 호출 방지)
  useEffect(() => {
    if (isAuthenticated) {
      globalLoadCards();
    }
  }, [isAuthenticated]);

  // 명함 저장 (API 호출)
  const saveCard = async (cardData) => {
    try {
      const { data } = await api.post('/api/cards/', cardData);
      
      if (data && data.id) {
        await loadCards(); // 데이터 새로고침
        return true;
      }
      return false;
    } catch (error) {
      console.error('명함 저장 실패:', error);
      return false;
    }
  };

  // 명함 삭제
  const deleteCard = async (id) => {
    try {
      await api.delete(`/api/cards/${id}`);
      await loadCards(); // 데이터 새로고침
      return true;
    } catch (error) {
      console.error('명함 삭제 실패:', error);
      return false;
    }
  };

  // 명함 업데이트
  const updateCard = async (id, updatedData) => {
    try {
      const { data } = await api.put(`/api/cards/${id}`, updatedData);
      
      if (data && data.id) {
        await loadCards(); // 데이터 새로고침
        return true;
      }
      return false;
    } catch (error) {
      console.error('명함 업데이트 실패:', error);
      return false;
    }
  };

  // 즐겨찾기 토글
  const toggleFavorite = async (cardId) => {
    try {
      await api.post(`/api/cards/${cardId}/favorite`);
      await loadCards(); // 데이터 새로고침
      return true;
    } catch (error) {
      console.error('즐겨찾기 토글 실패:', error);
      return false;
    }
  };

  // 즐겨찾기 목록 조회
  const getFavorites = async () => {
    try {
      const { data } = await api.get('/api/cards/favorites/list');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('즐겨찾기 조회 실패:', error);
      return [];
    }
  };

  // 새로고침 함수 제공
  const refreshCards = () => loadCards();

  // 검색 함수
  const searchCards = async (query) => {
    try {
      const { data } = await api.get(`/api/cards/search/${encodeURIComponent(query)}`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('검색 실패:', error);
      return [];
    }
  };

  return {
    cards,
    loading,
    loadCards,
    refreshCards,
    saveCard,
    deleteCard,
    updateCard,
    toggleFavorite,
    getFavorites,
    searchCards
  };
}

// 검색 전용 훅
export function useSearchAPI() {
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  const performSearch = async (query) => {
    if (!isAuthenticated || !query.trim()) {
      setSearchResults([]);
      return [];
    }

    try {
      setSearchLoading(true);
      const { data } = await api.get(`/api/cards/search/${encodeURIComponent(query)}`);
      
      if (Array.isArray(data)) {
        setSearchResults(data);
        return data;
      } else {
        setSearchResults([]);
        return [];
      }
    } catch (error) {
      console.error('검색 실패:', error);
      setSearchResults([]);
      return [];
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchResults([]);
  };

  return {
    searchResults,
    searchLoading,
    performSearch,
    clearSearch
  };
}

// 통계 전용 훅
export function useCardStatsAPI() {
  const [stats, setStats] = useState({
    total: 0,
    favorites: 0,
    byCompany: {},
    recentlyAdded: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  const refreshStats = async () => {
    if (!isAuthenticated) return;

    try {
      setStatsLoading(true);
      const { data } = await api.get('/api/cards/stats');
      console.log('📊 Stats API 응답:', data);
      setStats(data);
    } catch (error) {
      console.error('통계 조회 실패:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // 인증 상태 변경 시 통계 자동 새로고침
  useEffect(() => {
    if (isAuthenticated) {
      refreshStats();
    }
  }, [isAuthenticated]);

  return {
    stats,
    statsLoading,
    refreshStats
  };
} 