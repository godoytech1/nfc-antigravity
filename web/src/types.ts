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

// Archivo adjunto a un justificativo (guardado en el bucket privado "justificativos").
export interface Attachment {
  path: string;
  name: string;
  type: string;
  size: number;
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
  attachments: Attachment[];
}

export interface EnrolledStudent {
  id: string;
  fullName: string;
  course: string;
}
