import React, { createContext, useContext, useState } from 'react';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [processedFiles, setProcessedFiles] = useState({ total: 0, saved: 0 });

  const resetLoading = () => {
    setIsUploading(false);
    setUploadProgress(0);
    setStatus('idle');
    setMessage('');
    setProcessedFiles({ total: 0, saved: 0 });
  };

  const showSuccess = (total, saved) => {
    setStatus('success');
    setProcessedFiles({ total, saved });
    setMessage('명함 처리가 완료되었습니다!');
    // 3초 후 모달 닫기
    setTimeout(resetLoading, 3000);
  };

  const showError = (errorMessage) => {
    setStatus('error');
    setMessage(errorMessage);
    // 3초 후 모달 닫기
    setTimeout(resetLoading, 3000);
  };

  return (
    <LoadingContext.Provider value={{
      isUploading,
      setIsUploading,
      uploadProgress,
      setUploadProgress,
      status,
      setStatus,
      message,
      setMessage,
      processedFiles,
      setProcessedFiles,
      showSuccess,
      showError,
      resetLoading
    }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}; 