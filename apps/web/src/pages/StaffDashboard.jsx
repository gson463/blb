
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { formatCurrency } from '@/lib/paymentUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AppShell from '@/components/AppShell.jsx';
import { Building2, Users, Receipt, CreditCard, AlertCircle, ArrowRight, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StaffDashboard = () => {
  const { staffRole, assignedProperties } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [staffRole]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Base filters depending on role
      let propertyFilter = '';
      if (staffRole === 'collector' && assignedProperties.length > 0) {
        propertyFilter = assignedProperties.map(id => `id="${id}"`).join(' || ');
      }

      // Fetch basic stats
      const properties = await pb.collection('properties').getFullList({
        filter: propertyFilter,
        $autoCancel: false
      });
      
      const propIds = properties.map(p => p.id);
      const unitFilter = propIds.length > 0 ? propIds.map(id => `property_id="${id}"`).join(' || ') : 'id="none"';
      
      const units = await pb.collection('units').getFullList({
        filter: unitFilter,
        $autoCancel: false
      });

      const invoices = await pb.collection('invoices').getFullList({
        filter: propIds.length > 0 ? propIds.map(id => `property_id="${id}"`).join(' || ') : 'id="none"',
        $autoCancel: false
      });

      const payments = await pb.collection('payments').getFullList({
        filter: propIds.length > 0 ? propIds.map(id => `property_id="${id}"`).join(' || ') : 'id="none"',
        $autoCancel: false
      });

      // Calculate metrics
      const unpaidInvoices = invoices.filter(i => i.status === 'Unpaid');
      const pendingPayments = payments.filter(p => p.status === 'Pending Approval');
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const collectedThisMonth = payments
        .filter(p => p.status === 'Approved' && new Date(p.payment_date).getMonth() === currentMonth && new Date(p.payment_date).getFullYear() === currentYear)
        .reduce((sum, p) => sum + p.amount, 0);

      setStats({
        properties: properties.length,
        units: units.length,
        occupiedUnits: units.filter(u => u.status === 'Occupied').length,
        unpaidInvoicesCount: unpaidInvoices.length,
        unpaidAmount: unpaidInvoices.reduce((sum, i) => sum + i.amount, 0),
        pendingPaymentsCount: pendingPayments.length,
        collectedThisMonth
      });

      // Mock chart data for accountant/manager
      if (staffRole === 'accountant' || staffRole === 'manager') {
        const mockChart = [
          { name: 'Jan', amount: 450000 },
          { name: 'Feb', amount: 520000 },
          { name: 'Mar', amount: 480000 },
          { name: 'Apr', amount: 610000 },
          { name: 'May', amount: 590000 },
          { name: 'Jun', amount: collectedThisMonth || 650000 },
        ];
        setChartData(mockChart);
      }

      // Recent activity (mocked for now, ideally from activity_logs)
      setRecentActivity([
        { id: 1, action: 'Payment Approved', details: 'INV-2024-001', time: '2 hours ago' },
        { id: 2, action: 'New Lease Created', details: 'Unit A1, Sunset Apts', time: '5 hours ago' },
        { id: 3, action: 'Invoice Generated', details: 'Rent - May 2024', time: '1 day ago' },
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

  const renderManagerDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          role="button"
          tabIndex={0}
          aria-label="Open properties"
          onClick={() => navigate('/staff/properties')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/staff/properties');
            }
          }}
          className="shadow-sm border-border/50 cursor-pointer transition hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <span className="text-2xl font-bold">{stats?.properties}</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          aria-label="Open units"
          onClick={() => navigate('/staff/units')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/staff/units');
            }
          }}
          className="shadow-sm border-border/50 cursor-pointer transition hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <span className="text-2xl font-bold">{stats?.occupiedUnits} / {stats?.units}</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Occupied Units</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          aria-label="Open invoices"
          onClick={() => navigate('/staff/invoices')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/staff/invoices');
            }
          }}
          className="shadow-sm border-border/50 cursor-pointer transition hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-destructive" />
              </div>
              <span className="text-2xl font-bold text-destructive">{stats?.unpaidInvoicesCount}</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Unpaid Invoices</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          aria-label="Open payments"
          onClick={() => navigate('/staff/payments')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/staff/payments');
            }
          }}
          className="shadow-sm border-border/50 cursor-pointer transition hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-accent" />
              </div>
              <span className="text-2xl font-bold text-accent">{stats?.pendingPaymentsCount}</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card
          role="button"
          tabIndex={0}
          aria-label="Open financial report"
          onClick={() => navigate('/reports/financial')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/reports/financial');
            }
          }}
          className="lg:col-span-2 shadow-sm border-border/50 cursor-pointer transition hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardHeader>
            <CardTitle>Collection Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `Tsh ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip cursor={{fill: 'transparent'}} formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          aria-label="Open reports dashboard"
          onClick={() => navigate('/reports/dashboard')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/reports/dashboard');
            }
          }}
          className="shadow-sm border-border/50 cursor-pointer transition hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.details}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-full mt-6 text-primary"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/reports/dashboard');
              }}
            >
              View All Activity
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAccountantDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          role="button"
          tabIndex={0}
          aria-label="Open payment history"
          onClick={() => navigate('/staff/payment-history')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/staff/payment-history');
            }
          }}
          className="shadow-sm border-border/50 bg-secondary/5 cursor-pointer transition hover:shadow-md hover:border-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardContent className="p-6">
            <p className="text-sm font-medium text-secondary/80 uppercase tracking-wider mb-2">Collected This Month</p>
            <h3 className="text-3xl font-bold text-secondary">{formatCurrency(stats?.collectedThisMonth)}</h3>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          aria-label="Open invoices"
          onClick={() => navigate('/staff/invoices')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/staff/invoices');
            }
          }}
          className="shadow-sm border-border/50 bg-destructive/5 cursor-pointer transition hover:shadow-md hover:border-destructive/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardContent className="p-6">
            <p className="text-sm font-medium text-destructive/80 uppercase tracking-wider mb-2">Outstanding Arrears</p>
            <h3 className="text-3xl font-bold text-destructive">{formatCurrency(stats?.unpaidAmount)}</h3>
            <p className="text-sm text-destructive/70 mt-1">Across {stats?.unpaidInvoicesCount} invoices</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          aria-label="Open payments"
          onClick={() => navigate('/staff/payments')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/staff/payments');
            }
          }}
          className="shadow-sm border-border/50 bg-accent/5 cursor-pointer transition hover:shadow-md hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardContent className="p-6">
            <p className="text-sm font-medium text-accent/80 uppercase tracking-wider mb-2">Pending Approvals</p>
            <h3 className="text-3xl font-bold text-accent">{stats?.pendingPaymentsCount}</h3>
            <p className="mt-2 inline-flex items-center text-sm text-accent/90">
              Review now <ArrowRight className="w-4 h-4 ml-1" />
            </p>
          </CardContent>
        </Card>
      </div>

      <Card
        role="button"
        tabIndex={0}
        aria-label="Open financial report"
        onClick={() => navigate('/reports/financial')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate('/reports/financial');
          }
        }}
        className="shadow-sm border-border/50 cursor-pointer transition hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `Tsh ${(value / 1000).toFixed(0)}k`} />
                <Tooltip cursor={{fill: 'transparent'}} formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="amount" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCollectorDashboard = () => (
    <div className="space-y-8">
      <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 mb-8">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <Building2 className="w-5 h-5 mr-2 text-primary" />
          Your Assigned Portfolio
        </h2>
        <p className="text-muted-foreground text-sm">You are managing {stats?.properties} properties with {stats?.units} total units.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          role="button"
          tabIndex={0}
          aria-label="Open invoices"
          onClick={() => navigate('/staff/invoices')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/staff/invoices');
            }
          }}
          className="shadow-sm border-border/50 cursor-pointer transition hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-destructive flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Collection Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{stats?.unpaidInvoicesCount}</div>
            <p className="text-sm text-muted-foreground mb-4">Unpaid invoices in your properties</p>
            <div className="text-xl font-semibold text-destructive mb-4">{formatCurrency(stats?.unpaidAmount)}</div>
            <p className="text-sm font-medium text-primary">View arrears list →</p>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          aria-label="Open payments"
          onClick={() => navigate('/staff/payments')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/staff/payments');
            }
          }}
          className="shadow-sm border-border/50 cursor-pointer transition hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-secondary flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Recent Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{formatCurrency(stats?.collectedThisMonth)}</div>
            <p className="text-sm text-muted-foreground mb-6">Collected this month</p>
            <p className="text-sm font-medium text-primary">Record or review payments →</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Staff Dashboard - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
                {staffRole === 'manager' ? 'Manager Overview' : 
                 staffRole === 'accountant' ? 'Financial Dashboard' : 
                 'Collector Dashboard'}
              </h1>
              <p className="text-muted-foreground">Welcome back. Here's what's happening today.</p>
            </div>

            {staffRole === 'manager' && renderManagerDashboard()}
            {staffRole === 'accountant' && renderAccountantDashboard()}
            {staffRole === 'collector' && renderCollectorDashboard()}
          </div>
        </main>
      </AppShell>
    </>
  );
};

export default StaffDashboard;
