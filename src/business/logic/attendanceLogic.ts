import type { Subject, AttendanceRecord, TimetableClass } from '../../types/index';

export function calculateAttendanceStats(subject: Subject, records: AttendanceRecord[], timetable: TimetableClass[], semesterEndDateStr: string) {
  const subRecords = records.filter(r => r.subjectId === subject.id);
  const conductedRecords = subRecords.filter(r => r.status !== 'Cancelled');
  const conducted = conductedRecords.length;
  const attended = subRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const missed = conducted - attended;
  
  const percentage = conducted > 0 ? Math.round((attended / conducted) * 100) : 100;
  const reqDecimal = subject.attendanceThreshold / 100;

  // Calculate skip/recovery logic according to requirements
  let skippable = 0;
  let toRecover = 0;

  if (conducted > 0) {
    const rawSkippable = Math.floor((attended / reqDecimal) - conducted);
    skippable = Math.max(0, rawSkippable);
    
    if (percentage < subject.attendanceThreshold) {
      if (reqDecimal === 1) {
        // Edge case: Cannot recover 100% if already missed one.
        toRecover = -1; // Indicates impossible
      } else {
        const rawRecover = Math.ceil((reqDecimal * conducted - attended) / (1 - reqDecimal));
        toRecover = Math.max(0, rawRecover);
      }
    }
  }

  // Calculate remaining scheduled classes based on timetable till end of semester
  const now = new Date();
  const semesterEnd = new Date(semesterEndDateStr);
  let remainingClasses = 0;
  
  const subjectClasses = timetable.filter(t => t.subjectId === subject.id);
  
  // Loop from tomorrow till end of semester to count future occurrences
  if (subjectClasses.length > 0) {
    const iterDate = new Date(now);
    iterDate.setDate(iterDate.getDate() + 1); // Start counting from tomorrow
    
    while (iterDate <= semesterEnd) {
      const dayOfWeek = iterDate.getDay();
      const occurrences = subjectClasses.filter(c => c.dayOfWeek === dayOfWeek).length;
      remainingClasses += occurrences;
      iterDate.setDate(iterDate.getDate() + 1);
    }
  }

  const isSafe = percentage >= subject.attendanceThreshold;
  
  return {
    conducted,
    attended,
    missed,
    percentage,
    requiredPercentage: subject.attendanceThreshold,
    remainingClasses,
    skippable,
    toRecover,
    isSafe,
  };
}
