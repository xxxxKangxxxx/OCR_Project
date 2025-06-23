import React from 'react';
import Header from './Header';
import Navigation from './Navigation';
import LoadingModal from './LoadingModal';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <Header />
      <main className="layout-content">
        {children}
      </main>
      <nav className="layout-navigation">
        <Navigation />
      </nav>
      <LoadingModal />
    </div>
  );
};

export default Layout; 