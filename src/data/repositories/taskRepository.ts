import { supabase } from '../../lib/supabase';
import type { Task } from '../../types/index';

export const taskRepository = {
  async getAll(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false });
      
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      subjectId: row.subject_id,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      priority: row.priority,
      status: row.status,
      estimatedTime: row.estimated_minutes,
      completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
      createdAt: new Date(row.created_at).getTime(),
      eventType: row.event_type || 'Task',
    }));
  },
  
  async add(task: Omit<Task, 'id' | 'createdAt' | 'userId'>): Promise<Task> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        user_id: authData.user.id,
        subject_id: task.subjectId || null,
        title: task.title,
        description: task.description,
        due_date: task.dueDate || null,
        priority: task.priority,
        status: task.status,
        estimated_minutes: task.estimatedTime,
        completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null,
        event_type: task.eventType || 'Task'
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      id: data.id,
      userId: data.user_id,
      subjectId: data.subject_id,
      title: data.title,
      description: data.description,
      dueDate: data.due_date,
      priority: data.priority,
      status: data.status,
      estimatedTime: data.estimated_minutes,
      completedAt: data.completed_at ? new Date(data.completed_at).getTime() : undefined,
      createdAt: new Date(data.created_at).getTime(),
      eventType: data.event_type || 'Task',
    };
  },
  
  async update(id: string, task: Partial<Task>): Promise<Task> {
    const updates: any = {};
    if (task.subjectId !== undefined) updates.subject_id = task.subjectId;
    if (task.title !== undefined) updates.title = task.title;
    if (task.description !== undefined) updates.description = task.description;
    if (task.dueDate !== undefined) updates.due_date = task.dueDate;
    if (task.priority !== undefined) updates.priority = task.priority;
    if (task.status !== undefined) updates.status = task.status;
    if (task.estimatedTime !== undefined) updates.estimated_minutes = task.estimatedTime;
    if (task.completedAt !== undefined) updates.completed_at = task.completedAt ? new Date(task.completedAt).toISOString() : null;
    if (task.eventType !== undefined) updates.event_type = task.eventType;

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      id: data.id,
      userId: data.user_id,
      subjectId: data.subject_id,
      title: data.title,
      description: data.description,
      dueDate: data.due_date,
      priority: data.priority,
      status: data.status,
      estimatedTime: data.estimated_minutes,
      completedAt: data.completed_at ? new Date(data.completed_at).getTime() : undefined,
      createdAt: new Date(data.created_at).getTime(),
      eventType: data.event_type || 'Task',
    };
  },
  
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
