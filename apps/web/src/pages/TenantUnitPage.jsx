
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { formatCurrency } from '@/lib/paymentUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, MapPin, Building2, Phone, Mail, Info } from 'lucide-react';
import { toast } from 'sonner';

const TenantUnitPage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [unitData, setUnitData] = useState(null);
  const [propertyData, setPropertyData] = useState(null);

  useEffect(() => {
    fetchUnitData();
  }, [currentUser]);

  const fetchUnitData = async () => {
    try {
      const tenantRecord = await pb.collection('tenants').getFirstListItem(`user_id = "${currentUser.id}"`, {
        expand: 'unit_id.property_id',
        $autoCancel: false
      });
      
      if (tenantRecord.expand?.unit_id) {
        setUnitData(tenantRecord.expand.unit_id);
        setPropertyData(tenantRecord.expand.unit_id.expand?.property_id);
      }
    } catch (error) {
      console.error('Error fetching unit data:', error);
      toast.error('Failed to load unit details');
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

  if (!unitData) {
    return (
      <div className="container mx-auto px-4 text-center py-12">
        <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Unit Assigned</h2>
        <p className="text-muted-foreground">You have not been assigned to a unit yet.</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Unit - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>My Unit</h1>
          <p className="text-muted-foreground">Details about your current residence.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Unit Details */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="overflow-hidden shadow-md border-0">
              {unitData.image ? (
                <div className="w-full h-64 bg-muted relative">
                  <img 
                    src={pb.files.getUrl(unitData, unitData.image)} 
                    alt={unitData.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  <Home className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{unitData.name}</h2>
                    <div className="flex items-center text-muted-foreground text-sm">
                      <Building2 className="w-4 h-4 mr-1" />
                      {propertyData?.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{formatCurrency(unitData.rent_amount)}</div>
                    <p className="text-xs text-muted-foreground">per month</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 py-4 border-t border-border/50">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Unit Type</p>
                    <p className="font-medium">{unitData.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                      {unitData.status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Details */}
            {propertyData && (
              <Card className="shadow-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-primary" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-6">
                    {propertyData.image && (
                      <div className="w-full md:w-1/3 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img 
                          src={pb.files.getUrl(propertyData, propertyData.image)} 
                          alt={propertyData.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{propertyData.name}</h3>
                      <div className="flex items-start text-muted-foreground text-sm mb-4">
                        <MapPin className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                        <span>{propertyData.location}</span>
                      </div>
                      {propertyData.description && (
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {propertyData.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="shadow-sm border-border/50 bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">Support & Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Need help with your unit? Contact property management.
                </p>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Management Office</p>
                    <p className="text-muted-foreground">+254 700 000 000</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Email Support</p>
                    <p className="text-muted-foreground">support@belibeli.com</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default TenantUnitPage;
