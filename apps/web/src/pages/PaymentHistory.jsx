
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { buildPaymentsFilter, buildPropertiesFilter, buildTenantsFilter, buildUnitsFilter } from '@/lib/staffDataScope';
import { generatePaymentReport } from '@/lib/paymentUtils';
import { todayDateStringEAT } from '@/lib/datetimeEAT';
import { AmountText } from '@/components/AmountText.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AppShell from '@/components/AppShell.jsx';
import { Download, History } from 'lucide-react';
import { toast } from 'sonner';

const PaymentHistory = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  
  const [activeTab, setActiveTab] = useState('tenant');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, tenantsRes, unitsRes, propsRes] = await Promise.all([
        pb.collection('payments').getFullList({
          filter: buildPaymentsFilter(currentUser),
          expand: 'tenant_id,invoice_id,unit_id,property_id',
          sort: '-payment_date',
          $autoCancel: false
        }),
        pb.collection('tenants').getFullList({ filter: buildTenantsFilter(currentUser), $autoCancel: false }),
        pb.collection('units').getFullList({ filter: buildUnitsFilter(currentUser), $autoCancel: false }),
        pb.collection('properties').getFullList({ filter: buildPropertiesFilter(currentUser), $autoCancel: false })
      ]);
      
      setPayments(paymentsRes);
      setTenants(tenantsRes);
      setUnits(unitsRes);
      setProperties(propsRes);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const csv = generatePaymentReport(filteredPayments, 'csv');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payment_history_${activeTab}_${todayDateStringEAT()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('History downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate export');
    }
  };

  const filteredPayments = payments.filter(p => {
    if (selectedFilter === 'all') return true;
    if (activeTab === 'tenant') return p.tenant_id === selectedFilter;
    if (activeTab === 'unit') return p.unit_id === selectedFilter;
    if (activeTab === 'property') return p.property_id === selectedFilter;
    return true;
  });

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('approved')) return <span className="px-2 py-1 text-xs font-medium rounded-lg bg-secondary/10 text-secondary">Approved</span>;
    if (s.includes('rejected')) return <span className="px-2 py-1 text-xs font-medium rounded-lg bg-destructive/10 text-destructive">Rejected</span>;
    return <span className="px-2 py-1 text-xs font-medium rounded-lg bg-accent/10 text-accent">Pending</span>;
  };

  return (
    <>
      <Helmet>
        <title>Payment History - BELIBELI DIGITAL MANAGER</title>
        <meta name="description" content="View comprehensive payment history across all properties and tenants." />
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Payment History</h1>
                <p className="text-muted-foreground">Comprehensive record of all transactions</p>
              </div>
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Download History
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedFilter('all'); }} className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="tenant">By Tenant</TabsTrigger>
                  <TabsTrigger value="unit">By Unit</TabsTrigger>
                  <TabsTrigger value="property">By Property</TabsTrigger>
                </TabsList>

                <div className="w-full sm:w-64">
                  {activeTab === 'tenant' && (
                    <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                      <SelectTrigger><SelectValue placeholder="All Tenants" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tenants</SelectItem>
                        {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {activeTab === 'unit' && (
                    <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                      <SelectTrigger><SelectValue placeholder="All Units" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Units</SelectItem>
                        {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {activeTab === 'property' && (
                    <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                      <SelectTrigger><SelectValue placeholder="All Properties" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Properties</SelectItem>
                        {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        {activeTab !== 'tenant' && <TableHead>Tenant</TableHead>}
                        {activeTab !== 'unit' && <TableHead>Unit</TableHead>}
                        {activeTab !== 'property' && <TableHead>Property</TableHead>}
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                      ) : filteredPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                            <History className="w-8 h-8 mx-auto mb-3 opacity-50" />
                            No payment history found for this selection
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium">
                              <AmountText value={payment.amount} />
                            </TableCell>
                            {activeTab !== 'tenant' && <TableCell>{payment.expand?.tenant_id?.name}</TableCell>}
                            {activeTab !== 'unit' && <TableCell>{payment.expand?.unit_id?.name}</TableCell>}
                            {activeTab !== 'property' && <TableCell>{payment.expand?.property_id?.name}</TableCell>}
                            <TableCell>{payment.expand?.invoice_id?.invoice_number || '-'}</TableCell>
                            <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </Tabs>
          </div>
        </main>
      </AppShell>
    </>
  );
};

export default PaymentHistory;
