'use client';

import { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Clock, Search, MessageSquare, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { LoadingSpinner, EmptyState } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type Notification } from '@/types/database';

export default function NotificationsPage() {
  const { showToast } = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, students(full_name, class_id, classes(name, section))')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map((n: any) => ({
        ...n,
        student: {
          full_name: n.students?.full_name,
          class_name: n.students?.classes?.name,
          section: n.students?.classes?.section
        }
      })) as (Notification & { student?: { full_name: string, class_name: string, section: string } })[];
    }
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string | 'all') => {
      // In a real app, this would call your backend API (e.g., Twilio, Resend)
      // For now, we simulate sending by updating the database status
      
      // Artificial delay to simulate network request
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let query = supabase.from('notifications').update({ status: 'sent' });
      
      if (id === 'all') {
        query = query.eq('status', 'pending');
      } else {
        query = query.eq('id', id);
      }
      
      const { error } = await query;
      if (error) throw error;
      
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showToast(id === 'all' ? 'All pending notifications sent successfully' : 'Notification sent successfully', 'success');
    },
    onError: (error) => {
      showToast(error.message || 'Failed to send notification(s)', 'error');
    }
  });

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = !searchQuery || 
      n.student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || n.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = notifications.filter(n => n.status === 'pending').length;
  const sentCount = notifications.filter(n => n.status === 'sent').length;

  const handleSendAll = () => {
    if (pendingCount === 0) return;
    sendMutation.mutate('all');
  };

  const handleSendSingle = (id: string) => {
    sendMutation.mutate(id);
  };

  if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-heading">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and send attendance alerts to parents
          </p>
        </div>
        <Button 
          onClick={handleSendAll}
          disabled={pendingCount === 0}
          loading={sendMutation.isPending && sendMutation.variables === 'all'}
        >
          <Send className="h-4 w-4" />
          Send All Pending ({pendingCount})
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl dark:bg-blue-900/30 dark:text-blue-400">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Generated</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{notifications.length}</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendingCount}</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sent</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{sentCount}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'sent', label: 'Sent' },
                { value: 'failed', label: 'Failed' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <CardTitle>Notification Log</CardTitle>
        </CardHeader>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {filteredNotifications.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={<MessageSquare className="h-12 w-12" />}
                title="No notifications found"
                description="There are no parent notifications matching your criteria."
              />
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div key={notification.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <Avatar name={notification.student?.full_name || 'Unknown'} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {notification.student?.full_name}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          • {notification.student?.class_name}-{notification.student?.section}
                        </span>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-800 mb-2 whitespace-pre-wrap">
                        {notification.message}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(notification.created_at, 'MMM dd, yyyy HH:mm')}
                        </span>
                        <span className="uppercase tracking-wider font-medium">
                          VIA {notification.channel}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center sm:flex-col justify-between sm:justify-start gap-3 sm:items-end pl-14 sm:pl-0">
                    <Badge variant={
                      notification.status === 'sent' ? 'success' :
                      notification.status === 'pending' ? 'warning' : 'danger'
                    }>
                      {notification.status === 'sent' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {notification.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {notification.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                      {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                    </Badge>
                    
                    {notification.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSendSingle(notification.id)}
                        loading={sendMutation.isPending && sendMutation.variables === notification.id}
                      >
                        <Send className="h-3 w-3" />
                        Send Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
