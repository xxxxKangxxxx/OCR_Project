import React, { useState } from 'react';
import { useBusinessCards } from '../utils/useLocalStorage.js';
import { parseOCRText } from '../utils/ocrParser';
import { API_ENDPOINTS } from '../utils/config';

const OCRCardAdder = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    company: { name: '' },
    address: '',
    mobile: '',
    fax: '',
    department: ''
  });
  const [showForm, setShowForm] = useState(false);
  
  const { saveCard } = useBusinessCards();

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const formDataForOCR = new FormData();
    formDataForOCR.append('files', file);

    try {
      const response = await fetch(API_ENDPOINTS.OCR, {
        method: 'POST',
        body: formDataForOCR,
      });
      
      const data = await response.json();
      setOcrResult(data.text);
      
      // OCR 결과를 파싱하여 폼 데이터로 변환
      const parsedData = parseOCRText(data.text);
      setFormData(prev => ({
        ...prev,
        name: parsedData.name || '',
        email: parsedData.email || '',
        phone: parsedData.phone || '',
        position: parsedData.position || '',
        company: { name: parsedData.company_name || '' },
        address: parsedData.address || '',
        mobile: parsedData.mobile || '',
        fax: parsedData.fax || '',
        department: parsedData.department || ''
      }));
      setShowForm(true);
      
    } catch (error) {
      console.error('OCR 처리 중 오류 발생:', error);
      alert('명함 스캔 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'companyName') {
      setFormData(prev => ({
        ...prev,
        company: { name: value }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = saveCard({
      ...formData,
      company_name: formData.company.name,
      company: null,
      ocr_raw_text: ocrResult
    });
    if (success) {
      alert('명함이 저장되었습니다!');
      setFormData({
        name: '',
        email: '',
        phone: '',
        position: '',
        company: { name: '' },
        address: '',
        mobile: '',
        fax: '',
        department: ''
      });
      setShowForm(false);
      setOcrResult('');
    } else {
      alert('명함 저장에 실패했습니다.');
    }
  };

  return (
    <div className="ocr-card-adder">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        disabled={isLoading}
      />
      
      {isLoading && <p>명함을 스캔하고 있습니다...</p>}
      
      {showForm && (
        <form onSubmit={handleSubmit}>
          <div>
            <label>이름:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label>회사:</label>
            <input
              type="text"
              name="companyName"
              value={formData.company.name}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label>직책:</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label>부서:</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label>이메일:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label>전화번호:</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label>휴대폰:</label>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label>팩스:</label>
            <input
              type="tel"
              name="fax"
              value={formData.fax}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label>주소:</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
            />
          </div>
          
          <button type="submit">저장</button>
        </form>
      )}
    </div>
  );
};

export default OCRCardAdder; 