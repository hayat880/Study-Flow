import { noteRepository } from '../../data/repositories/noteRepository';
import type { Note } from '../../types/index';
import { v4 as uuidv4 } from 'uuid';

export const noteService = {
  getNotes: async (): Promise<Note[]> => {
    return await noteRepository.getAll();
  },

  addTextNote: async (subjectId: string | null, title: string, content: string, tags?: string[]): Promise<Note> => {
    return await noteRepository.add({
      subjectId,
      title,
      type: 'Text Note',
      content,
      tags
    });
  },

  addLinkNote: async (subjectId: string | null, title: string, type: 'YouTube Link' | 'Web Link', url: string, tags?: string[]): Promise<Note> => {
    return await noteRepository.add({
      subjectId,
      title,
      type,
      content: url,
      tags
    });
  },

  uploadFileNote: async (subjectId: string | null, title: string, file: File, type: 'PDF' | 'Image' | 'Video' | 'File', tags?: string[]): Promise<Note> => {
    // Generate a unique path for the file to avoid collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const path = `${subjectId || 'general'}/${fileName}`;

    // 1. Upload to Supabase Storage
    const storagePath = await noteRepository.uploadFile(file, path);

    // 2. Save the database record
    return await noteRepository.add({
      subjectId,
      title,
      type,
      storagePath,
      tags
    });
  },

  deleteNote: async (note: Note): Promise<void> => {
    // If it has a file, delete it from storage first
    if (note.storagePath) {
      try {
        await noteRepository.deleteFile(note.storagePath);
      } catch (e) {
        console.error("Failed to delete file from storage:", e);
      }
    }
    // Then delete the DB record
    await noteRepository.remove(note.id);
  },

  getFileUrl: (path: string): string => {
    return noteRepository.getFileUrl(path);
  },
  
  extractYoutubeId: (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }
};
