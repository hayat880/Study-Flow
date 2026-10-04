import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { taskService } from '../../business/services/taskService';
import { examService } from '../../business/services/examService';
import { subjectService } from '../../business/services/subjectService';
import type { Task, ExamTopic, Subject } from '../../types/index';
import './other-pages.css';

export const ExamsPage: React.FC = () => {
  const [exams, setExams] = useState<Task[]>([]);
  const [topics, setTopics] = useState<ExamTopic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [newTopic, setNewTopic] = useState('');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [newExamSubject, setNewExamSubject] = useState('');
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [t, tp, s] = await Promise.all([
        taskService.getTasks(),
        examService.getTopics(),
        subjectService.getSubjects()
      ]);
      const onlyExams = t.filter(x => x.eventType === 'Exam' || x.eventType === 'Quiz');
      setExams(onlyExams);
      setTopics(tp);
      setSubjects(s);
      if (onlyExams.length > 0 && !selectedExamId) {
        setSelectedExamId(onlyExams[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntil = (dateStr?: string) => {
    if (!dateStr) return null;
    const due = new Date(dateStr);
    const now = new Date();
    due.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diff = due.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const handleSaveExam = async () => {
    if (!newExamTitle || !newExamDate) return;
    try {
      setSaving(true);
      if (editingExamId) {
        const updated = await taskService.updateTask(editingExamId, {
          title: newExamTitle,
          dueDate: new Date(newExamDate).toISOString(),
          subjectId: newExamSubject || ''
        });
        setExams(exams.map(e => e.id === editingExamId ? updated : e));
      } else {
        const added = await taskService.addTask({
          title: newExamTitle,
          dueDate: new Date(newExamDate).toISOString(),
          priority: 'high',
          status: 'pending',
          eventType: 'Exam',
          subjectId: newExamSubject || ''
        });
        const newExams = [...exams, added];
        setExams(newExams);
        if (newExams.length === 1) setSelectedExamId(added.id);
      }
      setIsAddOpen(false);
      setEditingExamId(null);
      setNewExamTitle('');
      setNewExamDate('');
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Failed to save exam: " + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteExam = (id: string) => {
    setConfirmModal({
      title: 'Delete Exam',
      message: 'Are you sure you want to delete this exam? All related revision topics will also be deleted.',
      onConfirm: async () => {
        try {
          await taskService.deleteTask(id);
          const newExams = exams.filter(e => e.id !== id);
          setExams(newExams);
          if (selectedExamId === id) setSelectedExamId(newExams.length > 0 ? newExams[0].id : '');
        } catch (e: any) {
          console.error(e);
          setErrorMsg("Failed to delete exam.");
        }
      }
    });
  };
  
  const openEditModal = (ex: Task) => {
    setEditingExamId(ex.id);
    setNewExamTitle(ex.title);
    setNewExamDate(ex.dueDate ? new Date(ex.dueDate).toISOString().slice(0, 16) : '');
    setNewExamSubject(ex.subjectId || '');
    setIsAddOpen(true);
  };
  
  const openAddModal = () => {
    setEditingExamId(null);
    setNewExamTitle('');
    setNewExamDate('');
    setNewExamSubject('');
    setIsAddOpen(true);
  };

  const handleAddTopic = async () => {
    if (!newTopic || !selectedExamId) return;
    try {
      const t = await examService.addTopic(selectedExamId, newTopic);
      setTopics([...topics, t]);
      setNewTopic('');
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Failed to add topic: " + (e.message || 'Unknown error'));
    }
  };

  const handleToggleTopic = async (topic: ExamTopic) => {
    try {
      const updated = await examService.toggleTopic(topic.id, !topic.isCompleted);
      setTopics(topics.map(t => t.id === topic.id ? updated : t));
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleDeleteTopic = async (id: string) => {
    try {
      await examService.deleteTopic(id);
      setTopics(topics.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  // Pre-calculate stats
  const stats = useMemo(() => {
    const map = new Map<string, { total: number, completed: number }>();
    exams.forEach(e => map.set(e.id, { total: 0, completed: 0 }));
    
    topics.forEach(t => {
      const st = map.get(t.taskId);
      if (st) {
        st.total++;
        if (t.isCompleted) st.completed++;
      }
    });
    return map;
  }, [exams, topics]);

  const selectedTopics = topics.filter(t => t.taskId === selectedExamId).sort((a,b) => a.createdAt - b.createdAt);

  return (
    <>
      <div className="hdr">
        <h2>Exams & Revision</h2>
        <div className="r">
          <button className="btn pri" onClick={openAddModal}>
            <Plus className="i" /> Add Exam
          </button>
        </div>
      </div>
      <div className="content">
        <div className="cw">
          {loading ? (
            <p>Loading...</p>
          ) : exams.length === 0 ? (
            <div className="card pad" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'var(--muted)', marginBottom: 16 }}>No exams scheduled. Add an exam to start planning your revision.</p>
              <button className="btn pri" onClick={openAddModal}>Add Exam</button>
            </div>
          ) : (
            <div className="pg">
              <div className="g c2">
                <div className="card cp">
                  <h3>Upcoming Exams</h3>
                  {exams.sort((a,b) => new Date(a.dueDate||0).getTime() - new Date(b.dueDate||0).getTime()).map(ex => {
                    const days = getDaysUntil(ex.dueDate);
                    const sub = subjects.find(s => s.id === ex.subjectId);
                    return (
                      <div key={ex.id} className="row-item" style={{ cursor: 'pointer', background: selectedExamId === ex.id ? 'var(--bg)' : 'transparent' }} onClick={() => setSelectedExamId(ex.id)}>
                        <div className="g1">
                          <span className="t" style={{ color: selectedExamId === ex.id ? 'var(--blue)' : 'inherit' }}>{ex.title}</span>
                          <span className="sub">{sub ? sub.name + ' · ' : ''}{ex.dueDate ? new Date(ex.dueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No date'}</span>
                        </div>
                        {days !== null && (
                          <span className={`badge ${days < 0 ? 'late' : days <= 3 ? 'warn' : ''}`}>
                            {days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? 'Today' : `In ${days} days`}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="card cp">
                  <h3>Revision Progress</h3>
                  {exams.map(ex => {
                    const st = stats.get(ex.id) || { total: 0, completed: 0 };
                    if (st.total === 0) return null;
                    const pct = Math.round((st.completed / st.total) * 100);
                    return (
                      <div key={ex.id} className="row-item" style={{ cursor: 'pointer', background: selectedExamId === ex.id ? 'var(--bg)' : 'transparent' }} onClick={() => setSelectedExamId(ex.id)}>
                        <div className="g1">
                          <span className="t">{ex.title}</span>
                          <span className="sub">{st.completed} of {st.total} topics revised</span>
                          <div className="meter" style={{ marginTop: 8 }}><i style={{ width: `${pct}%`, background: pct === 100 ? 'var(--okc)' : 'var(--blue)' }}></i></div>
                        </div>
                        <b style={{ marginLeft: 12, color: pct === 100 ? 'var(--okc)' : 'inherit' }}>{pct}%</b>
                      </div>
                    );
                  })}
                  {Array.from(stats.values()).every(s => s.total === 0) && (
                    <p style={{ color: 'var(--muted)', padding: 12 }}>Add revision topics to see your progress.</p>
                  )}
                </div>
              </div>

              {selectedExamId && (
                <div className="card cp" style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <h3 style={{ margin: 0 }}>Revision Checklist: {exams.find(e => e.id === selectedExamId)?.title}</h3>
                      <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => openEditModal(exams.find(e => e.id === selectedExamId)!)}>Edit Exam</button>
                    </div>
                    <button className="btn" style={{ border: 'none', padding: 4, color: 'var(--muted)' }} onClick={() => handleDeleteExam(selectedExamId)}>
                      <Trash2 className="i" style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                  
                  {selectedTopics.length === 0 ? (
                    <p style={{ color: 'var(--muted)', padding: '0 12px 12px' }}>No topics added yet. Break your exam down into smaller topics to study.</p>
                  ) : (
                    selectedTopics.map(topic => (
                      <div key={topic.id} className="row-item">
                        <input 
                          type="checkbox" 
                          checked={topic.isCompleted} 
                          onChange={() => handleToggleTopic(topic)}
                          style={{ width: 16, height: 16, accentColor: 'var(--blue)', cursor: 'pointer' }} 
                        />
                        <div className="g1" style={{ marginLeft: 10 }}>
                          <span className="t" style={{ textDecoration: topic.isCompleted ? 'line-through' : 'none', color: topic.isCompleted ? 'var(--muted)' : 'inherit' }}>
                            {topic.title}
                          </span>
                        </div>
                        <button className="btn" style={{ border: 'none', padding: 4, color: 'var(--muted)' }} onClick={() => handleDeleteTopic(topic.id)}>
                          <Trash2 className="i" style={{ width: 16, height: 16 }} />
                        </button>
                      </div>
                    ))
                  )}

                  <div style={{ padding: 12, borderTop: '1px solid var(--line)', display: 'flex', gap: 10 }}>
                    <input 
                      type="text" 
                      className="in" 
                      placeholder="Add a new topic to revise..." 
                      value={newTopic}
                      onChange={e => setNewTopic(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddTopic(); }}
                      style={{ flex: 1 }}
                    />
                    <button className="btn pri" onClick={handleAddTopic} disabled={!newTopic}>Add</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isAddOpen && (
        <>
          <div className="veil" style={{ display: 'block' }} onClick={() => setIsAddOpen(false)}></div>
          <div className="drawer" role="dialog" style={{ display: 'flex' }}>
            <div className="dh">
              <h3>{editingExamId ? 'Edit Exam' : 'Add Exam'}</h3>
              <button className="btn" style={{ padding: '6px 10px' }} onClick={() => setIsAddOpen(false)}>Close</button>
            </div>
            <div className="db">
              <div className="f">
                <label>Exam Title <i>*</i></label>
                <input className="in" value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} placeholder="e.g. Final Exam" />
              </div>
              <div className="f">
                <label>Subject</label>
                <select className="in" value={newExamSubject} onChange={e => setNewExamSubject(e.target.value)}>
                  <option value="">Select subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="f">
                <label>Date & Time <i>*</i></label>
                <input type="datetime-local" className="in" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} />
              </div>
            </div>
            <div className="df">
              <button className="btn" onClick={() => setIsAddOpen(false)}>Cancel</button>
              <button className="btn pri" disabled={saving || !newExamTitle || !newExamDate} onClick={handleSaveExam}>
                {saving ? 'Saving...' : 'Save Exam'}
              </button>
            </div>
          </div>
        </>
      )}

      {errorMsg && (
        <>
          <div className="modal-veil" onClick={() => setErrorMsg(null)}></div>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="mh">Error</div>
            <div className="mb">{errorMsg}</div>
            <div className="mf">
              <button className="btn pri" onClick={() => setErrorMsg(null)}>Okay</button>
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
