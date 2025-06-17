import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CardGroup.css';

const CardGroup = ({ title, cards = [], backgroundColor, onColorChange }) => {
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
  const navigate = useNavigate();
  const displayCount = Math.min(cards.length, 10);
  
  const handleColorChange = (e) => {
    onColorChange(title, e.target.value);
  };

  const handleGroupClick = () => {
    navigate(`/company/${encodeURIComponent(title)}`);
  };

  return (
    <div className="card-group" onClick={handleGroupClick}>
      <div className="card-group-header">
        <div className="header-left">
          <h2 className="group-title">{title}</h2>
          {title && (
            <div className="color-picker-container">
              <button
                className="color-button"
                style={{ backgroundColor }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsColorPickerVisible(!isColorPickerVisible);
                }}
              >
                <span className="color-dot" style={{ backgroundColor }}></span>
              </button>
              {isColorPickerVisible && (
                <div className="color-picker-popup">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={handleColorChange}
                    className="color-picker"
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <span className="card-count">{cards.length}</span>
      </div>
      <div className="cards-stack">
        {cards.length === 0 ? (
          <div className="empty-card">
            <span>비어있음</span>
          </div>
        ) : (
          [...Array(displayCount)].map((_, index) => (
            <div 
              key={index}
              className={`stacked-card ${index === 0 ? 'top-card' : ''}`}
              style={{ 
                '--index': index,
                '--total': displayCount,
                '--card-color': backgroundColor || '#8B7355',
                zIndex: displayCount - index,
              }}
            >
              {index === 0 && (
                <>
                  <div className="card-content">
                    <h3>{cards[0].name}</h3>
                    <p>{cards[0].position}</p>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CardGroup;