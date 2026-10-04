import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Play, Pause, Square, Trash2, Check, Clock } from 'lucide-react';
import { plannerService } from '../../business/services/plannerService';
import { subjectService } from '../../business/services/subjectService';
import { taskService } from '../../business/services/taskService';
import type { StudySession, Subject, Task } from '../../types/index';
import { useNavigate } from 'react-router-dom';

export const PlannerPage: React.FC = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const navigate = useNavigate();
  
  const [msgModal, setMsgModal] = useState<{title: string, message: string} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newDuration, setNewDuration] = useState(60); // minutes
  


  useEffect(() => {
    loadData();
    // Default today's date for inputs
    const today = new Date();
    setNewDate(today.toISOString().split('T')[0]);
    setNewStartTime('09:00');
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [sess, subs, tsks] = await Promise.all([
        plannerService.getSessions(),
        subjectService.getSubjects(),
        taskService.getTasks()
      ]);
      setSessions(sess);
      setSubjects(subs);
      setTasks(tsks.filter(t => t.status !== 'completed'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const days = [];
    const curr = new Date();
    const dayOfWeek = curr.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = curr.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    
    const monday = new Date(curr.getTime());
    monday.setDate(diff);
    monday.setHours(0,0,0,0);
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime());
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };
  const weekDays = useMemo(() => getWeekDays(), []);

  const selectedDaySessions = useMemo(() => {
    return sessions.filter(s => {
      const sDate = new Date(s.scheduledStart);
      return sDate.getDate() === selectedDate.getDate() && 
             sDate.getMonth() === selectedDate.getMonth() && 
             sDate.getFullYear() === selectedDate.getFullYear();
    }).sort((a, b) => a.scheduledStart - b.scheduledStart);
  }, [sessions, selectedDate]);

  const handleAddSession = async () => {
    if (!newTitle || !newDate || !newStartTime) return;
    try {
      setSaving(true);
      const startObj = new Date(`${newDate}T${newStartTime}`);
      const endObj = new Date(startObj.getTime() + newDuration * 60000);
      
      const added = await plannerService.addSession({
        title: newTitle,
        subjectId: newSubject || null,
        taskId: newTask || null,
        scheduledStart: startObj.getTime(),
        scheduledEnd: endObj.getTime(),
        status: 'Planned',
        actualDuration: 0,
      });
      setSessions([...sessions, added]);
      setIsAddOpen(false);
      setNewTitle('');
    } catch (e) {
      console.error(e);
      setMsgModal({ title: 'Error', message: 'Failed to add session.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      title: 'Delete Session',
      message: 'Are you sure you want to delete this study session?',
      onConfirm: async () => {
        try {
          await plannerService.deleteSession(id);
          setSessions(sessions.filter(s => s.id !== id));
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const markSkipped = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await plannerService.markSkipped(id);
      setSessions(sessions.map(s => s.id === id ? updated : s));
    } catch (err) {
      console.error(err);
    }
  };

  const startTimerForSession = async (s: StudySession) => {
    navigate(`/focus?session=${s.id}`);
  };

  // --- Stats ---
  const totalPlannedMinutes = selectedDaySessions.reduce((acc, s) => {
    return acc + Math.round((s.scheduledEnd - s.scheduledStart) / 60000);
  }, 0);
  const totalCompletedMinutes = selectedDaySessions.reduce((acc, s) => {
    return acc + ((s.status === 'Completed' || s.status === 'In Progress') ? s.actualDuration : 0);
  }, 0);
  const progressPct = totalPlannedMinutes === 0 ? 0 : Math.min(100, Math.round((totalCompletedMinutes / totalPlannedMinutes) * 100));

  return (
    <>
      <div className="hdr">
        <h2>Study Planner</h2>
        <div className="r">
          <button className="btn pri" onClick={() => setIsAddOpen(true)}>
            <Plus className="i" /> Add Session
          </button>
        </div>
      </div>
      <div className="content">
        <div className="cw">
          {/* Week Calendar */}
          <div className="card cp" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', padding: 10 }}>
            {weekDays.map((day, i) => {
              const isSelected = day.getDate() === selectedDate.getDate();
              const isToday = day.getDate() === new Date().getDate();
              return (
                <div 
                  key={i} 
                  onClick={() => setSelectedDate(day)}
                  style={{ 
                    flex: 1, 
                    textAlign: 'center', 
                    padding: '10px 0', 
                    cursor: 'pointer',
                    borderRadius: 8,
                    background: isSelected ? 'var(--blue)' : 'transparent',
                    color: isSelected ? '#fff' : 'inherit'
                  }}
                >
                  <div style={{ fontSize: 12, opacity: isSelected ? 0.9 : 0.6, fontWeight: 600, textTransform: 'uppercase' }}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                    {day.getDate()}
                  </div>
                  {isToday && !isSelected && <div style={{ width: 4, height: 4, background: 'var(--blue)', borderRadius: '50%', margin: '4px auto 0' }}></div>}
                </div>
              );
            })}
          </div>

          <div className="pg">
            <div className="g c2">
              <div className="card cp">
                <h3>Sessions for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                {loading ? (
                  <p style={{ padding: 12 }}>Loading...</p>
                ) : selectedDaySessions.length === 0 ? (
                  <p style={{ padding: 12, color: 'var(--muted)' }}>No study sessions planned for this day.</p>
                ) : (
                  selectedDaySessions.map(session => {
                    const sub = subjects.find(s => s.id === session.subjectId);
                    const plannedMins = Math.round((session.scheduledEnd - session.scheduledStart) / 60000);
                    const startTimeStr = new Date(session.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <div key={session.id} className="row-item" style={{ opacity: session.status === 'Skipped' ? 0.5 : 1 }}>
                        <div style={{ width: 60, fontWeight: 600, fontSize: 13 }}>
                          {startTimeStr}
                        </div>
                        <div className="g1" style={{ marginLeft: 10 }}>
                          <span className="t" style={{ textDecoration: session.status === 'Skipped' ? 'line-through' : 'none' }}>
                            {session.title}
                          </span>
                          <span className="sub">
                            {sub ? sub.name + ' · ' : ''} {plannedMins} min
                            {session.status === 'Completed' && ` · Actual: ${session.actualDuration} min`}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 6 }}>
                          {session.status === 'Planned' && (
                            <>
                              <button className="btn pri" style={{ padding: '4px 10px' }} onClick={() => startTimerForSession(session)}>
                                <Play className="i" style={{ width: 14, height: 14 }} /> Start
                              </button>
                              <button className="btn" style={{ padding: '4px 8px' }} onClick={(e) => markSkipped(session.id, e)}>Skip</button>
                            </>
                          )}
                          {session.status === 'In Progress' && (
                            <>
                              <button className="btn pri" style={{ padding: '4px 10px', background: 'var(--wc)', borderColor: 'var(--wc)' }} onClick={() => startTimerForSession(session)}>
                                <Play className="i" style={{ width: 14, height: 14 }} /> Resume
                              </button>
                            </>
                          )}
                          {session.status === 'Completed' && (
                            <span className="badge ok">Completed</span>
                          )}
                          {session.status === 'Skipped' && (
                            <span className="badge">Skipped</span>
                          )}
                          <button className="btn" style={{ padding: '4px 8px', border: 'none' }} onClick={(e) => handleDelete(session.id, e)}>
                            <Trash2 className="i" style={{ width: 14, height: 14, color: 'var(--muted)' }} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="card cp">
                <h3>Today's Progress</h3>
                <div style={{ padding: '20px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 700, color: progressPct === 100 ? 'var(--okc)' : 'var(--blue)' }}>
                    {progressPct}%
                  </div>
                  <p style={{ color: 'var(--muted)', marginTop: 8 }}>
                    Completed <b>{totalCompletedMinutes}</b> out of <b>{totalPlannedMinutes}</b> planned minutes.
                  </p>
                  
                  <div className="meter" style={{ height: 12, marginTop: 20 }}>
                    <i style={{ width: `${progressPct}%`, background: progressPct >= 100 ? 'var(--okc)' : 'var(--blue)' }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Add Session Modal */}
      {isAddOpen && (
        <>
          <div className="veil" style={{ display: 'block' }} onClick={() => setIsAddOpen(false)}></div>
          <div className="drawer" role="dialog" style={{ display: 'flex' }}>
            <div className="dh">
              <h3>Add Study Session</h3>
              <button className="btn" style={{ padding: '6px 10px' }} onClick={() => setIsAddOpen(false)}>Close</button>
            </div>
            <div className="db">
              <div className="f">
                <label>Topic / Title <i>*</i></label>
                <input className="in" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Trees and graphs" />
              </div>
              <div className="f">
                <label>Subject</label>
                <select className="in" value={newSubject} onChange={e => setNewSubject(e.target.value)}>
                  <option value="">Select subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="f">
                <label>Link to Task (Optional)</label>
                <select className="in" value={newTask} onChange={e => setNewTask(e.target.value)}>
                  <option value="">No linked task</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="f" style={{ flex: 1 }}>
                  <label>Date <i>*</i></label>
                  <input type="date" className="in" value={newDate} onChange={e => setNewDate(e.target.value)} />
                </div>
                <div className="f" style={{ flex: 1 }}>
                  <label>Start Time <i>*</i></label>
                  <input type="time" className="in" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} />
                </div>
              </div>
              
              <div className="f">
                <label>Duration (minutes)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="range" min="15" max="240" step="15" value={newDuration} onChange={e => setNewDuration(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--blue)' }} />
                  <div style={{ width: 60, fontWeight: 600 }}>{newDuration} min</div>
                </div>
              </div>
            </div>
            <div className="df">
              <button className="btn" onClick={() => setIsAddOpen(false)}>Cancel</button>
              <button className="btn pri" disabled={saving || !newTitle || !newDate || !newStartTime} onClick={handleAddSession}>
                {saving ? 'Saving...' : 'Save Session'}
              </button>
            </div>
          </div>
        </>
      )}

      {msgModal && (
        <>
          <div className="modal-veil" onClick={() => setMsgModal(null)}></div>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="mh">{msgModal.title}</div>
            <div className="mb">{msgModal.message}</div>
            <div className="mf">
              <button className="btn pri" onClick={() => setMsgModal(null)}>Okay</button>
            </div>
          </div>
        </>
      )}

      {confirmModal && (
        <>
          <div className="modal-veil" onClick={() => setConfirmModal(null)}></div>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="mh">{confirmModal.title}</div>
            <div className="mb">{confirmModal.message}</div>
            <div className="mf">
              <button className="btn" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button className="btn pri" style={{ background: 'var(--rc)', borderColor: 'var(--rc)' }} onClick={() => {
                confirmModal.onConfirm();
                setConfirmModal(null);
              }}>Confirm</button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
