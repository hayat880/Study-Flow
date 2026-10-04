import type { Subject } from '../../types/index';
import { subjectRepository } from '../../data/repositories/subjectRepository';

export const subjectService = {
  async getSubjects(): Promise<Subject[]> {
    return await subjectRepository.getAll();
  },

  async addSubject(data: Omit<Subject, 'id' | 'createdAt'>): Promise<Subject> {
    return await subjectRepository.add(data);
  },

  async updateSubject(id: string, data: Partial<Omit<Subject, 'id' | 'createdAt'>>): Promise<Subject> {
    return await subjectRepository.update(id, data);
  },

  async deleteSubject(id: string): Promise<void> {
    await subjectRepository.remove(id);
  }
};
