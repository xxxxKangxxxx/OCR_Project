import React from 'react';
import './BusinessCard.css';

const BusinessCard = ({ 
  name, 
  name_en,
  company_name, 
  position, 
  department,
  phone_number, 
  mobile_phone_number,
  fax_number,
  email, 
  address,
  postal_code,
  onEdit 
}) => {
  return (
    <div className="business-card">
      <div className="card-header">
        <div className="card-main-info">
          <h2 className="name">{name}</h2>
          {name_en && <p className="name-en">{name_en}</p>}
          <p className="position">{position}</p>
          {department && <p className="department">{department}</p>}
          <p className="company">{company_name}</p>
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
        {phone_number && (
          <p className="contact-info">
            <span className="label">전화:</span> {phone_number}
          </p>
        )}
        {mobile_phone_number && (
          <p className="contact-info">
            <span className="label">휴대폰:</span> {mobile_phone_number}
          </p>
        )}
        {fax_number && (
          <p className="contact-info">
            <span className="label">팩스:</span> {fax_number}
          </p>
        )}
        {email && (
          <p className="contact-info">
            <span className="label">이메일:</span> {email}
          </p>
        )}
        {address && (
          <p className="contact-info">
            <span className="label">주소:</span> {address}
            {postal_code && <span className="postal-code"> ({postal_code})</span>}
          </p>
        )}
      </div>
    </div>
  );
};

export default BusinessCard; 