import React, { useState, useRef, useCallback, useEffect } from 'react';
import './ImageEditor.css';

const ImageEditor = ({ imageFile, onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [originalImageData, setOriginalImageData] = useState(null);
  
  // 이미지 조정 값들
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  
  // 크롭 관련 상태
  const [cropMode, setCropMode] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 이미지 로드
  useEffect(() => {
    if (imageFile) {
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
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  const initializeCanvas = (img) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 캔버스 크기를 이미지에 맞게 조정 (최대 800px)
    const maxWidth = 800;
    const maxHeight = 600;
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
    
    // 원본 이미지 데이터 저장
    ctx.drawImage(img, 0, 0, width, height);
    setOriginalImageData(ctx.getImageData(0, 0, width, height));
    
    // 초기 크롭 영역 설정
    setCropArea({ x: 0, y: 0, width, height });
  };

  // 이미지 필터 적용
  const applyFilters = useCallback(() => {
    if (!originalImageData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(originalImageData);
    const data = imageData.data;
    const originalData = originalImageData.data;
    
    // 밝기, 대비, 채도 조정
    const brightnessValue = (brightness - 100) * 2.55;
    const contrastValue = contrast / 100;
    const saturationValue = saturation / 100;
    
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
      
      // 값 범위 제한
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
      data[i + 3] = originalData[i + 3]; // 알파값 유지
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // 크롭 모드일 때 크롭 영역 표시
    if (cropMode) {
      drawCropOverlay();
    }
  }, [brightness, contrast, saturation, originalImageData, cropMode]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // 크롭 오버레이 그리기
  const drawCropOverlay = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 반투명 오버레이
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 크롭 영역 지우기 (투명하게)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    ctx.globalCompositeOperation = 'source-over';
    
    // 크롭 영역 테두리
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    
    // 코너 핸들
    const handleSize = 8;
    ctx.fillStyle = '#007bff';
    const corners = [
      { x: cropArea.x - handleSize/2, y: cropArea.y - handleSize/2 },
      { x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y - handleSize/2 },
      { x: cropArea.x - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2 },
      { x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2 }
    ];
    
    corners.forEach(corner => {
      ctx.fillRect(corner.x, corner.y, handleSize, handleSize);
    });
  };

  // 캔버스 마우스 이벤트 핸들러
  const handleCanvasMouseDown = (e) => {
    if (!cropMode) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Canvas의 실제 크기와 display 크기 비율 계산
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setIsDragging(true);
    setDragStart({ x, y });
    
    // 기본 이벤트 방지
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCanvasMouseMove = (e) => {
    if (!cropMode) return;
    
    // 드래그 중이 아닐 때만 캔버스에서 커서 스타일 변경
    if (!isDragging) {
      const canvas = canvasRef.current;
      canvas.style.cursor = 'crosshair';
    }
  };

  // 전역 마우스 이벤트 핸들러 (드래그 중에만 활성화)
  const handleGlobalMouseMove = useCallback((e) => {
    if (!isDragging || !cropMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // Canvas의 실제 크기와 display 크기 비율 계산
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const width = Math.abs(x - dragStart.x);
    const height = Math.abs(y - dragStart.y);
    const startX = Math.min(x, dragStart.x);
    const startY = Math.min(y, dragStart.y);
    
    setCropArea({ x: startX, y: startY, width, height });
  }, [isDragging, cropMode, dragStart]);

  const handleGlobalMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = 'default';
      }
    }
  }, [isDragging]);

  // 크롭 드래그를 위한 전역 이벤트 리스너
  useEffect(() => {
    if (isDragging && cropMode) {
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalMouseUp, { passive: false });
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, cropMode, handleGlobalMouseMove, handleGlobalMouseUp]);

  // 리셋 함수
  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  // 저장 함수
  const handleSave = () => {
    const canvas = canvasRef.current;
    
    if (cropMode && cropArea.width > 0 && cropArea.height > 0) {
      // 크롭된 이미지 생성
      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d');
      
      croppedCanvas.width = cropArea.width;
      croppedCanvas.height = cropArea.height;
      
      // 필터가 적용된 현재 캔버스에서 크롭 영역만 복사
      const imageData = canvas.getContext('2d').getImageData(
        cropArea.x, cropArea.y, cropArea.width, cropArea.height
      );
      croppedCtx.putImageData(imageData, 0, 0);
      
      croppedCanvas.toBlob((blob) => {
        const file = new File([blob], imageFile.name, { type: imageFile.type });
        onSave(file);
      }, imageFile.type);
    } else {
      // 전체 이미지 저장
      canvas.toBlob((blob) => {
        const file = new File([blob], imageFile.name, { type: imageFile.type });
        onSave(file);
      }, imageFile.type);
    }
  };

  if (!imageFile) return null;

  return (
    <div className="image-editor-modal">
      <div className="image-editor-container">
        <div className="image-editor-header">
          <h3>이미지 편집</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        
        <div className="image-editor-content">
          <div className="image-container">
            <canvas
              ref={canvasRef}
              className="edit-canvas"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              style={{ 
                touchAction: 'none',
                userSelect: 'none'
              }}
            />
          </div>
          
          <div className="controls-panel">
            <div className="control-group">
              <h4>이미지 조정</h4>
              
              <div className="control-item">
                <label>밝기</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                />
                <span>{brightness}%</span>
              </div>
              
              <div className="control-item">
                <label>대비</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                />
                <span>{contrast}%</span>
              </div>
              
              <div className="control-item">
                <label>채도</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                />
                <span>{saturation}%</span>
              </div>
              
              <button className="reset-btn" onClick={resetFilters}>
                초기화
              </button>
            </div>
            
            <div className="control-group">
              <h4>크롭</h4>
              <button 
                className={`crop-btn ${cropMode ? 'active' : ''}`}
                onClick={() => setCropMode(!cropMode)}
              >
                {cropMode ? '크롭 완료' : '크롭 시작'}
              </button>
              {cropMode && (
                <p className="crop-instruction">
                  드래그하여 크롭 영역을 선택하세요
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="image-editor-footer">
          <button className="cancel-btn" onClick={onCancel}>
            취소
          </button>
          <button className="save-btn" onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor; 