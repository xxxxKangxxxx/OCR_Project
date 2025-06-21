import React from 'react';
import CircularProgress from './CircularProgress';
import { useLoading } from '../contexts/LoadingContext';
import './LoadingModal.css';

const LoadingModal = () => {
  const { 
    isUploading, 
    uploadProgress, 
    status,
    message,
    processedFiles
  } = useLoading();

  if (!isUploading && status === 'idle') return null;

  return (
    <div className="loading-modal-overlay">
      <div className={`loading-modal-content ${status}`}>
        {uploadProgress < 100 ? (
          <div className="loading-state">
            <div className="progress-container">
              <CircularProgress progress={uploadProgress} />
            </div>
            <div className="loading-text-container">
              <p>명함을 처리하고 있습니다...</p>
            </div>
          </div>
        ) : status === 'success' ? (
          <div className="result-message success">
            <div className="icon-wrapper">
              <img src="/success-icon.svg" alt="성공" className="status-icon" />
            </div>
            <h3>명함 처리가 완료되었습니다!</h3>
            <p>처리된 파일: {processedFiles.total}개</p>
            <p>저장된 명함: {processedFiles.saved}개</p>
          </div>
        ) : status === 'error' ? (
          <div className="result-message error">
            <div className="icon-wrapper">
              <img src="/error-icon.svg" alt="오류" className="status-icon" />
            </div>
            <h3>오류가 발생했습니다</h3>
            <p>{message}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LoadingModal; 