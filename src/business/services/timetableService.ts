import type { TimetableClass } from '../../types/index';
import { timetableRepository } from '../../data/repositories/timetableRepository';

export const timetableService = {
  async getClasses(): Promise<TimetableClass[]> {
    return await timetableRepository.getAll();
  },

  async addClass(tClass: Omit<TimetableClass, 'id' | 'userId' | 'createdAt'>): Promise<TimetableClass> {
    return await timetableRepository.add(tClass);
  },

  async updateClass(id: string, updates: Partial<TimetableClass>): Promise<TimetableClass> {
    return await timetableRepository.update(id, updates);
  },

  async deleteClass(id: string): Promise<void> {
    return await timetableRepository.delete(id);
  }
};
