import React, { useState } from 'react';
import { useBusinessCardsAPI } from '../hooks/useBusinessCardsAPI';
import './BusinessCard.css';

const BusinessCard = ({ card, onEdit, onDelete }) => {
  const { toggleFavorite, deleteCard } = useBusinessCardsAPI();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFavoriteClick = async () => {
    await toggleFavorite(card.id);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    const success = await deleteCard(card.id);
    if (success) {
      alert('명함이 삭제되었습니다.');
      if (onDelete) {
        onDelete();
      }
    } else {
      alert('명함 삭제에 실패했습니다.');
    }
    setShowDeleteConfirm(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div className="business-card">
      <div className="card-header">
        <div className="card-main-info">
          <h2 className="name">{card.name}</h2>
          {card.name_en && <p className="name-en">{card.name_en}</p>}
          <p className="position">{card.position}</p>
          {card.department && <p className="department">{card.department}</p>}
          <p className="company">{card.company_name}</p>
        </div>
        <div className="card-actions">
          <button
            className={`action-button favorite-button ${card.isFavorite ? 'active' : ''}`}
            onClick={handleFavoriteClick}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={card.isFavorite ? "#ffd700" : "none"} stroke="currentColor" strokeWidth="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
            </svg>
          </button>
          <button
            className="action-button"
            onClick={() => onEdit(card)}
          >
            <img src="/edit-icon.svg" alt="편집" />
          </button>
          <button 
            className="action-button delete-button"
            onClick={handleDeleteClick}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
          <button className="action-button">
            <img src="/share-icon.svg" alt="공유" />
          </button>
        </div>
      </div>
      
      <div className="card-details">
        {card.phone_number && (
          <p className="contact-info">
            <span className="label">전화:</span> {card.phone_number}
          </p>
        )}
        {card.mobile_phone_number && (
          <p className="contact-info">
            <span className="label">휴대폰:</span> {card.mobile_phone_number}
          </p>
        )}
        {card.fax_number && (
          <p className="contact-info">
            <span className="label">팩스:</span> {card.fax_number}
          </p>
        )}
        {card.email && (
          <p className="contact-info">
            <span className="label">이메일:</span> {card.email}
          </p>
        )}
        {card.address && (
          <p className="contact-info">
            <span className="label">주소:</span> {card.address}
            {card.postal_code && <span className="postal-code"> ({card.postal_code})</span>}
          </p>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirm-modal">
          <div className="delete-confirm-content">
            <p>정말 이 명함을 삭제하시겠습니까?</p>
            <div className="delete-confirm-actions">
              <button onClick={handleDeleteConfirm} className="delete-confirm-button">삭제</button>
              <button onClick={handleDeleteCancel} className="delete-cancel-button">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessCard; 