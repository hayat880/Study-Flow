import { plannerRepository } from '../../data/repositories/plannerRepository';
import type { StudySession } from '../../types/index';

export const plannerService = {
  getSessions: async (): Promise<StudySession[]> => {
    return await plannerRepository.getAll();
  },

  addSession: async (session: Omit<StudySession, 'id' | 'createdAt' | 'userId'>): Promise<StudySession> => {
    return await plannerRepository.add(session);
  },

  updateSession: async (id: string, updates: Partial<StudySession>): Promise<StudySession> => {
    return await plannerRepository.update(id, updates);
  },

  deleteSession: async (id: string): Promise<void> => {
    return await plannerRepository.remove(id);
  },

  startSession: async (id: string): Promise<StudySession> => {
    return await plannerRepository.update(id, { status: 'In Progress' });
  },

  finishSession: async (id: string, actualDurationMinutes: number): Promise<StudySession> => {
    return await plannerRepository.update(id, { 
      status: 'Completed', 
      actualDuration: actualDurationMinutes,
      completedAt: new Date().toISOString() as any
    });
  },

  saveProgress: async (id: string, actualDurationMinutes: number): Promise<StudySession> => {
    return await plannerRepository.update(id, { 
      status: 'In Progress', 
      actualDuration: actualDurationMinutes 
    });
  },
  
  markSkipped: async (id: string): Promise<StudySession> => {
    return await plannerRepository.update(id, { status: 'Skipped' });
  }
};
