import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './presentation/components/layout/Layout';
import { DashboardPage } from './presentation/pages/DashboardPage';
import { TasksPage } from './presentation/pages/TasksPage';
import { LoginPage } from './presentation/pages/auth/LoginPage';
import { RegisterPage } from './presentation/pages/auth/RegisterPage';
import { AttendancePage } from './presentation/pages/AttendancePage';
import { SchedulePage } from './presentation/pages/SchedulePage';
import { SubjectsPage } from './presentation/pages/SubjectsPage';
import { NotesPage } from './presentation/pages/NotesPage';
import { RecordsPage } from './presentation/pages/RecordsPage';
import { AnalyticsPage } from './presentation/pages/AnalyticsPage';
import { FocusPage } from './presentation/pages/FocusPage';
import { TimetablePage } from './presentation/pages/TimetablePage';
import { AiHelperPage } from './presentation/pages/AiHelperPage';
import { SettingsPage } from './presentation/pages/SettingsPage';
import { ExamsPage } from './presentation/pages/ExamsPage';
import { PlannerPage } from './presentation/pages/PlannerPage';
import { NotificationsPage } from './presentation/pages/NotificationsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const root = document.documentElement;
    document.body.style.filter = 'none'; // Clear any stuck filters
    if (savedTheme === 'Dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (savedTheme === 'Light') {
      root.setAttribute('data-theme', 'light');
    }
    // Check for hash recovery token globally on load
    if (window.location.hash.includes('type=recovery')) {
      window.location.href = '/login' + window.location.hash;
    }
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/login#type=recovery';
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="records" element={<RecordsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="focus" element={<FocusPage />} />
          <Route path="ai" element={<AiHelperPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="planner" element={<PlannerPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
