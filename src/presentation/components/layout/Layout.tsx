import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { LayoutDashboard, ListTodo, Calendar, Target, MoreHorizontal, Bell } from 'lucide-react';

export const Layout: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [profileName, setProfileName] = useState(localStorage.getItem('profileName') || 'User');

  const getInitials = (name: string) => {
    const parts = (name || 'U').trim().split(/\s+/);
    return parts.length > 1 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() 
      : parts[0][0].toUpperCase();
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    
    const handleProfileChange = () => setProfileName(localStorage.getItem('profileName') || 'User');
    window.addEventListener('profileNameChanged', handleProfileChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('profileNameChanged', handleProfileChange);
    };
  }, []);

  return (
    <div className="desk" id="desk" data-drawer="open">
      <Sidebar />
      <div className="main">
        {isMobile && (
          <div className="mtop">
            <div className="logo">
              <svg viewBox="0 0 40 40">
                <rect width="40" height="40" rx="10" fill="#fff" />
                <path d="M20 9l12 6-12 6-12-6z" fill="#1e4fd8" />
                <path d="M13 19v5c0 2 3.2 4 7 4s7-2 7-4v-5l-7 3.5z" fill="#0f2a5c" />
                <path d="M32 15v8" stroke="#1e4fd8" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div><b>SLS</b></div>
            </div>
            <Link to="/notifications" style={{ marginLeft: 'auto', position: 'relative', width: 34, height: 34, border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, display: 'grid', placeItems: 'center', color: '#fff', textDecoration: 'none' }}>
              <Bell className="i" />
            </Link>
            <Link to="/settings" style={{ marginLeft: 10, width: 34, height: 34, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', textDecoration: 'none', fontWeight: 600, fontSize: 13, border: '1px solid rgba(255,255,255,0.3)' }}>
              {getInitials(profileName)}
            </Link>
          </div>
        )}
        
        <Outlet />
        
        {isMobile && (
          <div className="mtabs">
            <NavLink to="/" className={({ isActive }) => isActive ? 'on' : ''} end>
              <LayoutDashboard className="i" />
              Home
            </NavLink>
            <NavLink to="/tasks" className={({ isActive }) => isActive ? 'on' : ''}>
              <ListTodo className="i" />
              Tasks
            </NavLink>
            <NavLink to="/schedule" className={({ isActive }) => isActive ? 'on' : ''}>
              <Calendar className="i" />
              Schedule
            </NavLink>
            <NavLink to="/focus" className={({ isActive }) => isActive ? 'on' : ''}>
              <Target className="i" />
              Focus
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'on' : ''}>
              <MoreHorizontal className="i" />
              More
            </NavLink>
          </div>
        )}
      </div>
    </div>
  );
};
