import { supabase } from '../../lib/supabase';
import type { AcademicRecord } from '../../types/index';

export const academicRepository = {
  async getAll(): Promise<AcademicRecord[]> {
    const { data, error } = await supabase
      .from('academic_records')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      subjectId: row.subject_id,
      component: row.component,
      obtainedMarks: row.obtained_marks,
      totalMarks: row.total_marks,
      type: row.type as any,
      createdAt: new Date(row.created_at).getTime(),
    }));
  },
  
  async add(record: Omit<AcademicRecord, 'id' | 'createdAt' | 'userId'>): Promise<AcademicRecord> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('academic_records')
      .insert([{
        user_id: authData.user.id,
        subject_id: record.subjectId,
        component: record.component,
        obtained_marks: record.obtainedMarks,
        total_marks: record.totalMarks,
        type: record.type
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      id: data.id,
      userId: data.user_id,
      subjectId: data.subject_id,
      component: data.component,
      obtainedMarks: data.obtained_marks,
      totalMarks: data.total_marks,
      type: data.type as any,
      createdAt: new Date(data.created_at).getTime(),
    };
  },
  
  async update(id: string, record: Partial<AcademicRecord>): Promise<AcademicRecord> {
    const updates: any = {};
    if (record.component !== undefined) updates.component = record.component;
    if (record.obtainedMarks !== undefined) updates.obtained_marks = record.obtainedMarks;
    if (record.totalMarks !== undefined) updates.total_marks = record.totalMarks;
    if (record.type !== undefined) updates.type = record.type;

    const { data, error } = await supabase
      .from('academic_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      id: data.id,
      userId: data.user_id,
      subjectId: data.subject_id,
      component: data.component,
      obtainedMarks: data.obtained_marks,
      totalMarks: data.total_marks,
      type: data.type as any,
      createdAt: new Date(data.created_at).getTime(),
    };
  },
  
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('academic_records')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
