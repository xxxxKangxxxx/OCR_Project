import { useState, useEffect } from 'react';
import { BusinessCardStorage, CompanyStorage, LocalStorageManager, UserStorage } from './localStorage.js';

// 명함 데이터 관리 훅
export function useBusinessCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // 데이터 로드
  const loadCards = () => {
    try {
      const loadedCards = BusinessCardStorage.getAll();
      setCards(loadedCards);
    } catch (error) {
      console.error('명함 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadCards();
  }, []);

  // 명함 저장
  const saveCard = (cardData) => {
    try {
      const success = BusinessCardStorage.save(cardData);
      if (success) {
        loadCards(); // 데이터 새로고침
        return true;
      }
      return false;
    } catch (error) {
      console.error('명함 저장 실패:', error);
      return false;
    }
  };

  // 명함 삭제
  const deleteCard = (id) => {
    try {
      const success = BusinessCardStorage.delete(id);
      if (success) {
        loadCards(); // 데이터 새로고침
        return true;
      }
      return false;
    } catch (error) {
      console.error('명함 삭제 실패:', error);
      return false;
    }
  };

  // 명함 검색
  const searchCards = (query) => {
    try {
      return BusinessCardStorage.search(query);
    } catch (error) {
      console.error('명함 검색 실패:', error);
      return [];
    }
  };

  // 즐겨찾기 토글
  const toggleFavorite = async (cardId) => {
    try {
      const success = BusinessCardStorage.toggleFavorite(cardId);
      if (success) {
        loadCards(); // 카드 목록 즉시 새로고침
        return true;
      }
      return false;
    } catch (error) {
      console.error('즐겨찾기 토글 실패:', error);
      return false;
    }
  };

  // 즐겨찾기 목록 조회
  const getFavorites = () => {
    try {
      return BusinessCardStorage.getFavorites();
    } catch (error) {
      console.error('즐겨찾기 조회 실패:', error);
      return [];
    }
  };

  // 명함 업데이트
  const updateCard = (id, updatedData) => {
    try {
      const success = BusinessCardStorage.save({ ...updatedData, id });
      if (success) {
        loadCards(); // 데이터 새로고침
        return true;
      }
      return false;
    } catch (error) {
      console.error('명함 업데이트 실패:', error);
      return false;
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

// 회사 데이터 관리 훅
export function useCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // 데이터 로드
  const loadCompanies = () => {
    try {
      const loadedCompanies = CompanyStorage.getAll();
      setCompanies(loadedCompanies);
    } catch (error) {
      console.error('회사 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadCompanies();
  }, []);

  // 회사 저장
  const saveCompany = (companyData) => {
    try {
      const success = CompanyStorage.save(companyData);
      if (success) {
        loadCompanies(); // 데이터 새로고침
        return true;
      }
      return false;
    } catch (error) {
      console.error('회사 저장 실패:', error);
      return false;
    }
  };

  // 회사명으로 검색 (자동완성용)
  const searchCompaniesByName = (name) => {
    try {
      return CompanyStorage.searchByName(name);
    } catch (error) {
      console.error('회사 검색 실패:', error);
      return [];
    }
  };

  return {
    companies,
    loading,
    saveCompany,
    searchCompaniesByName,
    refreshCompanies: loadCompanies
  };
}

// 검색 기능 훅
export function useSearch() {
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

      const results = BusinessCardStorage.search(query);
      setSearchResults(results);
    } catch (error) {
      console.error('검색 실패:', error);
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

// 로컬스토리지 상태 관리 훅
export function useStorageInfo() {
  const [storageInfo, setStorageInfo] = useState({
    bytes: 0,
    kb: '0',
    mb: '0'
  });

  const updateStorageInfo = () => {
    try {
      const info = LocalStorageManager.getStorageSize();
      setStorageInfo(info);
    } catch (error) {
      console.error('스토리지 정보 조회 실패:', error);
    }
  };

  useEffect(() => {
    updateStorageInfo();
  }, []);

  return {
    storageInfo,
    updateStorageInfo
  };
}

// 사용자 정보 관리 훅
export function useUserInfo() {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = () => {
    try {
      const info = UserStorage.getInfo();
      setUserInfo(info);
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveUserInfo = (info) => {
    try {
      const success = UserStorage.saveInfo(info);
      if (success) {
        setUserInfo(info);
        return true;
      }
      return false;
    } catch (error) {
      console.error('사용자 정보 저장 실패:', error);
      return false;
    }
  };

  return {
    userInfo,
    loading,
    saveUserInfo
  };
}

// 명함 통계 정보 훅
export function useCardStats() {
  const [stats, setStats] = useState({
    totalCards: 0,
    totalCompanies: 0,
    favoriteCards: 0,
    recentScans: []
  });

  const refreshStats = () => {
    const newStats = BusinessCardStorage.getStats();
    setStats(newStats);
  };

  useEffect(() => {
    refreshStats();
  }, []);

  return {
    stats,
    refreshStats
  };
} 