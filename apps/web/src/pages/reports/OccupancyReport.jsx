
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { getPropertyWiseBreakdown, getUnitTypeDistribution } from '@/lib/reportUtils';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { buildPropertiesFilter } from '@/lib/staffDataScope';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppShell from '@/components/AppShell.jsx';
import BarChart from '@/components/charts/BarChart.jsx';
import PieChart from '@/components/charts/PieChart.jsx';
import { Download, FileText, Home } from 'lucide-react';

const OccupancyReport = () => {
  const { currentUser, staffRole, assignedProperties } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ properties: [], units: [] });

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
      
      const units = await pb.collection('units').getFullList({ filter: unitFilter, $autoCancel: false });

      setData({ properties, units });
    } catch (error) {
      console.error('Error fetching occupancy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const propertyBreakdown = getPropertyWiseBreakdown(data.properties, data.units, [], []);
  const unitDistribution = getUnitTypeDistribution(data.units);

  const totalUnits = data.units.length;
  const occupiedUnits = data.units.filter(u => u.status === 'Occupied').length;
  const vacantUnits = totalUnits - occupiedUnits;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const occupancyPieData = [
    { name: 'Occupied', value: occupiedUnits, color: 'hsl(var(--secondary))' },
    { name: 'Vacant', value: vacantUnits, color: 'hsl(var(--destructive))' }
  ];

  const handleExportCSV = () => {
    const columns = [
      { header: 'Property Name', key: 'name' },
      { header: 'Total Units', key: 'totalUnits' },
      { header: 'Occupied Units', key: 'occupiedUnits' },
      { header: 'Occupancy Rate (%)', key: 'occupancyRate' }
    ];
    exportToCSV('Occupancy_Report', columns, propertyBreakdown);
  };

  const handleExportPDF = () => {
    const columns = [
      { header: 'Property Name', key: 'name' },
      { header: 'Total Units', key: 'totalUnits' },
      { header: 'Occupied Units', key: 'occupiedUnits' },
      { header: 'Occupancy Rate', key: 'occupancyRate', type: 'percentage' }
    ];
    exportToPDF('Occupancy Report', null, columns, propertyBreakdown);
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
        <title>Occupancy Report - BELIBELI DIGITAL MANAGER</title>
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Occupancy Report</h1>
                <p className="text-muted-foreground">Analyze unit utilization and vacancy rates.</p>
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
                  <p className="text-2xl font-bold">{totalUnits}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Units</p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/5 border-secondary/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-secondary">{occupiedUnits}</p>
                  <p className="text-xs text-secondary/80 uppercase tracking-wider mt-1">Occupied</p>
                </CardContent>
              </Card>
              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{vacantUnits}</p>
                  <p className="text-xs text-destructive/80 uppercase tracking-wider mt-1">Vacant</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{occupancyRate}%</p>
                  <p className="text-xs text-primary/80 uppercase tracking-wider mt-1">Occupancy Rate</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <Card className="lg:col-span-2 shadow-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Occupancy by Property</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart 
                    data={propertyBreakdown} 
                    xKey="name" 
                    bars={[
                      { key: 'occupiedUnits', name: 'Occupied', color: 'hsl(var(--secondary))' },
                      { key: 'totalUnits', name: 'Total Units', color: 'hsl(var(--muted))' }
                    ]} 
                  />
                </CardContent>
              </Card>
              <div className="space-y-8">
                <Card className="shadow-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Overall Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PieChart data={occupancyPieData} height={200} />
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Unit Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PieChart data={unitDistribution} height={200} />
                  </CardContent>
                </Card>
              </div>
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
                      <TableHead className="text-right">Total Units</TableHead>
                      <TableHead className="text-right">Occupied</TableHead>
                      <TableHead className="text-right">Vacant</TableHead>
                      <TableHead className="text-right">Occupancy Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propertyBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No data available</TableCell>
                      </TableRow>
                    ) : (
                      propertyBreakdown.map((prop) => (
                        <TableRow key={prop.id}>
                          <TableCell className="font-medium">{prop.name}</TableCell>
                          <TableCell className="text-right">{prop.totalUnits}</TableCell>
                          <TableCell className="text-right text-secondary font-medium">{prop.occupiedUnits}</TableCell>
                          <TableCell className="text-right text-destructive">{prop.totalUnits - prop.occupiedUnits}</TableCell>
                          <TableCell className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              prop.occupancyRate >= 90 ? 'bg-secondary/10 text-secondary' :
                              prop.occupancyRate >= 70 ? 'bg-accent/10 text-accent' :
                              'bg-destructive/10 text-destructive'
                            }`}>
                              {prop.occupancyRate}%
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

export default OccupancyReport;
