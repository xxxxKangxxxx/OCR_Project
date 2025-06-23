import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [originalImageData, setOriginalImageData] = useState(null);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(initialIndex);
  const [editedFiles, setEditedFiles] = useState(new Array(selectedFiles.length).fill(null));
  
  // 이미지 조정 값들
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [exposure, setExposure] = useState(100);
  
  // 크롭 관련 상태 (react-image-crop 사용)
  const [cropMode, setCropMode] = useState(false);
  const [crop, setCrop] = useState({
    unit: '%',
    x: 10,
    y: 15,
    width: 80,
    height: 70
  });
  const [completedCrop, setCompletedCrop] = useState();
  const imgRef = useRef(null);
  
  // 컨트롤 상태
  const [activeTab, setActiveTab] = useState('adjust'); // 'adjust' 또는 'crop'
  const [activeControl, setActiveControl] = useState('brightness');
  const [marksOffset, setMarksOffset] = useState(0);
  
  // 슬라이더 드래그 상태 (통합)
  const [isSliderDragging, setIsSliderDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(100);

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

  // 이미지 로드
  useEffect(() => {
    if (currentFile) {
      // 필터 값 초기화
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setExposure(100);
      setCropMode(false);
      setActiveTab('adjust');
      
      // 기본 크롭 값 설정 (명함에 적합한 크기)
      setCrop({
        unit: '%',
        x: 10,
        y: 15,
        width: 80,
        height: 70
      });
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          setImageLoaded(true);
          initializeCanvas(img);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(currentFile);
    }
  }, [currentFile]);

  const initializeCanvas = (img) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // 캔버스 크기를 이미지에 맞게 조정 (최대 크기 설정)
    const maxWidth = Math.min(800, window.innerWidth - 40);
    const maxHeight = Math.min(600, window.innerHeight - 200);
    let { width, height } = img;
    
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    console.log('🎨 캔버스 초기화:', { width, height });
    
    // 원본 이미지 데이터 저장
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    setOriginalImageData(imageData);
    
    // 초기 크롭 영역 설정 (명함에 적합한 크기로)
    const cropWidth = Math.min(width * 0.8, 400); // 최대 400px로 제한
    const cropHeight = Math.min(height * 0.7, 280); // 최대 280px로 제한 (명함 비율 고려)
    const cropX = (width - cropWidth) / 2;
    const cropY = (height - cropHeight) / 2;
    
    console.log('🔧 초기 크롭 영역 설정:', { 
      x: cropX, y: cropY, width: cropWidth, height: cropHeight,
      canvasSize: { width, height }
    });
    
    // 픽셀 단위로 설정하되 이미지 경계를 벗어나지 않도록 조정
    setCrop({ 
      unit: 'px',
      x: Math.max(0, cropX), 
      y: Math.max(0, cropY), 
      width: Math.min(cropWidth, width), 
      height: Math.min(cropHeight, height) 
    });
    
    // 조절 모드에서 즉시 이미지가 보이도록 필터 적용
    if (!cropMode) {
      console.log('🎨 초기 필터 적용');
      // 다음 프레임에서 필터 적용 (상태 업데이트 후)
      setTimeout(() => {
        if (canvasRef.current && !cropMode) {
          applyFilters();
        }
      }, 0);
    }
  };

  // 이미지 필터 적용
  const applyFilters = useCallback(() => {
    if (!originalImageData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.createImageData(originalImageData);
    const data = imageData.data;
    const originalData = originalImageData.data;
    
    // 밝기, 대비, 채도, 노출 조정
    const brightnessValue = (brightness - 100) * 2.55;
    const contrastValue = contrast / 100;
    const saturationValue = saturation / 100;
    const exposureValue = exposure / 100;
    
    for (let i = 0; i < data.length; i += 4) {
      let r = originalData[i];
      let g = originalData[i + 1];
      let b = originalData[i + 2];
      
      // 밝기 조정
      r += brightnessValue;
      g += brightnessValue;
      b += brightnessValue;
      
      // 대비 조정
      r = ((r - 128) * contrastValue) + 128;
      g = ((g - 128) * contrastValue) + 128;
      b = ((b - 128) * contrastValue) + 128;
      
      // 채도 조정
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * saturationValue;
      g = gray + (g - gray) * saturationValue;
      b = gray + (b - gray) * saturationValue;
      
      // 노출 조정
      r = r * exposureValue;
      g = g * exposureValue;
      b = b * exposureValue;
      
      // 값 범위 제한
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
      data[i + 3] = originalData[i + 3]; // 알파값 유지
    }
    
    ctx.putImageData(imageData, 0, 0);
  }, [brightness, contrast, saturation, exposure, originalImageData]);

  // 조절 모드에서만 캔버스 업데이트
  useEffect(() => {
    if (!cropMode && originalImageData && canvasRef.current) {
      console.log('🎨 조절 모드 - 필터 적용 중...');
      applyFilters();
    }
  }, [brightness, contrast, saturation, exposure, cropMode, originalImageData, applyFilters]);

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

  // 슬라이더 드래그 시스템 (슬라이더 드래그 중에만 활성화)
  useEffect(() => {
    if (!isSliderDragging) return;

    const handleGlobalMouseMove = (e) => {
      console.log('🔥🔥🔥 슬라이더 드래그 중! X:', e.clientX, '시작X:', dragStartX);
      
      const deltaX = e.clientX - dragStartX;
      const sensitivity = 1;
      const newValue = Math.max(0, Math.min(200, dragStartValue + deltaX * sensitivity));
      
      console.log('📊 값 변경:', dragStartValue, '->', newValue, '(deltaX:', deltaX, ')');
      
      switch (activeControl) {
        case 'brightness': setBrightness(newValue); break;
        case 'contrast': setContrast(newValue); break;
        case 'saturation': setSaturation(newValue); break;
        case 'exposure': setExposure(newValue); break;
      }
      
      // 기본 이벤트는 차단하지 않음 (스크롤 허용)
    };
    
    const handleGlobalMouseUp = (e) => {
      console.log('🛑 슬라이더 드래그 종료');
      setIsSliderDragging(false);
      // 기본 이벤트는 차단하지 않음
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    document.addEventListener('mouseup', handleGlobalMouseUp, { passive: true });
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSliderDragging, dragStartX, dragStartValue, activeControl]);

  // 슬라이더 드래그 시작 함수
  const handleSliderMouseDown = (e) => {
    console.log('🚀 슬라이더 드래그 시작!');
    console.log('📍 시작 위치:', e.clientX, e.clientY);
    
    setIsSliderDragging(true);
    setDragStartX(e.clientX);
    setDragStartValue(getCurrentControlValue());
    
    console.log('✅ 드래그 상태 설정 완료 - 이제 마우스를 움직여보세요!');
    
    // 슬라이더 드래그에만 기본 이벤트 차단
    e.preventDefault();
    e.stopPropagation();
  };

  // 리셋 함수
  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setExposure(100);
  };

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

  // 탭 변경 핸들러
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'crop') {
      setCropMode(true);
      // 크롭 모드로 전환할 때 항상 기본 크롭 박스 표시
      const hasValidCrop = crop && 
        !isNaN(parseFloat(crop.x)) && 
        !isNaN(parseFloat(crop.y)) && 
        !isNaN(parseFloat(crop.width)) && 
        !isNaN(parseFloat(crop.height)) &&
        crop.width > 0 && crop.height > 0;
      
      if (!hasValidCrop) {
        const defaultCrop = {
          unit: '%',
          x: 10,
          y: 15,
          width: 80,
          height: 70
        };
        setCrop(defaultCrop);
        console.log('🔧 크롭 모드 전환 - 기본 크롭 영역 설정:', defaultCrop);
      } else {
        console.log('🔧 크롭 모드 전환 - 기존 크롭 유지:', crop);
      }
    } else {
      setCropMode(false);
      // 조절 모드로 전환할 때 원본 이미지를 다시 캔버스에 그리고 필터 적용
      setTimeout(() => {
        if (canvasRef.current && imageRef.current && originalImageData) {
          console.log('🎨 조절 모드로 전환 - 원본 이미지 복원 및 필터 적용');
          
          // 캔버스를 원본 이미지로 다시 초기화
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          const img = imageRef.current;
          
          // 캔버스 크기 재설정
          const maxWidth = Math.min(800, window.innerWidth - 40);
          const maxHeight = Math.min(600, window.innerHeight - 200);
          let { width, height } = img;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // 원본 이미지를 캔버스에 다시 그리기
          ctx.drawImage(img, 0, 0, width, height);
          
          // 원본 이미지 데이터 업데이트
          const imageData = ctx.getImageData(0, 0, width, height);
          setOriginalImageData(imageData);
          
          // 필터 적용
          applyFilters();
        }
      }, 0);
    }
  };

  // 컨트롤 아이콘 클릭 핸들러
  const handleControlClick = (controlType) => {
    setActiveControl(controlType);
  };

  // 현재 활성화된 컨트롤의 값과 setter 가져오기
  const getCurrentControlValue = () => {
    switch (activeControl) {
      case 'brightness': return brightness;
      case 'contrast': return contrast;
      case 'saturation': return saturation;
      case 'exposure': return exposure;
      default: return 100;
    }
  };

  const setCurrentControlValue = (value) => {
    switch (activeControl) {
      case 'brightness': setBrightness(value); break;
      case 'contrast': setContrast(value); break;
      case 'saturation': setSaturation(value); break;
      case 'exposure': setExposure(value); break;
    }
  };

  // 값을 눈금 오프셋으로 변환 (0-200 -> -100px ~ +100px)
  const valueToOffset = (value) => {
    // 값 100이 중앙(0px), 0이 +100px, 200이 -100px
    return (100 - value) * 1;
  };

  // 오프셋을 값으로 변환
  const offsetToValue = (offset) => {
    return Math.round(100 - offset);
  };

  // 값이 변경될 때마다 눈금 오프셋 업데이트
  useEffect(() => {
    const currentValue = getCurrentControlValue();
    const offset = valueToOffset(currentValue);
    console.log('🔄 값 변경 감지! 컨트롤:', activeControl, '값:', currentValue, '오프셋:', offset);
    setMarksOffset(offset);
  }, [brightness, contrast, saturation, exposure, activeControl]);

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
          errorMessages.push(`${file.name}: ${error.message}`);
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
      } else {
        showSuccess(files.length, successCount);
      }
    } catch (error) {
      console.error('❌ API 요청 실패:', error);
      showError('명함 처리 중 오류가 발생했습니다.');
    }
  };

  // 저장 함수 (react-image-crop 방식)
  const handleSave = () => {
    if (cropMode && completedCrop && imgRef.current) {
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
    } else {
      // 조절 모드 - 캔버스에서 이미지 저장
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.toBlob((blob) => {
          const file = new File([blob], currentFile.name, { type: currentFile.type });
          handleImageEditSave(file);
        }, currentFile.type);
      }
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
    return <div>Loading...</div>;
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
          {cropMode && imageUrl ? (
            <div style={{ 
              width: '100%', 
              height: '600px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden'
            }}>
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
                aspect={undefined} // 자유 비율
                style={{ 
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
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
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) brightness(${exposure}%)`,
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                  alt="편집할 이미지"
                />
              </ReactCrop>
            </div>
          ) : (
            <div style={{ 
              width: '100%', 
              height: '600px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f5f5f5'
            }}>
              <canvas
                ref={canvasRef}
                className="edit-canvas"
                style={{ 
                  touchAction: 'none',
                  userSelect: 'none',
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
              />
            </div>
          )}
        </div>
        
        <div className="controls-panel">
          <div className="control-group">
            {/* 메인 탭 */}
            <div className="main-tabs">
              <div 
                className={`main-tab ${activeTab === 'adjust' ? 'active' : ''}`}
                onClick={() => handleTabChange('adjust')}
              >
                조절
              </div>
              <div 
                className={`main-tab ${activeTab === 'crop' ? 'active' : ''}`}
                onClick={() => handleTabChange('crop')}
              >
                자르기
              </div>
            </div>
            
            {/* 조절 탭 내용 */}
            {activeTab === 'adjust' && (
              <div className="adjust-content">
                {/* 조절 아이콘들 */}
                <div className="adjust-icons">
                  <div 
                    className={`adjust-icon brightness-icon ${activeControl === 'brightness' ? 'active' : ''}`}
                    onClick={() => handleControlClick('brightness')}
                    title="밝기"
                  ></div>
                  <div 
                    className={`adjust-icon contrast-icon ${activeControl === 'contrast' ? 'active' : ''}`}
                    onClick={() => handleControlClick('contrast')}
                    title="대비"
                  ></div>
                  <div 
                    className={`adjust-icon saturation-icon ${activeControl === 'saturation' ? 'active' : ''}`}
                    onClick={() => handleControlClick('saturation')}
                    title="채도"
                  ></div>
                  <div 
                    className={`adjust-icon exposure-icon ${activeControl === 'exposure' ? 'active' : ''}`}
                    onClick={() => handleControlClick('exposure')}
                    title="노출"
                  ></div>
                </div>
                
                {/* 수평 슬라이더 컨테이너 */}
                <div className="slider-container">
                  <div 
                    className="horizontal-dial-container"
                    onMouseDown={(e) => {
                      console.log('🖱️ 슬라이더 마우스 다운!');
                      handleSliderMouseDown(e);
                    }}
                    style={{ 
                      cursor: 'grab',
                      userSelect: 'none',
                      touchAction: 'none'
                    }}
                  >
                    <div 
                      className="horizontal-marks"
                      style={{
                        transform: `translateX(calc(-50% + ${marksOffset}px))`,
                        pointerEvents: 'none'
                      }}
                    >
                      {Array.from({ length: 41 }, (_, i) => (
                        <div
                          key={i}
                          className={`horizontal-mark ${i === 20 ? 'major' : ''}`}
                          style={{ pointerEvents: 'none' }}
                        />
                      ))}
                    </div>
                    <div className="horizontal-track" style={{ pointerEvents: 'none' }} />
                    <div className="horizontal-indicator" style={{ pointerEvents: 'none' }} />
                  </div>
                  <div className="value-display">{getCurrentControlValue()}</div>
                </div>
                
                {/* 초기화 버튼 */}
                <button className="crop-reset-btn" onClick={resetFilters}>
                  초기화
                </button>
              </div>
            )}
            
            {/* 크롭 탭 내용 */}
            {activeTab === 'crop' && (
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
            )}
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