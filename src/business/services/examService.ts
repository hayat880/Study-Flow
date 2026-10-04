import { examRepository } from '../../data/repositories/examRepository';
import type { ExamTopic } from '../../types/index';

export const examService = {
  getTopics: async (taskId?: string): Promise<ExamTopic[]> => {
    if (taskId) {
      return await examRepository.getTopicsForExam(taskId);
    }
    return await examRepository.getAllTopics();
  },

  addTopic: async (taskId: string, title: string): Promise<ExamTopic> => {
    return await examRepository.addTopic(taskId, title);
  },

  toggleTopic: async (id: string, isCompleted: boolean): Promise<ExamTopic> => {
    return await examRepository.toggleTopic(id, isCompleted);
  },

  deleteTopic: async (id: string): Promise<void> => {
    return await examRepository.deleteTopic(id);
  }
};
