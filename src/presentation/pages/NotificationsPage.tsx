import React, { useState, useEffect, useMemo } from 'react';
import './other-pages.css';

import { taskService } from '../../business/services/taskService';
import { subjectService } from '../../business/services/subjectService';
import { attendanceService } from '../../business/services/attendanceService';
import type { Task, Subject, AttendanceRecord } from '../../types/index';

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  timeLabel: string;
  type: 'danger' | 'warning' | 'info';
  timestamp: number;
}

export const NotificationsPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [readNotifs, setReadNotifs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('readNotifs');
      if (stored) {
        setReadNotifs(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [tsks, subs, atts] = await Promise.all([
          taskService.getTasks(),
          subjectService.getSubjects(),
          attendanceService.getRecords()
        ]);
        setTasks(tsks);
        setSubjects(subs);
        setAttendance(atts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const notifications = useMemo(() => {
    if (loading) return [];
    const notifs: NotificationItem[] = [];
    const now = new Date();
    
    // 1. Task/Exam/Assignment Notifications
    tasks.forEach(t => {
      if (t.status === 'completed' || !t.dueDate) return;
      
      const dueDate = new Date(t.dueDate);
      const diffTime = dueDate.getTime() - now.getTime();
      const diffHours = diffTime / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      const subName = subjects.find(s => s.id === t.subjectId)?.name || '';
      const prefix = subName ? `${subName}: ` : '';

      if (diffTime < 0) {
        // Overdue
        notifs.push({
          id: `task-overdue-${t.id}`,
          title: `Overdue ${t.eventType || 'Task'}: ${prefix}${t.title}`,
          desc: `This was due on ${dueDate.toLocaleDateString()} at ${dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`,
          timeLabel: `${Math.floor(Math.abs(diffHours))} hours ago`,
          type: 'danger',
          timestamp: dueDate.getTime()
        });
      } else if (diffDays <= 7 && t.eventType === 'Exam') {
        // Upcoming Exam (next 7 days)
        notifs.push({
          id: `exam-upcoming-${t.id}`,
          title: `Upcoming Exam: ${prefix}${t.title}`,
          desc: `Scheduled for ${dueDate.toLocaleDateString()} at ${dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`,
          timeLabel: `in ${Math.ceil(diffDays)} days`,
          type: 'warning',
          timestamp: dueDate.getTime()
        });
      } else if (diffDays <= 2) {
        // Upcoming Task/Assignment (next 48 hours)
        notifs.push({
          id: `task-upcoming-${t.id}`,
          title: `Deadline Approaching: ${prefix}${t.title}`,
          desc: `Due ${diffDays < 1 ? 'today' : 'tomorrow'} at ${dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`,
          timeLabel: `in ${Math.floor(diffHours)} hours`,
          type: 'info',
          timestamp: dueDate.getTime()
        });
      }
    });

    const globalThreshold = parseInt(localStorage.getItem('globalAttendanceThreshold') || '75');
    subjects.forEach(sub => {
      const subAtt = attendance.filter(a => a.subjectId === sub.id);
      if (subAtt.length > 0) {
        const presentCount = subAtt.filter(a => a.status === 'Present' || a.status === 'Late').length;
        const pct = Math.round((presentCount / subAtt.length) * 100);
        const threshold = sub.attendanceThreshold || globalThreshold;

        if (pct < threshold) {
          notifs.push({
            id: `att-warn-${sub.id}`,
            title: `${sub.name} Attendance Warning`,
            desc: `Your attendance is at ${pct}%, which is below the ${threshold}% requirement.`,
            timeLabel: `Current Status`,
            type: 'danger',
            timestamp: now.getTime() - 1 // Make it appear at the top
          });
        }
      }
    });

    // Sort by timestamp (most urgent / recent first)
    // For overdue, smaller timestamp (more in the past) = first? Actually let's just sort by timestamp desc, but wait.
    // Overdue is past, Upcoming is future.
    const typeWeight = { danger: 3, warning: 2, info: 1 };
    return notifs
      .filter(n => !readNotifs.includes(n.id))
      .sort((a, b) => typeWeight[b.type] - typeWeight[a.type]);
    
  }, [tasks, subjects, attendance, loading, readNotifs]);

  const handleMarkAllRead = () => {
    const allIds = notifications.map(n => n.id);
    if (allIds.length === 0) return;
    
    const newReadNotifs = Array.from(new Set([...readNotifs, ...allIds]));
    setReadNotifs(newReadNotifs);
    localStorage.setItem('readNotifs', JSON.stringify(newReadNotifs));
  };

  return (
    <>
      <div className="hdr">
        <h2>Notifications</h2>
        <div className="r">
          <button className="btn" onClick={handleMarkAllRead} disabled={notifications.length === 0 || loading} style={{ opacity: notifications.length === 0 ? 0.5 : 1 }}>
            Mark all as read
          </button>
        </div>
      </div>
      <div className="content">
        <div className="cw">
          <div className="pg">
            <div className="card cp">
              {loading ? (
                <p style={{ padding: 20, color: 'var(--muted)' }}>Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                  <h3 style={{ marginBottom: 8, color: 'var(--ink)' }}>All caught up!</h3>
                  <p>You have no new notifications right now.</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="row-item" style={{ 
                    background: n.type === 'danger' ? 'var(--tint)' : 'transparent', 
                    padding: n.type === 'danger' ? '12px 16px' : '12px 16px', 
                    borderRadius: 8, 
                    margin: n.type === 'danger' ? '-4px -4px 12px' : '0 0 12px', 
                    border: n.type === 'danger' ? '1px solid var(--rc)' : n.type === 'warning' ? '1px solid var(--orange)' : '1px solid var(--line)'
                  }}>
                    <div className="g1">
                      <span className="t" style={{ color: n.type === 'danger' ? 'var(--rc)' : n.type === 'warning' ? 'var(--orange)' : 'var(--ink)' }}>
                        {n.title}
                      </span>
                      <span className="sub">{n.desc}</span>
                      <span className="sub" style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
                        {n.timeLabel}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
