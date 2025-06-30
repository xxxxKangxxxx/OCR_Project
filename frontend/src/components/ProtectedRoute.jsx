import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, isUploadingCards, setIsUploadingCards, ocrFileInfo } = useAuth();
  const location = useLocation();
  const [ocrStartTime, setOcrStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(90);

  // OCR 처리 시간 추적 및 예상 시간 계산
  useEffect(() => {
    if (isUploadingCards && !ocrStartTime) {
      setOcrStartTime(Date.now());
      setElapsedTime(0);
      
      // 파일 정보를 바탕으로 예상 시간 계산
      if (ocrFileInfo) {
        const { fileCount, totalSize } = ocrFileInfo;
        const baseTime = 30;
        const fileTime = fileCount * 20;
        const sizeTime = Math.floor(totalSize / (1024 * 1024)) * 5;
        const calculatedTime = baseTime + fileTime + sizeTime;
        setEstimatedTime(Math.max(calculatedTime, 30));
      }
    } else if (!isUploadingCards && ocrStartTime) {
      setOcrStartTime(null);
      setElapsedTime(0);
    }
  }, [isUploadingCards, ocrStartTime, ocrFileInfo]);

  // 경과 시간 업데이트
  useEffect(() => {
    let timer;
    if (isUploadingCards && ocrStartTime) {
      timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - ocrStartTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isUploadingCards, ocrStartTime]);

  // 남은 시간 계산
  const remainingTime = Math.max(0, estimatedTime - elapsedTime);
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`;
  };

  // OCR 처리 취소
  const handleCancelOCR = () => {
    if (confirm('OCR 처리를 취소하시겠습니까?\n진행 중인 작업이 중단됩니다.')) {
      setIsUploadingCards(false);
      setOcrStartTime(null);
      setElapsedTime(0);
    }
  };

  // OCR 처리 중이거나 초기 인증 로딩 중일 때만 로딩 화면 표시
  if (isUploadingCards || (loading && !isAuthenticated)) {
    const loadingStyles = {
      loadingContainer: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      },
      loadingSpinner: {
        textAlign: 'center',
        color: 'white'
      },
      spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderTop: '4px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
      }
    };

    return (
      <>
        <div style={loadingStyles.loadingContainer}>
          <div style={loadingStyles.loadingSpinner}>
            <div style={loadingStyles.spinner}></div>
            <p>{isUploadingCards ? '명함 OCR 처리 중...' : (loading ? '로그인 확인 중...' : '처리 중...')}</p>
            {isUploadingCards && (
              <div style={{ fontSize: '14px', marginTop: '15px', opacity: 0.9 }}>
                <p style={{ margin: '8px 0' }}>텍스트 인식 및 정보 추출 중입니다</p>
                
                {/* 진행률 바 */}
                <div style={{ 
                  width: '200px', 
                  height: '6px', 
                  backgroundColor: 'rgba(255,255,255,0.3)', 
                  borderRadius: '3px',
                  margin: '10px auto',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min((elapsedTime / estimatedTime) * 100, 100)}%`,
                    height: '100%',
                    backgroundColor: '#4CAF50',
                    borderRadius: '3px',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
                
                <p style={{ margin: '5px 0' }}>
                  경과: {formatTime(elapsedTime)} / 예상: {formatTime(estimatedTime)}
                </p>
                {remainingTime > 0 && (
                  <p style={{ margin: '5px 0', fontSize: '12px' }}>
                    약 {formatTime(remainingTime)} 남음
                  </p>
                )}
                
                {/* 취소 버튼 */}
                <button 
                  onClick={handleCancelOCR}
                  style={{
                    marginTop: '15px',
                    padding: '8px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                >
                  처리 취소
                </button>
              </div>
            )}
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
        {/* OCR 처리 중일 때도 children 렌더링 (백그라운드 작업용) */}
        {isUploadingCards && (
          <div style={{ position: 'absolute', top: '-9999px' }}>
            {children}
          </div>
        )}
      </>
    );
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 인증된 경우 자식 컴포넌트 렌더링
  return children;
};

export default ProtectedRoute; 