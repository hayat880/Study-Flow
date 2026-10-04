import React, { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { subjectService } from '../../business/services/subjectService';
import { academicService } from '../../business/services/academicService';
import type { Subject, AcademicRecord } from '../../types/index';
import './other-pages.css';

export const RecordsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    component: '',
    obtainedMarks: '',
    totalMarks: '',
    type: 'Quiz' as AcademicRecord['type']
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [subs, recs] = await Promise.all([
        subjectService.getSubjects(),
        academicService.getRecords()
      ]);
      setSubjects(subs);
      setRecords(recs);
      if (subs.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subs[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const subjectRecords = useMemo(() => {
    return records.filter(r => r.subjectId === selectedSubjectId).sort((a, b) => b.createdAt - a.createdAt);
  }, [records, selectedSubjectId]);

  const stats = useMemo(() => {
    const calc = (type?: AcademicRecord['type']) => {
      const filtered = type ? subjectRecords.filter(r => r.type === type) : subjectRecords;
      if (filtered.length === 0) return { percent: null, label: 'No records', count: 0, obtained: 0, total: 0 };
      const ob = filtered.reduce((acc, curr) => acc + Number(curr.obtainedMarks), 0);
      const tot = filtered.reduce((acc, curr) => acc + Number(curr.totalMarks), 0);
      return {
        percent: Math.round((ob / tot) * 100),
        label: type ? `${filtered.length} entered` : `Grade ${ob / tot >= 0.85 ? 'A' : ob / tot >= 0.7 ? 'B' : ob / tot >= 0.5 ? 'C' : 'F'}`,
        count: filtered.length,
        obtained: ob,
        total: tot
      };
    };

    return {
      overall: calc(),
      quizzes: calc('Quiz'),
      assignments: calc('Assignment'),
      exams: calc('Exam')
    };
  }, [subjectRecords]);

  const handleOpenModal = (type: AcademicRecord['type']) => {
    setFormData({ component: '', obtainedMarks: '', totalMarks: '', type });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedSubjectId || !formData.component || !formData.obtainedMarks || !formData.totalMarks) return;
    try {
      setSaving(true);
      const added = await academicService.addRecord({
        subjectId: selectedSubjectId,
        component: formData.component,
        obtainedMarks: Number(formData.obtainedMarks),
        totalMarks: Number(formData.totalMarks),
        type: formData.type
      });
      setRecords([...records, added]);
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await academicService.deleteRecord(deleteConfirmId);
      setRecords(records.filter(r => r.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (e) {
      console.error(e);
      alert("Failed to delete record.");
    }
  };

  return (
    <>
      <div className="hdr">
        <h2>Academic Records</h2>
        <div className="r">
          <button className="btn pri" onClick={() => handleOpenModal('Quiz')} disabled={subjects.length === 0}>
            <Plus className="i" /> Add marks
          </button>
        </div>
      </div>
      <div className="content">
        <div className="cw">
          {loading ? (
            <p>Loading...</p>
          ) : subjects.length === 0 ? (
            <div className="card pad" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'var(--muted)', marginBottom: 16 }}>You need to add subjects before you can track academic records.</p>
            </div>
          ) : (
            <div className="pg">
              <div className="g c2">
                <select className="in" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)}>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="seg">
                  <span className="on">Marks</span>
                </div>
              </div>
              <div className="g c4">
                <div className="card cp stat">
                  <small>Overall so far</small>
                  <b>{stats.overall.percent !== null ? `${stats.overall.percent}%` : 'N/A'}</b>
                  <span>{stats.overall.label}</span>
                </div>
                <div className="card cp stat">
                  <small>Quizzes</small>
                  <b>{stats.quizzes.percent !== null ? `${stats.quizzes.percent}%` : 'N/A'}</b>
                  <span>{stats.quizzes.label}</span>
                </div>
                <div className="card cp stat">
                  <small>Assignments</small>
                  <b>{stats.assignments.percent !== null ? `${stats.assignments.percent}%` : 'N/A'}</b>
                  <span>{stats.assignments.label}</span>
                </div>
                <div className="card cp stat">
                  <small>Exams</small>
                  <b>{stats.exams.percent !== null ? `${stats.exams.percent}%` : 'N/A'}</b>
                  <span>{stats.exams.label}</span>
                </div>
              </div>
              
              <div className="card">
                {subjectRecords.length === 0 ? (
                  <p style={{ padding: 20, color: 'var(--muted)', textAlign: 'center' }}>No records added for this subject yet.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Type</th>
                        <th>Marks</th>
                        <th>Percent</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectRecords.map(r => (
                        <tr key={r.id}>
                          <td><span className="t">{r.component}</span></td>
                          <td><span className="badge">{r.type}</span></td>
                          <td>{r.obtainedMarks} / {r.totalMarks}</td>
                          <td><span style={{ fontWeight: 600, color: 'var(--blue)' }}>{Math.round((r.obtainedMarks / r.totalMarks) * 100)}%</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <a style={{ color: 'var(--rc)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }} onClick={(e) => { e.preventDefault(); setDeleteConfirmId(r.id); }}>Delete</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => handleOpenModal('Quiz')}>Add quiz</button>
                <button className="btn" onClick={() => handleOpenModal('Assignment')}>Add assignment</button>
                <button className="btn" onClick={() => handleOpenModal('Project')}>Add project</button>
                <button className="btn" onClick={() => handleOpenModal('Exam')}>Add exam</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <>
          <div className="modal-veil" onClick={() => setIsModalOpen(false)}></div>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="mh">Add Academic Record</div>
            <div className="mb" style={{ display: 'grid', gap: 14 }}>
              <div className="f">
                <label>Component Name</label>
                <input className="in" placeholder="e.g. Quiz 1, Midterm" value={formData.component} onChange={e => setFormData({...formData, component: e.target.value})} />
              </div>
              <div className="f">
                <label>Type</label>
                <select className="in" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                  <option value="Quiz">Quiz</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Project">Project</option>
                  <option value="Exam">Exam</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="g2">
                <div className="f">
                  <label>Obtained Marks</label>
                  <input type="number" className="in" placeholder="0" value={formData.obtainedMarks} onChange={e => setFormData({...formData, obtainedMarks: e.target.value})} />
                </div>
                <div className="f">
                  <label>Total Marks</label>
                  <input type="number" className="in" placeholder="10" value={formData.totalMarks} onChange={e => setFormData({...formData, totalMarks: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="mf">
              <button className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn pri" disabled={saving || !formData.component || !formData.obtainedMarks || !formData.totalMarks} onClick={handleSave}>
                {saving ? 'Saving...' : 'Save marks'}
              </button>
            </div>
          </div>
        </>
      )}

      {deleteConfirmId && (
        <>
          <div className="modal-veil" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="mh">Delete Record</div>
            <div className="mb">Are you sure you want to remove this academic record? Your overall grade and percentage will be recalculated automatically.</div>
            <div className="mf">
              <button className="btn" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button className="btn" style={{background: 'var(--rb)', color: 'var(--rc)', borderColor: 'var(--rc)'}} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
