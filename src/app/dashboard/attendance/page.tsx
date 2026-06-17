'use client';

import { useState, useMemo, useEffect } from 'react';
import { Check, X, CheckCheck, Save, Calendar, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/loading';
import { type Class, type Student, type AttendanceRecord } from '@/types/database';
import { generateNotificationMessage, formatDate, cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function AttendancePage() {
  const { showToast } = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | null>>({});
  const [sendAlertsImmediately, setSendAlertsImmediately] = useState(true);

  // Load default preference from settings in localStorage
  useEffect(() => {
    const cachedNotifs = localStorage.getItem('notification_settings');
    if (cachedNotifs) {
      try {
        const parsed = JSON.parse(cachedNotifs);
        if (parsed.autoSendAlerts !== undefined) {
          setSendAlertsImmediately(parsed.autoSendAlerts);
        }
      } catch (e) {
        console.error('Failed to load notification settings', e);
      }
    }
  }, []);

  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data as Class[];
    }
  });

  const { data: classStudents = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', selectedClass)
        .order('full_name');
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!selectedClass
  });

  const { data: existingAttendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance', selectedClass, selectedDate],
    queryFn: async () => {
      if (!selectedClass) return [];
      const studentIds = classStudents.map(s => s.id);
      if (studentIds.length === 0) return [];

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('attendance_date', selectedDate)
        .in('student_id', studentIds);
      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: !!selectedClass && classStudents.length > 0
  });

  // Pre-fill attendance when data loads
  useEffect(() => {
    if (!existingAttendance) return;

    const newAtt: Record<string, 'present' | 'absent'> = {};
    existingAttendance.forEach(a => {
      newAtt[a.student_id] = a.status;
    });
    setAttendance(newAtt);
  }, [existingAttendance]);

  // Set default class if not set
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  const classOptions = classes.map(c => ({
    value: c.id,
    label: `${c.name} - ${c.section}`,
  }));

  const stats = useMemo(() => {
    const present = Object.values(attendance).filter(s => s === 'present').length;
    const absent = Object.values(attendance).filter(s => s === 'absent').length;
    const unmarked = classStudents.length - present - absent;
    return { present, absent, unmarked, total: classStudents.length };
  }, [attendance, classStudents]);

  const markAttendance = (studentId: string, status: 'present' | 'absent') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  };

  const markAllPresent = () => {
    const newAttendance: Record<string, 'present' | 'absent' | null> = {};
    classStudents.forEach(s => {
      newAttendance[s.id] = 'present';
    });
    setAttendance(newAttendance);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const attendanceRecords = Object.entries(attendance)
        .filter(([_, status]) => status !== null)
        .map(([student_id, status]) => ({
          student_id,
          attendance_date: selectedDate,
          status,
          marked_by: user.id
        }));

      // Upsert attendance
      const { error: attError } = await supabase
        .from('attendance')
        .upsert(attendanceRecords, { onConflict: 'student_id, attendance_date' });

      if (attError) throw attError;

      // Handle Notifications for absent students
      const absentStudents = classStudents.filter(s => attendance[s.id] === 'absent');
      let sentCount = 0;
      if (absentStudents.length > 0) {
        const selectedClassInfo = classes.find(c => c.id === selectedClass);
        const notifications = absentStudents.map(s => ({
          student_id: s.id,
          message: generateNotificationMessage(s.full_name, `${selectedClassInfo?.name}-${selectedClassInfo?.section}`, selectedDate, s.gender),
          channel: 'whatsapp' as const,
          status: 'pending' as const
        }));

        const { data: insertedNotifs, error: notifError } = await supabase.from('notifications').insert(notifications).select('id');
        if (notifError) {
          console.error('Failed to create notifications', notifError);
        } else if (sendAlertsImmediately) {
          try {
            const response = await fetch('/api/notifications/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ id: 'all' }),
            });
            const data = await response.json();
            if (response.ok) {
              sentCount = absentStudents.length;
            } else {
              console.error('Immediate WhatsApp send error:', data.error);
            }
          } catch (err) {
            console.error('Network error triggering immediate WhatsApp alerts:', err);
          }
        }
      }

      return { absentCount: absentStudents.length, sentCount };
    },
    onSuccess: ({ absentCount, sentCount }) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });

      const alertSuffix = absentCount === 0
        ? ''
        : sentCount > 0
          ? ` (WhatsApp alerts sent to parents!)`
          : ` (Notifications queued)`;

      showToast(
        `Attendance saved! ${stats.present} present, ${stats.absent} absent${alertSuffix}`,
        'success'
      );
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to save attendance', 'error');
    }
  });

  const handleSave = () => {
    const unmarked = classStudents.filter(s => !attendance[s.id]);
    if (unmarked.length > 0) {
      showToast(`${unmarked.length} student(s) are unmarked. Please mark all students.`, 'warning');
      return;
    }
    saveMutation.mutate();
  };

  if (isLoadingClasses) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner /></div>;

  const selectedClassInfo = classes.find(c => c.id === selectedClass);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-heading">Mark Attendance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Record daily attendance for your class
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer bg-white dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <input
              type="checkbox"
              checked={sendAlertsImmediately}
              onChange={(e) => setSendAlertsImmediately(e.target.checked)}
              className="h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <span>Send WhatsApp alerts immediately</span>
          </label>
          <Button variant="success" onClick={markAllPresent} size="md">
            <CheckCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Mark All Present</span>
            <span className="sm:hidden">All Present</span>
          </Button>
          <Button onClick={handleSave} loading={saveMutation.isPending} size="md">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Filters and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Select
                label="Class"
                options={classOptions}
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Present</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Absent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.unmarked}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unmarked</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Attendance Info */}
      {selectedClassInfo && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <ClipboardCheck className="h-4 w-4" />
          <span>Marking attendance for <strong className="text-gray-900 dark:text-gray-100">{selectedClassInfo.name} - {selectedClassInfo.section}</strong> on <strong className="text-gray-900 dark:text-gray-100">{formatDate(selectedDate, 'MMMM dd, yyyy')}</strong></span>
        </div>
      )}

      {/* Student Attendance Cards */}
      {isLoadingStudents || isLoadingAttendance ? (
        <div className="min-h-[30vh] flex items-center justify-center"><LoadingSpinner /></div>
      ) : classStudents.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No students found in this class.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {classStudents.map((student) => {
            const status = attendance[student.id];
            return (
              <Card
                key={student.id}
                className={cn(
                  'p-4 transition-all duration-200',
                  status === 'present' && 'ring-2 ring-emerald-500/30 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-800',
                  status === 'absent' && 'ring-2 ring-red-500/30 border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-800'
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={student.full_name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{student.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Roll #{student.roll_number}</p>
                  </div>
                  {status && (
                    <Badge variant={status === 'present' ? 'success' : 'danger'} className="hidden sm:inline-flex">
                      {status === 'present' ? 'Present' : 'Absent'}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => markAttendance(student.id, 'present')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-200 border-2',
                      status === 'present'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-gray-600 dark:text-gray-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20'
                    )}
                  >
                    <Check className="h-5 w-5" />
                    Present
                  </button>
                  <button
                    onClick={() => markAttendance(student.id, 'absent')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-200 border-2',
                      status === 'absent'
                        ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20'
                        : 'border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-gray-600 dark:text-gray-400 dark:hover:border-red-700 dark:hover:bg-red-900/20'
                    )}
                  >
                    <X className="h-5 w-5" />
                    Absent
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating Save Button - Mobile */}
      <div className="fixed bottom-20 right-4 lg:bottom-6 lg:hidden z-30">
        <Button
          onClick={handleSave}
          loading={saveMutation.isPending}
          size="lg"
          className="rounded-full shadow-lg shadow-blue-600/30 h-14 w-14 p-0 flex items-center justify-center"
        >
          <Save className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
