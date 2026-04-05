
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import {
  buildLeaseListFilter,
  buildPendingLeaseRequestsFilter,
  buildPropertiesFilter,
} from '@/lib/staffDataScope';
import { downloadLeasePdf } from '@/lib/pdfUtils';
import { getDaysUntilExpiry } from '@/lib/leaseUtils';
import { AmountText } from '@/components/AmountText.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import LeaseForm from '@/components/LeaseForm.jsx';
import { Plus, FileText, Edit, Trash2, Download, Inbox } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { toast } from 'sonner';

const LeaseManagement = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leases, setLeases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [filterProperty, setFilterProperty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;
  const [showForm, setShowForm] = useState(false);
  const [selectedLease, setSelectedLease] = useState(null);
  const [pendingLeaseRequests, setPendingLeaseRequests] = useState(0);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    (async () => {
      try {
        const list = await pb.collection('lease_requests').getFullList({
          filter: buildPendingLeaseRequestsFilter(currentUser),
          $autoCancel: false,
        });
        setPendingLeaseRequests(list.length);
      } catch {
        setPendingLeaseRequests(0);
      }
    })();
  }, [currentUser]);

  useEffect(() => {
    setPage(1);
  }, [filterProperty, filterStatus]);

  useEffect(() => {
    fetchLeases();
  }, [page, filterProperty, filterStatus, currentUser?.id]);

  const fetchProperties = async () => {
    try {
      const records = await pb.collection('properties').getFullList({
        filter: buildPropertiesFilter(currentUser),
        $autoCancel: false
      });
      setProperties(records);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchLeases = async () => {
    setLoading(true);
    try {
      const filter = buildLeaseListFilter(currentUser, filterProperty, filterStatus);
      const records = await pb.collection('leases').getList(page, pageSize, {
        filter,
        expand: 'unit_id,tenant_id,property_id',
        sort: '-created',
        $autoCancel: false,
      });
      setLeases(records.items);
      setTotalPages(records.totalPages || 1);
    } catch (error) {
      console.error('Error fetching leases:', error);
      toast.error('Failed to load leases');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lease) => {
    setSelectedLease(lease);
    setShowForm(true);
  };

  const handleDelete = async (leaseId) => {
    if (!window.confirm('Are you sure you want to delete this lease?')) return;

    try {
      await pb.collection('leases').delete(leaseId, { $autoCancel: false });
      toast.success('Lease deleted successfully');
      fetchLeases();
    } catch (error) {
      console.error('Error deleting lease:', error);
      toast.error('Failed to delete lease');
    }
  };

  const handleDownloadLease = async (lease) => {
    try {
      await downloadLeasePdf(lease, {
        property_id: lease.expand?.property_id,
        unit_id: lease.expand?.unit_id,
        tenant_id: lease.expand?.tenant_id,
      });
      toast.success('Lease PDF downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Could not generate PDF');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedLease(null);
  };

  if (loading) {
    return (
      <AppShell>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading leases...</p>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <>
      <Helmet>
        <title>Lease Management - BELIBELI DIGITAL MANAGER</title>
        <meta name="description" content="Manage your property leases, track expiry dates, and handle renewals." />
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Lease Management</h1>
                <p className="text-muted-foreground">Track and manage tenant leases</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={filterProperty} onValueChange={setFilterProperty}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Renewed">Renewed</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Lease
                </Button>
              </div>
            </div>

            {pendingLeaseRequests > 0 && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                <Inbox className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    {pendingLeaseRequests} tenant lease request{pendingLeaseRequests === 1 ? '' : 's'} pending
                  </p>
                  <p className="text-amber-800/90 dark:text-amber-200/90 mt-1">
                    Tenants have submitted early termination or non-renewal notices. Review them in your records
                    (lease_requests in PocketBase admin) or follow up with the tenant directly.
                  </p>
                </div>
              </div>
            )}

            {leases.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No leases found</h3>
                  <p className="text-muted-foreground mb-4">Create a new lease to get started</p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Lease
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unit / Property</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Rent Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leases.map((lease) => {
                        const daysUntilExpiry = getDaysUntilExpiry(lease.end_date);
                        const isExpiringSoon = lease.status === 'Active' && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
                        
                        return (
                          <TableRow key={lease.id} className={isExpiringSoon ? 'bg-accent/5 hover:bg-accent/10' : ''}>
                            <TableCell>
                              <div className="font-medium">{lease.expand?.unit_id?.name}</div>
                              <div className="text-xs text-muted-foreground">{lease.expand?.property_id?.name}</div>
                            </TableCell>
                            <TableCell className="font-medium">{lease.expand?.tenant_id?.name}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(lease.start_date).toLocaleDateString()} - 
                              </div>
                              <div className="text-sm">
                                {new Date(lease.end_date).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                            <AmountText value={lease.rent_amount} />
                          </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                                lease.status === 'Active' ? 'bg-secondary/10 text-secondary' :
                                lease.status === 'Expired' ? 'bg-destructive/10 text-destructive' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {lease.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {lease.status === 'Active' ? (
                                <span className={`text-sm ${isExpiringSoon ? 'text-accent font-semibold' : 'text-muted-foreground'}`}>
                                  {daysUntilExpiry} days
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-1">
                                <Button variant="ghost" size="icon" onClick={() => handleDownloadLease(lease)} title="Download Lease">
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(lease)} title="Edit">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(lease.id)} className="text-destructive hover:text-destructive" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="p-4 border-t flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPage((p) => Math.max(1, p - 1));
                            }}
                            className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <span className="px-3 text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPage((p) => Math.min(totalPages, p + 1));
                            }}
                            className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </Card>
            )}
          </div>
        </main>
      </AppShell>

      {showForm && (
        <LeaseForm
          lease={selectedLease}
          onClose={handleFormClose}
          onSuccess={fetchLeases}
        />
      )}
    </>
  );
};

export default LeaseManagement;
