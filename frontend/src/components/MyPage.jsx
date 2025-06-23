import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardStats } from '../utils/useLocalStorage';
import { useAuth } from '../contexts/AuthContext';
import './MyPage.css';

const MyPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { stats, refreshStats } = useCardStats();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: ''
  });
  const [activeTab, setActiveTab] = useState('profile');
  const [darkMode, setDarkMode] = useState(() => {
    // 로컬 스토리지에서 다크모드 설정 불러오기
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    // 사용자 정보가 있으면 폼에 설정 (편집 모드 강제하지 않음)
    if (user) {
      setEditForm({
        name: user.full_name || user.username || '',
        email: user.email || ''
      });
    }
  }, [user]);

  // 다크모드 설정 적용
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleEditClick = () => {
    if (user) {
      setEditForm({
        name: user.full_name || user.username || '',
        email: user.email || ''
      });
      setIsEditing(true);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    // TODO: 백엔드에 사용자 정보 업데이트 API 구현 필요
    // 현재는 편집 모드만 종료
    alert('사용자 정보 업데이트 기능은 준비 중입니다.');
    setIsEditing(false);
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

  const handleDarkModeToggle = () => {
    setDarkMode(!darkMode);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    navigate('/login');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  if (!user) {
    return (
      <div className="mypage">
        <div className="loading">사용자 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="mypage">
      <div className="profile-stats-card">
        <div className="profile-header">
          <div className="avatar-container-small">
            <div className="user-avatar-small default-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
          <div className="user-info-compact">
            <h1 className="user-name-compact">{user?.full_name || user?.username || '이름 없음'}</h1>
            <p className="user-email-compact">{user?.email || '이메일 없음'}</p>
            <p className="join-date-compact">가입일: {new Date(user?.created_at || Date.now()).toLocaleDateString()}</p>
          </div>
          <div className="profile-actions">
            <button className="logout-btn" onClick={handleLogout}>
              <span>로그아웃</span>
            </button>
          </div>
        </div>
        
        <div className="stats-grid-compact">
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
                <div className="form-buttons">
                  <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>취소</button>
                  <button type="submit" className="update-btn">저장</button>
                </div>
              </form>
            ) : (
              <div className="profile-display">
                <div className="profile-field">
                  <label>사용자명</label>
                  <p>{user?.username || '설정되지 않음'}</p>
                </div>
                <div className="profile-field">
                  <label>이름</label>
                  <p>{user?.full_name || '설정되지 않음'}</p>
                </div>
                <div className="profile-field">
                  <label>이메일</label>
                  <p>{user?.email || '설정되지 않음'}</p>
                </div>
                <div className="profile-field">
                  <label>가입일</label>
                  <p>{new Date(user?.created_at || Date.now()).toLocaleDateString()}</p>
                </div>
                <button className="update-btn" onClick={handleEditClick}>
                  프로필 수정
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="section-card">
            <h2 className="section-title">설정</h2>
            <div className="setting-item">
              <div className="setting-info">
                <h4>다크 모드</h4>
                <p>어두운 테마를 사용합니다.</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={darkMode}
                  onChange={handleDarkModeToggle}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
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

      {/* 로그아웃 확인 모달 */}
      {showLogoutConfirm && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <h3>로그아웃</h3>
            <p>정말로 로그아웃하시겠습니까?</p>
            <div className="logout-modal-buttons">
              <button onClick={cancelLogout} className="cancel-btn">취소</button>
              <button onClick={confirmLogout} className="confirm-btn">로그아웃</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPage; 