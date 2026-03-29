
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { getDaysUntilExpiry } from '@/lib/leaseUtils';
import { getOverdueInvoices, formatCurrency } from '@/lib/invoiceUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppShell from '@/components/AppShell.jsx';
import { Building2, Home, Users, DollarSign, TrendingUp, AlertCircle, Plus, FileText, Clock, CheckCircle, CreditCard, Activity } from 'lucide-react';

const LandlordDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalUnits: 0,
    totalTenants: 0,
    totalMonthlyRent: 0,
    paidRent: 0,
    unpaidRent: 0,
    pendingPayments: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  const [expiringLeases, setExpiringLeases] = useState([]);
  const [invoiceStats, setInvoiceStats] = useState({
    unpaid: 0,
    pending: 0,
    overdue: 0,
    overdueList: []
  });
  
  const [paymentStats, setPaymentStats] = useState({
    approvedThisMonth: 0,
    pendingCount: 0,
    rejectedCount: 0,
    approvalRate: 0,
    topPending: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const staffTeam = await pb.collection('users').getFullList({
        filter: `employer_id = "${currentUser.id}" && role = "staff"`,
        $autoCancel: false,
      });
      const activityIds = [currentUser.id, ...staffTeam.map((s) => s.id)];
      const activityFilter = activityIds.map((id) => `user_id = "${id}"`).join(' || ');

      const [properties, units, tenants, invoices, payments, leases, activities] = await Promise.all([
        pb.collection('properties').getFullList({ filter: `landlord_id = "${currentUser.id}"`, $autoCancel: false }),
        pb.collection('units').getFullList({ filter: `property_id.landlord_id = "${currentUser.id}"`, $autoCancel: false }),
        pb.collection('tenants').getFullList({ filter: `unit_id.property_id.landlord_id = "${currentUser.id}"`, $autoCancel: false }),
        pb.collection('invoices').getFullList({ filter: `property_id.landlord_id = "${currentUser.id}"`, expand: 'tenant_id', $autoCancel: false }),
        pb.collection('payments').getFullList({ filter: `property_id.landlord_id = "${currentUser.id}"`, expand: 'tenant_id', sort: '-created', $autoCancel: false }),
        pb.collection('leases').getFullList({ filter: `property_id.landlord_id = "${currentUser.id}" && status = "Active"`, expand: 'unit_id,tenant_id', $autoCancel: false }),
        pb.collection('activity_logs').getList(1, 8, { filter: activityFilter, sort: '-created', $autoCancel: false }),
      ]);

      // Core Stats
      const totalMonthlyRent = units.reduce((sum, unit) => sum + (unit.rent_amount || 0), 0);
      const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
      const paidRent = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const unpaidInvoices = invoices.filter(inv => inv.status === 'Unpaid');
      const unpaidRent = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const pendingPayments = payments.filter(p => p.status === 'Pending Approval' || p.status === 'pending_approval');

      setStats({
        totalProperties: properties.length,
        totalUnits: units.length,
        totalTenants: tenants.length,
        totalMonthlyRent,
        paidRent,
        unpaidRent,
        pendingPayments: pendingPayments.length
      });

      // Invoice Stats & Overdue List
      const overdueInvoices = getOverdueInvoices(invoices);
      setInvoiceStats({
        unpaid: unpaidInvoices.length,
        pending: invoices.filter(inv => inv.status === 'Pending Approval').length,
        overdue: overdueInvoices.length,
        overdueList: overdueInvoices.slice(0, 5)
      });

      // Payment Stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const approvedPayments = payments.filter(p => p.status === 'Approved' || p.status === 'approved');
      const rejectedPayments = payments.filter(p => p.status === 'Rejected' || p.status === 'rejected');
      
      const approvedThisMonth = approvedPayments.filter(p => {
        const d = new Date(p.payment_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).reduce((sum, p) => sum + p.amount, 0);

      const totalProcessed = approvedPayments.length + rejectedPayments.length;
      const approvalRate = totalProcessed > 0 ? Math.round((approvedPayments.length / totalProcessed) * 100) : 0;

      setPaymentStats({
        approvedThisMonth,
        pendingCount: pendingPayments.length,
        rejectedCount: rejectedPayments.length,
        approvalRate,
        topPending: pendingPayments.slice(0, 5)
      });

      // Expiring Leases
      const expiring = leases.map(lease => ({
        ...lease,
        daysUntilExpiry: getDaysUntilExpiry(lease.end_date)
      })).filter(lease => lease.daysUntilExpiry >= 0 && lease.daysUntilExpiry <= 30)
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
      
      setExpiringLeases(expiring);
      setRecentActivities(activities.items);

      // Generate alerts
      const newAlerts = [];
      if (overdueInvoices.length > 0) {
        newAlerts.push({ type: 'warning', message: `${overdueInvoices.length} overdue invoices require attention.` });
      }
      if (pendingPayments.length > 0) {
        newAlerts.push({ type: 'info', message: `${pendingPayments.length} payments pending approval.` });
      }
      setAlerts(newAlerts);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExpiryColor = (days) => {
    if (days <= 5) return 'text-destructive bg-destructive/10';
    if (days <= 10) return 'text-orange-600 bg-orange-500/10';
    if (days <= 15) return 'text-accent bg-accent/10';
    return 'text-blue-600 bg-blue-500/10';
  };

  if (loading) {
    return (
      <AppShell>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - BELIBELI DIGITAL MANAGER</title>
        <meta name="description" content="Manage your properties, tenants, and rental operations from your dashboard." />
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {currentUser?.name}</p>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="mb-8 space-y-3">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-3 p-4 rounded-xl ${
                      alert.type === 'warning' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'
                    }`}
                  >
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium">{alert.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card
                role="button"
                tabIndex={0}
                aria-label="Open properties"
                onClick={() => navigate('/properties')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/properties');
                  }
                }}
                className="shadow-lg cursor-pointer transition hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Properties</CardTitle>
                  <Building2 className="w-5 h-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalProperties}</div>
                </CardContent>
              </Card>

              <Card
                role="button"
                tabIndex={0}
                aria-label="Open units"
                onClick={() => navigate('/units')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/units');
                  }
                }}
                className="shadow-lg cursor-pointer transition hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Units</CardTitle>
                  <Home className="w-5 h-5 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalUnits}</div>
                </CardContent>
              </Card>

              <Card
                role="button"
                tabIndex={0}
                aria-label="Open tenants"
                onClick={() => navigate('/tenants')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/tenants');
                  }
                }}
                className="shadow-lg cursor-pointer transition hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Tenants</CardTitle>
                  <Users className="w-5 h-5 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalTenants}</div>
                </CardContent>
              </Card>

              <Card
                role="button"
                tabIndex={0}
                aria-label="Open units"
                onClick={() => navigate('/units')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/units');
                  }
                }}
                className="shadow-lg cursor-pointer transition hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Rent</CardTitle>
                  <DollarSign className="w-5 h-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(stats.totalMonthlyRent)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card
                role="button"
                tabIndex={0}
                aria-label="Open payment history"
                onClick={() => navigate('/payment-history')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/payment-history');
                  }
                }}
                className="bg-secondary/5 border-secondary/20 cursor-pointer transition hover:shadow-md hover:border-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Approved This Month</p>
                  <p className="text-2xl font-bold text-secondary">{formatCurrency(paymentStats.approvedThisMonth)}</p>
                </CardContent>
              </Card>
              <Card
                role="button"
                tabIndex={0}
                aria-label="Open payments"
                onClick={() => navigate('/payments')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/payments');
                  }
                }}
                className="bg-accent/5 border-accent/20 cursor-pointer transition hover:shadow-md hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Pending Approvals</p>
                  <p className="text-2xl font-bold text-accent">{paymentStats.pendingCount}</p>
                </CardContent>
              </Card>
              <Card
                role="button"
                tabIndex={0}
                aria-label="Open payments"
                onClick={() => navigate('/payments')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/payments');
                  }
                }}
                className="bg-destructive/5 border-destructive/20 cursor-pointer transition hover:shadow-md hover:border-destructive/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Total Rejected</p>
                  <p className="text-2xl font-bold text-destructive">{paymentStats.rejectedCount}</p>
                </CardContent>
              </Card>
              <Card
                role="button"
                tabIndex={0}
                aria-label="Open payment analytics report"
                onClick={() => navigate('/reports/payment-analytics')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/reports/payment-analytics');
                  }
                }}
                className="bg-muted/30 cursor-pointer transition hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Approval Rate</p>
                  <p className="text-2xl font-bold">{paymentStats.approvalRate}%</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Pending Payment Approvals */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Pending Approvals</h2>
                  <Button variant="link" asChild className="text-primary">
                    <Link to="/payments">Manage All</Link>
                  </Button>
                </div>
                <Card>
                  <CardContent className="p-0">
                    {paymentStats.topPending.length > 0 ? (
                      <div className="divide-y">
                        {paymentStats.topPending.map((payment) => (
                          <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                            <div>
                              <p className="font-medium text-sm">{payment.expand?.tenant_id?.name}</p>
                              <p className="text-xs text-muted-foreground">{new Date(payment.payment_date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                              <Button size="sm" asChild>
                                <Link to="/payments">Review</Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <CheckCircle className="w-8 h-8 text-secondary mx-auto mb-3" />
                        <p className="text-sm font-medium">All caught up!</p>
                        <p className="text-xs text-muted-foreground">No payments waiting for approval.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Overdue Payments Alert */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Overdue Invoices</h2>
                  <Button variant="link" asChild className="text-primary">
                    <Link to="/invoices">View All</Link>
                  </Button>
                </div>
                <Card>
                  <CardContent className="p-0">
                    {invoiceStats.overdueList.length > 0 ? (
                      <div className="divide-y">
                        {invoiceStats.overdueList.map((invoice) => (
                          <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                            <div>
                              <p className="font-medium text-sm">{invoice.expand?.tenant_id?.name}</p>
                              <p className="text-xs text-destructive">Due: {new Date(invoice.due_date).toLocaleDateString()}</p>
                            </div>
                            <span className="font-semibold text-destructive">{formatCurrency(invoice.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <CheckCircle className="w-8 h-8 text-secondary mx-auto mb-3" />
                        <p className="text-sm font-medium">Looking good!</p>
                        <p className="text-xs text-muted-foreground">No overdue invoices at the moment.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent activity — landlord + their staff */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-muted-foreground" />
                Recent activity
              </h2>
              <Card>
                <CardContent className="p-0">
                  {recentActivities.length > 0 ? (
                    <div className="divide-y">
                      {recentActivities.map((log) => (
                        <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <div>
                            <p className="text-sm font-medium">{log.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.entity_type && log.entity_id ? `${log.entity_type} · ${log.entity_id}` : log.details || '—'}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {log.created ? new Date(log.created).toLocaleString() : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground">No recent activity.</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Quick actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Button asChild variant="outline" className="h-auto py-4 flex-col space-y-2">
                  <Link to="/payments">
                    <CreditCard className="w-5 h-5" />
                    <span>Approve Payments</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4 flex-col space-y-2">
                  <Link to="/payment-history">
                    <Clock className="w-5 h-5" />
                    <span>Payment History</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4 flex-col space-y-2">
                  <Link to="/invoices">
                    <FileText className="w-5 h-5" />
                    <span>Invoices</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4 flex-col space-y-2">
                  <Link to="/leases">
                    <TrendingUp className="w-5 h-5" />
                    <span>Leases</span>
                  </Link>
                </Button>
              </div>
            </div>

          </div>
        </main>
      </AppShell>
    </>
  );
};

export default LandlordDashboard;
