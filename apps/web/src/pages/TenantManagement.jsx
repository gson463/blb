
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { buildTenantsFilter } from '@/lib/staffDataScope';
import { fetchAvailableUnitsForAssignment } from '@/lib/availableUnits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AppShell from '@/components/AppShell.jsx';
import TenantForm from '@/components/TenantForm.jsx';
import { Plus, Users, Edit, Trash2, Mail, Phone, Home, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/paymentUtils';

const TenantManagement = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [assignableUnits, setAssignableUnits] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);

  const fetchTenants = useCallback(async () => {
    try {
      const records = await pb.collection('tenants').getFullList({
        filter: buildTenantsFilter(currentUser),
        expand: 'unit_id,unit_id.property_id',
        sort: '-created',
        $autoCancel: false
      });
      setTenants(records);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast.error('Failed to load tenants');
    }
  }, [currentUser]);

  const loadAssignableUnits = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const list = await fetchAvailableUnitsForAssignment(pb, currentUser, {});
      setAssignableUnits(list);
    } catch (e) {
      console.error('Error loading assignable units:', e);
    }
  }, [currentUser]);

  const refreshAfterTenantChange = useCallback(async () => {
    await fetchTenants();
    await loadAssignableUnits();
  }, [fetchTenants, loadAssignableUnits]);

  useEffect(() => {
    if (!currentUser?.id) return;
    (async () => {
      setLoading(true);
      try {
        await refreshAfterTenantChange();
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser?.id, refreshAfterTenantChange]);

  const handleEdit = (tenant) => {
    setSelectedTenant(tenant);
    setShowForm(true);
  };

  const handleDelete = async (tenantId) => {
    if (!window.confirm('Are you sure you want to delete this tenant?')) return;

    try {
      await pb.collection('tenants').delete(tenantId, { $autoCancel: false });
      toast.success('Tenant deleted successfully');
      await refreshAfterTenantChange();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error('Failed to delete tenant');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedTenant(null);
  };

  if (loading) {
    return (
      <AppShell>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tenants...</p>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <>
      <Helmet>
        <title>Tenants - BELIBELI DIGITAL MANAGER</title>
        <meta name="description" content="Manage your tenants and track tenant information." />
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Tenants</h1>
                <p className="text-muted-foreground">
                  Create tenant accounts, assign a unit, and share portal login details. Only vacant units or units
                  with no active lease appear below as available.
                </p>
              </div>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Tenant
              </Button>
            </div>

            <Card className="mb-8 border-primary/20 bg-primary/[0.03]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  Units available for new tenants
                </CardTitle>
                <CardDescription>
                  Vacant units, or occupied units whose active lease has ended (end date in the past). Use{' '}
                  <strong>Add Tenant</strong> to register login credentials and assign the unit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignableUnits.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No units are free right now — all listed units have an active lease. When a lease ends, the unit
                    will show here (or mark the unit vacant in Units).
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left">
                          <th className="px-3 py-2 font-medium">Property</th>
                          <th className="px-3 py-2 font-medium">Unit</th>
                          <th className="px-3 py-2 font-medium">Rent</th>
                          <th className="px-3 py-2 font-medium">Availability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignableUnits.map((u) => (
                          <tr key={u.id} className="border-b border-border/60 last:border-0">
                            <td className="px-3 py-2">{u.expand?.property_id?.name || '—'}</td>
                            <td className="px-3 py-2 font-medium">{u.name}</td>
                            <td className="px-3 py-2">
                              {u.rent_amount != null ? formatCurrency(u.rent_amount) : '—'}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{u.availabilityLabel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <KeyRound className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    After you add a tenant, use <strong>Copy credentials</strong> on the success message to send email
                    and password for <code className="text-xs bg-muted px-1 rounded">/tenant/login</code>.
                  </span>
                </div>
              </CardContent>
            </Card>

            {tenants.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No tenants yet</h3>
                  <p className="text-muted-foreground mb-4">Add your first tenant to get started</p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tenant
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center text-sm">
                                <Mail className="w-3 h-3 mr-1 text-muted-foreground" />
                                {tenant.email}
                              </div>
                              {tenant.phone && (
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {tenant.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{tenant.expand?.unit_id?.name}</TableCell>
                          <TableCell>{tenant.expand?.unit_id?.expand?.property_id?.name}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-lg ${
                                tenant.status === 'Active'
                                  ? 'bg-secondary/10 text-secondary'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {tenant.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(tenant)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(tenant.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        </main>
      </AppShell>

      {showForm && (
        <TenantForm
          tenant={selectedTenant}
          onClose={handleFormClose}
          onSuccess={refreshAfterTenantChange}
        />
      )}
    </>
  );
};

export default TenantManagement;
