import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessCardsAPI } from '../hooks/useBusinessCardsAPI';
import { EditCardModal } from './CompanyCards';
import BusinessCard from './BusinessCard';
import './CompanyCards.css';

const FavoritePage = () => {
  const navigate = useNavigate();
  const { getFavorites, updateCard, refreshCards } = useBusinessCardsAPI();
  const [favoriteCards, setFavoriteCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 즐겨찾기 명함 로드
  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      const favorites = await getFavorites();
      setFavoriteCards(favorites);
    } catch (err) {
      console.error('즐겨찾기 조회 실패:', err);
      setError('즐겨찾기를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  // 뒤로가기
  const handleBack = () => {
    navigate(-1);
  };

  // 명함 편집
  const handleEditClick = (card) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  // 명함 저장
  const handleSaveCard = async (editedCard) => {
    const success = await updateCard(editedCard.id, editedCard);
    if (success) {
      alert('명함이 수정되었습니다.');
      setIsModalOpen(false);
      setSelectedCard(null);
      loadFavorites(); // 즐겨찾기 목록 새로고침
    } else {
      alert('명함 수정에 실패했습니다.');
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
  };

  // 즐겨찾기 상태 변경 후 새로고침
  const handleFavoriteChange = () => {
    loadFavorites();
  };

  // 삭제 완료 후 새로고침
  const handleDeleteComplete = () => {
    loadFavorites();
  };

  if (loading) {
    return (
      <div className="company-cards">
        <div className="company-header">
          <button className="back-button" onClick={handleBack}>
            <span>&larr;</span> 뒤로
          </button>
          <div className="company-title-container">
            <h1>즐겨찾기</h1>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          즐겨찾기를 불러오는 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="company-cards">
        <div className="company-header">
          <button className="back-button" onClick={handleBack}>
            <span>&larr;</span> 뒤로
          </button>
          <div className="company-title-container">
            <h1>즐겨찾기</h1>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#d73a49' }}>
          <p>{error}</p>
          <button onClick={loadFavorites} style={{ 
            background: '#667eea', 
            color: 'white', 
            border: 'none', 
            padding: '0.5rem 1rem', 
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="company-cards">
      <div className="company-header">
        <button className="back-button" onClick={handleBack}>
          <span>&larr;</span> 뒤로
        </button>
        <div className="company-title-container">
          <h1>즐겨찾기</h1>
          <span style={{ 
            position: 'absolute', 
            right: '20px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            background: '#f8f9fa',
            color: '#6c757d',
            padding: '0.3rem 0.8rem',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '500',
            border: '1px solid #e9ecef'
          }}>
            {favoriteCards.length}개
          </span>
        </div>
      </div>

      {favoriteCards.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem', 
          color: '#666',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '4rem', opacity: 0.3 }}>⭐</div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#666' }}>즐겨찾기가 비어있습니다</h2>
          <p style={{ margin: 0, lineHeight: 1.6, color: '#888' }}>
            아직 즐겨찾기로 설정한 명함이 없습니다.<br/>
            명함에서 ⭐ 버튼을 눌러 즐겨찾기에 추가해보세요!
          </p>
          <button 
            onClick={() => navigate('/')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '0.8rem 2rem',
              borderRadius: '25px',
              fontSize: '1rem',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            홈으로 이동
          </button>
        </div>
      ) : (
        <div className="cards-grid">
          {favoriteCards.map((card) => (
            <BusinessCard 
              key={card.id}
              card={card} 
              onEdit={handleEditClick}
              onDelete={handleDeleteComplete}
              onFavoriteChange={handleFavoriteChange}
            />
          ))}
        </div>
      )}

      {selectedCard && (
        <EditCardModal
          card={selectedCard}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveCard}
        />
      )}
    </div>
  );
};

export default FavoritePage; 