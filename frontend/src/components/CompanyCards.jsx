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
      [name]: value,
      company_name: name === 'company_name' ? value : prev.company_name
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editedCard);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-wrapper">
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>명함 수정</h2>
            <button className="close-button" onClick={onClose}>&times;</button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit} className="edit-form">
              <div className="form-group">
                <label htmlFor="company_name">회사명</label>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  value={editedCard.company_name || ''}
                  onChange={handleChange}
                />
              </div>
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
            </form>
          </div>
          <div className="modal-footer">
            <div className="form-actions">
              <button type="button" onClick={onClose} className="cancel-button">취소</button>
              <button type="button" onClick={handleSubmit} className="save-button">저장</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BusinessCard = ({ card, onEdit }) => {
  const { toggleFavorite } = useBusinessCards();

  const handleFavoriteClick = () => {
    toggleFavorite(card.id);
  };

  return (
    <div className="business-card">
      <div className="card-header">
        <div className="card-main-info">
          <h2 className="name">{card.name}</h2>
          <p className="position">{card.position}</p>
          <p className="department">{card.department}</p>
        </div>
        <div className="card-actions">
          <button
            className={`action-button favorite-button ${card.isFavorite ? 'active' : ''}`}
            onClick={handleFavoriteClick}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={card.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
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
  );
};

const CompanyCards = () => {
  const { companyName } = useParams();
  const navigate = useNavigate();
  const { cards, updateCard } = useBusinessCards();
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBack = () => {
    navigate(-1); // 브라우저의 히스토리에서 이전 페이지로 이동
  };

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
      // 회사명이 변경되었다면 홈페이지로 이동
      if (editedCard.company_name !== companyName) {
        navigate('/');
      }
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
          <h1>{decodeURIComponent(companyName)}</h1>
        </div>
      </div>
      
      <div className="cards-grid">
        {companyCards.map(card => (
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

export { EditCardModal };
export default CompanyCards; 

<style jsx>{`
  .company-header {
    display: flex;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
    background: white;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .back-button {
    background: none;
    border: none;
    font-size: 15px;
    color: #666;
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    position: absolute;
    left: 20px;
  }

  .back-button span {
    font-size: 18px;
  }

  .back-button:hover {
    color: #333;
  }

  .company-title-container {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 60px;
  }

  .company-title-container h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    color: #333;
  .company-name-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    max-width: 400px;
    position: relative;
  }

  .company-name-display h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    color: #333;
    text-align: center;
    flex: 1;
  }

  .edit-company-name {
    background: none;
    border: none;
    width: 24px;
    height: 24px;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    border-radius: 4px;
    transition: all 0.2s ease;
    position: absolute;
    right: -30px;
    top: 50%;
    transform: translateY(-50%);
  }

  .edit-company-name:hover {
    background-color: #f5f5f5;
    color: #333;
  }

  .edit-company-name svg {
    display: block;
  }

  .company-name-edit {
    width: 100%;
    max-width: 300px;
  }

  .company-name-input {
    width: 100%;
    font-size: 18px;
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    text-align: center;
  }

  .company-name-input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
  }
`}</style> 