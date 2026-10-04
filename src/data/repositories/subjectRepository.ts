import { supabase } from '../../lib/supabase';
import type { Subject } from '../../types/index';

export const subjectRepository = {
  async getAll(): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // Map database snake_case to frontend camelCase
    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      code: row.code,
      teacher: row.instructor || '',
      creditHours: row.credit_hours,
      attendanceThreshold: row.attendance_threshold,
      quizCount: row.quiz_count,
      assignmentCount: row.assignment_count,
      createdAt: new Date(row.created_at).getTime(),
    }));
  },
  
  async add(subject: Omit<Subject, 'id' | 'createdAt'>): Promise<Subject> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('subjects')
      .insert([{
        user_id: authData.user.id,
        name: subject.name,
        code: subject.code,
        instructor: subject.teacher,
        credit_hours: subject.creditHours,
        attendance_threshold: subject.attendanceThreshold,
        quiz_count: subject.quizCount,
        assignment_count: subject.assignmentCount
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      code: data.code,
      teacher: data.instructor || '',
      creditHours: data.credit_hours,
      attendanceThreshold: data.attendance_threshold,
      quizCount: data.quiz_count,
      assignmentCount: data.assignment_count,
      createdAt: new Date(data.created_at).getTime(),
    };
  },
  
  async update(id: string, subject: Partial<Subject>): Promise<Subject> {
    const updates: any = {};
    if (subject.name !== undefined) updates.name = subject.name;
    if (subject.code !== undefined) updates.code = subject.code;
    if (subject.teacher !== undefined) updates.instructor = subject.teacher;
    if (subject.creditHours !== undefined) updates.credit_hours = subject.creditHours;
    if (subject.attendanceThreshold !== undefined) updates.attendance_threshold = subject.attendanceThreshold;
    if (subject.quizCount !== undefined) updates.quiz_count = subject.quizCount;
    if (subject.assignmentCount !== undefined) updates.assignment_count = subject.assignmentCount;

    const { data, error } = await supabase
      .from('subjects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      code: data.code,
      teacher: data.instructor || '',
      creditHours: data.credit_hours,
      attendanceThreshold: data.attendance_threshold,
      quizCount: data.quiz_count,
      assignmentCount: data.assignment_count,
      createdAt: new Date(data.created_at).getTime(),
    };
  },
  
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
