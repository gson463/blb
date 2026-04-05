
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { formatDate } from '@/lib/paymentUtils';
import { AmountText } from '@/components/AmountText.jsx';
import { calculateLeaseExpiryStats, getLeaseStatusBreakdown } from '@/lib/reportUtils';
import { getDaysUntilExpiry } from '@/lib/leaseUtils';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { buildLeasesFilter } from '@/lib/staffDataScope';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppShell from '@/components/AppShell.jsx';
import PieChart from '@/components/charts/PieChart.jsx';
import { Download, FileText, AlertCircle } from 'lucide-react';

const LeaseReport = () => {
  const { currentUser, staffRole, assignedProperties } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leases, setLeases] = useState([]);

  useEffect(() => {
    fetchData();
  }, [staffRole, currentUser?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let propertyFilter = '';
      if (staffRole === 'collector' && assignedProperties.length > 0) {
        propertyFilter = assignedProperties.map(id => `property_id="${id}"`).join(' || ');
      } else if (currentUser) {
        propertyFilter = buildLeasesFilter(currentUser);
      }

      const records = await pb.collection('leases').getFullList({ 
        filter: propertyFilter, 
        expand: 'tenant_id,unit_id,property_id',
        sort: 'end_date',
        $autoCancel: false 
      });

      setLeases(records);
    } catch (error) {
      console.error('Error fetching lease data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = calculateLeaseExpiryStats(leases);
  const statusBreakdown = getLeaseStatusBreakdown(leases);

  const handleExportCSV = () => {
    const columns = [
      { header: 'Tenant', key: 'tenant' },
      { header: 'Property', key: 'property' },
      { header: 'Unit', key: 'unit' },
      { header: 'Start Date', key: 'start' },
      { header: 'End Date', key: 'end' },
      { header: 'Rent', key: 'rent' },
      { header: 'Status', key: 'status' }
    ];
    const exportData = leases.map(l => ({
      tenant: l.expand?.tenant_id?.name || 'Unknown',
      property: l.expand?.property_id?.name || 'Unknown',
      unit: l.expand?.unit_id?.name || 'Unknown',
      start: formatDate(l.start_date),
      end: formatDate(l.end_date),
      rent: l.rent_amount,
      status: l.status
    }));
    exportToCSV('Lease_Report', columns, exportData);
  };

  const handleExportPDF = () => {
    const columns = [
      { header: 'Tenant', key: 'tenant' },
      { header: 'Property', key: 'property' },
      { header: 'Unit', key: 'unit' },
      { header: 'End Date', key: 'end' },
      { header: 'Rent', key: 'rent', type: 'currency' },
      { header: 'Status', key: 'status' }
    ];
    const exportData = leases.map(l => ({
      tenant: l.expand?.tenant_id?.name || 'Unknown',
      property: l.expand?.property_id?.name || 'Unknown',
      unit: l.expand?.unit_id?.name || 'Unknown',
      end: formatDate(l.end_date),
      rent: l.rent_amount,
      status: l.status
    }));
    exportToPDF('Lease Report', null, columns, exportData);
  };

  if (loading) {
    return (
      <AppShell>
        <main className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </main>
      </AppShell>
    );
  }

  return (
    <>
      <Helmet>
        <title>Lease Report - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Lease Report</h1>
                <p className="text-muted-foreground">Monitor lease expirations and renewals.</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={handleExportCSV}>
                  <FileText className="w-4 h-4 mr-2" /> CSV
                </Button>
                <Button variant="outline" onClick={handleExportPDF}>
                  <Download className="w-4 h-4 mr-2" /> PDF
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-muted/30 border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Active Leases</p>
                </CardContent>
              </Card>
              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{stats.within30}</p>
                  <p className="text-xs text-destructive/80 uppercase tracking-wider mt-1">Expiring &lt; 30 Days</p>
                </CardContent>
              </Card>
              <Card className="bg-accent/5 border-accent/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-accent">{stats.within90}</p>
                  <p className="text-xs text-accent/80 uppercase tracking-wider mt-1">Expiring &lt; 90 Days</p>
                </CardContent>
              </Card>
              <Card className="bg-muted border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{stats.expired}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Expired</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <Card className="shadow-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Lease Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <PieChart data={statusBreakdown} />
                </CardContent>
              </Card>
              <Card className="lg:col-span-2 shadow-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Upcoming Expirations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {leases.filter(l => {
                      const days = getDaysUntilExpiry(l.end_date);
                      return days >= 0 && days <= 90 && l.status !== 'Expired';
                    }).slice(0, 5).map(lease => {
                      const days = getDaysUntilExpiry(lease.end_date);
                      const isUrgent = days <= 30;
                      return (
                        <div key={lease.id} className={`p-4 rounded-xl border flex items-center justify-between ${isUrgent ? 'bg-destructive/5 border-destructive/20' : 'bg-accent/5 border-accent/20'}`}>
                          <div className="flex items-center space-x-3">
                            <AlertCircle className={`w-5 h-5 ${isUrgent ? 'text-destructive' : 'text-accent'}`} />
                            <div>
                              <p className="font-medium">{lease.expand?.tenant_id?.name}</p>
                              <p className="text-xs text-muted-foreground">{lease.expand?.unit_id?.name} - {lease.expand?.property_id?.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${isUrgent ? 'text-destructive' : 'text-accent'}`}>In {days} days</p>
                            <p className="text-xs text-muted-foreground">{formatDate(lease.end_date)}</p>
                          </div>
                        </div>
                      );
                    })}
                    {stats.within90 === 0 && (
                      <div className="text-center py-8 text-muted-foreground">No leases expiring soon.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">All Leases</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Property / Unit</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead className="text-right">Rent</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leases found</TableCell>
                      </TableRow>
                    ) : (
                      leases.map((lease) => {
                        const days = getDaysUntilExpiry(lease.end_date);
                        const isExpired = lease.status === 'Expired' || days < 0;
                        const isUrgent = days >= 0 && days <= 30;
                        
                        return (
                          <TableRow key={lease.id} className={isExpired ? 'opacity-60' : isUrgent ? 'bg-destructive/5' : ''}>
                            <TableCell className="font-medium">{lease.expand?.tenant_id?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              <div className="text-sm">{lease.expand?.property_id?.name}</div>
                              <div className="text-xs text-muted-foreground">{lease.expand?.unit_id?.name}</div>
                            </TableCell>
                            <TableCell>{formatDate(lease.start_date)}</TableCell>
                            <TableCell className={isUrgent ? 'text-destructive font-medium' : ''}>{formatDate(lease.end_date)}</TableCell>
                            <TableCell className="text-right font-bold">
                            <AmountText value={lease.rent_amount} className="font-bold" />
                          </TableCell>
                            <TableCell>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                isExpired ? 'bg-muted text-muted-foreground' :
                                isUrgent ? 'bg-destructive/10 text-destructive' :
                                'bg-secondary/10 text-secondary'
                              }`}>
                                {isExpired ? 'Expired' : isUrgent ? 'Expiring Soon' : 'Active'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </main>
      </AppShell>
    </>
  );
};

export default LeaseReport;
