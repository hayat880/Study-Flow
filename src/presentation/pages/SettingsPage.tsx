import React, { useState, useEffect } from 'react';
import './other-pages.css';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Book, Grid, FileText, History, LineChart, GraduationCap, Map, Bot } from 'lucide-react';

const SettingRow = ({ title, sub, action }: any) => (
  <div className="set">
    <div className="g1">
      <span className="t">{title}</span>
      <span className="sub">{sub}</span>
    </div>
    {action}
  </div>
);

const Toggle = ({ on, onChange }: any) => {
  return <div className={`tog ${on ? 'on' : ''}`} onClick={onChange}></div>;
};

export const SettingsPage: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string>('Loading...');
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [toastNotifs, setToastNotifs] = useState(localStorage.getItem('toastNotifsEnabled') !== 'false');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'System');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserEmail(data.user.email || 'User');
      } else {
        setUserEmail('Guest');
      }
    };
    fetchUser();
  }, []);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTheme(val);
    localStorage.setItem('theme', val);
    
    // Clean up any old filters
    document.body.style.filter = 'none';

    // Apply real theme
    const root = document.documentElement;
    if (val === 'Dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (val === 'Light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
  };

  const showToast = (msg: string) => {
    // Remove existing toast if any
    const existing = document.getElementById('studyflow-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'studyflow-toast';
    toast.className = 'custom-toast';
    toast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> ${msg}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <>
      <div className="hdr">
        <h2>{isMobile ? 'Menu & Settings' : 'Settings'}</h2>
      </div>
      <div className="content">
        <div className="cw">
          <div className="pg">
            {isMobile && (
              <div className="card cp" style={{ padding: 0 }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h3 style={{ margin: 0 }}>Explore Features</h3>
                </div>
                <div className="app-grid">
                  <Link to="/subjects" className="app-item">
                    <div className="ic"><Book className="i" style={{ width: 22, height: 22 }} /></div>
                    Subjects
                  </Link>
                  <Link to="/timetable" className="app-item">
                    <div className="ic"><Grid className="i" style={{ width: 22, height: 22 }} /></div>
                    Timetable
                  </Link>
                  <Link to="/notes" className="app-item">
                    <div className="ic"><FileText className="i" style={{ width: 22, height: 22 }} /></div>
                    Notes
                  </Link>
                  <Link to="/exams" className="app-item">
                    <div className="ic"><GraduationCap className="i" style={{ width: 22, height: 22 }} /></div>
                    Exams
                  </Link>
                  <Link to="/planner" className="app-item">
                    <div className="ic"><Map className="i" style={{ width: 22, height: 22 }} /></div>
                    Planner
                  </Link>
                  <Link to="/analytics" className="app-item">
                    <div className="ic"><LineChart className="i" style={{ width: 22, height: 22 }} /></div>
                    Analytics
                  </Link>
                  <Link to="/records" className="app-item">
                    <div className="ic"><History className="i" style={{ width: 22, height: 22 }} /></div>
                    Records
                  </Link>
                  <Link to="/ai" className="app-item">
                    <div className="ic"><Bot className="i" style={{ width: 22, height: 22 }} /></div>
                    AI Helper
                  </Link>
                </div>
              </div>
            )}
            
            <div className="card cp">
              <h3>Account Profile</h3>
              <SettingRow 
                title="Profile Name" 
                sub="Used for greetings and avatar" 
                action={<input className="in" style={{ width: 150 }} defaultValue={localStorage.getItem('profileName') || ''} onBlur={(e) => {
                  if(e.target.value) {
                    localStorage.setItem('profileName', e.target.value);
                    window.dispatchEvent(new Event('profileNameChanged'));
                  }
                }} placeholder="Your Name" />} 
              />
              <SettingRow title="Email Address" sub={userEmail} action={<button className="btn sm ghost" onClick={handleLogout}>Log Out</button>} />
            </div>
            
            <div className="card cp">
              <h3>Preferences</h3>
              <SettingRow title="Minimum attendance" sub="Used for warnings and predictions" action={<input className="in" style={{ width: 130 }} defaultValue="75%" disabled />} />
              <SettingRow title="Theme" sub="Light, dark or system" action={
                <select className="in" style={{ width: 130 }} value={theme} onChange={handleThemeChange}>
                  <option value="System">System</option>
                  <option value="Light">Light</option>
                  <option value="Dark">Dark (Experimental)</option>
                </select>
              } />
            </div>
            
            <div className="card cp">
              <h3>Notifications</h3>
              <SettingRow title="In-app reminders" sub="Due soon, overdue, low attendance notifications" action={<Toggle on={inAppNotifs} onChange={() => setInAppNotifs(!inAppNotifs)} />} />
              <SettingRow 
                title="Pop-up notifications" 
                sub="Show non-intrusive on-screen alerts" 
                action={<Toggle on={toastNotifs} onChange={() => {
                  const newState = !toastNotifs;
                  setToastNotifs(newState);
                  localStorage.setItem('toastNotifsEnabled', newState.toString());
                  if (newState) {
                    showToast("Pop-up alerts enabled!");
                  }
                }} />} 
              />
            </div>
            
            <div className="card cp" style={{ borderColor: 'var(--rc)' }}>
              <h3 style={{ color: 'var(--rc)' }}>Data & Privacy</h3>
              <SettingRow title="AI Helper" sub="Using Gemini 1.5 Flash API via Supabase Edge Function." action={null} />
              <SettingRow title="Clear all data" sub="Permanently wipe all your account data." action={<button className="btn sm" style={{ color: 'var(--rc)', borderColor: 'var(--rc)' }}>Clear Account</button>} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
