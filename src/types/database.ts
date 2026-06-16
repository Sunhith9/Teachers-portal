export type UserRole = 'admin' | 'teacher';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  section: string;
  teacher_id?: string;
  created_by: string;
  created_at: string;
}

export interface Student {
  id: string;
  roll_number: string;
  full_name: string;
  class_id: string;
  class_name?: string;
  section?: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  gender?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  attendance_date: string;
  status: 'present' | 'absent';
  marked_by: string;
  created_at: string;
  student?: Student;
}

export interface Notification {
  id: string;
  student_id: string;
  message: string;
  channel: 'whatsapp' | 'sms' | 'email';
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
  student?: Student;
}

export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
}

export interface AttendanceEntry {
  studentId: string;
  status: 'present' | 'absent' | null;
}
