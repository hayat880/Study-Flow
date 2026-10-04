import { supabase } from '../../lib/supabase';
import type { ExamTopic } from '../../types/index';

export const examRepository = {
  async getTopicsForExam(taskId: string): Promise<ExamTopic[]> {
    const { data, error } = await supabase
      .from('exam_topics')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      taskId: row.task_id,
      title: row.title,
      isCompleted: row.is_completed,
      createdAt: new Date(row.created_at).getTime(),
    }));
  },
  
  async addTopic(taskId: string, title: string): Promise<ExamTopic> {
    const { data, error } = await supabase
      .from('exam_topics')
      .insert([{
        task_id: taskId,
        title: title,
        is_completed: false
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      id: data.id,
      taskId: data.task_id,
      title: data.title,
      isCompleted: data.is_completed,
      createdAt: new Date(data.created_at).getTime(),
    };
  },
  
  async toggleTopic(id: string, isCompleted: boolean): Promise<ExamTopic> {
    const { data, error } = await supabase
      .from('exam_topics')
      .update({ is_completed: isCompleted })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      id: data.id,
      taskId: data.task_id,
      title: data.title,
      isCompleted: data.is_completed,
      createdAt: new Date(data.created_at).getTime(),
    };
  },

  async deleteTopic(id: string): Promise<void> {
    const { error } = await supabase
      .from('exam_topics')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },

  async getAllTopics(): Promise<ExamTopic[]> {
    // Used for calculating global stats if needed
    const { data, error } = await supabase
      .from('exam_topics')
      .select('*');
      
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      taskId: row.task_id,
      title: row.title,
      isCompleted: row.is_completed,
      createdAt: new Date(row.created_at).getTime(),
    }));
  }
};
