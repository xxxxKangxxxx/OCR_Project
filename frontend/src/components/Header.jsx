import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <img src="/Cardlet_Logo.png" alt="Cardlet" className="logo" />
        <img src="/bell.png" alt="Notifications" className="notification-icon" />
      </div>
    </header>
  );
};

export default Header; 