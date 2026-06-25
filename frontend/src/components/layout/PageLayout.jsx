import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import './PageLayout.css';

const PageLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobileView = window.innerWidth <= 768;
      setIsMobile(mobileView);
      if (mobileView) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`layout-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${isMobile ? 'is-mobile' : 'is-desktop'}`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} isMobile={isMobile} />
      <div className="layout-main">
        <Header toggleSidebar={toggleSidebar} />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PageLayout;
