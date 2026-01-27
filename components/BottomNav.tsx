
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QuickActionsMenu from './QuickActionsMenu';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: 'Início', icon: 'home', path: '/dashboard' },
    { label: 'Viagens', icon: 'explore', path: '/trips', fill: true },
    { label: 'Add', icon: 'add', path: '/add-trip', isSpecial: true },
    { label: 'Feriados', icon: 'event', path: '/holidays' },
    { label: 'Finanças', icon: 'payments', path: '/finance' },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.isSpecial) {
      setIsQuickMenuOpen(true);
    } else {
      navigate(item.path);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white/95 backdrop-blur-xl border-t border-terracotta-100/50 px-4 pt-3 pb-8 flex justify-between items-center z-40">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => handleNavClick(item)}
            className={`flex flex-1 flex-col items-center gap-1 ${isActive(item.path) ? 'text-terracotta-500' : 'text-sunset-muted'}`}
          >
            {item.isSpecial ? (
              <div className="w-14 h-14 rounded-2xl bg-terracotta-500 text-white flex items-center justify-center shadow-lg shadow-terracotta-500/30 active:scale-95 transition-transform -mt-6">
                <span className="material-symbols-outlined text-3xl font-bold">add</span>
              </div>
            ) : (
              <>
                <span className={`material-symbols-outlined ${item.fill && isActive(item.path) ? 'fill' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
              </>
            )}
          </button>
        ))}
        <div className="fixed bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-sunset-dark/10 rounded-full z-50"></div>
      </nav>

      <QuickActionsMenu isOpen={isQuickMenuOpen} onClose={() => setIsQuickMenuOpen(false)} />
    </>
  );
};

export default BottomNav;
