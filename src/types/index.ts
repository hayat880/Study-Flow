export interface Subject {
  id: string;
  name: string;
  code: string;
  teacher?: string;
  creditHours?: number;
  color?: string;
  attendanceThreshold: number;
  quizCount: number;
  assignmentCount: number;
  createdAt: number;
}

export interface Task {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  description?: string;
  dueDate?: string; 
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  estimatedTime?: number;
  completedAt?: number;
  createdAt: number;
  eventType?: 'Task' | 'Assignment' | 'Exam' | 'Quiz' | 'Lab' | 'Project' | 'Study' | 'Other';
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  subjectId: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused' | 'Cancelled';
  createdAt: number;
}

export interface TimetableClass {
  id: string;
  userId: string;
  subjectId: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  startTime: string; // e.g. "09:00:00"
  endTime: string;   // e.g. "10:00:00"
  room?: string;
  createdAt: number;
}

export interface AcademicRecord {
  id: string;
  userId: string;
  subjectId: string;
  component: string;
  obtainedMarks: number;
  totalMarks: number;
  type: 'Quiz' | 'Assignment' | 'Project' | 'Exam' | 'Other';
  createdAt: number;
}

export interface Note {
  id: string;
  userId: string;
  subjectId: string | null;
  title: string;
  type: string; // 'Text Note', 'PDF', 'YouTube Link', 'Web Link', 'Image', 'Video', 'File'
  content?: string; 
  storagePath?: string; 
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ExamTopic {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  createdAt: number;
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId: string | null;
  taskId: string | null;
  title: string;
  scheduledStart: number;
  scheduledEnd: number;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Skipped';
  actualDuration: number; // in minutes
  notes?: string;
  completedAt?: number;
  createdAt: number;
}
