import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

// MongoDB API를 사용하는 명함 데이터 관리 훅
export function useBusinessCardsAPI() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // 데이터 로드
  const loadCards = async () => {
    if (!isAuthenticated) {
      setCards([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.get('/api/cards/');
      if (Array.isArray(data)) {
        setCards(data);
        console.log('📋 명함 데이터 로드 완료:', data.length, '개');
      } else {
        console.error('❌ 잘못된 응답 형식:', data);
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
      const { data } = await api.post('/api/cards/', cardData);
      
      if (data && data.id) {
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
      await api.delete(`/api/cards/${id}`);
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
      const { data } = await api.put(`/api/cards/${id}`, updatedData);
      
      if (data && data.id) {
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
      await api.post(`/api/cards/${cardId}/favorite`);
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
      const { data } = await api.get('/api/cards/favorites/list');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ 즐겨찾기 조회 실패:', error);
      return [];
    }
  };

  // 명함 검색
  const searchCards = async (query) => {
    if (!query.trim()) return [];
    
    try {
      const { data } = await api.get(`/api/cards/search/${encodeURIComponent(query)}`);
      return Array.isArray(data) ? data : [];
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

  // 검색 실행
  const performSearch = async (query) => {
    setIsSearching(true);
    setSearchQuery(query);
    
    try {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      const { data } = await api.get(`/api/cards/search/${encodeURIComponent(query)}`);
      setSearchResults(Array.isArray(data) ? data : []);
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
  const { isAuthenticated } = useAuth();

  const refreshStats = async () => {
    if (!isAuthenticated) return;
    
    try {
      // 모든 명함 가져와서 통계 계산
      const { data: cards } = await api.get('/api/cards/');
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