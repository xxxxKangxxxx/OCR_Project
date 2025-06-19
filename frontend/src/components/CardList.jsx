import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBusinessCards } from '../utils/useLocalStorage';
import { EditCardModal } from './CompanyCards';
import './CompanyCards.css';

const BusinessCard = ({ card, onEdit }) => {
  const { toggleFavorite, cards } = useBusinessCards();
  const [isFavorite, setIsFavorite] = useState(card.isFavorite);

  useEffect(() => {
    const currentCard = cards.find(c => c.id === card.id);
    if (currentCard) {
      setIsFavorite(currentCard.isFavorite);
    }
  }, [cards, card.id]);

  const handleFavoriteClick = async () => {
    await toggleFavorite(card.id);
  };

  return (
    <div className="business-card">
      <div className="card-header">
        <div className="card-main-info">
          <h2 className="name">{card.name}</h2>
          <p className="position">{card.position}</p>
          <p className="company">{card.company_name}</p>
          <p className="department">{card.department}</p>
        </div>
        <div className="card-actions">
          <button
            className={`action-button favorite-button ${isFavorite ? 'active' : ''}`}
            onClick={handleFavoriteClick}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? "#ffd700" : "none"} stroke="currentColor" strokeWidth="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
            </svg>
          </button>
          <button
            className="action-button"
            onClick={() => onEdit(card)}
          >
            <img src="/edit-icon.svg" alt="편집" />
          </button>
          <button className="action-button">
            <img src="/share-icon.svg" alt="공유" />
          </button>
        </div>
      </div>
      <div className="card-details">
        <div className="contact-info">
          <span className="label">이메일:</span> {card.email}
        </div>
        <div className="contact-info">
          <span className="label">전화:</span> {card.phone}
        </div>
        <div className="contact-info">
          <span className="label">휴대폰:</span> {card.mobile}
        </div>
        {card.address && (
          <div className="contact-info">
            <span className="label">주소:</span> {card.address}
          </div>
        )}
      </div>
    </div>
  );
};

const CardList = () => {
  const { type, date } = useParams();
  const navigate = useNavigate();
  const { cards, updateCard } = useBusinessCards();
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

  const handleSaveCard = (editedCard) => {
    const success = updateCard(editedCard.id, editedCard);
    if (success) {
      alert('명함이 수정되었습니다.');
      setIsModalOpen(false);
    } else {
      alert('명함 수정에 실패했습니다.');
    }
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
          <BusinessCard key={card.id} card={card} onEdit={handleEditClick} />
        ))}
      </div>

      {selectedCard && (
        <EditCardModal
          card={selectedCard}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveCard}
        />
      )}
    </div>
  );
};

export default CardList; 