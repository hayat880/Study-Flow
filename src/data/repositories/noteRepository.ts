import { supabase } from '../../lib/supabase';
import type { Note } from '../../types/index';

export const noteRepository = {
  async getAll(): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      subjectId: row.subject_id,
      title: row.title,
      type: row.type,
      content: row.content,
      storagePath: row.storage_path,
      tags: row.tags || [],
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }));
  },
  
  async add(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Note> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('notes')
      .insert([{
        user_id: authData.user.id,
        subject_id: note.subjectId,
        title: note.title,
        type: note.type,
        content: note.content,
        storage_path: note.storagePath,
        tags: note.tags || []
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      id: data.id,
      userId: data.user_id,
      subjectId: data.subject_id,
      title: data.title,
      type: data.type,
      content: data.content,
      storagePath: data.storage_path,
      tags: data.tags || [],
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  },
  
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },

  async uploadFile(file: File, path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('resources')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) throw error;
    return data.path;
  },

  async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from('resources')
      .remove([path]);
      
    if (error) throw error;
  },

  getFileUrl(path: string): string {
    const { data } = supabase.storage.from('resources').getPublicUrl(path);
    return data.publicUrl;
  }
};
