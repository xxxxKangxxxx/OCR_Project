import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBusinessCards } from '../utils/useLocalStorage';
import './CompanyCards.css';

// 모달 컴포넌트
const EditCardModal = ({ card, isOpen, onClose, onSave }) => {
  const [editedCard, setEditedCard] = useState(card);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedCard(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editedCard);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>명함 수정</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-group">
            <label htmlFor="name">이름</label>
            <input
              type="text"
              id="name"
              name="name"
              value={editedCard.name || ''}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="position">직책</label>
            <input
              type="text"
              id="position"
              name="position"
              value={editedCard.position || ''}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="department">부서</label>
            <input
              type="text"
              id="department"
              name="department"
              value={editedCard.department || ''}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={editedCard.email || ''}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="phone">전화번호</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={editedCard.phone || ''}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="mobile">휴대폰</label>
            <input
              type="tel"
              id="mobile"
              name="mobile"
              value={editedCard.mobile || ''}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="fax">팩스</label>
            <input
              type="tel"
              id="fax"
              name="fax"
              value={editedCard.fax || ''}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="address">주소</label>
            <input
              type="text"
              id="address"
              name="address"
              value={editedCard.address || ''}
              onChange={handleChange}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="save-button">저장</button>
            <button type="button" onClick={onClose} className="cancel-button">취소</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CompanyCards = () => {
  const { companyName } = useParams();
  const navigate = useNavigate();
  const { cards, updateCard } = useBusinessCards();
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 현재 회사의 명함만 필터링
  const companyCards = cards.filter(card => 
    card.company?.name === decodeURIComponent(companyName) ||
    card.company_name === decodeURIComponent(companyName)
  );

  const handleEditClick = (card) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleSaveCard = (editedCard) => {
    const success = updateCard(editedCard.id, editedCard);
    if (success) {
      alert('명함이 수정되었습니다.');
    } else {
      alert('명함 수정에 실패했습니다.');
    }
  };

  return (
    <div className="company-cards">
      <div className="company-header">
        <button className="back-button" onClick={() => navigate('/')}>
          &larr; 뒤로
        </button>
        <h1>{decodeURIComponent(companyName)}</h1>
      </div>
      
      <div className="cards-grid">
        {companyCards.map(card => (
          <div key={card.id} className="business-card">
            <div className="card-header">
              <div className="card-main-info">
                <h2 className="name">{card.name}</h2>
                <p className="position">{card.position}</p>
                <p className="department">{card.department}</p>
              </div>
              <div className="card-actions">
                <button
                  className="action-button"
                  onClick={() => handleEditClick(card)}
                >
                  <img src="/edit-icon.svg" alt="편집" />
                </button>
                <button className="action-button">
                  <img src="/share-icon.svg" alt="공유" />
                </button>
              </div>
            </div>
            
            <div className="card-details">
              {card.email && (
                <p className="contact-info">
                  <span className="label">이메일:</span> {card.email}
                </p>
              )}
              {card.phone && (
                <p className="contact-info">
                  <span className="label">전화:</span> {card.phone}
                </p>
              )}
              {card.mobile && (
                <p className="contact-info">
                  <span className="label">휴대폰:</span> {card.mobile}
                </p>
              )}
              {card.fax && (
                <p className="contact-info">
                  <span className="label">팩스:</span> {card.fax}
                </p>
              )}
              {card.address && (
                <p className="contact-info">
                  <span className="label">주소:</span> {card.address}
                </p>
              )}
            </div>
          </div>
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

export default CompanyCards; 