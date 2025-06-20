import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useBusinessCards } from '../utils/useLocalStorage.js';
import './Navigation.css';
import { parseOCRText } from '../utils/ocrParser';
import { API_ENDPOINTS } from '../utils/config';

const Navigation = () => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { saveCard, refreshCards } = useBusinessCards();
  
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
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      console.log('🌐 API 요청 시작');
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

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
          alert(`파일 처리 중 오류가 발생했습니다:\n${errorMessages}`);
        } else {
          // 성공한 결과들을 로컬스토리지에 저장
          let savedCount = 0;
          results.forEach(result => {
            if (result.parsed && !result.error) {
              try {
                const cardData = {
                  ...result.parsed,
                  original_filename: result.filename,
                  company: null  // company 객체 제거
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
          
          // 성공 메시지 표시
          const message = `🎉 명함 처리 완료!\n\n처리된 파일: ${results.length}개\n저장된 명함: ${savedCount}개`;
          alert(message);
          
          // 저장된 명함이 있으면 자동으로 홈으로 이동
          if (savedCount > 0 && location.pathname !== '/') {
            navigate('/');
          }
          
          // 명함 목록 새로고침
          refreshCards();
        }
      }
    } catch (error) {
      console.error('❌ API 요청 실패:', error);
      alert('명함 처리 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 이미지 전처리 함수
  const processImage = (file) => {
    return new Promise((resolve, reject) => {
      console.log(`🔄 processImage 시작: ${file.name}`);
      alert(`🔄 processImage 시작\n파일: ${file.name}\n크기: ${(file.size / 1024 / 1024).toFixed(2)}MB\n타입: ${file.type}`);
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        console.log(`📖 FileReader 로드 완료: ${file.name}`);
        alert(`📖 FileReader 로드 완료\n파일: ${file.name}\nData URL 길이: ${e.target.result.length}`);
        
        const img = new Image();
        
        img.onload = () => {
          console.log(`🖼️ 이미지 로드 완료: ${file.name}`, {
            width: img.width,
            height: img.height
          });
          alert(`🖼️ 이미지 로드 완료\n파일: ${file.name}\n크기: ${img.width}x${img.height}`);
          
          try {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            // 이미지 크기 제한 (4000px)
            const maxSize = 4000;
            if (width > maxSize || height > maxSize) {
              console.log(`📏 이미지 리사이징 필요: ${width}x${height} -> `, end='');
              if (width > height) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              } else {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
              console.log(`${width}x${height}`);
              alert(`📏 이미지 리사이징\n원본: ${img.width}x${img.height}\n변경: ${width}x${height}`);
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              alert(`❌ Canvas context 생성 실패: ${file.name}`);
              reject(new Error('Canvas context를 생성할 수 없습니다.'));
              return;
            }
            
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            console.log(`🎨 캔버스 처리 완료: ${file.name}`);
            alert(`🎨 캔버스 처리 완료: ${file.name}`);

            // JPEG 품질 0.9로 설정하여 변환
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  console.log(`✅ Blob 생성 완료: ${file.name}`, {
                    size: blob.size,
                    type: blob.type
                  });
                  alert(`✅ Blob 생성 완료\n파일: ${file.name}\n크기: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
                  resolve(new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  }));
                } else {
                  console.error(`❌ Blob 생성 실패: ${file.name}`);
                  alert(`❌ Blob 생성 실패: ${file.name}\n\ntoBlob() 메서드가 null을 반환했습니다.`);
                  reject(new Error('이미지 변환 중 Blob 생성에 실패했습니다.'));
                }
              },
              'image/jpeg',
              0.9
            );
          } catch (error) {
            console.error(`❌ 캔버스 처리 오류: ${file.name}`, error);
            alert(`❌ 캔버스 처리 오류\n파일: ${file.name}\n오류: ${error.message}\n스택: ${error.stack}`);
            reject(error);
          }
        };
        
        img.onerror = (error) => {
          console.error(`❌ 이미지 로드 실패: ${file.name}`, error);
          alert(`❌ 이미지 로드 실패 (여기서 Load failed 발생!)\n\n파일: ${file.name}\n오류 타입: ${error.type || 'unknown'}\n오류 메시지: ${error.message || 'Load failed'}\n\n가능한 원인:\n- 파일이 손상됨\n- 지원되지 않는 이미지 형식\n- 메모리 부족`);
          reject(new Error(`이미지 로드 실패: ${file.name} - ${error.type || 'Load failed'}`));
        };
        
        // 이미지 로드 시작
        alert(`🔄 이미지 로드 시작: ${file.name}`);
        img.src = e.target.result;
      };
      
      reader.onerror = (error) => {
        console.error(`❌ FileReader 오류: ${file.name}`, error);
        alert(`❌ FileReader 오류 (여기서 Load failed 발생 가능!)\n\n파일: ${file.name}\n오류: ${error.message || 'FileReader Load failed'}\n\n가능한 원인:\n- 파일을 읽을 수 없음\n- 파일이 손상됨\n- 권한 문제`);
        reject(new Error(`파일 읽기 실패: ${file.name} - ${error.message || 'Load failed'}`));
      };
      
      // 파일 읽기 시작
      alert(`🔄 파일 읽기 시작: ${file.name}`);
      reader.readAsDataURL(file);
    });
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
        <span>{isUploading ? '업로드 중...' : '명함 등록'}</span>
      </button>
      
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <img src="/home-icon.svg" alt="홈" className="nav-icon" />
        <span>Home</span>
      </Link>
      
      <Link to="/mypage" className={`nav-item ${location.pathname === '/mypage' ? 'active' : ''}`}>
        <img src="/profile-icon.svg" alt="마이페이지" className="nav-icon" />
        <span>마이페이지</span>
      </Link>
      
      <style>{`
        .nav-item.uploading {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </nav>
  );
};

export default Navigation; 