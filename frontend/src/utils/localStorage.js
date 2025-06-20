// 로컬스토리지 키 상수
const STORAGE_KEYS = {
  BUSINESS_CARDS: 'cardlet_business_cards',
  COMPANIES: 'cardlet_companies',
  SETTINGS: 'cardlet_settings',
  CARDS: 'business_cards',
  USER_INFO: 'user_info',
  STORAGE_INFO: 'storage_info'
};

// 로컬스토리지 유틸리티 클래스
class LocalStorageManager {
  
  // 데이터 저장
  static setItem(key, data) {
    try {
      const jsonData = JSON.stringify(data);
      localStorage.setItem(key, jsonData);
      return true;
    } catch (error) {
      console.error('로컬스토리지 저장 실패:', error);
      return false;
    }
  }

  // 데이터 조회
  static getItem(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error('로컬스토리지 조회 실패:', error);
      return defaultValue;
    }
  }

  // 데이터 삭제
  static removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('로컬스토리지 삭제 실패:', error);
      return false;
    }
  }

  // 전체 데이터 삭제
  static clear() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('로컬스토리지 전체 삭제 실패:', error);
      return false;
    }
  }

  // 사용 중인 스토리지 크기 확인 (대략적)
  static getStorageSize() {
    let total = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        total += data.length;
      }
    });
    return {
      bytes: total,
      kb: (total / 1024).toFixed(2),
      mb: (total / 1024 / 1024).toFixed(2)
    };
  }
}

// 명함 데이터 관리 클래스
class BusinessCardStorage {
  
  // 모든 명함 조회
  static getAll() {
    return LocalStorageManager.getItem(STORAGE_KEYS.BUSINESS_CARDS, []);
  }

  // ID로 명함 조회
  static getById(id) {
    const cards = this.getAll();
    return cards.find(card => card.id === id) || null;
  }

  // 명함 검색
  static search(query) {
    const cards = this.getAll();
    const lowerQuery = query.toLowerCase();
    
    return cards.filter(card => {
      return (
        card.name?.toLowerCase().includes(lowerQuery) ||
        card.email?.toLowerCase().includes(lowerQuery) ||
        card.phone_number?.includes(query) ||
        card.company_name?.toLowerCase().includes(lowerQuery) ||
        card.position?.toLowerCase().includes(lowerQuery)
      );
    });
  }

  // 명함 저장/업데이트
  static save(cardData) {
    const cards = this.getAll();
    const now = new Date().toISOString();
    
    // 데이터 정규화
    const normalizedCardData = {
      id: cardData.id,
      name: cardData.name,
      name_en: cardData.name_en,
      email: cardData.email,
      phone_number: cardData.phone_number,
      mobile_phone_number: cardData.mobile_phone_number,
      fax_number: cardData.fax_number,
      position: cardData.position,
      department: cardData.department,
      company_name: cardData.company_name,
      address: cardData.address,
      postal_code: cardData.postal_code,
      ocr_raw_text: cardData.ocr_raw_text,
      ocr_confidence: cardData.ocr_confidence,
      isFavorite: cardData.isFavorite || false
    };
    
    if (normalizedCardData.id) {
      // 업데이트
      const index = cards.findIndex(card => card.id === normalizedCardData.id);
      if (index !== -1) {
        cards[index] = { 
          ...normalizedCardData,
          updated_at: now 
        };
      }
    } else {
      // 새로 생성
      const newCard = {
        ...normalizedCardData,
        id: Date.now().toString(), // 간단한 ID 생성
        created_at: now,
        updated_at: now
      };
      cards.push(newCard);
    }
    
    return LocalStorageManager.setItem(STORAGE_KEYS.BUSINESS_CARDS, cards);
  }

  // 명함 삭제
  static delete(id) {
    const cards = this.getAll();
    const filteredCards = cards.filter(card => card.id !== id);
    return LocalStorageManager.setItem(STORAGE_KEYS.BUSINESS_CARDS, filteredCards);
  }

  // 즐겨찾기 토글
  static toggleFavorite(cardId) {
    try {
      const cards = this.getAll();
      const cardIndex = cards.findIndex(card => card.id === cardId);
      
      if (cardIndex !== -1) {
        const updatedCards = [...cards];
        updatedCards[cardIndex] = {
          ...updatedCards[cardIndex],
          isFavorite: !updatedCards[cardIndex].isFavorite,
          updated_at: new Date().toISOString()
        };
        
        const success = LocalStorageManager.setItem(STORAGE_KEYS.BUSINESS_CARDS, updatedCards);
        return success;
      }
      return false;
    } catch (error) {
      console.error('즐겨찾기 토글 실패:', error);
      return false;
    }
  }

  // 즐겨찾기 목록 조회
  static getFavorites() {
    try {
      const cards = this.getAll();
      return cards.filter(card => card.isFavorite);
    } catch (error) {
      console.error('즐겨찾기 목록 조회 실패:', error);
      return [];
    }
  }

  static getRecentScans(limit = 5) {
    const cards = this.getAll();
    return cards
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, limit)
      .map(card => ({
        ...card,
        createdAt: card.created_at
      }));
  }

  static getStats() {
    const cards = this.getAll();
    const companies = new Set(cards.map(card => card.company_name || '').filter(Boolean)).size;
    
    return {
      totalCards: cards.length,
      totalCompanies: companies,
      favoriteCards: cards.filter(card => card.isFavorite).length,
      recentScans: this.getRecentScans()
    };
  }
}

// 회사 데이터 관리 클래스
class CompanyStorage {
  
  // 모든 회사 조회
  static getAll() {
    return LocalStorageManager.getItem(STORAGE_KEYS.COMPANIES, []);
  }

  // 회사 저장
  static save(companyData) {
    const companies = this.getAll();
    const now = new Date().toISOString();
    
    if (companyData.id) {
      // 업데이트
      const index = companies.findIndex(company => company.id === companyData.id);
      if (index !== -1) {
        companies[index] = { ...companyData, updated_at: now };
      }
    } else {
      // 새로 생성
      const newCompany = {
        ...companyData,
        id: Date.now().toString(),
        created_at: now,
        updated_at: now
      };
      companies.push(newCompany);
    }
    
    return LocalStorageManager.setItem(STORAGE_KEYS.COMPANIES, companies);
  }

  // 회사명으로 검색 (자동완성용)
  static searchByName(name) {
    const companies = this.getAll();
    return companies.filter(company => 
      company.name.toLowerCase().includes(name.toLowerCase())
    );
  }
}

// 사용자 정보 관리 클래스
class UserStorage {
  static getInfo() {
    const defaultInfo = {
      name: '',
      email: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const userInfo = LocalStorageManager.getItem(STORAGE_KEYS.USER_INFO);
    return userInfo || defaultInfo;
  }

  static saveInfo(userInfo) {
    const updatedInfo = {
      ...userInfo,
      updatedAt: new Date().toISOString()
    };
    return LocalStorageManager.setItem(STORAGE_KEYS.USER_INFO, updatedInfo);
  }
}

// 데이터 백업/복원 유틸리티
class DataManager {
  
  // 전체 데이터 내보내기 (JSON 파일로)
  static exportData() {
    const data = {
      business_cards: BusinessCardStorage.getAll(),
      companies: CompanyStorage.getAll(),
      exported_at: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardlet_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 데이터 가져오기
  static importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          
          if (data.business_cards) {
            LocalStorageManager.setItem(STORAGE_KEYS.BUSINESS_CARDS, data.business_cards);
          }
          if (data.companies) {
            LocalStorageManager.setItem(STORAGE_KEYS.COMPANIES, data.companies);
          }
          
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = function() {
        reject(new Error('파일 읽기 실패'));
      };
      
      reader.readAsText(file);
    });
  }
}

export {
  LocalStorageManager,
  BusinessCardStorage,
  CompanyStorage,
  UserStorage,
  DataManager,
  STORAGE_KEYS
}; 