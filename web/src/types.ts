export type Role = 'profesor' | 'alumno';

export interface AttendanceRecord {
  id: string;
  studentId: string | null;
  studentName: string;
  course: string;
  subject: string | null;
  status: 'ontime' | 'absent';
  scannedAt: string; // ISO
}

export interface Justification {
  id: string;
  userId: string | null;
  studentName: string;
  course: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string; // ISO
}

export interface EnrolledStudent {
  id: string;
  fullName: string;
  course: string;
}
