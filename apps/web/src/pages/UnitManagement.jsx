
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { buildPropertiesFilter, buildUnitsFilter } from '@/lib/staffDataScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppShell from '@/components/AppShell.jsx';
import UnitForm from '@/components/UnitForm.jsx';
import { Plus, Home, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/paymentUtils';

const UnitManagement = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);

  useEffect(() => {
    fetchProperties();
    fetchUnits();
  }, []);

  const fetchProperties = async () => {
    try {
      const records = await pb.collection('properties').getFullList({
        filter: buildPropertiesFilter(currentUser),
        $autoCancel: false
      });
      setProperties(records);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      const records = await pb.collection('units').getFullList({
        filter: buildUnitsFilter(currentUser),
        expand: 'property_id',
        sort: '-created',
        $autoCancel: false
      });
      setUnits(records);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error('Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (unit) => {
    setSelectedUnit(unit);
    setShowForm(true);
  };

  const handleDelete = async (unitId) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) return;

    try {
      await pb.collection('units').delete(unitId, { $autoCancel: false });
      toast.success('Unit deleted successfully');
      fetchUnits();
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast.error('Failed to delete unit');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedUnit(null);
  };

  const filteredUnits = selectedProperty === 'all'
    ? units
    : units.filter(unit => unit.property_id === selectedProperty);

  if (loading) {
    return (
      <AppShell>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading units...</p>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <>
      <Helmet>
        <title>Units - BELIBELI DIGITAL MANAGER</title>
        <meta name="description" content="Manage your rental units and track occupancy status." />
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Units</h1>
                <p className="text-muted-foreground">Manage your rental units</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Unit
                </Button>
              </div>
            </div>

            {filteredUnits.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Home className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No units yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first unit to get started</p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Unit
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUnits.map((unit) => (
                  <Card key={unit.id} className="shadow-lg hover:shadow-xl transition-shadow duration-200">
                    {unit.image && (
                      <div className="aspect-video w-full overflow-hidden rounded-t-xl">
                        <img
                          src={pb.files.getUrl(unit, unit.image)}
                          alt={unit.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{unit.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{unit.expand?.property_id?.name}</p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-lg ${
                            unit.status === 'Vacant'
                              ? 'bg-secondary/10 text-secondary'
                              : 'bg-accent/10 text-accent'
                          }`}
                        >
                          {unit.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="font-medium">{unit.type}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Rent:</span>
                          <span className="font-medium">{formatCurrency(unit.rent_amount)}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(unit)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(unit.id)}
                          className="flex-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </AppShell>

      {showForm && (
        <UnitForm
          unit={selectedUnit}
          onClose={handleFormClose}
          onSuccess={fetchUnits}
        />
      )}
    </>
  );
};

export default UnitManagement;
