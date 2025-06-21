import React, { useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useBusinessCards } from '../utils/useLocalStorage.js';
import { useLoading } from '../contexts/LoadingContext';
import './Navigation.css';
import { API_ENDPOINTS } from '../utils/config';

const Navigation = () => {
  const fileInputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { saveCard, refreshCards } = useBusinessCards();
  const { 
    isUploading, 
    setIsUploading, 
    uploadProgress, 
    setUploadProgress,
    setStatus,
    showSuccess,
    showError
  } = useLoading();
  
  // API URL을 환경에 따라 동적으로 설정 (네트워크 테스트용)
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    console.log('📁 파일 선택됨:', files);
    
    if (!files || files.length === 0) {
      console.log('❌ 파일이 선택되지 않음');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setStatus('loading');
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      console.log('🌐 API 요청 시작');
      
      // 진행 상태를 더 부드럽게 시뮬레이션
      let currentProgress = 0;
      const progressTimer = setInterval(() => {
        if (currentProgress < 95) {
          // 남은 진행률에 따라 증가 속도를 동적으로 조절
          const remainingProgress = 95 - currentProgress;
          const increment = Math.max(0.5, remainingProgress * 0.01); // 최소 0.5%, 최대 남은 진행률의 1%
          currentProgress += increment;
          setUploadProgress(currentProgress);
        } else {
          clearInterval(progressTimer);
        }
      }, 50); // 50ms마다 업데이트하여 더 부드럽게 표시

      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      clearInterval(progressTimer);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      console.log('📥 API 응답 받음:', results);

      if (Array.isArray(results)) {
        const hasError = results.some(result => result.error);
        if (hasError) {
          const errorMessages = results
            .filter(result => result.error)
            .map(result => `${result.filename}: ${result.error}`)
            .join('\n');
          showError(errorMessages);
        } else {
          // 성공한 결과들을 로컬스토리지에 저장
          let savedCount = 0;
          results.forEach(result => {
            if (result.parsed && !result.error) {
              try {
                const cardData = {
                  ...result.parsed,
                  original_filename: result.filename,
                  company_name: null  // company 객체 제거
                };
                
                console.log('Saving card data:', cardData);
                const success = saveCard(cardData);
                if (success) {
                  savedCount++;
                }
              } catch (error) {
                console.error('명함 데이터 저장 오류:', error);
              }
            }
          });

          // 90%에서 100%까지 부드럽게 증가
          const finalProgressTimer = setInterval(() => {
            setUploadProgress(prev => {
              if (prev >= 100) {
                clearInterval(finalProgressTimer);
                // 프로그레스바가 100%에 도달한 후 성공 상태로 변경
                showSuccess(results.length, savedCount);
                
                // 저장된 명함이 있으면 자동으로 홈으로 이동하고 새로고침
                if (savedCount > 0) {
                  if (location.pathname !== '/') {
                    navigate('/');
                  }
                  setTimeout(() => {
                    window.location.reload(); // 페이지 새로고침
                  }, 3000);
                }
                
                // 명함 목록 새로고침
                refreshCards();
                return 100;
              }
              return prev + 0.5; // 0.5%씩 증가
            });
          }, 30);
        }
      }
    } catch (error) {
      console.error('❌ API 요청 실패:', error);
      showError('명함 처리 중 오류가 발생했습니다.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    if (!isUploading) {
      fileInputRef.current.click();
    }
  };

  return (
    <nav className="navigation">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        accept="image/jpeg,image/png,image/heic,image/heif,application/pdf"
        multiple
      />
      <button 
        className={`nav-item ${isUploading ? 'uploading' : ''}`} 
        onClick={handleUploadClick}
        disabled={isUploading}
      >
        <img src="/scan-icon.svg" alt="명함 등록" className="nav-icon" />
        <span>명함 등록</span>
      </button>
      
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <img src="/home-icon.svg" alt="홈" className="nav-icon" />
        <span>Home</span>
      </Link>
      
      <Link to="/mypage" className={`nav-item ${location.pathname === '/mypage' ? 'active' : ''}`}>
        <img src="/profile-icon.svg" alt="마이페이지" className="nav-icon" />
        <span>마이페이지</span>
      </Link>
    </nav>
  );
};

export default Navigation; 