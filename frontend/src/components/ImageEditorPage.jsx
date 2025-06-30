import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import LoadingModal from './LoadingModal';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './ImageEditorPage.css';

const ImageEditorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { apiRequest } = useAuth();
  const { 
    setIsUploading, 
    setUploadProgress,
    setStatus,
    showSuccess,
    showError
  } = useLoading();

  // URL state에서 파일 정보 가져오기
  const { files: selectedFiles, currentIndex: initialIndex } = location.state || { files: [], currentIndex: 0 };
  
  const [currentEditingIndex, setCurrentEditingIndex] = useState(initialIndex);
  const [editedFiles, setEditedFiles] = useState(new Array(selectedFiles.length).fill(null));
  
  // 크롭 관련 상태 (react-image-crop 사용)
  const [crop, setCrop] = useState({
    unit: '%',
    x: 10,
    y: 15,
    width: 80,
    height: 70
  });
  const [completedCrop, setCompletedCrop] = useState();
  const imgRef = useRef(null);
  
  // 현재 편집 중인 파일
  const currentFile = selectedFiles[currentEditingIndex];

  // 이미지 URL 상태로 관리
  const [imageUrl, setImageUrl] = useState('');

  // 이미지 URL 생성 및 정리
  useEffect(() => {
    if (!currentFile) {
      setImageUrl('');
      return;
    }
    
    // 이전 URL 정리
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    
    // 새 URL 생성
    const newUrl = URL.createObjectURL(currentFile);
    setImageUrl(newUrl);
    
    // cleanup 함수로 URL 정리
    return () => {
      URL.revokeObjectURL(newUrl);
    };
  }, [currentFile]); // imageUrl을 의존성에서 제거하여 무한 루프 방지

  // 페이지 진입 시 파일이 없으면 홈으로 리다이렉트
  useEffect(() => {
    if (!selectedFiles || selectedFiles.length === 0) {
      navigate('/');
    }
  }, [selectedFiles, navigate]);

  // react-image-crop 이벤트 핸들러들
  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    console.log('🖼️ ReactCrop 이미지 로드됨:', width, 'x', height, '현재 crop:', crop);
    
    // 유효하지 않은 crop 값이 있을 때 초기값으로 설정
    const hasValidCrop = crop && 
      !isNaN(parseFloat(crop.x)) && 
      !isNaN(parseFloat(crop.y)) && 
      !isNaN(parseFloat(crop.width)) && 
      !isNaN(parseFloat(crop.height)) &&
      crop.width > 0 && crop.height > 0;
    
    if (!hasValidCrop) {
      const initialCrop = {
        unit: '%',
        x: 20,
        y: 20,
        width: 60,
        height: 60
      };
      console.log('🔧 유효하지 않은 crop 감지 - 초기 crop 설정:', initialCrop);
      setCrop(initialCrop);
    } else {
      console.log('✅ 기존 crop 유지:', crop);
    }
  }, [crop]);

  const onCropChange = useCallback((newCrop) => {
    // undefined나 NaN 값을 안전하게 처리
    const sanitizedCrop = {
      unit: newCrop.unit || '%',
      x: isNaN(parseFloat(newCrop.x)) ? 20 : parseFloat(newCrop.x),
      y: isNaN(parseFloat(newCrop.y)) ? 20 : parseFloat(newCrop.y),
      width: isNaN(parseFloat(newCrop.width)) ? 60 : parseFloat(newCrop.width),
      height: isNaN(parseFloat(newCrop.height)) ? 60 : parseFloat(newCrop.height)
    };
    console.log('🔄 Crop 변경:', newCrop, '->', sanitizedCrop);
    setCrop(sanitizedCrop);
  }, []);

  const onCropComplete = useCallback((newCrop) => {
    // undefined나 NaN 값을 안전하게 처리
    const sanitizedCrop = {
      unit: newCrop.unit || '%',
      x: isNaN(parseFloat(newCrop.x)) ? 20 : parseFloat(newCrop.x),
      y: isNaN(parseFloat(newCrop.y)) ? 20 : parseFloat(newCrop.y),
      width: isNaN(parseFloat(newCrop.width)) ? 60 : parseFloat(newCrop.width),
      height: isNaN(parseFloat(newCrop.height)) ? 60 : parseFloat(newCrop.height)
    };
    console.log('✅ Crop 완료:', newCrop, '->', sanitizedCrop);
    setCompletedCrop(sanitizedCrop);
  }, []);

  // 크롭 리셋 함수
  const resetCrop = () => {
    setCrop({
      unit: '%',
      x: 10,
      y: 15,
      width: 80,
      height: 70
    });
    setCompletedCrop(null);
    console.log('🔄 크롭 리셋됨');
  };

  // OCR 처리 함수
  const processFiles = async (files) => {
    setIsUploading(true);
    setUploadProgress(0);
    setStatus('loading');

    try {
      console.log('🌐 API 요청 시작');
      
      let successCount = 0;
      let errorMessages = [];
      let processedFiles = 0;
      const totalFiles = files.length;
      
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        
        try {
          console.log(`🔄 ${file.name} 처리 시작...`);
          
          const baseProgress = Math.floor((fileIndex / totalFiles) * 90);
          const nextProgress = Math.floor(((fileIndex + 1) / totalFiles) * 90);
          const progressRange = nextProgress - baseProgress;
          
          let currentFileProgress = 0;
          const fileProgressTimer = setInterval(() => {
            if (currentFileProgress < progressRange * 0.8) {
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

          clearInterval(fileProgressTimer);
          
          if (result.error) {
            errorMessages.push(`${file.name}: ${result.error}`);
          } else {
            successCount++;
            console.log(`✅ ${file.name} 처리 완료:`, result);
          }
          
          processedFiles++;
          setUploadProgress(nextProgress);
          
        } catch (error) {
          console.error(`❌ ${file.name} 처리 실패:`, error);
          // 인증 오류가 아닌 경우에만 에러 메시지 추가
          if (error.response?.status !== 401) {
            errorMessages.push(`${file.name}: ${error.message || '처리 중 오류가 발생했습니다'}`);
          }
          processedFiles++;
          const progress = Math.floor(((fileIndex + 1) / totalFiles) * 90);
          setUploadProgress(progress);
        }
      }

      // 100% 완료
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

      await finalProgress();
      
      if (errorMessages.length > 0) {
        showError(errorMessages.join('\n'));
        // 오류 발생 시 Home 페이지로 이동
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        showSuccess(files.length, successCount);
      }
    } catch (error) {
      console.error('❌ API 요청 실패:', error);
      showError('명함 처리 중 오류가 발생했습니다.');
      // 오류 발생 시 Home 페이지로 이동
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  };

  // 저장 함수 (react-image-crop 방식)
  const handleSave = () => {
    if (completedCrop && imgRef.current) {
      // react-image-crop 방식으로 크롭된 이미지 생성
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const image = imgRef.current;
      
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      
      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;
      
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
      
      canvas.toBlob((blob) => {
        const file = new File([blob], currentFile.name, { type: currentFile.type });
        handleImageEditSave(file);
      }, currentFile.type);
    }
  };

  const handleImageEditSave = (editedFile) => {
    const newEditedFiles = [...editedFiles];
    newEditedFiles[currentEditingIndex] = editedFile;
    setEditedFiles(newEditedFiles);

    // 다음 이미지로 이동하거나 편집 완료
    if (currentEditingIndex < selectedFiles.length - 1) {
      setCurrentEditingIndex(currentEditingIndex + 1);
    } else {
      // 모든 이미지 편집 완료, OCR 처리 시작
      const filesToProcess = newEditedFiles.map((editedFile, index) => 
        editedFile || selectedFiles[index]
      );
      processFiles(filesToProcess);
      navigate('/');
    }
  };

  const handleSkipEdit = () => {
    // 현재 이미지 편집 건너뛰기
    const newEditedFiles = [...editedFiles];
    newEditedFiles[currentEditingIndex] = selectedFiles[currentEditingIndex];
    setEditedFiles(newEditedFiles);

    if (currentEditingIndex < selectedFiles.length - 1) {
      setCurrentEditingIndex(currentEditingIndex + 1);
    } else {
      // 모든 이미지 처리 완료
      const filesToProcess = newEditedFiles.map((editedFile, index) => 
        editedFile || selectedFiles[index]
      );
      processFiles(filesToProcess);
      navigate('/');
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (!currentFile) {
    return (
      <div className="image-editor-page">
        <div className="image-editor-header">
          <div className="header-left">
            <button className="back-btn" onClick={() => navigate('/')}>
              ← 뒤로
            </button>
            <h1>이미지 편집</h1>
          </div>
        </div>
        <div className="image-editor-content">
          <div className="image-container">
            <div className="loading-placeholder">
              파일을 불러오는 중...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="image-editor-page">
        <div className="image-editor-header">
          <div className="header-left">
            <button className="back-btn" onClick={handleCancel}>
              ← 뒤로
            </button>
            <h1>이미지 편집</h1>
          </div>
          <div className="header-right">
            <span className="progress-indicator">
              {currentEditingIndex + 1} / {selectedFiles.length}
            </span>
          </div>
        </div>
      
        <div className="image-editor-content">
          <div className="image-container">
            {imageUrl ? (
              <ReactCrop
                crop={{
                  unit: crop?.unit || '%',
                  x: isNaN(parseFloat(crop?.x)) ? 20 : parseFloat(crop.x),
                  y: isNaN(parseFloat(crop?.y)) ? 20 : parseFloat(crop.y),
                  width: isNaN(parseFloat(crop?.width)) ? 60 : parseFloat(crop.width),
                  height: isNaN(parseFloat(crop?.height)) ? 60 : parseFloat(crop.height)
                }}
                onChange={onCropChange}
                onComplete={onCropComplete}
                aspect={undefined}
              >
                <img
                  ref={imgRef}
                  src={imageUrl}
                  onLoad={onImageLoad}
                  onError={(e) => {
                    console.error('❌ 이미지 로드 오류:', e);
                    console.log('🔍 시도한 URL:', imageUrl);
                  }}
                  style={{ 
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                  alt="편집할 이미지"
                />
              </ReactCrop>
            ) : (
              <div className="loading-placeholder">
                이미지를 로드하는 중...
              </div>
            )}
          </div>
        
          <div className="controls-panel">
              <div className="crop-content">
                <div className="crop-instruction">
                  박스 모서리를 드래그하여 크기를 조정하거나<br/>
                  박스 내부를 드래그하여 위치를 이동하세요
                </div>
                <div className="crop-actions">
                  <button className="crop-reset-btn" onClick={resetCrop}>
                    크롭 초기화
                  </button>
                </div>
            </div>
          </div>
        </div>
      
        <div className="image-editor-footer">
          <button className="skip-btn" onClick={handleSkipEdit}>
            편집 건너뛰기
          </button>
          <button className="save-btn" onClick={handleSave}>
            {currentEditingIndex < selectedFiles.length - 1 ? '다음' : '완료'}
          </button>
        </div>
      </div>
      <LoadingModal />
    </>
  );
};

export default ImageEditorPage; 