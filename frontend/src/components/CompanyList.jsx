import React from 'react';
import { Link } from 'react-router-dom';

const CompanyList = () => {
  // 임시 데이터 (나중에 실제 데이터로 교체)
  const companies = [
    { id: 1, name: '삼성전자', cardCount: 5 },
    { id: 2, name: 'LG전자', cardCount: 3 },
    { id: 3, name: '현대자동차', cardCount: 4 },
  ];

  return (
    <div className="company-list">
      <h1>회사별 명함 목록</h1>
      
      <div className="companies-grid">
        {companies.map(company => (
          <Link 
            to={`/company/${encodeURIComponent(company.name)}`} 
            key={company.id} 
            className="company-item"
          >
            <div className="company-content">
              <h2>{company.name}</h2>
              <p>{company.cardCount}개의 명함</p>
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        .company-list {
          padding: 20px;
        }

        h1 {
          font-size: 28px;
          margin-bottom: 24px;
        }

        .companies-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
        }

        .company-item {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 20px;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s;
        }

        .company-item:hover {
          transform: translateY(-4px);
        }

        .company-content h2 {
          font-size: 20px;
          margin: 0 0 8px 0;
        }

        .company-content p {
          color: #666;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default CompanyList; 