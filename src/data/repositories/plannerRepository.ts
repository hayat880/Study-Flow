import { supabase } from '../../lib/supabase';
import type { StudySession } from '../../types/index';

export const plannerRepository = {
  async getAll(): Promise<StudySession[]> {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .order('scheduled_start', { ascending: true });
      
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      subjectId: row.subject_id,
      taskId: row.task_id,
      title: row.title,
      scheduledStart: new Date(row.scheduled_start).getTime(),
      scheduledEnd: new Date(row.scheduled_end).getTime(),
      status: row.status as StudySession['status'],
      actualDuration: row.actual_duration,
      notes: row.notes,
      completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
      createdAt: new Date(row.created_at).getTime(),
    }));
  },
  
  async add(session: Omit<StudySession, 'id' | 'createdAt' | 'userId'>): Promise<StudySession> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('study_sessions')
      .insert([{
        user_id: authData.user.id,
        subject_id: session.subjectId,
        task_id: session.taskId,
        title: session.title,
        scheduled_start: new Date(session.scheduledStart).toISOString(),
        scheduled_end: new Date(session.scheduledEnd).toISOString(),
        status: session.status,
        actual_duration: session.actualDuration,
        notes: session.notes,
        completed_at: session.completedAt ? new Date(session.completedAt).toISOString() : null
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      id: data.id,
      userId: data.user_id,
      subjectId: data.subject_id,
      taskId: data.task_id,
      title: data.title,
      scheduledStart: new Date(data.scheduled_start).getTime(),
      scheduledEnd: new Date(data.scheduled_end).getTime(),
      status: data.status,
      actualDuration: data.actual_duration,
      notes: data.notes,
      completedAt: data.completed_at ? new Date(data.completed_at).getTime() : undefined,
      createdAt: new Date(data.created_at).getTime(),
    };
  },
  
  async update(id: string, updates: Partial<StudySession>): Promise<StudySession> {
    const payload: any = {};
    if (updates.subjectId !== undefined) payload.subject_id = updates.subjectId;
    if (updates.taskId !== undefined) payload.task_id = updates.taskId;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.scheduledStart !== undefined) payload.scheduled_start = new Date(updates.scheduledStart).toISOString();
    if (updates.scheduledEnd !== undefined) payload.scheduled_end = new Date(updates.scheduledEnd).toISOString();
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.actualDuration !== undefined) payload.actual_duration = updates.actualDuration;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt ? new Date(updates.completedAt).toISOString() : null;

    const { data, error } = await supabase
      .from('study_sessions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      id: data.id,
      userId: data.user_id,
      subjectId: data.subject_id,
      taskId: data.task_id,
      title: data.title,
      scheduledStart: new Date(data.scheduled_start).getTime(),
      scheduledEnd: new Date(data.scheduled_end).getTime(),
      status: data.status,
      actualDuration: data.actual_duration,
      notes: data.notes,
      completedAt: data.completed_at ? new Date(data.completed_at).getTime() : undefined,
      createdAt: new Date(data.created_at).getTime(),
    };
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
