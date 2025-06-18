import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const location = useLocation();
  
  // API URL을 환경에 따라 동적으로 설정
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    console.log('📁 파일 선택됨:', files);
    
    if (files.length > 0) {
      // 모바일 디버깅용 - 선택된 파일 정보 표시
      const fileInfo = Array.from(files).map((file, i) => 
        `파일 ${i + 1}: ${file.name}\n크기: ${(file.size / 1024 / 1024).toFixed(2)}MB\n타입: ${file.type}`
      ).join('\n\n');
      
      if (confirm(`선택된 파일:\n\n${fileInfo}\n\n계속 진행하시겠습니까?`)) {
        setIsUploading(true);
        
        try {
          // 네트워크 연결 테스트
          console.log('🌐 네트워크 연결 테스트 시작...');
          alert(`네트워크 연결 테스트 시작...\nAPI URL: ${API_URL}`);
          
          try {
            const testResponse = await fetch(`${API_URL}/docs`, {
              method: 'GET',
              mode: 'cors',
            });
            console.log('✅ 네트워크 연결 테스트 성공:', testResponse.status);
            alert(`네트워크 연결 테스트 성공!\n상태: ${testResponse.status}`);
          } catch (networkError) {
            console.error('❌ 네트워크 연결 실패:', networkError);
            alert(`네트워크 연결 실패!\n\n오류: ${networkError.message}\n\n서버가 실행 중인지 확인해주세요.`);
            throw new Error(`네트워크 연결 실패: ${networkError.message}`);
          }

          // 선택된 파일들에 대한 상세 정보 로그
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(`📄 파일 ${i + 1}:`, {
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified
            });
          }

          // 파일 크기 및 형식 검사
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            // 파일 크기 제한 (10MB)
            if (file.size > 10 * 1024 * 1024) {
              throw new Error(`파일 크기가 너무 큽니다 (최대 10MB): ${file.name}`);
            }
            // 허용된 파일 형식 검사
            const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];
            if (!allowedTypes.includes(file.type.toLowerCase())) {
              console.error('❌ 지원하지 않는 파일 형식:', file.type);
              alert(`지원하지 않는 파일 형식입니다.\n\n파일: ${file.name}\n타입: ${file.type}\n\n지원되는 형식: JPG, PNG, HEIC, HEIF, PDF`);
              throw new Error(`지원하지 않는 파일 형식입니다 (${file.type}). 지원되는 형식: JPG, PNG, HEIC, HEIF, PDF`);
            }
          }

          const formData = new FormData();
          
          // 각 파일 처리
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
              console.log(`🔄 파일 처리 중: ${file.name}`);
              
              // 이미지 파일인 경우에만 리사이징
              if (file.type.startsWith('image/')) {
                console.log(`🖼️ 이미지 처리 시작: ${file.name}`);
                alert(`이미지 처리 시작: ${file.name}`);
                
                const processedFile = await processImage(file);
                console.log(`✅ 이미지 처리 완료: ${file.name}`, {
                  originalSize: file.size,
                  processedSize: processedFile.size
                });
                alert(`이미지 처리 완료: ${file.name}\n원본 크기: ${(file.size / 1024 / 1024).toFixed(2)}MB\n처리 후: ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
                
                formData.append('files', processedFile, file.name);
              } else {
                console.log(`📄 PDF 파일 추가: ${file.name}`);
                formData.append('files', file);
              }
            } catch (error) {
              console.error(`❌ 파일 처리 중 오류 (${file.name}):`, error);
              console.error('오류 상세:', {
                message: error.message,
                stack: error.stack,
                name: error.name
              });
              
              // 모바일용 상세 에러 정보
              alert(`파일 처리 중 오류 발생!\n\n파일: ${file.name}\n오류: ${error.message}\n\n오류 타입: ${error.name}`);
              throw new Error(`이미지 처리 중 오류가 발생했습니다: ${file.name} - ${error.message}`);
            }
          }

          console.log('📤 서버로 업로드 시작...');
          console.log('🌐 API URL:', API_URL);
          alert(`서버로 업로드 시작...\nAPI URL: ${API_URL}`);

          const response = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Accept': 'application/json',
            },
            body: formData,
          });

          console.log('📥 서버 응답 받음:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('❌ 서버 오류 응답:', errorData);
            alert(`서버 오류 발생!\n\n상태: ${response.status} ${response.statusText}\n오류 내용: ${errorData?.detail || '알 수 없는 오류'}`);
            throw new Error(errorData?.detail || `서버 오류 (${response.status}): ${response.statusText}`);
          }

          const results = await response.json();
          console.log('✅ 업로드 결과:', results);
          
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
          console.error('❌ 전체 업로드 프로세스 오류:', error);
          console.error('오류 상세 정보:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            cause: error.cause
          });
          
          // 더 구체적인 에러 메시지 제공
          let userMessage = '파일 업로드 중 오류가 발생했습니다.';
          if (error.message.includes('Load failed')) {
            userMessage += '\n\n가능한 원인:\n- 네트워크 연결 문제\n- 파일이 손상되었거나 지원되지 않는 형식\n- 서버 연결 실패';
          } else if (error.message.includes('Failed to fetch')) {
            userMessage += '\n\n네트워크 오류: 서버에 연결할 수 없습니다.';
          } else {
            userMessage += `\n\n오류 내용: ${error.message}`;
          }
          
          alert(userMessage);
        } finally {
          setIsUploading(false);
          event.target.value = ''; // 파일 선택 초기화
        }
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