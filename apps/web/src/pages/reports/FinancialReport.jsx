
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { AmountText } from '@/components/AmountText.jsx';
import { getPropertyWiseBreakdown, getMonthlyRevenueTrend } from '@/lib/reportUtils';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { buildPropertiesFilter } from '@/lib/staffDataScope';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppShell from '@/components/AppShell.jsx';
import BarChart from '@/components/charts/BarChart.jsx';
import LineChart from '@/components/charts/LineChart.jsx';
import { Download, FileText, DollarSign } from 'lucide-react';

const FinancialReport = () => {
  const { currentUser, staffRole, assignedProperties } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');
  const [data, setData] = useState({ properties: [], units: [], invoices: [], payments: [] });

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
      const unitFilter = propIds.length > 0 ? propIds.map(id => `property_id="${id}"`).join(' || ') : 'id="none"';
      
      const [units, invoices, payments] = await Promise.all([
        pb.collection('units').getFullList({ filter: unitFilter, $autoCancel: false }),
        pb.collection('invoices').getFullList({ filter: unitFilter, $autoCancel: false }),
        pb.collection('payments').getFullList({ filter: unitFilter, $autoCancel: false })
      ]);

      setData({ properties, units, invoices, payments });
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const propertyBreakdown = getPropertyWiseBreakdown(data.properties, data.units, data.invoices, data.payments);
  const revenueTrend = getMonthlyRevenueTrend(data.invoices);

  const totals = propertyBreakdown.reduce((acc, curr) => ({
    invoiced: acc.invoiced + curr.totalInvoiced,
    collected: acc.collected + curr.totalCollected,
    pending: acc.pending + curr.totalPending,
    unpaid: acc.unpaid + curr.totalUnpaid
  }), { invoiced: 0, collected: 0, pending: 0, unpaid: 0 });

  const overallCollectionRate = totals.invoiced > 0 ? Math.round((totals.collected / totals.invoiced) * 100) : 0;

  const handleExportCSV = () => {
    const columns = [
      { header: 'Property Name', key: 'name' },
      { header: 'Total Units', key: 'totalUnits' },
      { header: 'Total Invoiced', key: 'totalInvoiced' },
      { header: 'Total Collected', key: 'totalCollected' },
      { header: 'Total Pending', key: 'totalPending' },
      { header: 'Total Unpaid', key: 'totalUnpaid' },
      { header: 'Collection Rate (%)', key: 'collectionRate' }
    ];
    exportToCSV('Financial_Report', columns, propertyBreakdown);
  };

  const handleExportPDF = () => {
    const columns = [
      { header: 'Property Name', key: 'name' },
      { header: 'Units', key: 'totalUnits' },
      { header: 'Invoiced', key: 'totalInvoiced', type: 'currency' },
      { header: 'Collected', key: 'totalCollected', type: 'currency' },
      { header: 'Pending', key: 'totalPending', type: 'currency' },
      { header: 'Unpaid', key: 'totalUnpaid', type: 'currency' },
      { header: 'Rate', key: 'collectionRate', type: 'percentage' }
    ];
    exportToPDF('Financial Report', dateRange === 'all' ? 'All Time' : `Last ${dateRange} Days`, columns, propertyBreakdown);
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
        <title>Financial Report - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Financial Report</h1>
                <p className="text-muted-foreground">Detailed breakdown of revenue, collections, and arrears.</p>
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
                  <AmountText value={totals.invoiced} className="text-xl font-bold" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Invoiced</p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/5 border-secondary/20">
                <CardContent className="p-4 text-center">
                  <AmountText value={totals.collected} className="text-xl font-bold" />
                  <p className="text-xs text-secondary/80 uppercase tracking-wider mt-1">Collected</p>
                </CardContent>
              </Card>
              <Card className="bg-accent/5 border-accent/20">
                <CardContent className="p-4 text-center">
                  <AmountText value={totals.pending} className="text-xl font-bold" />
                  <p className="text-xs text-accent/80 uppercase tracking-wider mt-1">Pending</p>
                </CardContent>
              </Card>
              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-4 text-center">
                  <AmountText value={totals.unpaid} className="text-xl font-bold" />
                  <p className="text-xs text-destructive/80 uppercase tracking-wider mt-1">Unpaid</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <p className="text-xl font-bold text-primary">{overallCollectionRate}%</p>
                  <p className="text-xs text-primary/80 uppercase tracking-wider mt-1">Efficiency</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card className="shadow-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Revenue by Property</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart 
                    data={propertyBreakdown} 
                    xKey="name" 
                    bars={[
                      { key: 'totalCollected', name: 'Collected', color: 'hsl(var(--secondary))' },
                      { key: 'totalUnpaid', name: 'Unpaid', color: 'hsl(var(--destructive))' }
                    ]} 
                    stacked={true}
                  />
                </CardContent>
              </Card>
              <Card className="shadow-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart 
                    data={revenueTrend} 
                    xKey="name" 
                    lines={[
                      { key: 'invoiced', name: 'Invoiced', color: 'hsl(var(--primary))' },
                      { key: 'unpaid', name: 'Unpaid', color: 'hsl(var(--destructive))' }
                    ]} 
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Property Breakdown</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property Name</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Invoiced</TableHead>
                      <TableHead className="text-right">Collected</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Unpaid</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propertyBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No data available</TableCell>
                      </TableRow>
                    ) : (
                      propertyBreakdown.map((prop) => (
                        <TableRow key={prop.id}>
                          <TableCell className="font-medium">{prop.name}</TableCell>
                          <TableCell className="text-right">{prop.totalUnits}</TableCell>
                          <TableCell className="text-right">
                            <AmountText value={prop.totalInvoiced} />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <AmountText value={prop.totalCollected} />
                          </TableCell>
                          <TableCell className="text-right">
                            <AmountText value={prop.totalPending} />
                          </TableCell>
                          <TableCell className="text-right">
                            <AmountText value={prop.totalUnpaid} />
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              prop.collectionRate >= 90 ? 'bg-secondary/10 text-secondary' :
                              prop.collectionRate >= 70 ? 'bg-accent/10 text-accent' :
                              'bg-destructive/10 text-destructive'
                            }`}>
                              {prop.collectionRate}%
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

export default FinancialReport;
