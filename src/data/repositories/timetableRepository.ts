import { supabase } from '../../lib/supabase';
import type { TimetableClass } from '../../types/index';

export const timetableRepository = {
  async getAll(): Promise<TimetableClass[]> {
    const { data, error } = await supabase
      .from('timetable_classes')
      .select('*')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      subjectId: row.subject_id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      room: row.room,
      createdAt: new Date(row.created_at).getTime(),
    }));
  },

  async add(tClass: Omit<TimetableClass, 'id' | 'userId' | 'createdAt'>): Promise<TimetableClass> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Not logged in");

    const { data, error } = await supabase
      .from('timetable_classes')
      .insert([{
        user_id: userData.user.id,
        subject_id: tClass.subjectId,
        day_of_week: tClass.dayOfWeek,
        start_time: tClass.startTime,
        end_time: tClass.endTime,
        room: tClass.room || null
      }])
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      subjectId: data.subject_id,
      dayOfWeek: data.day_of_week,
      startTime: data.start_time,
      endTime: data.end_time,
      room: data.room,
      createdAt: new Date(data.created_at).getTime(),
    };
  },

  async update(id: string, updates: Partial<TimetableClass>): Promise<TimetableClass> {
    const dbUpdates: any = {};
    if (updates.subjectId !== undefined) dbUpdates.subject_id = updates.subjectId;
    if (updates.dayOfWeek !== undefined) dbUpdates.day_of_week = updates.dayOfWeek;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.room !== undefined) dbUpdates.room = updates.room;

    const { data, error } = await supabase
      .from('timetable_classes')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      userId: data.user_id,
      subjectId: data.subject_id,
      dayOfWeek: data.day_of_week,
      startTime: data.start_time,
      endTime: data.end_time,
      room: data.room,
      createdAt: new Date(data.created_at).getTime(),
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('timetable_classes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
