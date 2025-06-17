import React, { useState, useRef } from 'react';
import './CardScanner.css';

const CardScanner = ({ onScanComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://localhost:8000/api/ocr', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      onScanComplete(data.text);
    } catch (error) {
      console.error('OCR 처리 중 오류 발생:', error);
      alert('명함 스캔 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="scan-section">
      <form className="upload-form" onSubmit={(e) => e.preventDefault()}>
        <input
          type="file"
          accept="image/*"
          className="file-input"
          ref={fileInputRef}
          onChange={handleFileUpload}
          capture="environment"
        />
        <label
          className="upload-button"
          onClick={() => fileInputRef.current?.click()}
        >
          <img src="/camera-icon.svg" alt="카메라" className="camera-icon" />
          <span>{isLoading ? '처리중...' : '명함 스캔하기'}</span>
        </label>
      </form>
      {isLoading && <div className="loading">처리중...</div>}
    </div>
  );
};

export default CardScanner; 