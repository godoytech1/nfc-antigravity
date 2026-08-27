export type Role = 'profesor' | 'alumno';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  course?: string;
  specialty?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  subject: string;
  specialty: string;
  timestamp: string; // ISO String or formatted time
}

export interface Justification {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  reason: string;
  hasAttachment: boolean;
  timestamp: string;
  status: 'pending' | 'approved' | 'denied';
}

// Broadcast messages
export type BroadcastMessage =
  | { type: 'NFC_SCAN'; payload: AttendanceRecord }
  | { type: 'JUSTIFICATION_SUBMIT'; payload: Justification }
  | { type: 'JUSTIFICATION_UPDATE'; payload: { id: string; status: 'approved' | 'denied' } };
