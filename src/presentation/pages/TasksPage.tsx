import React, { useState, useEffect } from 'react';
import { Plus, Search, Check, RefreshCcw } from 'lucide-react';
import { taskService } from '../../business/services/taskService';
import { subjectService } from '../../business/services/subjectService';
import { isTaskDueToday, isTaskUpcoming, isTaskOverdue } from '../../business/logic/taskLogic';
import type { Task, Subject } from '../../types/index';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [currentTab, setCurrentTab] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all');

  const [newTask, setNewTask] = useState<{
    id?: string;
    title: string;
    subjectId: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'in-progress' | 'completed' | 'overdue';
    estimatedTime: number;
    description: string;
  }>({
    title: '',
    subjectId: '',
    dueDate: '',
    priority: 'medium',
    status: 'pending',
    estimatedTime: 120,
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [loadedTasks, loadedSubjects] = await Promise.all([
        taskService.getTasks(),
        subjectService.getSubjects()
      ]);
      setTasks(loadedTasks);
      setSubjects(loadedSubjects);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const openDrawerForNew = () => {
    setNewTask({
      title: '',
      subjectId: subjects.length > 0 ? subjects[0].id : '',
      dueDate: new Date().toISOString().slice(0, 16),
      priority: 'medium',
      status: 'pending',
      estimatedTime: 120,
      description: ''
    });
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!newTask.title) return;
    setErrorMsg(null);
    
    try {
      setSaving(true);
      const taskData = {
        title: newTask.title,
        subjectId: newTask.subjectId || '',
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined,
        priority: newTask.priority,
        status: newTask.status,
        estimatedTime: newTask.estimatedTime,
        description: newTask.description
      };
      
      let updatedTasks = [...tasks];
      
      if (newTask.id) {
        // Update existing task
        const updated = await taskService.updateTask(newTask.id, taskData);
        updatedTasks = updatedTasks.map(t => t.id === newTask.id ? updated : t);
      } else {
        // Add new task
        const added = await taskService.addTask(taskData);
        updatedTasks.push(added);
      }
      
      setTasks(updatedTasks.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }));
      setIsDrawerOpen(false);
    } catch (error: any) {
      console.error("Failed to save task:", error);
      setErrorMsg(error?.message || "An unexpected database error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDone = async (task: Task) => {
    if (task.status === 'completed') return;
    try {
      const updated = await taskService.markCompleted(task.id);
      setTasks(tasks.map(t => t.id === task.id ? updated : t));
    } catch (error: any) {
      console.error("Failed to update task:", error);
      setErrorMsg(error?.message || "Failed to mark task as done.");
    }
  };

  const handleUncomplete = async (task: Task) => {
    if (task.status !== 'completed') return;
    try {
      const updated = await taskService.uncompleteTask(task.id);
      setTasks(tasks.map(t => t.id === task.id ? updated : t));
    } catch (error: any) {
      console.error("Failed to uncomplete task:", error);
      setErrorMsg(error?.message || "Failed to uncomplete task.");
    }
  };

  const getSubjectName = (subjectId: string) => {
    const sub = subjects.find(s => s.id === subjectId);
    return sub ? sub.name : 'No subject';
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return <span className="pr c">Critical</span>;
      case 'high': return <span className="pr h">High</span>;
      case 'medium': return <span className="pr m">Medium</span>;
      default: return <span className="pr">Low</span>;
    }
  };

  const getStatusBadge = (status: string, task: Task) => {
    if (status === 'completed') return <span className="badge ok">Done</span>;
    if (isTaskOverdue(task)) return <span className="badge late">Overdue</span>;
    if (status === 'in-progress') return <span className="badge">In progress</span>;
    return <span className="badge">Pending</span>;
  };

  // Filter tasks based on current tab
  const now = new Date();
  const filteredTasks = tasks.filter(t => {
    if (currentTab === 'all') return true;
    if (currentTab === 'today') return isTaskDueToday(t, now);
    if (currentTab === 'upcoming') return isTaskUpcoming(t, now);
    if (currentTab === 'overdue') return isTaskOverdue(t, now);
    if (currentTab === 'completed') return t.status === 'completed';
    return true;
  }).filter(t => {
    if (selectedSubjectFilter && t.subjectId !== selectedSubjectFilter) return false;
    return t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <>
      <div className="hdr">
        <h2>Tasks</h2>
        <div className="r">
          <button className="btn pri" onClick={openDrawerForNew}>
            <Plus className="i" /> Add task
          </button>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div className="tabs">
            <a className={currentTab === 'all' ? 'on' : ''} href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('all'); }}>All<em>{tasks.length}</em></a>
            <a className={currentTab === 'today' ? 'on' : ''} href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('today'); }}>Today<em>{tasks.filter(t => isTaskDueToday(t, now)).length}</em></a>
            <a className={currentTab === 'upcoming' ? 'on' : ''} href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('upcoming'); }}>Upcoming<em>{tasks.filter(t => isTaskUpcoming(t, now)).length}</em></a>
            <a className={currentTab === 'overdue' ? 'on' : ''} href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('overdue'); }}>Overdue<em>{tasks.filter(t => isTaskOverdue(t, now)).length}</em></a>
            <a className={currentTab === 'completed' ? 'on' : ''} href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('completed'); }}>Completed<em>{tasks.filter(t => t.status === 'completed').length}</em></a>
          </div>
          <div className="tools">
            <div className="in sr" style={{ padding: 0 }}>
              <Search className="i" style={{ marginLeft: 12, position: 'absolute' }} />
              <input 
                type="text" 
                placeholder="Search tasks..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', paddingLeft: 38, outline: 'none', fontSize: 13, color: 'inherit' }}
              />
            </div>
            <select className="in" aria-label="Subject" value={selectedSubjectFilter} onChange={e => setSelectedSubjectFilter(e.target.value)}>
              <option value="">All subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          
          {loading ? (
            <p style={{ padding: 20, color: 'var(--muted)' }}>Loading tasks from database...</p>
          ) : filteredTasks.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              {currentTab === 'today' && <p>🎉 You have no tasks for today.</p>}
              {currentTab === 'completed' && <p>No tasks completed yet.</p>}
              {currentTab === 'upcoming' && <p>You're all caught up. No upcoming tasks.</p>}
              {currentTab === 'overdue' && <p>Great! You have no overdue tasks.</p>}
              {currentTab === 'all' && <p>No tasks found. Click "Add task" to get started.</p>}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: '34px' }}></th>
                  <th>Task</th>
                  {!isMobile && <th>Due</th>}
                  {!isMobile && <th>Priority</th>}
                  {isMobile ? <th className="m-hide">Status</th> : <th>Status</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => {
                  const isDone = task.status === 'completed';
                  return (
                    <tr key={task.id} className={isDone ? 'done' : ''}>
                      <td>
                        <span className={`ck ${isDone ? 'y' : ''}`} style={{ cursor: 'pointer' }} onClick={() => isDone ? handleUncomplete(task) : handleMarkDone(task)}>
                          {isDone && <Check className="i" style={{strokeWidth: 3, width: 12, height: 12}} />}
                        </span>
                      </td>
                      <td>
                        <span className="t" style={{ cursor: 'pointer' }} onClick={() => {
                          setNewTask({
                            id: task.id,
                            title: task.title,
                            subjectId: task.subjectId,
                            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
                            priority: task.priority,
                            status: task.status,
                            estimatedTime: task.estimatedTime || 0,
                            description: task.description || ''
                          });
                          setIsDrawerOpen(true);
                        }}>{task.title}</span>
                        <span className="sub">
                          {isMobile 
                            ? (task.dueDate ? new Date(task.dueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'No date')
                            : `${getSubjectName(task.subjectId)} · ${task.estimatedTime ? Math.round(task.estimatedTime / 60) : 0} hours`}
                        </span>
                      </td>
                      {!isMobile && (
                        <td>
                          {task.dueDate ? new Date(task.dueDate).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'No due date'}
                        </td>
                      )}
                      {!isMobile && <td>{getPriorityLabel(task.priority)}</td>}
                      <td className={isMobile ? "m-hide" : ""}>{getStatusBadge(task.status, task)}</td>
                      <td style={{ display: 'flex', gap: 6, flexDirection: isMobile ? 'column' : 'row' }}>
                        <button className="btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => {
                          setNewTask({
                            id: task.id,
                            title: task.title,
                            subjectId: task.subjectId,
                            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
                            priority: task.priority,
                            status: task.status,
                            estimatedTime: task.estimatedTime || 0,
                            description: task.description || ''
                          });
                          setIsDrawerOpen(true);
                        }}>{isMobile ? 'Edit' : 'Edit'}</button>
                        
                        {!isDone ? (
                          <button className="btn pri" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleMarkDone(task)}>
                            {isMobile ? <Check className="i" style={{ width: 12, height: 12 }} /> : 'Mark done'}
                          </button>
                        ) : (
                          <button className="btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleUncomplete(task)} title="Mark as incomplete">
                            <RefreshCcw className="i" style={{ width: 12, height: 12 }} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isDrawerOpen && (
        <>
          <div className="veil" style={{ display: 'block' }} onClick={() => setIsDrawerOpen(false)}></div>
          <div className="drawer" role="dialog" aria-label="Add task" style={{ display: 'flex' }}>
            <div className="dh">
              <h3>{newTask.id ? 'Edit task' : 'Add task'}</h3>
              <button className="btn" style={{ padding: '6px 10px' }} onClick={() => setIsDrawerOpen(false)}>Close</button>
            </div>
            <div className="db">
              <div className="f">
                <label>Title <i>*</i></label>
                <input className="in" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="e.g. Data Structures Assignment 1" />
              </div>
              <div className="f">
                <label>Subject</label>
                <select className="in" value={newTask.subjectId} onChange={e => setNewTask({...newTask, subjectId: e.target.value})}>
                  <option value="">Select subject...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="g2">
                <div className="f">
                  <label>Due date & time</label>
                  <input type="datetime-local" className="in" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
                </div>
                <div className="f">
                  <label>Status</label>
                  <select className="in" value={newTask.status} onChange={e => setNewTask({...newTask, status: e.target.value as any})}>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In progress</option>
                  </select>
                </div>
              </div>
              <div className="f">
                <label>Priority <i>*</i></label>
                <div className="seg">
                  {['low', 'medium', 'high', 'critical'].map(p => (
                    <span key={p} className={newTask.priority === p ? 'on' : ''} onClick={() => setNewTask({...newTask, priority: p as any})}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="f">
                <label>Estimated time (minutes)</label>
                <input type="number" className="in" value={newTask.estimatedTime === 0 ? '' : newTask.estimatedTime} onChange={e => setNewTask({...newTask, estimatedTime: e.target.value === '' ? 0 : Number(e.target.value)})} />
              </div>
              <div className="f">
                <label>Notes</label>
                <textarea className="in" style={{ height: 80, padding: 10 }} value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} placeholder="Optional details..."></textarea>
              </div>
            </div>
            <div className="df">
              <button className="btn" onClick={() => setIsDrawerOpen(false)}>Cancel</button>
              <button className="btn pri" disabled={saving || !newTask.title} onClick={handleSave}>
                {saving ? 'Saving...' : 'Save task'}
              </button>
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
    </>
  );
};
