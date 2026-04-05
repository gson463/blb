
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { formatDate, isPaymentApproved, isPaymentRejected } from '@/lib/paymentUtils';
import { AmountText } from '@/components/AmountText.jsx';
import { getDaysUntilExpiry } from '@/lib/leaseUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Receipt, CreditCard, AlertCircle, Clock, ArrowRight, Upload } from 'lucide-react';
import { toast } from 'sonner';

const TenantDashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tenantData, setTenantData] = useState(null);
  const [stats, setStats] = useState({
    unpaidInvoices: 0,
    pendingPayments: 0,
    rentBalance: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [activeLease, setActiveLease] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const fetchDashboardData = async () => {
    try {
      // 1. Get Tenant Record
      const tenantRecord = await pb.collection('tenants').getFirstListItem(`user_id = "${currentUser.id}"`, {
        expand: 'unit_id.property_id',
        $autoCancel: false
      });
      setTenantData(tenantRecord);

      // 2. Get Invoices
      const invoices = await pb.collection('invoices').getList(1, 5, {
        filter: `tenant_id = "${tenantRecord.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      setRecentInvoices(invoices.items);

      const allUnpaidInvoices = await pb.collection('invoices').getFullList({
        filter: `tenant_id = "${tenantRecord.id}" && status = "Unpaid"`,
        $autoCancel: false
      });
      const rentBalance = allUnpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

      // 3. Get Payments
      const payments = await pb.collection('payments').getList(1, 5, {
        filter: `tenant_id = "${tenantRecord.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      setRecentPayments(payments.items);

      const pendingPayments = await pb.collection('payments').getFullList({
        filter: `tenant_id = "${tenantRecord.id}" && (status = "Pending Approval" || status = "pending_approval")`,
        $autoCancel: false
      });

      // 4. Get Active Lease
      try {
        const lease = await pb.collection('leases').getFirstListItem(`tenant_id = "${tenantRecord.id}" && status = "Active"`, {
          $autoCancel: false
        });
        setActiveLease(lease);
      } catch (e) {
        // No active lease found
        setActiveLease(null);
      }

      setStats({
        unpaidInvoices: allUnpaidInvoices.length,
        pendingPayments: pendingPayments.length,
        rentBalance,
      });

    } catch (error) {
      console.error('Error fetching tenant dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tenantData) {
    return (
      <div className="container mx-auto px-4 text-center py-12">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Tenant Profile Found</h2>
        <p className="text-muted-foreground">Your account is not linked to any tenant profile. Please contact your landlord.</p>
      </div>
    );
  }

  const unit = tenantData.expand?.unit_id;
  const property = unit?.expand?.property_id;
  const daysUntilExpiry = activeLease ? getDaysUntilExpiry(activeLease.end_date) : null;

  return (
    <>
      <Helmet>
        <title>Tenant Dashboard - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
            Welcome back,{' '}
            {(tenantData.name || currentUser?.name || 'Tenant').trim().split(/\s+/).filter(Boolean)[0] || 'Tenant'}
          </h1>
          <p className="text-muted-foreground">Here's an overview of your rental account.</p>
        </div>

        {/* Alerts Section */}
        <div className="space-y-3 mb-8">
          {stats.unpaidInvoices > 0 && (
            <div className="flex items-start space-x-3 p-4 rounded-xl bg-destructive/10 text-destructive">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">You have {stats.unpaidInvoices} unpaid invoice(s) totaling <AmountText value={stats.rentBalance} />.</p>
                <Link to="/tenant/upload-payment" className="text-sm underline font-semibold mt-1 inline-block">Pay now</Link>
              </div>
            </div>
          )}
          {stats.pendingPayments > 0 && (
            <div className="flex items-start space-x-3 p-4 rounded-xl bg-accent/10 text-accent">
              <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">You have {stats.pendingPayments} payment(s) pending approval by the landlord.</p>
            </div>
          )}
          {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
            <div className="flex items-start space-x-3 p-4 rounded-xl bg-orange-500/10 text-orange-600">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">Your lease expires in {daysUntilExpiry} days. Please contact your landlord to renew.</p>
            </div>
          )}
        </div>

        {/* Quick Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">My Unit</CardTitle>
              <Home className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold truncate">{unit?.name || 'Unassigned'}</div>
              <p className="text-xs text-muted-foreground truncate">{property?.name || '-'}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Rent</CardTitle>
              <Receipt className="w-5 h-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <AmountText value={unit?.rent_amount || 0} className="text-xl font-bold" />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
              <AlertCircle className={`w-5 h-5 ${stats.rentBalance > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <AmountText value={stats.rentBalance} className="text-xl font-bold" />
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-primary/5 border-primary/20">
            <CardContent className="p-6 flex flex-col justify-center h-full">
              <Button asChild className="w-full mb-2">
                <Link to="/tenant/upload-payment">
                  <Upload className="w-4 h-4 mr-2" /> Upload Payment
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/tenant/invoices">View Invoices</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Invoices */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/tenant/invoices" className="text-primary">View All <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentInvoices.length > 0 ? (
                <div className="space-y-4">
                  {recentInvoices.map(invoice => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">Due: {formatDate(invoice.due_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">
                          <AmountText value={invoice.amount} className="text-sm font-bold" />
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          invoice.status === 'Paid' ? 'bg-secondary/10 text-secondary' :
                          invoice.status === 'Unpaid' ? 'bg-destructive/10 text-destructive' :
                          'bg-accent/10 text-accent'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No recent invoices</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Payments</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/tenant/payment-history" className="text-primary">View All <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentPayments.length > 0 ? (
                <div className="space-y-4">
                  {recentPayments.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{formatDate(payment.payment_date)}</p>
                        <p className="text-xs text-muted-foreground">
                          Amount: <AmountText value={payment.amount} className="text-xs font-medium" />
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isPaymentApproved(payment.status) ? 'bg-secondary/10 text-secondary' :
                          isPaymentRejected(payment.status) ? 'bg-destructive/10 text-destructive' :
                          'bg-accent/10 text-accent'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No recent payments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default TenantDashboard;
