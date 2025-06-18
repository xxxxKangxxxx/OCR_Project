import React, { useState, useEffect } from 'react';
import './MyPage.css';

const MyPage = () => {
  const [user, setUser] = useState({
    name: '김철수',
    email: 'chulsoo@example.com',
    avatar: null,
    joinDate: '2024.01.15'
  });

  const [stats, setStats] = useState({
    totalCards: 0,
    totalCompanies: 0,
    favoriteCards: 0,
    recentScans: 0
  });

  const [settings, setSettings] = useState({
    notifications: true,
    autoBackup: true,
    darkMode: false,
    language: 'ko'
  });

  const [activeTab, setActiveTab] = useState('profile');

  // 컴포넌트 마운트 시 상태 초기화
  useEffect(() => {
    // 자체 스크롤 초기화 (독립적 컨테이너이므로 간단함)
    const resetScroll = () => {
      const mypage = document.querySelector('.mypage');
      if (mypage) {
        mypage.scrollTop = 0;
      }
      console.log('MyPage 마운트 - 스크롤 초기화');
    };

    resetScroll();
    setTimeout(resetScroll, 0);

    // 페이지 진입 시마다 초기 상태로 리셋
    setActiveTab('profile');
    
    // 사용자 정보 초기화 (실제로는 API에서 가져올 것)
    setUser({
      name: '김철수',
      email: 'chulsoo@example.com',
      avatar: null,
      joinDate: '2024.01.15'
    });

    // 설정 초기화 (실제로는 API에서 가져올 것)
    setSettings({
      notifications: true,
      autoBackup: true,
      darkMode: false,
      language: 'ko'
    });

    // 통계 데이터 로드 (실제로는 API에서 데이터를 가져올 것)
    setStats({
      totalCards: 47,
      totalCompanies: 12,
      favoriteCards: 8,
      recentScans: 3
    });
  }, []); // 빈 배열로 마운트 시에만 실행

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    // 실제로는 API로 설정 저장
    console.log(`설정 변경: ${key} = ${value}`);
  };

  const handleProfileUpdate = () => {
    // 프로필 업데이트 로직
    alert('프로필이 업데이트되었습니다.');
  };

  const handleExportData = () => {
    // 데이터 내보내기 로직
    alert('데이터 내보내기 기능을 준비 중입니다.');
  };

  const handleDeleteAccount = () => {
    if (confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      alert('계정 삭제 기능을 준비 중입니다.');
    }
  };

  return (
    <div className="mypage">
      <div className="mypage-header">
        <div className="user-profile">
          <div className="avatar-container">
            {user.avatar ? (
              <img src={user.avatar} alt="프로필" className="user-avatar" />
            ) : (
              <div className="user-avatar default-avatar">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            )}
            <button className="avatar-edit-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
          <div className="user-info">
            <h2 className="user-name">{user.name}</h2>
            <p className="user-email">{user.email}</p>
            <p className="join-date">가입일: {user.joinDate}</p>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total-cards">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.totalCards}</h3>
            <p className="stat-label">총 명함 수</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon total-companies">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9,22 9,12 15,12 15,22"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.totalCompanies}</h3>
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
            <h3 className="stat-number">{stats.favoriteCards}</h3>
            <p className="stat-label">즐겨찾기</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon recent-scans">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"></path>
              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
              <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"></path>
              <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3"></path>
            </svg>
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.recentScans}</h3>
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
          className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          데이터 관리
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="section-card">
              <h3 className="section-title">개인 정보</h3>
              <div className="form-group">
                <label htmlFor="userName">이름</label>
                <input 
                  type="text" 
                  id="userName" 
                  value={user.name} 
                  onChange={(e) => setUser(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="userEmail">이메일</label>
                <input 
                  type="email" 
                  id="userEmail" 
                  value={user.email} 
                  onChange={(e) => setUser(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <button className="update-btn" onClick={handleProfileUpdate}>
                프로필 업데이트
              </button>
            </div>

            <div className="section-card">
              <h3 className="section-title">최근 활동</h3>
              <div className="activity-list">
                <div className="activity-item">
                  <div className="activity-icon">📋</div>
                  <div className="activity-content">
                    <p className="activity-text">삼성전자 김철수님 명함을 추가했습니다</p>
                    <p className="activity-time">2시간 전</p>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon">⭐</div>
                  <div className="activity-content">
                    <p className="activity-text">LG전자 이영희님을 즐겨찾기에 추가했습니다</p>
                    <p className="activity-time">1일 전</p>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon">🏢</div>
                  <div className="activity-content">
                    <p className="activity-text">네이버 회사 그룹을 생성했습니다</p>
                    <p className="activity-time">3일 전</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section">
            <div className="section-card">
              <h3 className="section-title">알림 설정</h3>
              <div className="setting-item">
                <div className="setting-info">
                  <h4>푸시 알림</h4>
                  <p>새로운 명함 추가 시 알림을 받습니다</p>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={settings.notifications}
                    onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <h4>자동 백업</h4>
                  <p>명함 데이터를 자동으로 백업합니다</p>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={settings.autoBackup}
                    onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="section-card">
              <h3 className="section-title">앱 설정</h3>
              <div className="setting-item">
                <div className="setting-info">
                  <h4>다크 모드</h4>
                  <p>어두운 테마를 사용합니다</p>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={settings.darkMode}
                    onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <h4>언어</h4>
                  <p>앱에서 사용할 언어를 선택합니다</p>
                </div>
                <select 
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="language-select"
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="data-section">
            <div className="section-card">
              <h3 className="section-title">데이터 내보내기</h3>
              <p className="section-description">
                저장된 명함 데이터를 다양한 형식으로 내보낼 수 있습니다.
              </p>
              <div className="export-options">
                <button className="export-btn csv" onClick={handleExportData}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                  </svg>
                  CSV로 내보내기
                </button>
                <button className="export-btn json" onClick={handleExportData}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                  </svg>
                  JSON으로 내보내기
                </button>
              </div>
            </div>

            <div className="section-card danger-zone">
              <h3 className="section-title danger">위험 구역</h3>
              <p className="section-description">
                아래 작업들은 되돌릴 수 없습니다. 신중하게 진행해주세요.
              </p>
              <div className="danger-actions">
                <button className="danger-btn" onClick={handleDeleteAccount}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3,6 5,6 21,6"></polyline>
                    <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                  </svg>
                  계정 삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPage; 