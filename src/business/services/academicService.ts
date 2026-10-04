import { academicRepository } from '../../data/repositories/academicRepository';
import type { AcademicRecord } from '../../types/index';

export const academicService = {
  getRecords: async (): Promise<AcademicRecord[]> => {
    return await academicRepository.getAll();
  },

  addRecord: async (record: Omit<AcademicRecord, 'id' | 'createdAt' | 'userId'>): Promise<AcademicRecord> => {
    if (record.obtainedMarks < 0 || record.totalMarks <= 0) {
      throw new Error("Invalid marks input.");
    }
    return await academicRepository.add(record);
  },

  updateRecord: async (id: string, updates: Partial<AcademicRecord>): Promise<AcademicRecord> => {
    return await academicRepository.update(id, updates);
  },

  deleteRecord: async (id: string): Promise<void> => {
    return await academicRepository.remove(id);
  }
};
