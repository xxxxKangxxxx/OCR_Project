import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBusinessCardsAPI } from '../hooks/useBusinessCardsAPI';
import { EditCardModal } from './CompanyCards';
import BusinessCard from './BusinessCard';
import './CompanyCards.css';

const CardList = () => {
  const { type, date } = useParams();
  const navigate = useNavigate();
  const { cards, updateCard, refreshCards } = useBusinessCardsAPI();
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBack = () => {
    navigate(-1); // 브라우저의 히스토리에서 이전 페이지로 이동
  };

  const filteredCards = React.useMemo(() => {
    if (type === 'all') {
      return cards;
    } else if (type === 'date' && date) {
      const targetDate = new Date(date);
      return cards.filter(card => {
        if (!card.created_at) return false;
        const cardDate = new Date(card.created_at);
        return cardDate.toLocaleDateString() === targetDate.toLocaleDateString();
      });
    }
    return [];
  }, [cards, type, date]);

  const getTitle = () => {
    if (type === 'all') {
      return '전체 명함';
    } else if (type === 'date' && date) {
      return `${new Date(date).toLocaleDateString()} 등록`;
    }
    return '';
  };

  const handleEditClick = (card) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleSaveCard = async (editedCard) => {
    const success = await updateCard(editedCard.id, editedCard);
    if (success) {
      alert('명함이 수정되었습니다.');
      setIsModalOpen(false);
      setSelectedCard(null);
    } else {
      alert('명함 수정에 실패했습니다.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
  };

  const handleDeleteComplete = async () => {
    await refreshCards(); // 카드 목록 새로고침
  };

  return (
    <div className="company-cards">
      <div className="company-header">
        <button className="back-button" onClick={handleBack}>
          <span>&larr;</span> 뒤로
        </button>
        <div className="company-title-container">
          <h1>{getTitle()}</h1>
        </div>
      </div>
      
      <div className="cards-grid">
        {filteredCards.map(card => (
          <BusinessCard 
            key={card.id} 
            card={card} 
            onEdit={handleEditClick}
            onDelete={handleDeleteComplete}
          />
        ))}
      </div>

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

export default CardList; 