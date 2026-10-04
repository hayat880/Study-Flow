import React, { useState, useEffect } from 'react';
import { subjectService } from '../../business/services/subjectService';
import { attendanceService } from '../../business/services/attendanceService';
import { timetableService } from '../../business/services/timetableService';
import { calculateAttendanceStats } from '../../business/logic/attendanceLogic';
import type { Subject, AttendanceRecord, TimetableClass } from '../../types/index';
import './attendance.css';

export const AttendancePage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [timetable, setTimetable] = useState<TimetableClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [semesterEndDate, setSemesterEndDate] = useState(() => localStorage.getItem('semesterEnd') || new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]);

  // Form state
  const [markDate, setMarkDate] = useState(new Date().toISOString().split('T')[0]);
  const [markStatus, setMarkStatus] = useState<Record<string, AttendanceRecord['status']>>({});

  useEffect(() => {
    loadData();
  }, []);

  // When markDate changes, auto-fill markStatus with any existing records for that day
  useEffect(() => {
    const existing = records.filter(r => r.date.startsWith(markDate));
    const newStatus: Record<string, AttendanceRecord['status']> = {};
    existing.forEach(r => {
      newStatus[r.subjectId] = r.status;
    });
    setMarkStatus(newStatus);
  }, [markDate, records]);

  async function loadData() {
    try {
      setLoading(true);
      const [loadedSubjects, loadedRecords, loadedTimetable] = await Promise.all([
        subjectService.getSubjects(),
        attendanceService.getRecords(),
        timetableService.getClasses()
      ]);
      setSubjects(loadedSubjects);
      setRecords(loadedRecords);
      setTimetable(loadedTimetable);
    } catch (error) {
      console.error("Failed to load attendance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (subjectId: string, status: AttendanceRecord['status']) => {
    setMarkStatus(prev => ({ ...prev, [subjectId]: status }));
  };

  const handleSaveAttendance = async () => {
    const keys = Object.keys(markStatus);
    if (keys.length === 0) return;

    try {
      setSaving(true);
      
      const newRecordsList = [...records];
      
      for (const subjectId of keys) {
        const existingRecord = records.find(r => r.date.startsWith(markDate) && r.subjectId === subjectId);
        if (existingRecord) {
          if (existingRecord.status !== markStatus[subjectId]) {
            const updated = await attendanceService.updateRecord(existingRecord.id, { status: markStatus[subjectId] });
            const idx = newRecordsList.findIndex(r => r.id === updated.id);
            if (idx !== -1) newRecordsList[idx] = updated;
          }
        } else {
          const added = await attendanceService.addRecord({
            subjectId,
            date: markDate,
            status: markStatus[subjectId]
          });
          newRecordsList.push(added);
        }
      }
      
      setRecords(newRecordsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      // Keep the status around since it's the current day's view
    } catch (error: any) {
      console.error("Failed to save attendance:", error);
      setErrorMsg(error?.message || "An unexpected database error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await attendanceService.deleteRecord(deleteConfirmId);
      setRecords(records.filter(r => r.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error("Failed to delete record:", error);
      setErrorMsg(error?.message || "Failed to delete record.");
      setDeleteConfirmId(null);
    }
  };

  // Calculations
  const getSubjectStats = (subject: Subject) => {
    const stats = calculateAttendanceStats(subject, records, timetable, semesterEndDate);

    let prediction = 'On track';
    let predClass = 'pred';

    if (stats.conducted === 0) {
      prediction = 'No classes yet';
    } else if (stats.isSafe) {
      if (stats.skippable === 0) {
        prediction = 'Cannot miss next';
        predClass = 'pred warn';
      } else {
        prediction = `Can miss ${stats.skippable} more`;
      }
    } else {
      if (stats.toRecover === -1) {
         prediction = `Impossible to recover`;
      } else {
         prediction = `Attend next ${stats.toRecover} classes`;
      }
      predClass = 'pred low';
    }
    
    return { ...stats, prediction, predClass };
  };

  const allTotal = records.length;
  const allPresent = records.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const overallPercentage = allTotal > 0 ? Math.round((allPresent / allTotal) * 100) : 100;
  
  const subjectsBelowMin = subjects.filter(s => getSubjectStats(s).isBelow);
  const absencesThisMonth = records.filter(r => {
    if (r.status === 'Present' || r.status === 'Late') return false;
    const d = new Date(r.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const getTodayClasses = () => {
    const dateObj = new Date(markDate);
    const dayOfWeek = dateObj.getDay();
    return timetable.filter(c => c.dayOfWeek === dayOfWeek).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const todayClasses = getTodayClasses();
  
  // Deduplicate subjects if multiple classes of same subject exist on same day
  const uniqueSubjectsToday = Array.from(new Set(todayClasses.map(c => c.subjectId)));

  const formatTime = (t: string) => {
    const [h, m] = t.split(':');
    const d = new Date();
    d.setHours(Number(h), Number(m));
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <>
      <div className="hdr">
        <h2>Attendance</h2>
      </div>
      <div className="content">
        <div className="stats">
          <div className="card stat">
            <small>Overall attendance</small>
            <b>{allTotal > 0 ? `${overallPercentage}%` : 'N/A'}</b>
            <span>{allPresent} of {allTotal} classes</span>
          </div>
          <div className="card stat">
            <small>Minimum required</small>
            <b>75%</b>
            <a href="#" style={{ color: 'var(--blue)', cursor: 'pointer', fontSize: 13 }} onClick={(e) => { e.preventDefault(); setIsSettingsOpen(true); }}>Change in Settings</a>
          </div>
          <div className="card stat">
            <small>Subjects below minimum</small>
            <b style={{ color: subjectsBelowMin.length > 0 ? 'var(--rc)' : 'inherit' }}>{subjectsBelowMin.length}</b>
            <span>{subjectsBelowMin.length === 1 ? subjectsBelowMin[0].name : subjectsBelowMin.length > 1 ? 'Multiple' : 'All good'}</span>
          </div>
          <div className="card stat">
            <small>Absences this month</small>
            <b>{absencesThisMonth}</b>
            <span>{absencesThisMonth > 0 ? `${absencesThisMonth} leave` : 'Keep it up'}</span>
          </div>
        </div>
        <div className="split">
          <div className="card">
            <div className="hd" style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex' }}>
              <h3 style={{ margin: 0 }}>By subject</h3>
              <small style={{ marginLeft: 'auto', color: 'var(--muted)' }}>Black line marks the minimum</small>
            </div>
            {loading ? (
              <p style={{ padding: 16, color: 'var(--muted)' }}>Loading subjects...</p>
            ) : subjects.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--muted)' }}>No subjects added. Add subjects first.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Attended</th>
                    <th style={{ width: 150 }}>Attendance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(sub => {
                    const stats = getSubjectStats(sub);
                    return (
                      <tr key={sub.id}>
                        <td><span className="t">{sub.name}</span></td>
                        <td>{stats.attended} / {stats.conducted}</td>
                        <td>
                          <span className="pct" style={{ color: !stats.isSafe ? 'var(--rc)' : 'inherit' }}>
                            {stats.percentage}%
                          </span>
                          <div className={`meter ${!stats.isSafe ? 'l' : ''}`}>
                            <i style={{ width: `${stats.percentage}%` }}></i>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${sub.attendanceThreshold}%`, width: 2, background: 'var(--ink)' }}></div>
                          </div>
                        </td>
                        <td>
                          {stats.isSafe ? (
                            <span className="badge ok">Safe</span>
                          ) : (
                            <span className="badge low">Below minimum</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div className="legend">
              <span>Safe: Above minimum</span>
              <span>Warning: Near minimum</span>
              <span>Below minimum: under target</span>
            </div>
          </div>
          
          <div className="card">
            <div className="hd" style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ margin: 0 }}>Mark attendance</h3>
            </div>
            <div style={{ padding: 16 }}>
              <div className="f">
                <label>Date</label>
                <input type="date" className="in" value={markDate} onChange={e => setMarkDate(e.target.value)} />
              </div>
              
              {uniqueSubjectsToday.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>No classes scheduled for this day in the Timetable.</p>
              ) : (
                uniqueSubjectsToday.map(subjectId => {
                  const sub = subjects.find(s => s.id === subjectId);
                  if (!sub) return null;
                  
                  // get the first class for this subject today for time/room info
                  const c = todayClasses.find(c => c.subjectId === subjectId);
                  const timeStr = c ? `${formatTime(c.startTime)} to ${formatTime(c.endTime)}` : '';
                  const roomStr = c?.room ? ` · ${c.room}` : '';
                  
                  return (
                    <div key={sub.id} className="mk">
                      <span className="t">{sub.name}</span>
                      <span className="sub">{timeStr}{roomStr}</span>
                      <div className="seg">
                        <span className={markStatus[sub.id] === 'Present' ? 'p' : ''} onClick={() => handleStatusChange(sub.id, 'Present')}>Present</span>
                        <span className={markStatus[sub.id] === 'Absent' ? 'a' : ''} onClick={() => handleStatusChange(sub.id, 'Absent')}>Absent</span>
                        <span className={markStatus[sub.id] === 'Excused' ? 'lv' : ''} onClick={() => handleStatusChange(sub.id, 'Excused')}>Leave</span>
                        <span className={markStatus[sub.id] === 'Cancelled' ? 'lv' : ''} onClick={() => handleStatusChange(sub.id, 'Cancelled')}>Off / Cancelled</span>
                      </div>
                    </div>
                  );
                })
              )}

              <button 
                className="btn pri" 
                style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} 
                disabled={saving || uniqueSubjectsToday.length === 0} 
                onClick={handleSaveAttendance}
              >
                {saving ? 'Saving...' : 'Save attendance'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="hd" style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex' }}>
            <h3 style={{ margin: 0 }}>Recent records</h3>
            <small style={{ marginLeft: 'auto', color: 'var(--muted)' }}>Last 5</small>
          </div>
          {loading ? (
             <p style={{ padding: 16, color: 'var(--muted)' }}>Loading records...</p>
          ) : records.length === 0 ? (
             <p style={{ padding: 16, color: 'var(--muted)' }}>No attendance records yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 5).map(record => {
                  const subject = subjects.find(s => s.id === record.subjectId);
                  const d = new Date(record.date);
                  const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                  return (
                    <tr key={record.id}>
                      <td>{dateStr}</td>
                      <td>{subject ? subject.name : 'Deleted subject'}</td>
                      <td>
                        {record.status === 'Present' ? <span className="badge ok">Present</span> : 
                         record.status === 'Absent' ? <span className="badge low">Absent</span> : 
                         <span className="badge warn">{record.status}</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <a style={{ color: 'var(--blue)', fontWeight: 600, cursor: 'pointer' }} onClick={(e) => handleDeleteRecord(record.id, e)}>Delete</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
            <div className="mh">Delete Record</div>
            <div className="mb">Are you sure you want to remove this attendance record? This will recalculate your attendance percentage.</div>
            <div className="mf">
              <button className="btn" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button className="btn" style={{background: 'var(--rb)', color: 'var(--rc)', borderColor: 'var(--rc)'}} onClick={executeDelete}>Delete</button>
            </div>
          </div>
        </>
      )}

      {isSettingsOpen && (
        <>
          <div className="modal-veil" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="mh">Attendance Settings</div>
            <div className="mb">
              <div className="f">
                <label>Semester End Date</label>
                <input 
                  type="date" 
                  className="in" 
                  value={semesterEndDate} 
                  onChange={e => {
                    setSemesterEndDate(e.target.value);
                    localStorage.setItem('semesterEnd', e.target.value);
                  }} 
                />
                <small style={{ display: 'block', marginTop: 4, color: 'var(--muted)' }}>Used to predict remaining classes in the semester.</small>
              </div>
            </div>
            <div className="mf">
              <button className="btn pri" onClick={() => setIsSettingsOpen(false)}>Done</button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
