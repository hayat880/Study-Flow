import type { AttendanceRecord } from '../../types/index';
import { attendanceRepository } from '../../data/repositories/attendanceRepository';

export const attendanceService = {
  async getRecords(): Promise<AttendanceRecord[]> {
    return await attendanceRepository.getAll();
  },

  async addRecord(record: Omit<AttendanceRecord, 'id' | 'userId' | 'createdAt'>): Promise<AttendanceRecord> {
    return await attendanceRepository.add(record);
  },

  async updateRecord(id: string, record: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    return await attendanceRepository.update(id, record);
  },

  async deleteRecord(id: string): Promise<void> {
    return await attendanceRepository.delete(id);
  }
};
