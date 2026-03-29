
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { formatCurrency, formatDate } from '@/lib/paymentUtils';
import { getDaysUntilExpiry } from '@/lib/leaseUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const TenantLeasePage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lease, setLease] = useState(null);

  useEffect(() => {
    fetchLeaseData();
  }, [currentUser]);

  const fetchLeaseData = async () => {
    try {
      const tenantRecord = await pb.collection('tenants').getFirstListItem(`user_id = "${currentUser.id}"`, {
        $autoCancel: false
      });
      
      const leaseRecord = await pb.collection('leases').getFirstListItem(`tenant_id = "${tenantRecord.id}" && status = "Active"`, {
        expand: 'unit_id,property_id',
        $autoCancel: false
      });
      
      setLease(leaseRecord);
    } catch (error) {
      console.error('Error fetching lease data:', error);
      // It's okay if no active lease is found
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    toast('Lease document download will be available soon.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="container mx-auto px-4 text-center py-12">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Active Lease</h2>
        <p className="text-muted-foreground">You do not have an active lease agreement on file.</p>
      </div>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry(lease.end_date);
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry >= 0;

  return (
    <>
      <Helmet>
        <title>My Lease - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Lease Agreement</h1>
            <p className="text-muted-foreground">Review your current lease terms and status.</p>
          </div>
          <Button onClick={handleDownload} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {isExpiringSoon && (
          <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-orange-700">Lease Expiring Soon</h3>
              <p className="text-sm text-orange-600/90 mt-1">
                Your lease will expire in {daysUntilExpiry} days on {formatDate(lease.end_date)}. Please contact management to discuss renewal options.
              </p>
            </div>
          </div>
        )}

        <Card className="shadow-md border-0 overflow-hidden mb-8">
          <div className="bg-primary/5 px-6 py-4 border-b border-border/50 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="font-semibold">Lease Details</span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-secondary/20 text-secondary flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" /> Active
            </span>
          </div>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Unit</p>
                  <p className="font-medium text-lg">{lease.expand?.unit_id?.name || 'Unknown Unit'}</p>
                  <p className="text-sm text-muted-foreground">{lease.expand?.property_id?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Monthly Rent</p>
                  <p className="font-bold text-2xl text-foreground">{formatCurrency(lease.rent_amount)}</p>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Lease Period</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{formatDate(lease.start_date)}</span>
                    <span className="text-muted-foreground">to</span>
                    <span className="font-medium">{formatDate(lease.end_date)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Time Remaining</p>
                  <p className={`font-medium ${isExpiringSoon ? 'text-orange-600' : 'text-foreground'}`}>
                    {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Expired'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Standard Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>1. Rent is due on the 1st of every month. Late payments may incur additional fees as specified in the full agreement.</p>
            <p>2. The tenant is responsible for maintaining the unit in good condition and reporting any maintenance issues promptly.</p>
            <p>3. Subletting is strictly prohibited without prior written consent from the landlord.</p>
            <p>4. A notice period of 30 days is required before vacating the premises at the end of the lease term.</p>
            <p className="italic mt-4 pt-4 border-t border-border/50">
              Note: This is a summary. Please download the full PDF document for complete terms and conditions.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default TenantLeasePage;
