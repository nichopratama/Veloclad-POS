import { Bell, User, Globe, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Header.css';

const Header = ({ toggleSidebar }) => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'id' ? 'en' : 'id';
    i18n.changeLanguage(nextLng);
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-icon-btn" onClick={toggleSidebar} aria-label="Toggle Sidebar">
          <Menu size={20} />
        </button>
      </div>
      
      <div className="header-right">
        <button className="header-icon-btn" onClick={toggleLanguage}>
          <Globe size={20} />
          <span className="lang-text">{i18n.language.toUpperCase()}</span>
        </button>
        
        <button className="header-icon-btn">
          <Bell size={20} />
          <span className="badge-dot"></span>
        </button>
        
        <div className="header-user">
          <div className="user-avatar">
            <User size={20} />
          </div>
          <div className="user-info">
            <div className="user-name">Kasir 1</div>
            <div className="user-role">Toko ABC</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
