import React, { useRef, useEffect } from 'react';
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

  // 업로드 완료 후 처리를 위한 useEffect
  useEffect(() => {
    if (uploadProgress === 100) {
      const timer = setTimeout(() => {
        if (location.pathname !== '/') {
          navigate('/');
        }
        window.location.reload();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadProgress, location.pathname, navigate]);

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
        if (currentProgress <= 100) {
          const remainingProgress = 100 - currentProgress;
          const increment = Math.max(0.5, remainingProgress * 0.01);
          currentProgress += increment;
          setUploadProgress(currentProgress);
        } else {
          clearInterval(progressTimer);
        }
      }, 50);

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
                  company_name: null
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

          // 프로그레스바를 100%로 설정하고 성공 상태로 변경
          setUploadProgress(100);
          showSuccess(results.length, savedCount);
          refreshCards();
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