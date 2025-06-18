import React, { useState } from 'react';
import { useBusinessCards, useCompanies, useStorageInfo } from '../utils/useLocalStorage.js';
import { DataManager } from '../utils/localStorage.js';

const LocalStorageDemo = () => {
  const { cards, saveCard, deleteCard, toggleFavorite, loading } = useBusinessCards();
  const { companies, saveCompany } = useCompanies();
  const { storageInfo, updateStorageInfo } = useStorageInfo();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    company: { name: '' }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'company') {
      setFormData(prev => ({
        ...prev,
        company: { name: value }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSaveCard = (e) => {
    e.preventDefault();
    const success = saveCard(formData);
    if (success) {
      alert('명함이 저장되었습니다!');
      setFormData({
        name: '',
        email: '',
        phone: '',
        position: '',
        company: { name: '' }
      });
      updateStorageInfo();
    } else {
      alert('명함 저장에 실패했습니다.');
    }
  };

  const handleDeleteCard = (id) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      const success = deleteCard(id);
      if (success) {
        alert('명함이 삭제되었습니다.');
        updateStorageInfo();
      }
    }
  };

  const handleToggleFavorite = (id) => {
    toggleFavorite(id);
  };

  const handleExportData = () => {
    DataManager.exportData();
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (file) {
      DataManager.importData(file)
        .then(() => {
          alert('데이터 가져오기가 완료되었습니다!');
          window.location.reload(); // 페이지 새로고침으로 데이터 반영
        })
        .catch((error) => {
          alert('데이터 가져오기에 실패했습니다: ' + error.message);
        });
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>로컬스토리지 데모</h1>
      
      {/* 스토리지 정보 */}
      <div style={{ 
        background: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <h3>스토리지 사용량</h3>
        <p>사용량: {storageInfo.kb} KB ({storageInfo.mb} MB)</p>
        <p>저장된 명함: {cards.length}개</p>
        <p>저장된 회사: {companies.length}개</p>
      </div>

      {/* 명함 추가 폼 */}
      <div style={{ 
        border: '1px solid #ddd', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <h3>새 명함 추가</h3>
        <form onSubmit={handleSaveCard}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              name="name"
              placeholder="이름"
              value={formData.name}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
              required
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="email"
              name="email"
              placeholder="이메일"
              value={formData.email}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="tel"
              name="phone"
              placeholder="전화번호"
              value={formData.phone}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              name="position"
              placeholder="직책"
              value={formData.position}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              name="company"
              placeholder="회사명"
              value={formData.company.name}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
            />
          </div>
          <button 
            type="submit"
            style={{ 
              backgroundColor: '#007bff', 
              color: 'white', 
              padding: '10px 20px', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            명함 저장
          </button>
        </form>
      </div>

      {/* 데이터 백업/복원 */}
      <div style={{ 
        border: '1px solid #ddd', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <h3>데이터 백업/복원</h3>
        <button 
          onClick={handleExportData}
          style={{ 
            backgroundColor: '#28a745', 
            color: 'white', 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '4px',
            marginRight: '10px',
            cursor: 'pointer'
          }}
        >
          데이터 내보내기
        </button>
        <label style={{ 
          backgroundColor: '#ffc107', 
          color: 'black', 
          padding: '10px 20px', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'inline-block'
        }}>
          데이터 가져오기
          <input 
            type="file" 
            accept=".json"
            onChange={handleImportData}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* 명함 목록 */}
      <div>
        <h3>저장된 명함 ({cards.length}개)</h3>
        {cards.length === 0 ? (
          <p>저장된 명함이 없습니다.</p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {cards.map((card) => (
              <div 
                key={card.id} 
                style={{ 
                  border: '1px solid #ddd', 
                  padding: '15px', 
                  borderRadius: '8px',
                  backgroundColor: card.is_favorite ? '#fff3cd' : 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0' }}>
                      {card.name}
                      {card.is_favorite && <span style={{ color: '#ffc107' }}> ⭐</span>}
                    </h4>
                    <p style={{ margin: '0 0 5px 0', color: '#666' }}>{card.position}</p>
                    <p style={{ margin: '0 0 5px 0', color: '#666' }}>{card.company?.name}</p>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>{card.email}</p>
                    <p style={{ margin: '0', fontSize: '14px' }}>{card.phone}</p>
                  </div>
                  <div>
                    <button 
                      onClick={() => handleToggleFavorite(card.id)}
                      style={{ 
                        backgroundColor: card.is_favorite ? '#ffc107' : '#6c757d',
                        color: 'white', 
                        padding: '5px 10px', 
                        border: 'none', 
                        borderRadius: '4px',
                        marginRight: '5px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {card.is_favorite ? '★' : '☆'}
                    </button>
                    <button 
                      onClick={() => handleDeleteCard(card.id)}
                      style={{ 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        padding: '5px 10px', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                  생성: {new Date(card.created_at).toLocaleString()}
                  {card.updated_at !== card.created_at && (
                    <span> | 수정: {new Date(card.updated_at).toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalStorageDemo; 