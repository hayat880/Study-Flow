import React, { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { taskService } from '../../business/services/taskService';
import { subjectService } from '../../business/services/subjectService';
import { timetableService } from '../../business/services/timetableService';
import type { Task, Subject, TimetableClass } from '../../types/index';
import './schedule.css';

const EVENT_TYPES = ['Task', 'Assignment', 'Exam', 'Quiz', 'Lab', 'Project', 'Study', 'Other'];

export const SchedulePage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<TimetableClass[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<Task> & { id?: string }>({
    title: '',
    eventType: 'Assignment',
    priority: 'medium',
    status: 'pending'
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [t, s, c] = await Promise.all([
        taskService.getTasks(),
        subjectService.getSubjects(),
        timetableService.getClasses()
      ]);
      setTasks(t);
      setSubjects(s);
      setClasses(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.dueDate) return;
    try {
      setSaving(true);
      if (newEvent.id) {
        const updated = await taskService.updateTask(newEvent.id, {
          title: newEvent.title,
          description: newEvent.description || '',
          dueDate: newEvent.dueDate,
          priority: newEvent.priority as any,
          status: newEvent.status as any,
          eventType: newEvent.eventType as any,
          subjectId: newEvent.subjectId || undefined,
        });
        setTasks(tasks.map(t => t.id === updated.id ? updated : t));
      } else {
        const added = await taskService.addTask({
          title: newEvent.title,
          description: newEvent.description || '',
          dueDate: newEvent.dueDate,
          priority: newEvent.priority as any,
          status: newEvent.status as any,
          eventType: newEvent.eventType as any,
          subjectId: newEvent.subjectId || undefined,
        });
        setTasks([...tasks, added]);
      }
      setIsAddOpen(false);
      setNewEvent({ id: undefined, title: '', eventType: 'Assignment', priority: 'medium', status: 'pending' });
    } catch (e) {
      console.error(e);
      alert("Failed to add event");
    } finally {
      setSaving(false);
    }
  };

  // Calendar logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon=0, Sun=6
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ d: daysInPrevMonth - i, out: true, date: new Date(year, month - 1, daysInPrevMonth - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ d, out: false, date: new Date(year, month, d) });
  }
  let extraDays = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ d: extraDays++, out: true, date: new Date(year, month + 1, extraDays - 1) });
  }

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const goToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  // Combine tasks and classes for a specific date
  const getEventsForDate = (d: Date) => {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split('T')[0];
    
    // Day tasks
    const dayTasks = tasks.filter(t => t.dueDate && t.dueDate.startsWith(dateStr));
    
    // Timetable classes
    const dayClasses = classes.filter(c => c.dayOfWeek === dayOfWeek);
    
    // Sort combined by time
    const combined: any[] = [];
    
    dayTasks.forEach(t => {
      let timeStr = '11:59 PM'; // Default if no exact time
      let timeVal = 2359;
      if (t.dueDate?.includes('T')) {
        const timePart = t.dueDate.split('T')[1];
        const h = parseInt(timePart.split(':')[0]);
        const m = parseInt(timePart.split(':')[1]);
        const dObj = new Date();
        dObj.setHours(h, m);
        timeStr = dObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        timeVal = h * 100 + m;
      }
      combined.push({
        id: t.id,
        type: 'task',
        title: t.title,
        eventType: t.eventType,
        subjectId: t.subjectId,
        timeStr,
        timeVal,
        priority: t.priority,
        description: t.description
      });
    });
    
    dayClasses.forEach(c => {
      const [h, m] = c.startTime.split(':');
      const dObj = new Date();
      dObj.setHours(parseInt(h), parseInt(m));
      const timeStr = dObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      combined.push({
        id: c.id,
        type: 'class',
        title: 'Class', // Replaced below
        subjectId: c.subjectId,
        room: c.room,
        timeStr,
        timeVal: parseInt(h) * 100 + parseInt(m)
      });
    });
    
    return combined.sort((a, b) => a.timeVal - b.timeVal);
  };

  const selectedEvents = getEventsForDate(selectedDate);
  
  const getEventClass = (type: string) => {
    if (type === 'Exam' || type === 'Quiz') return 'exam';
    if (type === 'Study') return 'study';
    return 'task';
  };

  return (
    <>
      <div className="hdr">
        <h2>Schedule</h2>
        <div className="r">
          <button className="btn pri" onClick={() => {
            setNewEvent({ id: undefined, title: '', eventType: 'Assignment', priority: 'medium', status: 'pending' });
            setIsAddOpen(true);
          }}>
            <Plus className="i" /> Add event
          </button>
        </div>
      </div>
      <div className="content-sch">
        <div className="card">
          <div className="bar">
            <span className="ib" onClick={prevMonth}><ChevronLeft className="i" /></span>
            <span className="ib" onClick={nextMonth}><ChevronRight className="i" /></span>
            <h3>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <button className="btn" onClick={goToday}>Today</button>
            {!isMobile && (
              <div className="views">
                <span className="on">Month</span>
              </div>
            )}
          </div>
          
          {isMobile ? (
            <div className="mgrid">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <div key={d} className="h">{d}</div>)}
              {cells.map((c, i) => {
                const evs = getEventsForDate(c.date);
                const hasExam = evs.some(e => e.eventType === 'Exam' || e.eventType === 'Quiz');
                const isToday = isSameDay(c.date, new Date());
                const isSel = isSameDay(c.date, selectedDate);
                
                return (
                  <div 
                    key={i} 
                    className={`d ${c.out ? 'out' : ''} ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}`}
                    onClick={() => setSelectedDate(c.date)}
                  >
                    {c.d}
                    {evs.length > 0 && <u className={hasExam ? 'r' : ''}></u>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cal">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="dow">{d}</div>)}
              {cells.map((c, i) => {
                const evs = getEventsForDate(c.date);
                const isToday = isSameDay(c.date, new Date());
                const isSel = isSameDay(c.date, selectedDate);
                
                return (
                  <div 
                    key={i} 
                    className={`day ${c.out ? 'out' : ''} ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}`}
                    onClick={() => setSelectedDate(c.date)}
                  >
                    <span className="n">{c.d}</span>
                    {evs.slice(0, 3).map((e, j) => (
                      <span key={j} className={`ev ${e.type === 'class' ? 'cls' : getEventClass(e.eventType)}`}>
                        {e.type === 'class' ? subjects.find(s=>s.id===e.subjectId)?.name : e.title}
                      </span>
                    ))}
                    {evs.length > 3 && <span className="more">+{evs.length - 3} more</span>}
                  </div>
                );
              })}
            </div>
          )}
          
          {!isMobile && (
            <div className="legend-sch">
              <span><i style={{ background: 'var(--blue)' }}></i>Task / Assignment</span>
              <span><i style={{ background: 'var(--ink)' }}></i>Class</span>
              <span><i style={{ background: 'var(--rc)' }}></i>Exam / Quiz</span>
            </div>
          )}
        </div>
        
        <div className="card pad">
          <h3>{selectedDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          <div className="sub">{selectedEvents.length} items</div>
          <div style={{ marginTop: 16 }}>
            {selectedEvents.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No events scheduled.</div>}
            {selectedEvents.map(e => {
              const sub = subjects.find(s => s.id === e.subjectId);
              if (e.type === 'class') {
                return (
                  <div key={e.id} className="ag cls">
                    <time>{e.timeStr}</time>
                    <span className="bar2"></span>
                    <div><span className="t">{sub?.name || 'Unknown Subject'}</span><span className="s">Class {e.room ? `· ${e.room}` : ''}</span></div>
                  </div>
                );
              } else {
                return (
                  <div key={e.id} className={`ag ${getEventClass(e.eventType)}`}>
                    <time>{e.timeStr}</time>
                    <span className="bar2"></span>
                    <div style={{ flex: 1 }}><span className="t">{e.title}</span><span className="s">{e.eventType} {sub ? `· ${sub.name}` : ''}</span></div>
                    <button className="btn" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => {
                      setNewEvent({
                        id: e.id,
                        title: e.title,
                        eventType: e.eventType,
                        subjectId: e.subjectId,
                        priority: e.priority,
                        description: e.description,
                        dueDate: selectedDate.toISOString().split('T')[0] + 'T' + (e.timeStr === '11:59 PM' ? '23:59' : new Date(`2000-01-01 ${e.timeStr}`).toISOString().substring(11, 16))
                      });
                      setIsAddOpen(true);
                    }}>Edit</button>
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>

      {isAddOpen && (
        <>
          <div className="veil" style={{ display: 'block' }} onClick={() => setIsAddOpen(false)}></div>
          <div className="drawer" role="dialog" style={{ display: 'flex' }}>
            <div className="dh">
              <h3>{newEvent.id ? 'Edit Event' : 'Add Event'}</h3>
              <button className="btn" style={{ padding: '6px 10px' }} onClick={() => setIsAddOpen(false)}>Close</button>
            </div>
            <div className="db">
              <div className="f">
                <label>Title <i>*</i></label>
                <input className="in" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="Event title" />
              </div>
              <div className="g2">
                <div className="f">
                  <label>Type</label>
                  <select className="in" value={newEvent.eventType} onChange={e => setNewEvent({...newEvent, eventType: e.target.value as any})}>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="f">
                  <label>Subject</label>
                  <select className="in" value={newEvent.subjectId || ''} onChange={e => setNewEvent({...newEvent, subjectId: e.target.value})}>
                    <option value="">No subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="f">
                <label>Date & Time <i>*</i></label>
                <input type="datetime-local" className="in" value={newEvent.dueDate || ''} onChange={e => {
                  const val = e.target.value;
                  const d = new Date(val);
                  setNewEvent({...newEvent, dueDate: d.toISOString()});
                }} />
              </div>
              <div className="f">
                <label>Description</label>
                <textarea className="in" rows={3} value={newEvent.description || ''} onChange={e => setNewEvent({...newEvent, description: e.target.value})}></textarea>
              </div>
            </div>
            <div className="df">
              <button className="btn" onClick={() => setIsAddOpen(false)}>Cancel</button>
              <button className="btn pri" disabled={saving || !newEvent.title || !newEvent.dueDate} onClick={handleAddEvent}>
                {saving ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
