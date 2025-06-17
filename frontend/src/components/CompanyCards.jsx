import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const CompanyCards = () => {
  const { companyName } = useParams();
  const navigate = useNavigate();

  // 임시 데이터 (나중에 실제 데이터로 교체)
  const cards = [
    { id: 1, name: '홍길동', position: '과장', department: '영업1팀', email: 'hong@company.com', phone: '010-1234-5678' },
    { id: 2, name: '김철수', position: '대리', department: '영업2팀', email: 'kim@company.com', phone: '010-2345-6789' },
  ];

  return (
    <main className="main-content">
      <div className="company-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← 뒤로가기
        </button>
        <h2>{decodeURIComponent(companyName)}</h2>
        <p className="card-count">{cards.length}개의 명함</p>
      </div>

      <div className="cards-container">
        {cards.map(card => (
          <div key={card.id} className="business-card">
            <div className="card-header">
              <h3>{card.name}</h3>
              <span className="position">{card.position}</span>
            </div>
            <div className="card-body">
              <p className="department">{card.department}</p>
              <p className="contact">{card.email}</p>
              <p className="contact">{card.phone}</p>
            </div>
            <div className="card-actions">
              <button className="edit-button">
                <img src="/edit-icon.svg" alt="Edit" />
              </button>
              <button className="share-button">
                <img src="/share-icon.svg" alt="Share" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .company-header {
          padding: 20px;
          margin-bottom: 20px;
        }

        .back-button {
          background: none;
          border: none;
          font-size: 16px;
          color: #666;
          cursor: pointer;
          padding: 0;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
        }

        .back-button:hover {
          color: #333;
        }

        .company-header h2 {
          font-size: 24px;
          margin: 0 0 8px 0;
          color: #333;
        }

        .card-count {
          color: #666;
          margin: 0;
        }

        .cards-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          padding: 20px;
        }

        .business-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 20px;
          position: relative;
        }

        .card-header {
          margin-bottom: 15px;
        }

        .card-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        .position {
          color: #666;
          font-size: 14px;
          display: block;
          margin-top: 4px;
        }

        .department {
          color: #666;
          font-size: 14px;
          margin: 4px 0;
        }

        .contact {
          color: #888;
          font-size: 14px;
          margin: 4px 0;
        }

        .card-actions {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          gap: 10px;
        }

        .edit-button,
        .share-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px;
        }

        .edit-button img,
        .share-button img {
          width: 20px;
          height: 20px;
        }
      `}</style>
    </main>
  );
};

export default CompanyCards; 