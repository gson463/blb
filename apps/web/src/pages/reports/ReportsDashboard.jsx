
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { AmountText } from '@/components/AmountText.jsx';
import { buildPropertiesFilter } from '@/lib/staffDataScope';
import { 
  calculateTotalRevenue, 
  calculateTotalCollected, 
  calculateTotalPendingApproval, 
  calculateTotalUnpaid,
  calculateOccupancyRate,
  calculateCollectionRate,
  getMonthlyRevenueTrend,
  getPaymentStatusBreakdown,
  getUnitTypeDistribution
} from '@/lib/reportUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppShell from '@/components/AppShell.jsx';
import LineChart from '@/components/charts/LineChart.jsx';
import PieChart from '@/components/charts/PieChart.jsx';
import { BarChart3, DollarSign, Home, FileText, PieChart as PieChartIcon, TrendingUp, ArrowRight } from 'lucide-react';

const ReportsDashboard = () => {
  const { currentUser, staffRole, assignedProperties } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');
  const [data, setData] = useState({
    invoices: [],
    payments: [],
    units: [],
    properties: []
  });

  useEffect(() => {
    fetchData();
  }, [staffRole, currentUser?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let propertyFilter = '';
      if (staffRole === 'collector' && assignedProperties.length > 0) {
        propertyFilter = assignedProperties.map((id) => `id="${id}"`).join(' || ');
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
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate date range filter
  const getDateFilter = () => {
    const end = new Date();
    const start = new Date();
    if (dateRange === '30') start.setDate(start.getDate() - 30);
    else if (dateRange === '90') start.setDate(start.getDate() - 90);
    else if (dateRange === '365') start.setDate(start.getDate() - 365);
    else return null;
    return { start, end };
  };

  const filter = getDateFilter();
  
  const stats = {
    revenue: calculateTotalRevenue(data.invoices, filter),
    collected: calculateTotalCollected(data.payments, filter),
    pending: calculateTotalPendingApproval(data.payments, filter),
    unpaid: calculateTotalUnpaid(data.invoices, data.payments, filter),
    occupancyRate: calculateOccupancyRate(data.units),
    collectionRate: calculateCollectionRate(data.invoices, data.payments, filter)
  };

  const revenueTrend = getMonthlyRevenueTrend(data.invoices, filter);
  const paymentStatus = getPaymentStatusBreakdown(data.payments, filter);
  const unitDistribution = getUnitTypeDistribution(data.units);

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
        <title>Reports Dashboard - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Reports & Analytics</h1>
                <p className="text-muted-foreground">Comprehensive overview of your property portfolio performance.</p>
              </div>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2" asChild>
                <Link to="/reports/financial">
                  <DollarSign className="w-6 h-6 text-secondary" />
                  <span>Financial</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2" asChild>
                <Link to="/reports/occupancy">
                  <Home className="w-6 h-6 text-primary" />
                  <span>Occupancy</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2" asChild>
                <Link to="/reports/payment-analytics">
                  <PieChartIcon className="w-6 h-6 text-accent" />
                  <span>Payments</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2" asChild>
                <Link to="/reports/lease">
                  <FileText className="w-6 h-6 text-blue-500" />
                  <span>Leases</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2" asChild>
                <Link to="/reports/property">
                  <BarChart3 className="w-6 h-6 text-purple-500" />
                  <span>Properties</span>
                </Link>
              </Button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Card className="shadow-sm border-border/50 bg-secondary/5">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-secondary/80 uppercase tracking-wider mb-2">Total Collected</p>
                  <AmountText value={stats.collected} className="text-3xl font-bold" />
                  <p className="text-sm text-muted-foreground mt-2">Collection Rate: <span className="font-bold text-foreground">{stats.collectionRate}%</span></p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-border/50 bg-destructive/5">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-destructive/80 uppercase tracking-wider mb-2">Total Unpaid</p>
                  <AmountText value={stats.unpaid} className="text-3xl font-bold" />
                  <p className="text-sm text-muted-foreground mt-2">Outstanding invoices</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-border/50 bg-accent/5">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-accent/80 uppercase tracking-wider mb-2">Pending Approval</p>
                  <AmountText value={stats.pending} className="text-3xl font-bold" />
                  <p className="text-sm text-muted-foreground mt-2">Awaiting verification</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="shadow-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Revenue Trend</CardTitle>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {revenueTrend.length > 0 ? (
                    <LineChart 
                      data={revenueTrend} 
                      xKey="name" 
                      lines={[
                        { key: 'invoiced', name: 'Invoiced', color: 'hsl(var(--primary))' },
                        { key: 'unpaid', name: 'Unpaid', color: 'hsl(var(--destructive))' }
                      ]} 
                    />
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Payment Status</CardTitle>
                  <PieChartIcon className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {paymentStatus.some(p => p.value > 0) ? (
                    <PieChart data={paymentStatus} />
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </AppShell>
    </>
  );
};

export default ReportsDashboard;
