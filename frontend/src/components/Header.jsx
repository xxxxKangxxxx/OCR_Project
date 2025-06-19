import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/">
          <img src="/Cardlet_Logo.png" alt="Cardlet" className="logo" />
        </Link>
        <img src="/bell.png" alt="Notifications" className="notification-icon" />
      </div>
    </header>
  );
};

export default Header; 