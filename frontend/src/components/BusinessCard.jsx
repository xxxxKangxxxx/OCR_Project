import React from 'react';
import './BusinessCard.css';

const BusinessCard = ({ name, company, position, phone, email, onEdit }) => {
  return (
    <div className="business-card">
      <div className="card-header">
        <div className="card-main-info">
          <h2 className="name">{name}</h2>
          <p className="position">{position}</p>
          <p className="company">{company}</p>
        </div>
        <div className="card-actions">
          <button
            className="action-button"
            onClick={onEdit}
          >
            <img src="/edit-icon.svg" alt="편집" />
          </button>
          <button className="action-button">
            <img src="/share-icon.svg" alt="공유" />
          </button>
        </div>
      </div>
      
      <div className="card-details">
        <p className="contact-info">
          <span className="label">전화:</span> {phone}
        </p>
        <p className="contact-info">
          <span className="label">이메일:</span> {email}
        </p>
      </div>
    </div>
  );
};

export default BusinessCard; 