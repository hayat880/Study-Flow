import React, { useState, useEffect } from 'react';
import { subjectService } from '../../business/services/subjectService';
import { timetableService } from '../../business/services/timetableService';
import type { Subject, TimetableClass } from '../../types/index';
import './other-pages.css';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TimetablePage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<TimetableClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [newClass, setNewClass] = useState<Partial<TimetableClass>>({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    room: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [loadedSubjects, loadedClasses] = await Promise.all([
        subjectService.getSubjects(),
        timetableService.getClasses()
      ]);
      setSubjects(loadedSubjects);
      setClasses(loadedClasses);
    } catch (error) {
      console.error("Failed to load timetable data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openDrawerForNew = () => {
    if (subjects.length === 0) {
      setErrorMsg("You must add subjects first before scheduling classes.");
      return;
    }
    setNewClass({
      subjectId: subjects[0].id,
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
      room: ''
    });
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!newClass.subjectId || newClass.dayOfWeek === undefined || !newClass.startTime || !newClass.endTime) return;
    
    if (newClass.startTime >= newClass.endTime) {
      setErrorMsg("Start time must be before end time.");
      return;
    }

    const isOverlap = classes.some(c => {
      if (c.dayOfWeek !== newClass.dayOfWeek) return false;
      return newClass.startTime! < c.endTime && c.startTime < newClass.endTime!;
    });

    if (isOverlap) {
      setErrorMsg("This class overlaps with an existing class in your timetable.");
      return;
    }

    try {
      setSaving(true);
      const added = await timetableService.addClass({
        subjectId: newClass.subjectId,
        dayOfWeek: newClass.dayOfWeek,
        startTime: newClass.startTime,
        endTime: newClass.endTime,
        room: newClass.room
      });
      setClasses([...classes, added]);
      setIsDrawerOpen(false);
    } catch (error: any) {
      console.error("Failed to save class:", error);
      setErrorMsg(error?.message || "An unexpected database error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await timetableService.deleteClass(deleteConfirmId);
      setClasses(classes.filter(c => c.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error: any) {
      setErrorMsg(error?.message || "Failed to delete.");
      setDeleteConfirmId(null);
    }
  };

  const currentDay = new Date().getDay();

  return (
    <>
      <div className="hdr">
        <h2>Timetable</h2>
        <div className="r">
          <button className="btn pri" onClick={openDrawerForNew}>Add class</button>
        </div>
      </div>
      <div className="content">
        <div className="cw">
          <div className="pg">
            {loading ? (
              <p style={{ color: 'var(--muted)' }}>Loading timetable...</p>
            ) : (
              <div className="g c6">
                {[1, 2, 3, 4, 5, 6].map(dayIdx => {
                  const dayClasses = classes.filter(c => c.dayOfWeek === dayIdx).sort((a, b) => a.startTime.localeCompare(b.startTime));
                  return (
                    <div key={dayIdx}>
                      <div className={`dh ${currentDay === dayIdx ? 'on' : ''}`}>{daysOfWeek[dayIdx]}</div>
                      {dayClasses.map(c => {
                        const sub = subjects.find(s => s.id === c.subjectId);
                        // Convert 09:00:00 to 9:00 AM
                        const formatTime = (t: string) => {
                          const [h, m] = t.split(':');
                          const d = new Date();
                          d.setHours(Number(h), Number(m));
                          return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
                        };
                        const timeStr = `${formatTime(c.startTime)} to ${formatTime(c.endTime)}`;
                        
                        return (
                          <div key={c.id} className="tt" style={{ position: 'relative' }}>
                            <b>{sub ? sub.name : 'Unknown Subject'}</b>{timeStr}
                            <span className="sub">{c.room || 'No room'}</span>
                            <a 
                              href="#" 
                              style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, color: 'var(--rc)' }}
                              onClick={(e) => handleDelete(c.id, e)}
                            >
                              Delete
                            </a>
                          </div>
                        );
                      })}
                      {dayClasses.length === 0 && (
                        <div style={{ padding: 12, fontSize: 12, color: 'var(--muted)', border: '1px dashed var(--field)', borderRadius: 8, marginTop: 10 }}>
                          No classes
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {isDrawerOpen && (
        <>
          <div className="veil" style={{ display: 'block' }} onClick={() => setIsDrawerOpen(false)}></div>
          <div className="drawer" role="dialog" style={{ display: 'flex' }}>
            <div className="dh">
              <h3>Add Class</h3>
              <button className="btn" style={{ padding: '6px 10px' }} onClick={() => setIsDrawerOpen(false)}>Close</button>
            </div>
            <div className="db">
              <div className="f">
                <label>Subject <i>*</i></label>
                <select className="in" value={newClass.subjectId} onChange={e => setNewClass({...newClass, subjectId: e.target.value})}>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="f">
                <label>Day <i>*</i></label>
                <select className="in" value={newClass.dayOfWeek} onChange={e => setNewClass({...newClass, dayOfWeek: Number(e.target.value)})}>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>
              <div className="g2">
                <div className="f"><label>Start Time <i>*</i></label><input type="time" className="in" value={newClass.startTime} onChange={e => setNewClass({...newClass, startTime: e.target.value})} /></div>
                <div className="f"><label>End Time <i>*</i></label><input type="time" className="in" value={newClass.endTime} onChange={e => setNewClass({...newClass, endTime: e.target.value})} /></div>
              </div>
              <div className="f">
                <label>Room</label>
                <input className="in" value={newClass.room} onChange={e => setNewClass({...newClass, room: e.target.value})} placeholder="e.g. C-204" />
              </div>
            </div>
            <div className="df">
              <button className="btn" onClick={() => setIsDrawerOpen(false)}>Cancel</button>
              <button className="btn pri" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save Class'}</button>
            </div>
          </div>
        </>
      )}

      {errorMsg && (
        <>
          <div className="modal-veil" onClick={() => setErrorMsg(null)}></div>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="mh">Notice</div>
            <div className="mb">{errorMsg}</div>
            <div className="mf">
              <button className="btn pri" onClick={() => setErrorMsg(null)}>Okay</button>
            </div>
          </div>
        </>
      )}

      {deleteConfirmId && (
        <>
          <div className="modal-veil" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="mh">Delete Class</div>
            <div className="mb">Are you sure you want to remove this class from your timetable?</div>
            <div className="mf">
              <button className="btn" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button className="btn" style={{background: 'var(--rb)', color: 'var(--rc)', borderColor: 'var(--rc)'}} onClick={executeDelete}>Delete</button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
