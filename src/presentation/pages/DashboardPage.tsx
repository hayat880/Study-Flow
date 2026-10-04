import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, CheckSquare, ListTodo, Target, Calendar, Plus, Moon } from 'lucide-react';
import { taskService } from '../../business/services/taskService';
import { subjectService } from '../../business/services/subjectService';
import { plannerService } from '../../business/services/plannerService';
import { attendanceService } from '../../business/services/attendanceService';
import { timetableService } from '../../business/services/timetableService';
import { noteService } from '../../business/services/noteService';
import { isTaskDueToday, isTaskOverdue, isCompletedToday, calculateTodayProgress } from '../../business/logic/taskLogic';
import type { Task, Subject, StudySession, AttendanceRecord, TimetableClass, Note } from '../../types/index';
import './dashboard.css';
import './other-pages.css';

export const DashboardPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<TimetableClass[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('User');
  const [profileName, setProfileName] = useState(localStorage.getItem('profileName') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [readNotifs, setReadNotifs] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  const getInitials = (name: string) => {
    const parts = (name || 'U').trim().split(/\s+/);
    return parts.length > 1 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() 
      : parts[0][0].toUpperCase();
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadData();
    const handleProfileChange = () => setProfileName(localStorage.getItem('profileName') || '');
    window.addEventListener('profileNameChanged', handleProfileChange);
    
    try {
      const stored = localStorage.getItem('readNotifs');
      if (stored) {
        setReadNotifs(JSON.parse(stored));
      }
    } catch (e) {}

    return () => window.removeEventListener('profileNameChanged', handleProfileChange);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [loadedTasks, loadedSubjects, loadedSess, loadedAtt, loadedClass, loadedNotes] = await Promise.all([
        taskService.getTasks(),
        subjectService.getSubjects(),
        plannerService.getSessions(),
        attendanceService.getRecords(),
        timetableService.getClasses(),
        noteService.getNotes()
      ]);
      setTasks(loadedTasks);
      setSubjects(loadedSubjects);
      setSessions(loadedSess);
      setAttendance(loadedAtt);
      setClasses(loadedClass);
      setNotes(loadedNotes);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }

    try {
      const { supabase } = await import('../../lib/supabase');
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserEmail(data.user.email || 'User');
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', data.user.id).single();
        if (profile && profile.full_name) {
           if (!localStorage.getItem('profileName') || localStorage.getItem('profileName') !== profile.full_name) {
             localStorage.setItem('profileName', profile.full_name);
             setProfileName(profile.full_name);
             window.dispatchEvent(new Event('profileNameChanged'));
           }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const notificationCount = useMemo(() => {
    let count = 0;
    const now = new Date();
    tasks.forEach(t => {
      if (t.status === 'completed' || !t.dueDate) return;
      const due = new Date(t.dueDate);
      const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours < 0) {
        if (!readNotifs.includes(`task-overdue-${t.id}`)) count++;
      } else if (t.eventType === 'Exam' && diffHours / 24 <= 7) {
        if (!readNotifs.includes(`exam-upcoming-${t.id}`)) count++;
      } else if (diffHours / 24 <= 2) {
        if (!readNotifs.includes(`task-upcoming-${t.id}`)) count++;
      }
    });
    const globalThreshold = parseInt(localStorage.getItem('globalAttendanceThreshold') || '75');
    subjects.forEach(sub => {
      const subAtt = attendance.filter(a => a.subjectId === sub.id);
      if (subAtt.length > 0) {
        const pres = subAtt.filter(a => a.status === 'Present' || a.status === 'Late').length;
        if (Math.round((pres / subAtt.length) * 100) < (sub.attendanceThreshold || globalThreshold)) {
          if (!readNotifs.includes(`att-warn-${sub.id}`)) count++;
        }
      }
    });
    return count;
  }, [tasks, subjects, attendance, readNotifs]);

  const toggleTheme = () => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme');
    const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = currentTheme === 'dark' || (!currentTheme && prefersDark);
    
    // Clean up any old filters just in case
    document.body.style.filter = 'none';
    
    if (isDark) {
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'Light');
    } else {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'Dark');
    }
  };

  const getSubjectName = (subjectId: string) => {
    const sub = subjects.find(s => s.id === subjectId);
    return sub ? sub.name : 'No subject';
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Critical';
      case 'high': return 'High';
      case 'medium': return 'Medium';
      default: return 'Low';
    }
  };

  const getStatusBadge = (status: string, task: Task) => {
    if (status === 'completed') return <span className="badge ok">Done</span>;
    if (isTaskOverdue(task)) return <span className="badge late">Overdue</span>;
    if (isTaskDueToday(task)) return <span className="badge due">Due today</span>;
    return <span className="badge">Remaining</span>;
  };

  const now = new Date();
  const { remainingToday } = calculateTodayProgress(tasks, now);
  const overdueCount = tasks.filter(t => isTaskOverdue(t, now)).length;
  
  // Table tasks
  const tableTasks = [...tasks]
    .filter(t => !isCompletedToday(t, now) && t.status !== 'completed')
    .filter(t => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const sub = subjects.find(s => s.id === t.subjectId);
      return t.title.toLowerCase().includes(q) || (sub && sub.name.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, searchQuery ? 20 : 4);

  // Stats Logic
  // 1. Study Hours
  const { currHours, currMins, diffText, dailyMins, maxDaily } = useMemo(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const currWeekStart = new Date(d.setDate(diff));
    const prevWeekStart = new Date(currWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    let curr = 0;
    let prev = 0;
    const daily = [0, 0, 0, 0, 0, 0, 0];

    sessions.forEach(s => {
      if (s.actualDuration > 0) {
        const sd = new Date(s.scheduledStart);
        if (sd >= currWeekStart) {
          curr += s.actualDuration;
          const dayIdx = (sd.getDay() + 6) % 7;
          daily[dayIdx] += s.actualDuration;
        } else if (sd >= prevWeekStart && sd < currWeekStart) {
          prev += s.actualDuration;
        }
      }
    });

    const diffMins = curr - prev;
    const diffHours = Math.floor(Math.abs(diffMins) / 60);
    const dText = diffMins >= 0 
      ? `${diffHours}h ${Math.abs(diffMins) % 60}m more than last week`
      : `${diffHours}h ${Math.abs(diffMins) % 60}m less than last week`;

    return { 
      currHours: Math.floor(curr / 60), 
      currMins: curr % 60, 
      diffText: dText,
      dailyMins: daily,
      maxDaily: Math.max(...daily, 60)
    };
  }, [sessions]);

  // 2. Next Exam
  const nextExam = useMemo(() => {
    const upcomingExams = tasks.filter(t => t.eventType === 'Exam' && t.dueDate && new Date(t.dueDate) > now)
      .sort((a,b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    
    if (upcomingExams.length === 0) return null;
    const ex = upcomingExams[0];
    const diff = new Date(ex.dueDate!).getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return { name: ex.title, days };
  }, [tasks]);

  // 3. Attendance
  const { attPct, attBySubject } = useMemo(() => {
    if (attendance.length === 0) return { attPct: 0, attBySubject: [] };
    const pres = attendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const overall = Math.round((pres / attendance.length) * 100);

    const subMap = new Map<string, {p: number, t: number}>();
    attendance.forEach(a => {
      const sm = subMap.get(a.subjectId) || {p:0, t:0};
      sm.t++;
      if (a.status === 'Present' || a.status === 'Late') sm.p++;
      subMap.set(a.subjectId, sm);
    });

    const bySub = Array.from(subMap.entries()).map(([id, d]) => {
      return { id, pct: Math.round((d.p / d.t) * 100) };
    }).sort((a,b) => b.pct - a.pct).slice(0, 3); // top 3 or bottom 3? let's show all available up to 3

    return { attPct: overall, attBySubject: bySub };
  }, [attendance]);

  // 4. Today's classes
  const todaysClasses = useMemo(() => {
    const todayNum = now.getDay();
    return classes.filter(c => {
      if (c.dayOfWeek !== todayNum) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const sub = subjects.find(s => s.id === c.subjectId);
      return (sub && sub.name.toLowerCase().includes(q)) || (c.room && c.room.toLowerCase().includes(q));
    }).sort((a,b) => a.startTime.localeCompare(b.startTime));
  }, [classes, searchQuery, subjects]);

  return (
    <>
      <div className="hdr">
        <h2 className="desktop-only">Dashboard</h2>
        <div className="sr" style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 20, padding: '4px 12px', zIndex: 50 }}>
          <Search className="i" style={{ width: 14, height: 14, color: 'var(--muted)', marginRight: 8 }} />
          <input 
            type="text" 
            placeholder="Search subjects, tasks, notes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: 200, color: 'var(--ink)' }} 
          />
          {searchQuery && (
            <div style={{ position: 'absolute', top: 36, left: 0, width: 300, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, boxShadow: 'var(--shadow)', maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {subjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                <Link to="/subjects" key={`s-${s.id}`} style={{ padding: '10px 12px', textDecoration: 'none', color: 'var(--ink)', fontSize: 13, borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>SUBJECT</span>
                  {s.name}
                </Link>
              ))}
              {tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).map(t => (
                <Link to="/tasks" key={`t-${t.id}`} style={{ padding: '10px 12px', textDecoration: 'none', color: 'var(--ink)', fontSize: 13, borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>TASK</span>
                  {t.title}
                </Link>
              ))}
              {notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase()))).map(n => (
                <Link to="/notes" key={`n-${n.id}`} style={{ padding: '10px 12px', textDecoration: 'none', color: 'var(--ink)', fontSize: 13, borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>NOTE</span>
                  {n.title}
                </Link>
              ))}
              
              {subjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && 
               tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && 
               notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 && (
                <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                  No matches found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
        <button className="btn desktop-only" onClick={toggleTheme} style={{ marginLeft: '10px' }} title="Toggle Light/Dark Theme">
          <Moon className="i" />
        </button>
        <Link to="/notifications" className="bell desktop-only" data-count={notificationCount} style={{ marginLeft: '10px', textDecoration: 'none', color: 'inherit' }}>
          <Bell className="i" />
        </Link>
        <Link to="/settings" className="who desktop-only" style={{ textDecoration: 'none', color: 'inherit' }}>
          <i>{getInitials(profileName || userEmail)}</i>
          <div>
            <b>{profileName || userEmail.split('@')[0]}</b>
            <small>Student</small>
          </div>
        </Link>
      </div>
      
      <div className="content">
        <div className="card hello cp">
          <div>
            <h1>{now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'}, {profileName || userEmail.split('@')[0]}</h1>
            <p>You have {remainingToday} tasks due today and {todaysClasses.length} classes.</p>
          </div>
          <div className="acts">
            <Link to="/tasks" className="btn">
              <Plus className="i" /> Add task
            </Link>
            <Link to="/attendance" className="btn ghost">Mark attendance</Link>
            <Link to="/focus" className="btn ghost">Start focus</Link>
          </div>
        </div>

        <div className="stats">
          <div className="card stat cp">
            <div className="ic"><CheckSquare className="i" /></div>
            <div>
              <small>Attendance</small>
              <b>{attendance.length > 0 ? `${attPct}%` : 'N/A'}</b>
              <span>Minimum 75%</span>
            </div>
          </div>
          <div className="card stat cp">
            <div className="ic"><ListTodo className="i" /></div>
            <div>
              <small>Tasks Remaining</small>
              <b>{remainingToday}</b>
              <span>{overdueCount} overdue</span>
            </div>
          </div>
          <div className="card stat cp">
            <div className="ic"><Target className="i" /></div>
            <div>
              <small>Studied this week</small>
              <b>{currHours}h {currMins}m</b>
              <span>{diffText}</span>
            </div>
          </div>
          <div className="card stat cp">
            <div className="ic"><Calendar className="i" /></div>
            <div>
              <small>Next exam</small>
              <b>{nextExam ? `${nextExam.days} days` : 'None'}</b>
              <span>{nextExam ? nextExam.name : 'Relax!'}</span>
            </div>
          </div>
        </div>

        <div className="two">
          <div className="card cp">
            <h3>Upcoming tasks{!isMobile && <Link to="/tasks">View all</Link>}</h3>
            {loading ? (
              <p style={{ padding: 12, color: 'var(--muted)' }}>Loading...</p>
            ) : tableTasks.length === 0 ? (
              <p style={{ padding: 12, color: 'var(--muted)' }}>No upcoming tasks. You are all caught up!</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    {!isMobile && <th>Due</th>}
                    {!isMobile && <th>Priority</th>}
                    {isMobile ? <th>Status</th> : <th>Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {tableTasks.map(task => (
                    <tr key={task.id}>
                      <td>
                        {task.title}
                        <span className="sub">
                          {isMobile 
                            ? (task.dueDate ? new Date(task.dueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'No date') 
                            : getSubjectName(task.subjectId)}
                        </span>
                      </td>
                      {!isMobile && <td>{task.dueDate ? new Date(task.dueDate).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'No date'}</td>}
                      {!isMobile && <td>{getPriorityLabel(task.priority)}</td>}
                      <td>{getStatusBadge(task.status, task)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="card cp">
            <h3>Today's classes{!isMobile && <Link to="/timetable">Timetable</Link>}</h3>
            {todaysClasses.length === 0 ? (
              <p style={{ padding: 12, color: 'var(--muted)' }}>No classes today.</p>
            ) : (
              todaysClasses.map(c => (
                <div key={c.id} className="cls">
                  <time>{c.startTime}</time>
                  <span className="bar"></span>
                  <div>{getSubjectName(c.subjectId)}<span className="sub">{isMobile ? (c.room || 'TBA') : `Room ${c.room || 'TBA'}`}</span></div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="two">
          <div className="card cp">
            <h3>Study hours this week{!isMobile && <Link to="/analytics">Analytics</Link>}</h3>
            <div className="chart">
              {dailyMins.map((mins, i) => (
                <div key={i} style={{ height: `${Math.max(5, (mins / maxDaily) * 100)}%`, opacity: mins > 0 ? 1 : 0.3 }} title={`${mins} mins`}></div>
              ))}
            </div>
            <div className="days">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>
          
          <div className="card cp">
            <h3>Attendance by subject{!isMobile && <Link to="/attendance">Details</Link>}</h3>
            {attBySubject.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 10 }}>No attendance recorded.</p>
            ) : (
              attBySubject.map(a => (
                <div key={a.id} className="att">
                  {getSubjectName(a.id)}<span className={a.pct < 75 ? "badge late" : ""}>{a.pct}% {a.pct < 75 ? 'Low' : ''}</span>
                  <div className={`meter ${a.pct < 75 ? 'low' : ''}`}><i style={{ width: `${a.pct}%` }}></i></div>
                </div>
              ))
            )}
          </div>
        </div>
        
      </div>
    </>
  );
};
