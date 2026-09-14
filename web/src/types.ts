export type Role = 'profesor' | 'alumno';

export type AttendanceStatus = 'ontime' | 'late' | 'absent';

export interface AttendanceRecord {
  id: string;
  studentId: string | null;
  studentName: string;
  course: string;
  status: AttendanceStatus;
  fecha: string; // YYYY-MM-DD, día de clase según la zona horaria del colegio
  scannedAt: string; // ISO
}

export interface Justification {
  id: string;
  userId: string | null;
  studentName: string;
  course: string;
  reason: string;
  fecha: string; // YYYY-MM-DD: el día que se está justificando
  status: 'pending' | 'approved' | 'denied';
  createdAt: string; // ISO
}

export interface EnrolledStudent {
  id: string;
  fullName: string;
  course: string;
}
