export enum Role {
  INSTRUCTOR = 'INSTRUCTOR',
  SUPERVISOR = 'SUPERVISOR',
}

export type EntryStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  zoneId: string;
  photoUrl: string;
  languages: string[];
  designations: string[];
  password?: string;
  targetHours?: number; // Meta mensal
  subgroup?: string; // Ex: "Equipe EN", "Equipe Manhã"
}

export interface Zone {
  id: string;
  name: string;
  supervisorId: string;
}

export interface AuditLog {
  changedAt: string;
  changedBy: string; // userId
  changes: string; // text description of what changed
}

export interface SupervisorLog {
  id: string;
  supervisorId: string;
  supervisorName: string;
  action: string;
  timestamp: string;
}

export interface Entry {
  id: string;
  userId: string;
  zoneId: string;
  date: string; // YYYY-MM-DD
  designation: string;
  languages: string[];
  hours: number;
  notes?: string;
  link?: string; // Link para material/comprovante
  status: EntryStatus;
  rejectionReason?: string;
  createdAt: string;
  editCount: number; // Track frequent edits
  history?: AuditLog[];
}

export interface DateRange {
  start: string;
  end: string;
}

export interface Stats {
  totalHours: number;
  entryCount: number;
  avgHoursPerEntry: number;
  avgHoursPerDay: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'success';
  read: boolean;
  createdAt: string;
}

export interface SmartAlert {
  id: string;
  type: 'late_entry' | 'high_hours_no_note' | 'frequent_edits' | 'last_minute_bulk';
  userId: string;
  severity: 'medium' | 'high';
  message: string;
  count?: number;
}