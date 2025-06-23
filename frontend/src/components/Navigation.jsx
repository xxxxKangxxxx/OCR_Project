import React, { useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// import { useBusinessCards } from '../utils/useLocalStorage.js'; // 더 이상 사용하지 않음
import { useLoading } from '../contexts/LoadingContext';
import { useAuth } from '../contexts/AuthContext';
import './Navigation.css';
import { API_ENDPOINTS } from '../utils/config';

const Navigation = () => {
  const fileInputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  // const { saveCard, refreshCards } = useBusinessCards(); // 더 이상 사용하지 않음
  const { apiRequest } = useAuth();
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
      
      // JWT 인증이 포함된 API 호출 (각 파일별로 처리)
      let successCount = 0;
      let errorMessages = [];
      let processedFiles = 0;
      const totalFiles = files.length;
      
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        
        try {
          console.log(`🔄 ${file.name} 처리 시작...`);
          
          // 현재 파일 처리 시작 시 진행률 계산
          const baseProgress = Math.floor((fileIndex / totalFiles) * 90);
          const nextProgress = Math.floor(((fileIndex + 1) / totalFiles) * 90);
          const progressRange = nextProgress - baseProgress;
          
          // OCR 처리 중 진행률을 천천히 증가시키는 타이머
          let currentFileProgress = 0;
          const fileProgressTimer = setInterval(() => {
            if (currentFileProgress < progressRange * 0.8) { // 80%까지만 채움
              currentFileProgress += Math.max(1, progressRange * 0.02);
              const totalProgress = baseProgress + Math.floor(currentFileProgress);
              setUploadProgress(Math.min(totalProgress, nextProgress - 2));
            }
          }, 200);
          
          const fileFormData = new FormData();
          fileFormData.append('files', file);
          
          const result = await apiRequest('/api/cards/ocr', {
            method: 'POST',
            body: fileFormData
          });

          // OCR 완료 후 타이머 정리 및 진행률 완료
          clearInterval(fileProgressTimer);
          
          if (result.error) {
            errorMessages.push(`${file.name}: ${result.error}`);
          } else {
            successCount++;
            console.log(`✅ ${file.name} 처리 완료:`, result);
          }
          
          // 현재 파일 처리 완료 - 진행률을 해당 구간의 끝까지 채움
          processedFiles++;
          setUploadProgress(nextProgress);
          
        } catch (error) {
          console.error(`❌ ${file.name} 처리 실패:`, error);
          errorMessages.push(`${file.name}: ${error.message}`);
          processedFiles++;
          const progress = Math.floor(((fileIndex + 1) / totalFiles) * 90);
          setUploadProgress(progress);
        }
      }

      // 모든 파일 처리 완료 후 100%까지 자연스럽게 채우기
      const finalProgress = () => {
        return new Promise((resolve) => {
          let currentProgress = Math.floor((processedFiles / totalFiles) * 90);
          const finalTimer = setInterval(() => {
            if (currentProgress < 100) {
              currentProgress += 2;
              setUploadProgress(Math.min(currentProgress, 100));
            } else {
              clearInterval(finalTimer);
              resolve();
            }
          }, 50);
        });
      };

      // 100% 완료 후 결과 메시지 표시
      await finalProgress();
      
      if (errorMessages.length > 0) {
        showError(errorMessages.join('\n'));
      } else {
        showSuccess(files.length, successCount);
        // MongoDB에 저장되므로 페이지 새로고침으로 최신 데이터 표시
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