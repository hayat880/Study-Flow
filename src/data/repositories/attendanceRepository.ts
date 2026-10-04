import { supabase } from '../../lib/supabase';
import type { AttendanceRecord } from '../../types/index';

export const attendanceRepository = {
  async getAll(): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      subjectId: row.subject_id,
      date: new Date(row.date).toISOString(),
      status: row.status as any,
      createdAt: new Date(row.created_at).getTime(),
    }));
  },

  async add(record: Omit<AttendanceRecord, 'id' | 'userId' | 'createdAt'>): Promise<AttendanceRecord> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Not logged in");

    const { data, error } = await supabase
      .from('attendance_records')
      .insert([{
        user_id: userData.user.id,
        subject_id: record.subjectId,
        date: new Date(record.date).toISOString(),
        status: record.status
      }])
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      subjectId: data.subject_id,
      date: new Date(data.date).toISOString(),
      status: data.status,
      createdAt: new Date(data.created_at).getTime(),
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
  
  async update(id: string, record: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    const updates: any = {};
    if (record.status !== undefined) updates.status = record.status;
    if (record.date !== undefined) updates.date = new Date(record.date).toISOString();
    
    const { data, error } = await supabase
      .from('attendance_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      userId: data.user_id,
      subjectId: data.subject_id,
      date: new Date(data.date).toISOString(),
      status: data.status,
      createdAt: new Date(data.created_at).getTime(),
    };
  }
};
