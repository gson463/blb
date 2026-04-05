
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { AmountText } from '@/components/AmountText.jsx';
import { getPropertyWiseBreakdown } from '@/lib/reportUtils';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { buildPropertiesFilter } from '@/lib/staffDataScope';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppShell from '@/components/AppShell.jsx';
import BarChart from '@/components/charts/BarChart.jsx';
import { Download, FileText, Building2 } from 'lucide-react';

const PropertyReport = () => {
  const { currentUser, staffRole, assignedProperties } = useAuth();
  const [loading, setLoading] = useState(true);
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
      console.error('Error fetching property data:', error);
    } finally {
      setLoading(false);
    }
  };

  const propertyBreakdown = getPropertyWiseBreakdown(data.properties, data.units, data.invoices, data.payments);

  const totals = {
    properties: data.properties.length,
    units: data.units.length,
    occupied: data.units.filter(u => u.status === 'Occupied').length,
    rent: data.units.reduce((sum, u) => sum + (u.rent_amount || 0), 0)
  };

  const handleExportCSV = () => {
    const columns = [
      { header: 'Property Name', key: 'name' },
      { header: 'Location', key: 'location' },
      { header: 'Total Units', key: 'totalUnits' },
      { header: 'Occupancy Rate (%)', key: 'occupancyRate' },
      { header: 'Collection Rate (%)', key: 'collectionRate' }
    ];
    exportToCSV('Property_Report', columns, propertyBreakdown);
  };

  const handleExportPDF = () => {
    const columns = [
      { header: 'Property Name', key: 'name' },
      { header: 'Location', key: 'location' },
      { header: 'Units', key: 'totalUnits' },
      { header: 'Occupancy', key: 'occupancyRate', type: 'percentage' },
      { header: 'Collection', key: 'collectionRate', type: 'percentage' }
    ];
    exportToPDF('Property Report', null, columns, propertyBreakdown);
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
        <title>Property Report - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Property Report</h1>
                <p className="text-muted-foreground">High-level overview of property performance.</p>
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
                  <p className="text-2xl font-bold">{totals.properties}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Properties</p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/5 border-secondary/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-secondary">{totals.units}</p>
                  <p className="text-xs text-secondary/80 uppercase tracking-wider mt-1">Total Units</p>
                </CardContent>
              </Card>
              <Card className="bg-accent/5 border-accent/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-accent">{totals.occupied}</p>
                  <p className="text-xs text-accent/80 uppercase tracking-wider mt-1">Occupied Units</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <AmountText value={totals.rent} className="text-2xl font-bold" />
                  <p className="text-xs text-primary/80 uppercase tracking-wider mt-1">Potential Rent</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card className="shadow-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Occupancy by Property</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart 
                    data={propertyBreakdown} 
                    xKey="name" 
                    bars={[
                      { key: 'occupancyRate', name: 'Occupancy %', color: 'hsl(var(--primary))' }
                    ]} 
                  />
                </CardContent>
              </Card>
              <Card className="shadow-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Collection Rate by Property</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart 
                    data={propertyBreakdown} 
                    xKey="name" 
                    bars={[
                      { key: 'collectionRate', name: 'Collection %', color: 'hsl(var(--secondary))' }
                    ]} 
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Property Details</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Occupancy</TableHead>
                      <TableHead className="text-right">Collection</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propertyBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No properties found</TableCell>
                      </TableRow>
                    ) : (
                      propertyBreakdown.map((prop) => (
                        <TableRow key={prop.id}>
                          <TableCell className="font-medium flex items-center">
                            <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                            {prop.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{prop.location}</TableCell>
                          <TableCell className="text-right">{prop.totalUnits}</TableCell>
                          <TableCell className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              prop.occupancyRate >= 90 ? 'bg-secondary/10 text-secondary' :
                              prop.occupancyRate >= 70 ? 'bg-accent/10 text-accent' :
                              'bg-destructive/10 text-destructive'
                            }`}>
                              {prop.occupancyRate}%
                            </span>
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

export default PropertyReport;
