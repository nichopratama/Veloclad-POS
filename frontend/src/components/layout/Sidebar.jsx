import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronDown, Phone, Info, LayoutDashboard, ShoppingCart, Package, BookOpen, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import './Sidebar.css';

const Sidebar = ({ isOpen, setIsOpen, isMobile }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const navItems = [
    { path: '/', label: t('Dashboard'), icon: LayoutDashboard },
    { 
      path: '/sales', 
      label: t('Sales'),
      icon: ShoppingCart,
      subItems: [
        { path: '/sales/pos', label: t('POS Cashier') },
        { path: '/sales/history', label: t('Transactions') },
      ]
    },
    { 
      path: '/inventory', 
      label: t('Inventory'),
      icon: Package,
      subItems: [
        { path: '/inventory/summary', label: t('Stock Summary') },
        { path: '/inventory/adjustment', label: t('Stock Adjustment') },
        { path: '/inventory/po', label: t('Purchase Order') },
      ]
    },
    { 
      path: '/library', 
      label: t('Library'),
      icon: BookOpen,
      subItems: [
        { path: '/library/items', label: t('Products') },
        { path: '/library/categories', label: t('Categories') },
        { path: '/library/customers', label: t('Customers') },
        { path: '/library/suppliers', label: t('Suppliers') },
      ]
    },
    { 
      path: '/settings', 
      label: t('Settings'), 
      icon: Settings,
      subItems: [
        { path: '/settings/store', label: t('Profil Toko') },
        { path: '/settings/receipt', label: t('Struk & Pajak') },
        { path: '/settings/system', label: t('Sistem') },
      ]
    },
  ];

  useEffect(() => {
    const currentMainPath = '/' + location.pathname.split('/')[1];
    if (currentMainPath !== '/') {
      setExpandedMenus(prev => ({
        ...prev,
        [currentMainPath]: true
      }));
    }
  }, [location.pathname]);

  const toggleExpand = (path, e) => {
    e.preventDefault();
    setExpandedMenus(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  return (
    <>
      {isMobile && isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)}></div>
      )}
      <aside className={`sidebar ${!isOpen && !isMobile ? 'sidebar-collapsed' : ''} ${isMobile && !isOpen ? 'sidebar-hidden-mobile' : ''}`}>
        <div className="sidebar-header">
        <div className="tenant-selector">
          <span>vapescrew</span>
          <ChevronDown size={18} />
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedMenus[item.path];
            const isActiveParent = (location.pathname.startsWith(item.path) && item.path !== '/') || location.pathname === item.path;

            return (
              <li key={item.path}>
                <div className="nav-item-wrapper">
                  <NavLink 
                    to={hasSubItems ? item.subItems[0].path : item.path} 
                    className={`sidebar-link ${isActiveParent ? 'active' : ''}`}
                    onClick={(e) => hasSubItems && toggleExpand(item.path, e)}
                  >
                    <div className="nav-link-content">
                      {hasSubItems ? (
                        <span className="chevron-icon">
                          {isExpanded ? <ChevronDown size={14} strokeWidth={3.5} /> : <ChevronRight size={14} strokeWidth={3.5} />}
                        </span>
                      ) : (
                        <span className="chevron-placeholder"></span>
                      )}
                      {item.icon && <item.icon size={18} style={{ opacity: 0.9 }} />}
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                </div>
                
                {hasSubItems && isExpanded && (
                  <ul className="sidebar-submenu">
                    {item.subItems.map(sub => (
                      <li key={sub.path}>
                        <NavLink 
                          to={sub.path}
                          className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                        >
                          {sub.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="phone-contact">
          <Phone size={14} fill="currentColor" />
          <span>1500970</span>
        </div>
        <button className="help-button">
          <div className="help-icon">
            <Info size={18} />
          </div>
          <div className="help-text">
            Tutorials & Help
          </div>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
