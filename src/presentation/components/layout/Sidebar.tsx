import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Book, CheckSquare, ListTodo, FileText, Calendar, History, LineChart, Grid, Target, Bot, Settings, GraduationCap, Map, Bell } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const items = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Book, label: 'Subjects', path: '/subjects' },
    { icon: CheckSquare, label: 'Attendance', path: '/attendance' },
    { icon: ListTodo, label: 'Tasks', path: '/tasks' },
    { icon: Calendar, label: 'Schedule', path: '/schedule' },
    { icon: Grid, label: 'Timetable', path: '/timetable' },
    { icon: FileText, label: 'Notes', path: '/notes' },
    { icon: History, label: 'Records', path: '/records' },
    { icon: LineChart, label: 'Analytics', path: '/analytics' },
    { icon: GraduationCap, label: 'Exams', path: '/exams' },
    { icon: Map, label: 'Planner', path: '/planner' },
    { icon: Target, label: 'Focus', path: '/focus' },
    { icon: Bot, label: 'AI Helper', path: '/ai' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="side" id="nav">
      <div className="logo">
        <svg viewBox="0 0 40 40">
          <rect width="40" height="40" rx="10" fill="#fff"/>
          <path d="M20 9l12 6-12 6-12-6z" fill="#1e4fd8"/>
          <path d="M13 19v5c0 2 3.2 4 7 4s7-2 7-4v-5l-7 3.5z" fill="#0f2a5c"/>
          <path d="M32 15v8" stroke="#1e4fd8" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <div>
          <b>SLS</b>
          <small>Student Learning System</small>
        </div>
      </div>
      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => isActive ? 'on' : ''}
          >
            <item.icon className="i" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
};
