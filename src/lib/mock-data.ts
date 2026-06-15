import { Student, AttendanceRecord, Notification, Profile, Class, DashboardStats } from '@/types/database';

export const mockProfile: Profile = {
  id: '1',
  email: 'admin@school.edu',
  full_name: 'Dr. Rajesh Kumar',
  role: 'admin',
  created_at: new Date().toISOString(),
};

export const mockClasses: Class[] = [
  { id: '1', name: 'Class 10', section: 'A', teacher_id: '2', created_by: '1', created_at: new Date().toISOString() },
  { id: '2', name: 'Class 10', section: 'B', teacher_id: '3', created_by: '1', created_at: new Date().toISOString() },
  { id: '3', name: 'Class 9', section: 'A', teacher_id: '2', created_by: '1', created_at: new Date().toISOString() },
  { id: '4', name: 'Class 9', section: 'B', teacher_id: '3', created_by: '1', created_at: new Date().toISOString() },
  { id: '5', name: 'Class 8', section: 'A', teacher_id: '4', created_by: '1', created_at: new Date().toISOString() },
];

export const mockStudents: Student[] = [
  { id: '1', roll_number: '001', full_name: 'Rahul Kumar', class_id: '1', class_name: 'Class 10', section: 'A', parent_name: 'Suresh Kumar', parent_phone: '+91 98765 43210', parent_email: 'suresh@email.com', status: 'active', created_at: new Date().toISOString() },
  { id: '2', roll_number: '002', full_name: 'Priya Sharma', class_id: '1', class_name: 'Class 10', section: 'A', parent_name: 'Anil Sharma', parent_phone: '+91 98765 43211', parent_email: 'anil@email.com', status: 'active', created_at: new Date().toISOString() },
  { id: '3', roll_number: '003', full_name: 'Arjun Patel', class_id: '1', class_name: 'Class 10', section: 'A', parent_name: 'Vijay Patel', parent_phone: '+91 98765 43212', parent_email: 'vijay@email.com', status: 'active', created_at: new Date().toISOString() },
  { id: '4', roll_number: '004', full_name: 'Sneha Reddy', class_id: '1', class_name: 'Class 10', section: 'A', parent_name: 'Krishna Reddy', parent_phone: '+91 98765 43213', parent_email: 'krishna@email.com', status: 'active', created_at: new Date().toISOString() },
  { id: '5', roll_number: '005', full_name: 'Vikram Singh', class_id: '1', class_name: 'Class 10', section: 'A', parent_name: 'Harpreet Singh', parent_phone: '+91 98765 43214', parent_email: 'harpreet@email.com', status: 'active', created_at: new Date().toISOString() },
  { id: '6', roll_number: '006', full_name: 'Ananya Gupta', class_id: '1', class_name: 'Class 10', section: 'A', parent_name: 'Rohit Gupta', parent_phone: '+91 98765 43215', parent_email: 'rohit@email.com', status: 'active', created_at: new Date().toISOString() },
  { id: '7', roll_number: '007', full_name: 'Rohan Mehta', class_id: '2', class_name: 'Class 10', section: 'B', parent_name: 'Deepak Mehta', parent_phone: '+91 98765 43216', parent_email: 'deepak@email.com', status: 'active', created_at: new Date().toISOString() },
  { id: '8', roll_number: '008', full_name: 'Kavita Joshi', class_id: '2', class_name: 'Class 10', section: 'B', parent_name: 'Manoj Joshi', parent_phone: '+91 98765 43217', parent_email: 'manoj@email.com', status: 'active', created_at: new Date().toISOString() },
  { id: '9', roll_number: '009', full_name: 'Amit Verma', class_id: '3', class_name: 'Class 9', section: 'A', parent_name: 'Ramesh Verma', parent_phone: '+91 98765 43218', parent_email: 'ramesh@email.com', status: 'active', created_at: new Date().toISOString() },
  { id: '10', roll_number: '010', full_name: 'Neha Agarwal', class_id: '3', class_name: 'Class 9', section: 'A', parent_name: 'Sunil Agarwal', parent_phone: '+91 98765 43219', parent_email: 'sunil@email.com', status: 'active', created_at: new Date().toISOString() },
  { id: '11', roll_number: '011', full_name: 'Karan Malhotra', class_id: '4', class_name: 'Class 9', section: 'B', parent_name: 'Ashok Malhotra', parent_phone: '+91 98765 43220', parent_email: 'ashok@email.com', status: 'active', created_at: new Date().toISOString() },
  { id: '12', roll_number: '012', full_name: 'Divya Nair', class_id: '5', class_name: 'Class 8', section: 'A', parent_name: 'Prakash Nair', parent_phone: '+91 98765 43221', parent_email: 'prakash@email.com', status: 'active', created_at: new Date().toISOString() },
];

const today = new Date().toISOString().split('T')[0];

export const mockAttendance: AttendanceRecord[] = [
  { id: '1', student_id: '1', attendance_date: today, status: 'present', marked_by: '1', created_at: new Date().toISOString() },
  { id: '2', student_id: '2', attendance_date: today, status: 'present', marked_by: '1', created_at: new Date().toISOString() },
  { id: '3', student_id: '3', attendance_date: today, status: 'absent', marked_by: '1', created_at: new Date().toISOString() },
  { id: '4', student_id: '4', attendance_date: today, status: 'present', marked_by: '1', created_at: new Date().toISOString() },
  { id: '5', student_id: '5', attendance_date: today, status: 'present', marked_by: '1', created_at: new Date().toISOString() },
  { id: '6', student_id: '6', attendance_date: today, status: 'absent', marked_by: '1', created_at: new Date().toISOString() },
  { id: '7', student_id: '7', attendance_date: today, status: 'present', marked_by: '1', created_at: new Date().toISOString() },
  { id: '8', student_id: '8', attendance_date: today, status: 'present', marked_by: '1', created_at: new Date().toISOString() },
  { id: '9', student_id: '9', attendance_date: today, status: 'present', marked_by: '1', created_at: new Date().toISOString() },
  { id: '10', student_id: '10', attendance_date: today, status: 'absent', marked_by: '1', created_at: new Date().toISOString() },
];

export const mockNotifications: Notification[] = [
  { id: '1', student_id: '3', message: 'Dear Parent,\n\nYour child Arjun Patel was marked absent today.\n\nClass: Class 10-A\n\nRegards,\nSchool Administration', channel: 'sms', status: 'sent', created_at: new Date().toISOString() },
  { id: '2', student_id: '6', message: 'Dear Parent,\n\nYour child Ananya Gupta was marked absent today.\n\nClass: Class 10-A\n\nRegards,\nSchool Administration', channel: 'email', status: 'pending', created_at: new Date().toISOString() },
  { id: '3', student_id: '10', message: 'Dear Parent,\n\nYour child Neha Agarwal was marked absent today.\n\nClass: Class 9-A\n\nRegards,\nSchool Administration', channel: 'whatsapp', status: 'pending', created_at: new Date().toISOString() },
];

export const mockDashboardStats: DashboardStats = {
  totalStudents: 12,
  presentToday: 9,
  absentToday: 3,
  attendanceRate: 75.0,
};

export const mockWeeklyData = [
  { day: 'Mon', present: 10, absent: 2, rate: 83 },
  { day: 'Tue', present: 11, absent: 1, rate: 92 },
  { day: 'Wed', present: 9, absent: 3, rate: 75 },
  { day: 'Thu', present: 10, absent: 2, rate: 83 },
  { day: 'Fri', present: 9, absent: 3, rate: 75 },
];
