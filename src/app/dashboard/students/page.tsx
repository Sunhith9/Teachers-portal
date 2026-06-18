'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Users, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState, LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { type Student, type Class } from '@/types/database';
import { ITEMS_PER_PAGE } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function StudentsPage() {
  const { showToast } = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    roll_number: '',
    full_name: '',
    class_id: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    gender: '',
  });

  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data as Class[];
    }
  });

  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, classes(name, section)')
        .order('full_name');
      if (error) throw error;

      // Transform data to match Student type with class_name and section
      return data.map((s: any) => ({
        ...s,
        class_name: s.classes?.name,
        section: s.classes?.section
      })) as Student[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (studentData: Partial<Student>) => {
      if (editingStudent) {
        const { error } = await supabase.from('students').update(studentData).eq('id', editingStudent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('students').insert([studentData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showToast(editingStudent ? 'Student updated' : 'Student added', 'success');
      setShowAddModal(false);
    },
    onError: (error) => {
      showToast(error.message || 'Failed to save student', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showToast('Student removed', 'success');
      setShowDeleteModal(false);
      setDeletingStudent(null);
    },
    onError: (error) => {
      showToast(error.message || 'Failed to delete student', 'error');
    }
  });

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = !searchQuery ||
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roll_number.includes(searchQuery) ||
        s.parent_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = !classFilter || s.class_name === classFilter;
      const matchesSection = !sectionFilter || s.section === sectionFilter;
      return matchesSearch && matchesClass && matchesSection;
    });
  }, [students, searchQuery, classFilter, sectionFilter]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const classOptions = [...new Set(students.map(s => s.class_name))]
    .filter(Boolean)
    .map(c => ({ value: c!, label: c! }));

  const sectionOptions = [...new Set(students.map(s => s.section))]
    .filter(Boolean)
    .map(s => ({ value: s!, label: s! }));

  const classDropdownOptions = classes.map(c => ({
    value: c.id,
    label: `${c.name} - ${c.section}`
  }));

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      roll_number: '',
      full_name: '',
      class_id: classes[0]?.id || '',
      parent_name: '',
      parent_phone: '',
      parent_email: '',
      gender: '',
    });
    setShowAddModal(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      roll_number: student.roll_number,
      full_name: student.full_name,
      class_id: student.class_id,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      parent_email: student.parent_email,
      gender: student.gender || '',
    });
    setShowAddModal(true);
  };

  const handleSave = () => {
    if (!formData.class_id || !formData.full_name || !formData.roll_number) {
      showToast('Please fill all required fields', 'warning');
      return;
    }

    // Validate phone number
    let phoneDigits = formData.parent_phone.replace(/\D/g, '');
    
    // If it has leading 0 (common local dialing), strip it
    if (phoneDigits.startsWith('0')) {
      phoneDigits = phoneDigits.substring(1);
    }

    // If it's a 10-digit number, prepend Indian country code 91 by default
    if (phoneDigits.length === 10) {
      phoneDigits = '91' + phoneDigits;
    }

    if (!phoneDigits || phoneDigits.length !== 12) {
      showToast('Please enter a valid 10-digit phone number', 'warning');
      return;
    }

    // Auto-format to +91XXXXXXXXXX
    const formattedPhone = '+' + phoneDigits;
    saveMutation.mutate({
      ...formData,
      parent_phone: formattedPhone,
      gender: formData.gender ? (formData.gender as 'male' | 'female') : undefined,
    });
  };

  const handleDelete = () => {
    if (deletingStudent) {
      deleteMutation.mutate(deletingStudent.id);
    }
  };

  if (isLoadingStudents || isLoadingClasses) {
    return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-heading">Students</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage student records and parent information
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4" />
          Add Student
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name, roll number, or parent..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <div className={`flex gap-3 ${showFilters ? 'flex' : 'hidden'} sm:flex`}>
            <Select
              options={classOptions}
              placeholder="All Classes"
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-40"
            />
            <Select
              options={sectionOptions}
              placeholder="All Sections"
              value={sectionFilter}
              onChange={(e) => { setSectionFilter(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-36"
            />
          </div>
        </div>
      </Card>

      {/* Students Table - Desktop */}
      <div className="hidden md:block">
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Student</th>
                  <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Roll No</th>
                  <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Class</th>
                  <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Parent</th>
                  <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Phone</th>
                  <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.full_name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{student.full_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{student.parent_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">{student.roll_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{student.class_name}-{student.section}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{student.parent_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{student.parent_phone}</td>
                    <td className="px-6 py-4">
                      <Badge variant={student.status === 'active' ? 'success' : 'danger'}>
                        {student.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(student)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setDeletingStudent(student); setShowDeleteModal(true); }}
                          className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Students Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {paginatedStudents.map((student) => (
          <Card key={student.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={student.full_name} />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{student.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Roll #{student.roll_number} • {student.class_name}-{student.section}</p>
                </div>
              </div>
              <Badge variant={student.status === 'active' ? 'success' : 'danger'}>
                {student.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Parent: {student.parent_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{student.parent_phone}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEditModal(student)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setDeletingStudent(student); setShowDeleteModal(true); }}
                  className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filteredStudents.length === 0 && (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No students found"
          description={searchQuery ? 'Try adjusting your search or filters' : 'Get started by adding your first student'}
          action={!searchQuery ? <Button onClick={openAddModal}><Plus className="h-4 w-4" />Add Student</Button> : undefined}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} of {filteredStudents.length} students
          </p>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${page === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingStudent ? 'Edit Student' : 'Add New Student'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Roll Number"
              placeholder="e.g., 001"
              value={formData.roll_number}
              onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
            />
            <Input
              label="Full Name"
              placeholder="Student's full name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
            <div>
              <Select
                label="Class"
                placeholder={classes.length === 0 ? "No classes available" : "Select a class"}
                options={classDropdownOptions}
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                error={classes.length === 0 ? "No classes found. Please seed classes first." : undefined}
              />
              {classes.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                  Your <code>classes</code> table is empty. Please run the SQL seed script.
                </p>
              )}
            </div>
            <Select
              label="Gender"
              placeholder="Select gender"
              options={[
                { value: 'male', label: 'Male (Son)' },
                { value: 'female', label: 'Female (Daughter)' },
              ]}
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            />
            <Input
              label="Parent Name"
              placeholder="Parent's full name"
              value={formData.parent_name}
              onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
            />
            <Input
              label="Parent Phone"
              placeholder="+91 XXXXX XXXXX"
              value={formData.parent_phone}
              onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
            />
            <Input
              label="Parent Email"
              type="email"
              placeholder="parent@email.com"
              value={formData.parent_email}
              onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saveMutation.isPending}>
              {editingStudent ? 'Update' : 'Add'} Student
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Student"
        size="sm"
      >
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to remove <strong>{deletingStudent?.full_name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteMutation.isPending}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
