import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBusinessCardsAPI } from '../hooks/useBusinessCardsAPI';

const OCRProcessingPage = () => {
  const navigate = useNavigate();
  const { setIsUploadingCards } = useAuth();
  const { cards, refreshCards } = useBusinessCardsAPI();

  // 마운트 시 한 번만 실행
  useEffect(() => {
    // 1초 후 카드 목록 새로고침
    const refreshTimer = setTimeout(() => {
      refreshCards();
    }, 1000);

    // 2초마다 처리 완료 확인
    const checkInterval = setInterval(async () => {
      refreshCards();
    }, 2000);
    
    return () => {
      clearTimeout(refreshTimer);
      clearInterval(checkInterval);
    };
  }, []);

  // 카드 상태 변화 감지
  useEffect(() => {
    const processingCards = cards.filter(card => card.processing_status === 'processing');
    
    // 처리 중인 카드가 없고, 카드가 존재하면 완료로 간주
    if (processingCards.length === 0 && cards.length > 0) {
      setIsUploadingCards(false);
      window.location.href = '/';
    }
  }, [cards, setIsUploadingCards, navigate]);

  return (
    <div style={{ display: 'none' }}>
      OCR 처리 중... (완료 감지 컴포넌트)
    </div>
  );
};

export default OCRProcessingPage; 