import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { plannerService } from '../../business/services/plannerService';
import { subjectService } from '../../business/services/subjectService';
import { taskService } from '../../business/services/taskService';
import type { StudySession, Subject, Task } from '../../types/index';
import './other-pages.css';

export const FocusPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  
  // Form state for ad-hoc sessions
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [targetMinutes, setTargetMinutes] = useState(45);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [sessionSeconds, setSessionSeconds] = useState(0); // Time spent purely in THIS sitting
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  const [msgModal, setMsgModal] = useState<{title: string, message: string, onOk?: () => void} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [subs, tsks, sess] = await Promise.all([
        subjectService.getSubjects(),
        taskService.getTasks(),
        plannerService.getSessions()
      ]);
      setSubjects(subs);
      setTasks(tsks.filter(t => t.status !== 'completed'));
      setSessions(sess);

      if (sessionId) {
        const s = sess.find(x => x.id === sessionId);
        if (s) {
          setActiveSession(s);
          const plannedSecs = Math.round((s.scheduledEnd - s.scheduledStart) / 1000);
          const remainingSecs = Math.max(0, plannedSecs - (s.actualDuration * 60));
          setTimeLeft(remainingSecs > 0 ? remainingSecs : 0);
          setSelectedSubject(s.subjectId || '');
          setSelectedTask(s.taskId || '');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!activeSession && !sessionId) {
      setTimeLeft(targetMinutes * 60);
    }
  }, [targetMinutes, activeSession, sessionId]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setSessionSeconds(prev => prev + 1);
        setTimeLeft(prev => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const handleStart = async () => {
    if (activeSession) {
      // It's a planned session
      if (activeSession.status === 'Planned') {
        const updated = await plannerService.startSession(activeSession.id);
        setActiveSession(updated);
      }
      setIsRunning(true);
    } else {
      // Ad-hoc session
      try {
        const now = Date.now();
        const end = now + (targetMinutes * 60 * 1000);
        const newSess = await plannerService.addSession({
          title: 'Focus Session',
          subjectId: selectedSubject || null,
          taskId: selectedTask || null,
          scheduledStart: now,
          scheduledEnd: end,
          status: 'In Progress',
          actualDuration: 0,
        });
        setActiveSession(newSess);
        setIsRunning(true);
      } catch (e) {
        console.error(e);
        setMsgModal({ title: 'Error', message: 'Failed to start session.' });
      }
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleSaveProgress = async () => {
    if (!activeSession) return;
    setIsRunning(false);
    
    const sittingMinutes = Math.round(sessionSeconds / 60);
    const newTotalMinutes = activeSession.actualDuration + sittingMinutes;

    try {
      await plannerService.saveProgress(activeSession.id, newTotalMinutes);
      setMsgModal({ 
        title: 'Success', 
        message: `Progress saved! You focused for ${sittingMinutes} minutes in this sitting.`,
        onOk: () => navigate('/planner')
      });
    } catch (e) {
      console.error(e);
      setMsgModal({ title: 'Error', message: 'Failed to save session.' });
    }
  };

  const handleFinish = async () => {
    if (!activeSession) return;
    setIsRunning(false);
    
    const sittingMinutes = Math.round(sessionSeconds / 60);
    const newTotalMinutes = activeSession.actualDuration + sittingMinutes;

    try {
      await plannerService.finishSession(activeSession.id, newTotalMinutes);
      setMsgModal({
        title: 'Session Completed',
        message: `You focused for ${sittingMinutes} minutes in this sitting.`,
        onOk: () => navigate('/planner')
      });
    } catch (e) {
      console.error(e);
      setMsgModal({ title: 'Error', message: 'Failed to save session.' });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Focused today
  const completedToday = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return sessions.filter(s => {
      if (s.status !== 'Completed' && s.status !== 'In Progress') return false;
      if (s.status === 'In Progress' && s.actualDuration === 0) return false;
      
      const d = new Date(s.scheduledStart);
      d.setHours(0,0,0,0);
      return d.getTime() === today.getTime();
    });
  }, [sessions]);

  const totalCompletedMinutes = completedToday.reduce((acc, s) => acc + s.actualDuration, 0);

  return (
    <>
      <div className="hdr">
        <h2>Focus Mode</h2>
      </div>
      <div className="content">
        <div className="cw">
          <div className="pg">
            <div className="g c21">
              <div className="card cp" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div className="g c2" style={{ textAlign: 'left', marginBottom: 20 }}>
                  <div className="f">
                    <label>Subject</label>
                    <select className="in" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!!sessionId || isRunning}>
                      <option value="">General (No subject)</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="f">
                    <label>Linked task (optional)</label>
                    <select className="in" value={selectedTask} onChange={e => setSelectedTask(e.target.value)} disabled={!!sessionId || isRunning}>
                      <option value="">No task</option>
                      {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ margin: '40px 0', position: 'relative' }}>
                  <div style={{ width: 250, height: 250, borderRadius: '50%', border: '8px solid var(--line)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <div style={{ fontSize: 56, fontWeight: 700, fontFamily: 'monospace', color: 'var(--blue)' }}>
                      {formatTime(timeLeft)}
                    </div>
                    <span style={{ color: 'var(--muted)', marginTop: 4 }}>
                      {isRunning ? 'Focusing...' : (activeSession ? 'Paused' : 'Ready')}
                    </span>
                  </div>
                </div>

                {!sessionId && !activeSession && (
                  <div style={{ maxWidth: 360, margin: '0 auto 24px' }}>
                    <div className="seg" style={{ marginBottom: 10 }}>
                      {[15, 25, 45, 60, 90].map(min => (
                        <span key={min} className={targetMinutes === min ? 'on' : ''} onClick={() => setTargetMinutes(min)} style={{ cursor: 'pointer' }}>
                          {min}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Custom time:</span>
                      <input 
                        type="number" 
                        className="in" 
                        style={{ width: 80, textAlign: 'center', padding: '6px' }} 
                        value={targetMinutes} 
                        onChange={e => setTargetMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                      />
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>min</span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  {!isRunning ? (
                    <button className="btn pri" style={{ padding: '10px 30px', fontSize: 16 }} onClick={handleStart}>
                      {activeSession ? 'Resume' : 'Start Focus'}
                    </button>
                  ) : (
                    <button className="btn" style={{ padding: '10px 30px', fontSize: 16 }} onClick={handlePause}>
                      Pause
                    </button>
                  )}
                  {activeSession && (
                    <>
                      <button className="btn" style={{ padding: '10px 15px', fontSize: 16 }} onClick={handleSaveProgress}>
                        Save & Pause
                      </button>
                      <button className="btn pri" style={{ padding: '10px 15px', fontSize: 16, background: 'var(--okc)', color: 'white', border: 'none' }} onClick={handleFinish}>
                        Mark Completed
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="card cp">
                <h3>Focused Today</h3>
                {completedToday.length === 0 ? (
                  <p style={{ color: 'var(--muted)' }}>You haven't focused on any sessions today.</p>
                ) : (
                  <>
                    {completedToday.map(s => {
                      const sub = subjects.find(x => x.id === s.subjectId);
                      return (
                        <div key={s.id} className="row-item">
                          <div className="g1">
                            <span className="t">{s.title || (sub ? sub.name : 'Focus Session')}</span>
                            <span className="sub">{s.actualDuration} min · {s.status === 'Completed' ? 'completed' : 'paused'}</span>
                          </div>
                          <span className={`badge ${s.status === 'Completed' ? 'ok' : 'warn'}`}>{s.status === 'Completed' ? 'Saved' : 'Paused'}</span>
                        </div>
                      );
                    })}
                    <div className="row-item" style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 16 }}>
                      <div className="g1">
                        <span className="t">Total focus time today</span>
                      </div>
                      <b style={{ fontSize: 16 }}>{Math.floor(totalCompletedMinutes / 60)}h {totalCompletedMinutes % 60}m</b>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {msgModal && (
        <>
          <div className="modal-veil" onClick={() => {
            if (msgModal.onOk) msgModal.onOk();
            setMsgModal(null);
          }}></div>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="mh">{msgModal.title}</div>
            <div className="mb">{msgModal.message}</div>
            <div className="mf">
              <button className="btn pri" onClick={() => {
                if (msgModal.onOk) msgModal.onOk();
                setMsgModal(null);
              }}>Okay</button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
