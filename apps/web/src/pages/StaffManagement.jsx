
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AppShell from '@/components/AppShell.jsx';
import StaffForm from '@/components/StaffForm.jsx';
import { Plus, Search, Shield, Users, UserCheck, UserX, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';

const StaffManagement = () => {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [showForm, setShowForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const records = await pb.collection('users').getFullList({
        filter: 'role = "staff"',
        sort: '-created',
        $autoCancel: false
      });
      setStaff(records);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (member) => {
    setSelectedStaff(member);
    setShowForm(true);
  };

  const handleToggleStatus = async (member) => {
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      await pb.collection('users').update(member.id, { status: newStatus }, { $autoCancel: false });
      toast.success(`Staff member ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchStaff();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) return;
    
    try {
      await pb.collection('users').delete(id, { $autoCancel: false });
      toast.success('Staff member deleted successfully');
      fetchStaff();
    } catch (error) {
      toast.error('Failed to delete staff member');
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || member.staff_role === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: staff.length,
    managers: staff.filter(s => s.staff_role === 'manager').length,
    accountants: staff.filter(s => s.staff_role === 'accountant').length,
    collectors: staff.filter(s => s.staff_role === 'collector').length,
  };

  const getRoleBadge = (role) => {
    const styles = {
      manager: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
      accountant: 'bg-green-500/10 text-green-700 border-green-500/20',
      collector: 'bg-orange-500/10 text-orange-700 border-orange-500/20'
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider ${styles[role] || 'bg-gray-100 text-gray-700'}`}>
        {role}
      </span>
    );
  };

  return (
    <>
      <Helmet>
        <title>Staff Management - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Staff Management</h1>
                <p className="text-muted-foreground">Manage your team members and their access roles.</p>
              </div>
              <Button onClick={() => { setSelectedStaff(null); setShowForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Staff Member
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-muted/30 border-border/50">
                <CardContent className="p-4 flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Staff</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardContent className="p-4 flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-700">{stats.managers}</p>
                    <p className="text-xs text-blue-600/80 uppercase tracking-wider">Managers</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-green-500/5 border-green-500/20">
                <CardContent className="p-4 flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">{stats.accountants}</p>
                    <p className="text-xs text-green-600/80 uppercase tracking-wider">Accountants</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-orange-500/5 border-orange-500/20">
                <CardContent className="p-4 flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <UserX className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-700">{stats.collectors}</p>
                    <p className="text-xs text-orange-600/80 uppercase tracking-wider">Collectors</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-8 shadow-sm border-border/50">
              <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="manager">Managers</SelectItem>
                    <SelectItem value="accountant">Accountants</SelectItem>
                    <SelectItem value="collector">Collectors</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Added On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                    ) : filteredStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          <Users className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          No staff members found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStaff.map((member) => (
                        <TableRow key={member.id} className={member.status === 'inactive' ? 'opacity-60' : ''}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">{member.email}</div>
                            <div className="text-xs text-muted-foreground">{member.phone || '-'}</div>
                          </TableCell>
                          <TableCell>{getRoleBadge(member.staff_role)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              member.status === 'active' ? 'bg-secondary/10 text-secondary' : 'bg-muted text-muted-foreground'
                            }`}>
                              {member.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(member.created).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button size="icon" variant="ghost" onClick={() => handleToggleStatus(member)} title={member.status === 'active' ? 'Deactivate' : 'Activate'}>
                                {member.status === 'active' ? <PowerOff className="w-4 h-4 text-muted-foreground" /> : <Power className="w-4 h-4 text-secondary" />}
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleEdit(member)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(member.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </main>
      </AppShell>

      {showForm && (
        <StaffForm
          staff={selectedStaff}
          onClose={() => { setShowForm(false); setSelectedStaff(null); }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedStaff(null);
            fetchStaff();
          }}
        />
      )}
    </>
  );
};

export default StaffManagement;
