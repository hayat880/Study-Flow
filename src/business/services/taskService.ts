import { supabase } from '../../lib/supabase';
import type { Task } from '../../types/index';
import { taskRepository } from '../../data/repositories/taskRepository';

export const taskService = {
  async getTasks(): Promise<Task[]> {
    return await taskRepository.getAll();
  },

  async addTask(data: Omit<Task, 'id' | 'createdAt' | 'userId'>): Promise<Task> {
    return await taskRepository.add(data);
  },

  async updateTask(id: string, data: Partial<Omit<Task, 'id' | 'createdAt' | 'userId'>>): Promise<Task> {
    return await taskRepository.update(id, data);
  },

  async deleteTask(id: string): Promise<void> {
    await taskRepository.remove(id);
  },
  
  async markCompleted(id: string): Promise<Task> {
    return await taskRepository.update(id, { 
      status: 'completed',
      completedAt: new Date().getTime() 
    });
  },
  
  async uncompleteTask(id: string): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'pending', completed_at: null })
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
      completedAt: undefined,
      createdAt: new Date(data.created_at).getTime(),
    };
  }
};
