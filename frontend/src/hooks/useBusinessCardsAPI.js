import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// MongoDB API를 사용하는 명함 데이터 관리 훅
export function useBusinessCardsAPI() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const { apiRequest, isAuthenticated } = useAuth();

  // 데이터 로드
  const loadCards = async () => {
    if (!isAuthenticated) {
      setCards([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiRequest('/api/cards/');
      if (Array.isArray(response)) {
        setCards(response);
        console.log('📋 명함 데이터 로드 완료:', response.length, '개');
      } else {
        console.error('❌ 잘못된 응답 형식:', response);
        setCards([]);
      }
    } catch (error) {
      console.error('❌ 명함 데이터 로드 실패:', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 및 인증 상태 변경 시 데이터 로드
  useEffect(() => {
    loadCards();
  }, [isAuthenticated]);

  // 명함 저장 (API 호출)
  const saveCard = async (cardData) => {
    try {
      const response = await apiRequest('/api/cards/', {
        method: 'POST',
        body: JSON.stringify(cardData)
      });
      
      if (response && response.id) {
        await loadCards(); // 데이터 새로고침
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ 명함 저장 실패:', error);
      return false;
    }
  };

  // 명함 삭제
  const deleteCard = async (id) => {
    try {
      await apiRequest(`/api/cards/${id}`, {
        method: 'DELETE'
      });
      await loadCards(); // 데이터 새로고침
      return true;
    } catch (error) {
      console.error('❌ 명함 삭제 실패:', error);
      return false;
    }
  };

  // 명함 업데이트
  const updateCard = async (id, updatedData) => {
    try {
      const response = await apiRequest(`/api/cards/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      });
      
      if (response && response.id) {
        await loadCards(); // 데이터 새로고침
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ 명함 업데이트 실패:', error);
      return false;
    }
  };

  // 즐겨찾기 토글
  const toggleFavorite = async (cardId) => {
    try {
      await apiRequest(`/api/cards/${cardId}/favorite`, {
        method: 'POST'
      });
      await loadCards(); // 데이터 새로고침
      return true;
    } catch (error) {
      console.error('❌ 즐겨찾기 토글 실패:', error);
      return false;
    }
  };

  // 즐겨찾기 목록 조회
  const getFavorites = async () => {
    try {
      const response = await apiRequest('/api/cards/favorites/list');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ 즐겨찾기 조회 실패:', error);
      return [];
    }
  };

  // 명함 검색
  const searchCards = async (query) => {
    if (!query.trim()) return [];
    
    try {
      const response = await apiRequest(`/api/cards/search/${encodeURIComponent(query)}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ 명함 검색 실패:', error);
      return [];
    }
  };

  return {
    cards,
    loading,
    saveCard,
    deleteCard,
    searchCards,
    toggleFavorite,
    getFavorites,
    refreshCards: loadCards,
    updateCard
  };
}

// 검색 기능 API 훅
export function useSearchAPI() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { apiRequest } = useAuth();

  // 검색 실행
  const performSearch = async (query) => {
    setIsSearching(true);
    setSearchQuery(query);
    
    try {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      const results = await apiRequest(`/api/cards/search/${encodeURIComponent(query)}`);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (error) {
      console.error('❌ 검색 실패:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색 초기화
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  return {
    searchQuery,
    searchResults,
    isSearching,
    performSearch,
    clearSearch
  };
}

// 명함 통계 정보 API 훅
export function useCardStatsAPI() {
  const [stats, setStats] = useState({
    totalCards: 0,
    totalCompanies: 0,
    favoriteCards: 0,
    recentScans: []
  });
  const { apiRequest, isAuthenticated } = useAuth();

  const refreshStats = async () => {
    if (!isAuthenticated) return;
    
    try {
      // 모든 명함 가져와서 통계 계산
      const cards = await apiRequest('/api/cards/');
      if (Array.isArray(cards)) {
        const companies = new Set(cards.map(card => card.company_name || '').filter(Boolean)).size;
        const recentScans = cards
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 5);

        setStats({
          totalCards: cards.length,
          totalCompanies: companies,
          favoriteCards: cards.filter(card => card.isFavorite).length,
          recentScans: recentScans
        });
      }
    } catch (error) {
      console.error('❌ 통계 조회 실패:', error);
    }
  };

  useEffect(() => {
    refreshStats();
  }, [isAuthenticated]);

  return {
    stats,
    refreshStats
  };
} 