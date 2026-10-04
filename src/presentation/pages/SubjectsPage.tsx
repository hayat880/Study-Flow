import React, { useState, useEffect } from 'react';
import { subjectService } from '../../business/services/subjectService';
import type { Subject } from '../../types/index';
import './other-pages.css';

export const SubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newSubject, setNewSubject] = useState({ name: '', code: '', teacher: '', creditHours: 3, attendanceThreshold: 75, quizCount: 4, assignmentCount: 4 });

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    try {
      setLoading(true);
      const loadedSubjects = await subjectService.getSubjects();
      setSubjects(loadedSubjects);
    } catch (error) {
      console.error("Failed to load subjects:", error);
    } finally {
      setLoading(false);
    }
  };

  const openDrawerForNew = () => {
    setEditingId(null);
    setNewSubject({ name: '', code: '', teacher: '', creditHours: 3, attendanceThreshold: 75, quizCount: 4, assignmentCount: 4 });
    setIsDrawerOpen(true);
  };

  const openDrawerForEdit = (subject: Subject) => {
    setEditingId(subject.id);
    setNewSubject({ 
      name: subject.name, 
      code: subject.code, 
      teacher: subject.teacher || '', 
      creditHours: subject.creditHours || 3, 
      attendanceThreshold: subject.attendanceThreshold, 
      quizCount: subject.quizCount, 
      assignmentCount: subject.assignmentCount 
    });
    setIsDrawerOpen(true);
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!newSubject.name || !newSubject.code) return;
    setErrorMsg(null);
    
    try {
      setSaving(true);
      if (editingId) {
        const updated = await subjectService.updateSubject(editingId, newSubject);
        setSubjects(subjects.map(s => s.id === editingId ? updated : s));
      } else {
        const added = await subjectService.addSubject(newSubject);
        setSubjects([added, ...subjects]);
      }
      setIsDrawerOpen(false);
    } catch (error: any) {
      console.error("Failed to save subject:", error);
      setErrorMsg(error?.message || "An unexpected database error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await subjectService.deleteSubject(deleteConfirmId);
      setSubjects(subjects.filter(s => s.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error("Failed to delete subject:", error);
      setErrorMsg(error?.message || "Failed to delete subject.");
      setDeleteConfirmId(null);
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.teacher && s.teacher.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <div className="hdr">
        <h2>Subjects</h2>
        <div className="r">
          <button className="btn pri" onClick={openDrawerForNew}>Add subject</button>
        </div>
      </div>
      <div className="content">
        <div className="cw">
          <div className="pg">
            <div className="in sr" style={{ padding: 0, display: 'flex', alignItems: 'center', position: 'relative' }}>
              <svg className="i" style={{ marginLeft: 12, position: 'absolute', color: 'var(--muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder="Search subjects..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', paddingLeft: 38, outline: 'none', fontSize: 13, color: 'inherit' }}
              />
            </div>
            
            {loading ? (
              <p style={{ color: 'var(--muted)' }}>Loading subjects from database...</p>
            ) : subjects.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No subjects added yet. Click "Add subject" to get started.</p>
            ) : (
              <div className="g c2">
                {filteredSubjects.map(sub => (
                  <div key={sub.id} className="card cp" style={{ position: 'relative' }}>
                    <div className="row-item" style={{ border: 0, padding: 0 }}>
                      <div className="tile">{sub.name.slice(0, 2).toUpperCase()}</div>
                      <div className="g1">
                        <span className="t">{sub.name}</span>
                        <span className="sub">{sub.code} · {sub.teacher} · {sub.creditHours} credits</span>
                      </div>
                    </div>
                    <div className="g c4" style={{ marginTop: 12, gap: 8 }}>
                      <div className="stat"><small>Target Att.</small><b style={{ fontSize: 16 }}>{sub.attendanceThreshold}%</b></div>
                      <div className="stat"><small>Quizzes</small><b style={{ fontSize: 16 }}>{sub.quizCount}</b></div>
                      <div className="stat"><small>Assign.</small><b style={{ fontSize: 16 }}>{sub.assignmentCount}</b></div>
                    </div>
                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: '6px' }}>
                      <button 
                        className="btn" 
                        style={{ padding: '4px 8px' }} 
                        onClick={() => openDrawerForEdit(sub)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn" 
                        style={{ padding: '4px 8px', color: 'var(--rc)', borderColor: 'var(--rb)', background: 'var(--rb)' }} 
                        onClick={() => handleDelete(sub.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isDrawerOpen && (
        <>
          <div className="veil" style={{ display: 'block' }} onClick={() => setIsDrawerOpen(false)}></div>
          <div className="drawer" role="dialog" aria-label={editingId ? 'Edit Subject' : 'Add Subject'} style={{ display: 'flex' }}>
            <div className="dh">
              <h3>{editingId ? 'Edit Subject' : 'Add Subject'}</h3>
              <button className="btn" style={{ padding: '6px 10px' }} onClick={() => setIsDrawerOpen(false)}>Close</button>
            </div>
            <div className="db">
              <div className="f">
                <label>Name <i>*</i></label>
                <input className="in" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} placeholder="e.g. Data Structures" />
              </div>
              <div className="f">
                <label>Code <i>*</i></label>
                <input className="in" value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value})} placeholder="e.g. CS-203" />
              </div>
              <div className="f">
                <label>Instructor</label>
                <input className="in" value={newSubject.teacher} onChange={e => setNewSubject({...newSubject, teacher: e.target.value})} placeholder="e.g. Dr. Ahmed" />
              </div>
              <div className="g2">
                <div className="f"><label>Credits</label><input type="number" className="in" value={newSubject.creditHours} onChange={e => setNewSubject({...newSubject, creditHours: Number(e.target.value)})} /></div>
                <div className="f"><label>Min. Attendance %</label><input type="number" className="in" value={newSubject.attendanceThreshold} onChange={e => setNewSubject({...newSubject, attendanceThreshold: Number(e.target.value)})} /></div>
              </div>
              <div className="g2">
                <div className="f"><label>Total Quizzes</label><input type="number" className="in" value={newSubject.quizCount} onChange={e => setNewSubject({...newSubject, quizCount: Number(e.target.value)})} /></div>
                <div className="f"><label>Total Assignments</label><input type="number" className="in" value={newSubject.assignmentCount} onChange={e => setNewSubject({...newSubject, assignmentCount: Number(e.target.value)})} /></div>
              </div>
            </div>
            <div className="df">
              <button className="btn" onClick={() => setIsDrawerOpen(false)}>Cancel</button>
              <button className="btn pri" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save Subject'}</button>
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
            <div className="mh">Delete Subject</div>
            <div className="mb">Are you sure you want to delete this subject? All associated tasks and records will also be removed.</div>
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
