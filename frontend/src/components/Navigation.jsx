import React, { useRef, useState } from 'react';
import './Navigation.css';

const Navigation = () => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // API URL을 환경에 따라 동적으로 설정
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      setIsUploading(true);
      
      try {
        // 파일 크기 및 형식 검사
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          // 파일 크기 제한 (10MB)
          if (file.size > 10 * 1024 * 1024) {
            throw new Error(`파일 크기가 너무 큽니다 (최대 10MB): ${file.name}`);
          }
          // 허용된 파일 형식 검사
          const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
          if (!allowedTypes.includes(file.type.toLowerCase())) {
            throw new Error(`지원하지 않는 파일 형식입니다 (${file.type}). 지원되는 형식: JPG, PNG, HEIC, PDF`);
          }
        }

        const formData = new FormData();
        
        // 각 파일 처리
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            // 이미지 파일인 경우에만 리사이징
            if (file.type.startsWith('image/')) {
              console.log(`Processing image: ${file.name}`);
              const processedFile = await processImage(file);
              formData.append('files', processedFile, file.name);
            } else {
              formData.append('files', file);
            }
          } catch (error) {
            console.error(`Error processing image ${file.name}:`, error);
            throw new Error(`이미지 처리 중 오류가 발생했습니다: ${file.name}`);
          }
        }

        console.log('Uploading files...');

        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('Server response:', errorData);
          throw new Error(errorData?.detail || '서버 오류가 발생했습니다. 다시 시도해주세요.');
        }

        const results = await response.json();
        console.log('Upload results:', results);
        
        // 결과 처리
        if (Array.isArray(results)) {
          const hasError = results.some(result => result.error);
          if (hasError) {
            const errorMessages = results
              .filter(result => result.error)
              .map(result => `${result.filename}: ${result.error}`)
              .join('\n');
            alert(`파일 처리 중 오류가 발생했습니다:\n${errorMessages}`);
          } else {
            alert('파일이 성공적으로 업로드되었습니다.');
          }
        } else {
          throw new Error('서버 응답 형식이 올바르지 않습니다.');
        }
        
      } catch (error) {
        console.error('Upload error:', error);
        alert(`파일 업로드 중 오류가 발생했습니다:\n${error.message}`);
      } finally {
        setIsUploading(false);
        event.target.value = ''; // 파일 선택 초기화
      }
    }
  };

  // 이미지 전처리 함수
  const processImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            // 이미지 크기 제한 (4000px)
            const maxSize = 4000;
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              } else {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white'; // 배경을 흰색으로 설정
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // JPEG 품질 0.9로 설정하여 변환
            canvas.toBlob(
              (blob) => {
                resolve(new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                }));
              },
              'image/jpeg',
              0.9
            );
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
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
        accept="image/jpeg,image/png,image/heic,application/pdf"
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
      <button className="nav-item active">
        <img src="/home-icon.svg" alt="홈" className="nav-icon" />
        <span>Home</span>
      </button>
      <button className="nav-item">
        <img src="/profile-icon.svg" alt="마이페이지" className="nav-icon" />
        <span>마이페이지</span>
      </button>
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