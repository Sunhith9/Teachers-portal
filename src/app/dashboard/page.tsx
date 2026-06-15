'use client';

import { Users, UserCheck, UserX, TrendingUp, Plus, ClipboardCheck, FileDown, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading';
import { formatDate, calculateAttendancePercentage } from '@/lib/utils';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function DashboardPage() {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  // Fetch all students for total count
  const { data: totalStudents = 0, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['dashboard-students-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch today's attendance records
  const { data: todaysAttendance = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['dashboard-todays-attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, students(full_name, roll_number, class_id, classes(name, section))')
        .eq('attendance_date', today)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Transform nested student data for recent activity
      return data.map((a: any) => ({
        ...a,
        student: {
          full_name: a.students?.full_name,
          roll_number: a.students?.roll_number,
          class_name: a.students?.classes?.name,
          section: a.students?.classes?.section
        }
      }));
    }
  });

  // Fetch this week's attendance data for the chart
  const { data: weeklyData = [], isLoading: isLoadingWeekly } = useQuery({
    queryKey: ['dashboard-weekly-chart'],
    queryFn: async () => {
      const pastWeek = new Date();
      pastWeek.setDate(pastWeek.getDate() - 6); // 7 days including today
      
      const { data, error } = await supabase
        .from('attendance')
        .select('attendance_date, status')
        .gte('attendance_date', pastWeek.toISOString().split('T')[0]);
        
      if (error) throw error;

      // Group by date
      const groupedByDate: Record<string, { present: number, absent: number }> = {};
      
      // Initialize last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        groupedByDate[dateStr] = { present: 0, absent: 0 };
      }

      data.forEach(record => {
        const d = record.attendance_date;
        if (groupedByDate[d]) {
          const status = record.status as 'present' | 'absent';
          groupedByDate[d][status]++;
        }
      });

      // Format for Recharts
      return Object.entries(groupedByDate).map(([date, stats]) => {
        const dateObj = new Date(date);
        return {
          day: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
          present: stats.present,
          absent: stats.absent,
          rate: calculateAttendancePercentage(stats.present, stats.present + stats.absent)
        };
      });
    }
  });

  const isLoading = isLoadingStudents || isLoadingAttendance || isLoadingWeekly;

  const presentToday = todaysAttendance.filter((a: any) => a.status === 'present').length;
  const absentToday = todaysAttendance.filter((a: any) => a.status === 'absent').length;
  const attendanceRate = totalStudents > 0 
    ? calculateAttendancePercentage(presentToday, presentToday + absentToday) // Based on marked students
    : 0;

  if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-heading">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Welcome back! Here&apos;s your attendance overview for {formatDate(new Date(), 'EEEE, MMMM dd, yyyy')}
          </p>
        </div>
        <Link href="/dashboard/attendance">
          <Button size="md">
            <ClipboardCheck className="h-4 w-4" />
            Mark Attendance
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={totalStudents}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Present Today"
          value={presentToday}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="Absent Today"
          value={absentToday}
          icon={UserX}
          color="red"
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Attendance Trend</CardTitle>
              <Badge variant="info">Last 7 Days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Area type="monotone" dataKey="present" stroke="#059669" fill="url(#presentGrad)" strokeWidth={2} name="Present" />
                  <Area type="monotone" dataKey="absent" stroke="#DC2626" fill="url(#absentGrad)" strokeWidth={2} name="Absent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/attendance" className="block">
              <button className="flex items-center gap-3 w-full p-3 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-all group dark:border-gray-700 dark:hover:bg-blue-900/20 dark:hover:border-blue-800">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Mark Attendance</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Record today&apos;s attendance</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </button>
            </Link>

            <Link href="/dashboard/students" className="block">
              <button className="flex items-center gap-3 w-full p-3 rounded-xl border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 transition-all group dark:border-gray-700 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-800">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Add Student</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Register new student</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
              </button>
            </Link>

            <Link href="/dashboard/reports" className="block">
              <button className="flex items-center gap-3 w-full p-3 rounded-xl border border-gray-200 hover:bg-amber-50 hover:border-amber-200 transition-all group dark:border-gray-700 dark:hover:bg-amber-900/20 dark:hover:border-amber-800">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <FileDown className="h-5 w-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Export Reports</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Download attendance data</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-amber-600 transition-colors" />
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity (Today)</CardTitle>
            <Link href="/dashboard/attendance">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {todaysAttendance.slice(0, 5).map((activity: any) => (
              <div key={activity.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar name={activity.student?.full_name || 'Unknown'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {activity.student?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.student?.class_name}-{activity.student?.section} • Roll #{activity.student?.roll_number}
                  </p>
                </div>
                <Badge variant={activity.status === 'present' ? 'success' : 'danger'}>
                  {activity.status === 'present' ? 'Present' : 'Absent'}
                </Badge>
              </div>
            ))}
            {todaysAttendance.length === 0 && (
              <div className="py-6 text-center text-gray-500 text-sm">
                No attendance marked today.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
