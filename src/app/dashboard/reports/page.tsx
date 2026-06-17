'use client';

import { useState, useMemo } from 'react';
import { Download, Filter, FileText, Calendar, PieChart as PieChartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading';
import { exportToCSV, formatDate, calculateAttendancePercentage, cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function ReportsPage() {
  const supabase = createClient();
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [dateRange, setDateRange] = useState('this-month');

  // Fetch all classes
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch all students with their class info
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, classes(name, section)')
        .order('full_name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch attendance records based on date range
  const { data: attendanceRecords = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance-reports', dateRange],
    queryFn: async () => {
      let startDate = new Date();
      if (dateRange === 'this-week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === 'this-month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (dateRange === 'last-3-months') {
        startDate.setMonth(startDate.getMonth() - 3);
      } else {
        startDate.setFullYear(startDate.getFullYear() - 1); // all time roughly
      }

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .gte('attendance_date', startDate.toISOString().split('T')[0]);
        
      if (error) throw error;
      return data;
    }
  });

  const isLoading = isLoadingClasses || isLoadingStudents || isLoadingAttendance;

  // Process data for charts and tables
  const reportData = useMemo(() => {
    // Filter students by class if needed
    const filteredStudents = selectedClass === 'all' 
      ? students 
      : students.filter(s => s.class_id === selectedClass);

    const studentIds = new Set(filteredStudents.map(s => s.id));

    // Filter attendance for these students
    const relevantAttendance = attendanceRecords.filter(a => studentIds.has(a.student_id));

    let totalPresent = 0;
    let totalAbsent = 0;

    // Calculate per-student stats
    const studentStats = filteredStudents.map(student => {
      const studentRecords = relevantAttendance.filter(a => a.student_id === student.id);
      const present = studentRecords.filter(a => a.status === 'present').length;
      const absent = studentRecords.filter(a => a.status === 'absent').length;
      const total = present + absent;
      const percentage = calculateAttendancePercentage(present, total);

      totalPresent += present;
      totalAbsent += absent;

      return {
        id: student.id,
        name: student.full_name,
        rollNo: student.roll_number,
        class: `${student.classes?.name}-${student.classes?.section}`,
        gender: student.gender,
        present,
        absent,
        total,
        percentage
      };
    }).sort((a, b) => b.percentage - a.percentage); // Sort by highest attendance

    const overallPercentage = calculateAttendancePercentage(totalPresent, totalPresent + totalAbsent);

    // Distribution data for pie chart
    const distributionData = [
      { name: '> 90%', value: studentStats.filter(s => s.percentage >= 90).length, color: '#059669' },
      { name: '75% - 90%', value: studentStats.filter(s => s.percentage >= 75 && s.percentage < 90).length, color: '#3B82F6' },
      { name: '< 75%', value: studentStats.filter(s => s.percentage > 0 && s.percentage < 75).length, color: '#DC2626' },
    ];

    // Class comparison data for bar chart
    const classComparisonData = classes.map(c => {
      const classStudents = students.filter(s => s.class_id === c.id);
      const classStudentIds = new Set(classStudents.map(s => s.id));
      const classAtt = attendanceRecords.filter(a => classStudentIds.has(a.student_id));
      
      const cPresent = classAtt.filter(a => a.status === 'present').length;
      const cTotal = classAtt.length;
      const cPercentage = calculateAttendancePercentage(cPresent, cTotal);

      return {
        name: `${c.name}-${c.section}`,
        attendance: cPercentage,
      };
    }).filter(c => c.attendance > 0);

    return {
      studentStats,
      totalPresent,
      totalAbsent,
      overallPercentage,
      distributionData,
      classComparisonData
    };
  }, [students, classes, attendanceRecords, selectedClass]);

  const classOptions = [
    { value: 'all', label: 'All Classes' },
    ...classes.map(c => ({ value: c.id, label: `${c.name} - ${c.section}` }))
  ];

  const handleExport = () => {
    const exportData = reportData.studentStats.map(s => ({
      'Roll Number': s.rollNo,
      'Student Name': s.name,
      'Class': s.class,
      'Total Days': s.total,
      'Present': s.present,
      'Absent': s.absent,
      'Attendance %': `${s.percentage}%`
    }));
    exportToCSV(exportData, `attendance-report-${formatDate(new Date(), 'yyyy-MM-dd')}`);
  };

  if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-heading">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analyze attendance patterns and export data
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Select
              label="Filter by Class"
              options={classOptions}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Select
              label="Date Range"
              options={[
                { value: 'this-week', label: 'Last 7 Days' },
                { value: 'this-month', label: 'Last 30 Days' },
                { value: 'last-3-months', label: 'Last 3 Months' },
                { value: 'all-time', label: 'All Time' },
              ]}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl dark:bg-blue-900/30 dark:text-blue-400">
            <PieChartIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Attendance</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{reportData.overallPercentage}%</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl dark:bg-emerald-900/30 dark:text-emerald-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Present</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{reportData.totalPresent}</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-xl dark:bg-red-900/30 dark:text-red-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Absent</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{reportData.totalAbsent}</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportData.distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {reportData.distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.classComparisonData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`${value || 0}%`, 'Attendance']}
                  />
                  <Bar dataKey="attendance" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Performance</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Student</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-6 py-3">Total Days</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-6 py-3">Present</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-6 py-3">Absent</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {reportData.studentStats.slice(0, 20).map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={student.name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{student.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Roll #{student.rollNo} • {student.class}
                          {student.gender && ` • ${student.gender === 'male' ? 'Male' : 'Female'}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">{student.total}</td>
                  <td className="px-6 py-4 text-center text-sm text-emerald-600 font-medium">{student.present}</td>
                  <td className="px-6 py-4 text-center text-sm text-red-600 font-medium">{student.absent}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      student.percentage >= 90 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      student.percentage >= 75 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                      {student.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
              {reportData.studentStats.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No attendance data available for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {reportData.studentStats.length > 20 && (
            <div className="p-4 text-center border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500">Showing top 20 students. Export CSV to see all data.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
