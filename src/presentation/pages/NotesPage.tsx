import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, FileText, Image as ImageIcon, Video, Link as LinkIcon, File as FileIcon, Trash2, X } from 'lucide-react';
import { subjectService } from '../../business/services/subjectService';
import { noteService } from '../../business/services/noteService';
import type { Subject, Note } from '../../types/index';
import './other-pages.css';

export const NotesPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addType, setAddType] = useState<'text' | 'file' | 'link'>('text');
  
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newContent, setNewContent] = useState(''); // Text or URL
  const [newFile, setNewFile] = useState<File | null>(null);
  
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  
  const [msgModal, setMsgModal] = useState<{title: string, message: string} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [subs, nts] = await Promise.all([
        subjectService.getSubjects(),
        noteService.getNotes()
      ]);
      setSubjects(subs);
      setNotes(nts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (subjectFilter !== 'all' && n.subjectId !== subjectFilter) return false;
      if (typeFilter !== 'all') {
        if (typeFilter === 'Text' && n.type !== 'Text Note') return false;
        if (typeFilter === 'Media' && !['Image', 'YouTube Link', 'Video'].includes(n.type)) return false;
        if (typeFilter === 'Files' && !['PDF', 'File'].includes(n.type)) return false;
        if (typeFilter === 'Links' && n.type !== 'Web Link') return false;
      }
      if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [notes, subjectFilter, typeFilter, searchQuery]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!newTitle) return;
    try {
      setSaving(true);
      let added: Note;
      const subId = newSubject === '' ? null : newSubject;

      if (addType === 'text') {
        added = await noteService.addTextNote(subId, newTitle, newContent);
      } else if (addType === 'link') {
        const isYoutube = newContent.includes('youtube.com') || newContent.includes('youtu.be');
        added = await noteService.addLinkNote(subId, newTitle, isYoutube ? 'YouTube Link' : 'Web Link', newContent);
      } else if (addType === 'file' && newFile) {
        let fileType: 'PDF' | 'Image' | 'Video' | 'File' = 'File';
        if (newFile.type.includes('pdf')) fileType = 'PDF';
        else if (newFile.type.includes('image')) fileType = 'Image';
        else if (newFile.type.includes('video')) fileType = 'Video';
        added = await noteService.uploadFileNote(subId, newTitle, newFile, fileType);
      } else {
        return;
      }
      setNotes([added, ...notes]);
      setIsAddOpen(false);
      resetForm();
    } catch (e: any) {
      console.error(e);
      setMsgModal({ title: 'Error', message: "Failed to save note: " + (e.message || "Unknown error") });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewSubject('');
    setNewContent('');
    setNewFile(null);
  };

  const handleDelete = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      title: 'Delete Note',
      message: `Are you sure you want to delete ${note.title}?`,
      onConfirm: async () => {
        try {
          await noteService.deleteNote(note);
          setNotes(notes.filter(n => n.id !== note.id));
          if (viewingNote?.id === note.id) setViewingNote(null);
        } catch (err) {
          console.error(err);
          setMsgModal({ title: 'Error', message: 'Failed to delete note.' });
        }
      }
    });
  };

  const getIcon = (type: string) => {
    if (type === 'Text Note') return <FileText className="i" style={{ color: 'var(--blue)' }} />;
    if (type === 'PDF') return <FileIcon className="i" style={{ color: 'var(--rc)' }} />;
    if (type === 'Image') return <ImageIcon className="i" style={{ color: 'var(--okc)' }} />;
    if (type === 'YouTube Link' || type === 'Video') return <Video className="i" style={{ color: 'var(--rc)' }} />;
    if (type === 'Web Link') return <LinkIcon className="i" style={{ color: 'var(--blue)' }} />;
    return <FileIcon className="i" />;
  };

  const renderNoteContent = (note: Note) => {
    if (note.type === 'Text Note') {
      return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{note.content}</div>;
    }
    if (note.type === 'YouTube Link') {
      const yid = noteService.extractYoutubeId(note.content || '');
      if (yid) {
        return (
          <div>
            <iframe 
              width="100%" 
              height="400" 
              src={`https://www.youtube.com/embed/${yid}?allowfullscreen=1`} 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" 
              allowFullScreen
              style={{ borderRadius: 8 }}
            ></iframe>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <a href={note.content} target="_blank" rel="noreferrer" className="btn">Watch directly on YouTube</a>
            </div>
          </div>
        );
      }
      return <a href={note.content} target="_blank" rel="noreferrer" className="link">{note.content}</a>;
    }
    if (note.type === 'Image' && note.storagePath) {
      const url = noteService.getFileUrl(note.storagePath);
      return (
        <div>
          <img src={url} alt={note.title} style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--line)' }} />
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <a href={url} target="_blank" rel="noreferrer" className="btn">Open image in full size</a>
          </div>
        </div>
      );
    }
    if (note.type === 'Video' && note.storagePath) {
      const url = noteService.getFileUrl(note.storagePath);
      return (
        <div>
          <video controls playsInline style={{ width: '100%', borderRadius: 8, border: '1px solid var(--line)' }}>
            <source src={url} />
            Your browser does not support the video tag.
          </video>
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <a href={url} target="_blank" rel="noreferrer" className="btn">Open video in new tab</a>
          </div>
        </div>
      );
    }
    if (note.storagePath) {
      const url = noteService.getFileUrl(note.storagePath);
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ marginBottom: 20 }}>This is a {note.type} file.</p>
          <a href={url} target="_blank" rel="noreferrer" className="btn pri">Open {note.type} in new tab</a>
        </div>
      );
    }
    if (note.type === 'Web Link') {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <a href={note.content} target="_blank" rel="noreferrer" className="btn pri">Visit Link</a>
          <p style={{ marginTop: 10 }}>{note.content}</p>
        </div>
      );
    }
    return <div>No content</div>;
  };

  return (
    <>
      <div className="hdr">
        <h2>Notes & Resources</h2>
        <div className="r">
          <button className="btn pri" onClick={() => { resetForm(); setIsAddOpen(true); }}>
            <Plus className="i" /> Add Resource
          </button>
        </div>
      </div>
      <div className="content">
        <div className="cw">
          <div className="pg">
            <div className="in" style={{ display: 'flex', alignItems: 'center', padding: 0 }}>
              <Search className="i" style={{ marginLeft: 12, position: 'absolute', color: 'var(--muted)' }} />
              <input 
                type="text" 
                placeholder="Search notes, files, and resources..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', paddingLeft: 38, outline: 'none', fontSize: 13, color: 'inherit' }}
              />
            </div>
            
            <div className="chips">
              <a className={subjectFilter === 'all' ? 'on' : ''} onClick={() => setSubjectFilter('all')}>All Subjects</a>
              {subjects.map(s => (
                <a key={s.id} className={subjectFilter === s.id ? 'on' : ''} onClick={() => setSubjectFilter(s.id)}>{s.name}</a>
              ))}
            </div>
            
            <div className="chips">
              <a className={typeFilter === 'all' ? 'on' : ''} onClick={() => setTypeFilter('all')}>All Types</a>
              <a className={typeFilter === 'Text' ? 'on' : ''} onClick={() => setTypeFilter('Text')}>Text Notes</a>
              <a className={typeFilter === 'Files' ? 'on' : ''} onClick={() => setTypeFilter('Files')}>PDFs & Files</a>
              <a className={typeFilter === 'Media' ? 'on' : ''} onClick={() => setTypeFilter('Media')}>Images & Video</a>
              <a className={typeFilter === 'Links' ? 'on' : ''} onClick={() => setTypeFilter('Links')}>Links</a>
            </div>
            
            {loading ? (
              <p style={{ padding: 20, color: 'var(--muted)' }}>Loading resources...</p>
            ) : filteredNotes.length === 0 ? (
              <div className="card pad" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ color: 'var(--muted)', marginBottom: 16 }}>No notes or resources found.</p>
              </div>
            ) : (
              <div className="card cp">
                {filteredNotes.map(note => {
                  const sub = subjects.find(s => s.id === note.subjectId);
                  return (
                    <div key={note.id} className="row-item" style={{ cursor: 'pointer' }} onClick={() => setViewingNote(note)}>
                      <div className="tile" style={{ background: 'var(--bg)' }}>
                        {getIcon(note.type)}
                      </div>
                      <div className="g1">
                        <span className="t">{note.title}</span>
                        <span className="sub">{sub ? sub.name : 'General'} &middot; {note.type} &middot; {new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                      <button className="btn" style={{ border: 'none', padding: 6, color: 'var(--muted)' }} onClick={(e) => handleDelete(note, e)}>
                        <Trash2 className="i" style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {isAddOpen && (
        <>
          <div className="veil" style={{ display: 'block' }} onClick={() => setIsAddOpen(false)}></div>
          <div className="drawer" role="dialog" style={{ display: 'flex' }}>
            <div className="dh">
              <h3>Add Resource</h3>
              <button className="btn" style={{ padding: '6px 10px' }} onClick={() => setIsAddOpen(false)}>Close</button>
            </div>
            <div className="db">
              <div className="f">
                <label>Resource Type</label>
                <div className="seg">
                  <span className={addType === 'text' ? 'on' : ''} onClick={() => setAddType('text')}>Text Note</span>
                  <span className={addType === 'file' ? 'on' : ''} onClick={() => setAddType('file')}>File / Image</span>
                  <span className={addType === 'link' ? 'on' : ''} onClick={() => setAddType('link')}>Link / Video</span>
                </div>
              </div>
              
              <div className="f">
                <label>Title <i>*</i></label>
                <input className="in" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Chapter 1 Summary" />
              </div>
              
              <div className="f">
                <label>Subject</label>
                <select className="in" value={newSubject} onChange={e => setNewSubject(e.target.value)}>
                  <option value="">General (No subject)</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {addType === 'text' && (
                <div className="f">
                  <label>Note Content <i>*</i></label>
                  <textarea className="in" style={{ height: 150, padding: 10 }} value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Type your notes here..."></textarea>
                </div>
              )}

              {addType === 'link' && (
                <div className="f">
                  <label>URL / Link <i>*</i></label>
                  <input type="url" className="in" value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                </div>
              )}

              {addType === 'file' && (
                <div className="f">
                  <label>Upload File <i>*</i></label>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
                  <div className="card pad" style={{ textAlign: 'center', borderStyle: 'dashed', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                    {newFile ? (
                      <div>
                        <b>{newFile.name}</b>
                        <p className="sub">{(newFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--muted)' }}>
                        <FileIcon className="i" style={{ margin: '0 auto 8px', display: 'block', width: 24, height: 24 }} />
                        Click to select a file (PDF, Image, Video, DOCX, TXT)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="df">
              <button className="btn" onClick={() => setIsAddOpen(false)}>Cancel</button>
              <button className="btn pri" disabled={saving || !newTitle || (addType === 'text' && !newContent) || (addType === 'link' && !newContent) || (addType === 'file' && !newFile)} onClick={handleSave}>
                {saving ? 'Saving...' : 'Save Resource'}
              </button>
            </div>
          </div>
        </>
      )}

      {viewingNote && (
        <>
          <div className="modal-veil" onClick={() => setViewingNote(null)}></div>
          <div className="modal" style={{ maxWidth: 800, width: '90%' }} role="dialog">
            <div className="mh" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {getIcon(viewingNote.type)}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{viewingNote.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>{subjects.find(s => s.id === viewingNote.subjectId)?.name || 'General'}</div>
                </div>
              </div>
              <button className="btn" style={{ padding: 6, border: 'none' }} onClick={() => setViewingNote(null)}>
                <X className="i" />
              </button>
            </div>
            <div className="mb" style={{ maxHeight: '70vh', overflowY: 'auto', padding: 20 }}>
              {renderNoteContent(viewingNote)}
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
