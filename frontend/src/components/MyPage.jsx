import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserInfo, useCardStats } from '../utils/useLocalStorage';
import './MyPage.css';

const MyPage = () => {
  const navigate = useNavigate();
  const { userInfo, saveUserInfo, loading: userLoading } = useUserInfo();
  const { stats, refreshStats } = useCardStats();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: ''
  });
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (!userLoading && userInfo && (!userInfo.name || !userInfo.email)) {
      setIsEditing(true);
    }
    if (userInfo) {
      setEditForm({
        name: userInfo.name || '',
        email: userInfo.email || ''
      });
    }
  }, [userInfo, userLoading]);

  const handleEditClick = () => {
    if (userInfo) {
      setEditForm({
        name: userInfo.name || '',
        email: userInfo.email || ''
      });
      setIsEditing(true);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saveUserInfo({
      ...userInfo,
      ...editForm,
      updatedAt: new Date().toISOString()
    })) {
      setIsEditing(false);
      refreshStats();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTotalCardsClick = () => {
    navigate('/cards/all');
  };

  const handleTotalCompaniesClick = () => {
    navigate('/?filter=company');
  };

  if (userLoading) {
    return (
      <div className="mypage">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="mypage">
        <div className="error">사용자 정보를 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="mypage">
      <div className="mypage-header">
        <div className="user-profile">
          <div className="avatar-container">
            <div className="user-avatar default-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
          <div className="user-info">
            <h1 className="user-name">{userInfo.name || '이름 없음'}</h1>
            <p className="user-email">{userInfo.email || '이메일 없음'}</p>
            <p className="join-date">가입일: {new Date(userInfo.createdAt || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card clickable" onClick={handleTotalCardsClick}>
          <div className="stat-icon total-cards">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.totalCards || 0}</h3>
            <p className="stat-label">총 명함 수</p>
          </div>
        </div>

        <div className="stat-card clickable" onClick={handleTotalCompaniesClick}>
          <div className="stat-icon total-companies">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9,22 9,12 15,12 15,22"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.totalCompanies || 0}</h3>
            <p className="stat-label">등록 회사 수</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon favorite-cards">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.favoriteCards || 0}</h3>
            <p className="stat-label">즐겨찾기</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon recent-scans">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.recentScans?.length || 0}</h3>
            <p className="stat-label">최근 스캔</p>
          </div>
        </div>
      </div>

      <div className="mypage-tabs">
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          프로필
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          설정
        </button>
        <button 
          className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          활동
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'profile' && (
          <div className="section-card">
            <h2 className="section-title">프로필 정보</h2>
            {isEditing ? (
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label htmlFor="name">이름</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={editForm.name}
                    onChange={handleChange}
                    placeholder="이름을 입력하세요"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">이메일</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleChange}
                    placeholder="이메일을 입력하세요"
                    required
                  />
                </div>
                <button type="submit" className="update-btn">저장</button>
              </form>
            ) : (
              <button className="update-btn" onClick={handleEditClick}>
                프로필 수정
              </button>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="section-card">
            <h2 className="section-title">설정</h2>
            <div className="setting-item">
              <div className="setting-info">
                <h4>알림 설정</h4>
                <p>새로운 명함이 추가되면 알림을 받습니다.</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <h4>자동 백업</h4>
                <p>명함 데이터를 자동으로 백업합니다.</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="section-card">
            <h2 className="section-title">최근 활동</h2>
            <div className="activity-list">
              {stats.recentScans?.map((scan, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </div>
                  <div className="activity-content">
                    <p className="activity-text">새로운 명함을 스캔했습니다.</p>
                    <p className="activity-time">{new Date(scan.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPage; 