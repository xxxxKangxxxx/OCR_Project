import React from 'react';
import Header from './Header';
import Navigation from './Navigation';
import { LoadingProvider } from '../contexts/LoadingContext';
import LoadingModal from './LoadingModal';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <LoadingProvider>
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
    </LoadingProvider>
  );
};

export default Layout; 