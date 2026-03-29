
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { formatCurrency, formatDate } from '@/lib/paymentUtils';
import { getPaymentStatusBreakdown, getAverageApprovalTime, getPaymentsByProperty } from '@/lib/reportUtils';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { buildPropertiesFilter } from '@/lib/staffDataScope';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppShell from '@/components/AppShell.jsx';
import PieChart from '@/components/charts/PieChart.jsx';
import BarChart from '@/components/charts/BarChart.jsx';
import { Download, FileText, Clock } from 'lucide-react';

const PaymentAnalytics = () => {
  const { currentUser, staffRole, assignedProperties } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ payments: [], properties: [] });

  useEffect(() => {
    fetchData();
  }, [staffRole, currentUser?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let propertyFilter = '';
      if (staffRole === 'collector' && assignedProperties.length > 0) {
        propertyFilter = assignedProperties.map(id => `id="${id}"`).join(' || ');
      } else if (currentUser) {
        propertyFilter = buildPropertiesFilter(currentUser);
      }

      const properties = await pb.collection('properties').getFullList({ filter: propertyFilter, $autoCancel: false });
      const propIds = properties.map(p => p.id);
      const paymentFilter = propIds.length > 0 ? propIds.map(id => `property_id="${id}"`).join(' || ') : 'id="none"';
      
      const payments = await pb.collection('payments').getFullList({ 
        filter: paymentFilter, 
        expand: 'tenant_id,unit_id,property_id',
        sort: '-created',
        $autoCancel: false 
      });

      setData({ properties, payments });
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPayments = data.payments.length;
  const approved = data.payments.filter(p => p.status === 'Approved').length;
  const pending = data.payments.filter(p => p.status === 'Pending Approval').length;
  const rejected = data.payments.filter(p => p.status === 'Rejected').length;
  const approvalRate = totalPayments > 0 ? Math.round((approved / totalPayments) * 100) : 0;
  
  const avgApprovalTime = getAverageApprovalTime(data.payments);
  const statusBreakdown = getPaymentStatusBreakdown(data.payments);
  const propertyPayments = getPaymentsByProperty(data.payments, data.properties);

  const handleExportCSV = () => {
    const columns = [
      { header: 'Date', key: 'date' },
      { header: 'Tenant', key: 'tenant' },
      { header: 'Property', key: 'property' },
      { header: 'Amount', key: 'amount' },
      { header: 'Status', key: 'status' }
    ];
    const exportData = data.payments.map(p => ({
      date: formatDate(p.payment_date),
      tenant: p.expand?.tenant_id?.name || 'Unknown',
      property: p.expand?.property_id?.name || 'Unknown',
      amount: p.amount,
      status: p.status
    }));
    exportToCSV('Payment_Analytics', columns, exportData);
  };

  const handleExportPDF = () => {
    const columns = [
      { header: 'Date', key: 'date' },
      { header: 'Tenant', key: 'tenant' },
      { header: 'Property', key: 'property' },
      { header: 'Amount', key: 'amount', type: 'currency' },
      { header: 'Status', key: 'status' }
    ];
    const exportData = data.payments.map(p => ({
      date: formatDate(p.payment_date),
      tenant: p.expand?.tenant_id?.name || 'Unknown',
      property: p.expand?.property_id?.name || 'Unknown',
      amount: p.amount,
      status: p.status
    }));
    exportToPDF('Payment Analytics', null, columns, exportData);
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
        <title>Payment Analytics - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Payment Analytics</h1>
                <p className="text-muted-foreground">Track payment submissions, approvals, and processing times.</p>
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

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <Card className="bg-muted/30 border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{totalPayments}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Submitted</p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/5 border-secondary/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-secondary">{approved}</p>
                  <p className="text-xs text-secondary/80 uppercase tracking-wider mt-1">Approved</p>
                </CardContent>
              </Card>
              <Card className="bg-accent/5 border-accent/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-accent">{pending}</p>
                  <p className="text-xs text-accent/80 uppercase tracking-wider mt-1">Pending</p>
                </CardContent>
              </Card>
              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{rejected}</p>
                  <p className="text-xs text-destructive/80 uppercase tracking-wider mt-1">Rejected</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{approvalRate}%</p>
                  <p className="text-xs text-primary/80 uppercase tracking-wider mt-1">Approval Rate</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <Card className="shadow-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Status Breakdown (Value)</CardTitle>
                </CardHeader>
                <CardContent>
                  <PieChart data={statusBreakdown} />
                </CardContent>
              </Card>
              <Card className="lg:col-span-2 shadow-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Payments by Property</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart 
                    data={propertyPayments} 
                    xKey="name" 
                    bars={[
                      { key: 'approved', name: 'Approved', color: 'hsl(var(--secondary))' },
                      { key: 'pending', name: 'Pending', color: 'hsl(var(--accent))' }
                    ]} 
                    stacked={true}
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Payments</CardTitle>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1" />
                  Avg. Approval Time: {avgApprovalTime} hours
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Property / Unit</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No payments found</TableCell>
                      </TableRow>
                    ) : (
                      data.payments.slice(0, 20).map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{formatDate(payment.payment_date)}</TableCell>
                          <TableCell>{payment.expand?.tenant_id?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="text-sm">{payment.expand?.property_id?.name}</div>
                            <div className="text-xs text-muted-foreground">{payment.expand?.unit_id?.name}</div>
                          </TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              payment.status === 'Approved' ? 'bg-secondary/10 text-secondary' :
                              payment.status === 'Rejected' ? 'bg-destructive/10 text-destructive' :
                              'bg-accent/10 text-accent'
                            }`}>
                              {payment.status}
                            </span>
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
    </>
  );
};

export default PaymentAnalytics;
