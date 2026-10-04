import React, { useState, useEffect, useMemo } from 'react';
import './other-pages.css';

import { plannerService } from '../../business/services/plannerService';
import { taskService } from '../../business/services/taskService';
import { subjectService } from '../../business/services/subjectService';
import { attendanceService } from '../../business/services/attendanceService';
import { academicService } from '../../business/services/academicService';

import type { StudySession, Task, Subject, AttendanceRecord, AcademicRecord } from '../../types/index';

const StatCard = ({ label, value, subtext }: any) => (
  <div className="card cp stat">
    <small>{label}</small>
    <b>{value}</b>
    <span>{subtext}</span>
  </div>
);

const AtCard = ({ subject, val, low }: any) => (
  <>
    <div className="sw">
      <span>{subject}</span><b>{val}%</b>
    </div>
    <div className={`meter ${low ? 'l' : ''}`}>
      <i style={{ width: `${val}%` }}></i>
    </div>
  </>
);

export const AnalyticsPage: React.FC = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [academic, setAcademic] = useState<AcademicRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [sess, tsks, subs, att, acad] = await Promise.all([
          plannerService.getSessions(),
          taskService.getTasks(),
          subjectService.getSubjects(),
          attendanceService.getRecords(),
          academicService.getRecords()
        ]);
        setSessions(sess);
        setTasks(tsks);
        setSubjects(subs);
        setAttendance(att);
        setAcademic(acad);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Compute week bounds
  const currentWeekStart = useMemo(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(d.setDate(diff));
  }, []);

  const previousWeekStart = useMemo(() => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    return d;
  }, [currentWeekStart]);

  // Compute Study Hours
  const { currentWeekMins, previousWeekMins, dailyMins } = useMemo(() => {
    let curr = 0;
    let prev = 0;
    const daily = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun

    sessions.forEach(s => {
      if (s.actualDuration > 0) {
        const d = new Date(s.scheduledStart);
        if (d >= currentWeekStart) {
          curr += s.actualDuration;
          const dayIdx = (d.getDay() + 6) % 7; // Monday is 0, Sunday is 6
          daily[dayIdx] += s.actualDuration;
        } else if (d >= previousWeekStart && d < currentWeekStart) {
          prev += s.actualDuration;
        }
      }
    });

    return { currentWeekMins: curr, previousWeekMins: prev, dailyMins: daily };
  }, [sessions, currentWeekStart, previousWeekStart]);

  const currHours = Math.floor(currentWeekMins / 60);
  const currMinsRem = currentWeekMins % 60;
  const diffMins = currentWeekMins - previousWeekMins;
  const diffHours = Math.floor(Math.abs(diffMins) / 60);
  const diffText = diffMins >= 0 
    ? `${diffHours}h ${Math.abs(diffMins) % 60}m more than last week`
    : `${diffHours}h ${Math.abs(diffMins) % 60}m less than last week`;

  const maxDaily = Math.max(...dailyMins, 60); // At least 60 mins scale

  // Compute Tasks
  const { doneTasks, remainingTasks, delayedTasks } = useMemo(() => {
    let done = 0, rem = 0, del = 0;
    const now = new Date();
    tasks.forEach(t => {
      if (t.status === 'completed') done++;
      else {
        if (t.dueDate && new Date(t.dueDate) < now) del++;
        else rem++;
      }
    });
    return { doneTasks: done, remainingTasks: rem, delayedTasks: del };
  }, [tasks]);

  const totalTasks = doneTasks + remainingTasks + delayedTasks;
  const taskPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  // Compute Attendance
  const attPct = useMemo(() => {
    if (attendance.length === 0) return 0;
    const present = attendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
    return Math.round((present / attendance.length) * 100);
  }, [attendance]);

  // Compute Marks
  const marksStats = useMemo(() => {
    if (academic.length === 0) return { overall: 0, bySubject: [] as {name: string, pct: number}[] };
    let totalScore = 0;
    let totalMax = 0;
    
    const subjectMap = new Map<string, {s: number, m: number}>();

    academic.forEach(r => {
      totalScore += r.obtainedMarks;
      totalMax += r.totalMarks;
      if (r.subjectId) {
        const sm = subjectMap.get(r.subjectId) || {s:0, m:0};
        sm.s += r.obtainedMarks;
        sm.m += r.totalMarks;
        subjectMap.set(r.subjectId, sm);
      }
    });

    const bySub = Array.from(subjectMap.entries()).map(([id, data]) => {
      const sub = subjects.find(s => s.id === id);
      return {
        name: sub ? sub.name : 'Unknown',
        pct: Math.round((data.s / data.m) * 100)
      };
    }).sort((a, b) => b.pct - a.pct); // Highest first

    return {
      overall: totalMax === 0 ? 0 : Math.round((totalScore / totalMax) * 100),
      bySubject: bySub
    };
  }, [academic, subjects]);

  return (
    <>
      <div className="hdr">
        <h2>Analytics</h2>
      </div>
      <div className="content">
        <div className="cw">
          {loading ? (
            <p>Loading analytics...</p>
          ) : (
            <div className="pg">
              <div className="g c4">
                <StatCard label="Studied (This Week)" value={`${currHours}h ${currMinsRem}m`} subtext={diffText} />
                <StatCard label="Tasks Done" value={`${doneTasks} / ${totalTasks}`} subtext={`${taskPct}% completion`} />
                <StatCard label="Overall Attendance" value={`${attPct}%`} subtext="Based on all recorded classes" />
                <StatCard label="Overall Marks" value={`${marksStats.overall}%`} subtext={`Across ${marksStats.bySubject.length} subjects`} />
              </div>
              
              <div className="g c2">
                <div className="card cp">
                  <h3>Study hours (This Week)</h3>
                  <div className="bars">
                    {dailyMins.map((mins, i) => (
                      <div key={i} style={{ height: `${Math.max(5, (mins / maxDaily) * 100)}%`, opacity: mins > 0 ? 1 : 0.3 }} title={`${mins} mins`}></div>
                    ))}
                  </div>
                  <div className="days">
                    <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                  </div>
                </div>
                <div className="card cp">
                  <h3>Task completion</h3>
                  <div className="donut">
                    <b>{taskPct}%</b>
                  </div>
                  <div className="dots">
                    <span><i style={{ background: 'var(--blue)' }}></i>{doneTasks} Done</span>
                    <span><i style={{ background: 'var(--field)' }}></i>{remainingTasks} Remaining</span>
                    <span><i style={{ background: 'var(--rc)' }}></i>{delayedTasks} Delayed</span>
                  </div>
                </div>
              </div>
              
              <div className="g c2">
                <div className="card cp">
                  <h3>Marks by subject</h3>
                  {marksStats.bySubject.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: 13 }}>No academic records found.</p>
                  ) : (
                    marksStats.bySubject.map((s, i) => (
                      <AtCard key={i} subject={s.name} val={s.pct} low={s.pct < 50} />
                    ))
                  )}
                </div>
                
                <div className="card cp">
                  <h3>Weekly Report Insights</h3>
                  <div className="row-item">
                    <span className="sub" style={{ color: 'var(--ink)' }}>
                      {currentWeekMins === 0 && previousWeekMins === 0 
                        ? 'No study sessions recorded yet.'
                        : currentWeekMins === previousWeekMins 
                          ? 'You studied the exact same amount as last week.'
                          : currentWeekMins > previousWeekMins 
                            ? 'Great job! You studied more this week.' 
                            : 'You studied less this week compared to last.'}
                    </span>
                  </div>
                  <div className="row-item">
                    <span className="sub" style={{ color: 'var(--ink)' }}>
                      {totalTasks === 0 
                        ? 'No tasks assigned yet.'
                        : `You have completed ${taskPct}% of your total tasks. ${delayedTasks > 0 ? `Watch out for ${delayedTasks} delayed tasks!` : 'You are completely caught up!'}`}
                    </span>
                  </div>
                  <div className="row-item">
                    <span className="sub" style={{ color: 'var(--ink)' }}>
                      {attendance.length === 0 
                        ? 'No attendance data recorded yet.'
                        : attPct < 75 ? 'Warning: Overall attendance is below 75%.' : 'Attendance is healthy and above 75%.'}
                    </span>
                  </div>
                  <div className="row-item">
                    <span className="sub" style={{ color: 'var(--ink)' }}>
                      {academic.length === 0 
                        ? 'No academic records added yet.'
                        : marksStats.overall < 50 ? 'Overall grades need improvement.' : 'Academic performance is steady.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
