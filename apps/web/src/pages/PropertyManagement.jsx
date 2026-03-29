
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { buildPropertiesFilter } from '@/lib/staffDataScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppShell from '@/components/AppShell.jsx';
import PropertyForm from '@/components/PropertyForm.jsx';
import { Plus, MapPin, Edit, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const PropertyManagement = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const records = await pb.collection('properties').getFullList({
        filter: buildPropertiesFilter(currentUser),
        sort: '-created',
        $autoCancel: false
      });
      setProperties(records);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (property) => {
    setSelectedProperty(property);
    setShowForm(true);
  };

  const handleDelete = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;

    try {
      await pb.collection('properties').delete(propertyId, { $autoCancel: false });
      toast.success('Property deleted successfully');
      fetchProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedProperty(null);
  };

  if (loading) {
    return (
      <AppShell>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading properties...</p>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <>
      <Helmet>
        <title>Properties - BELIBELI DIGITAL MANAGER</title>
        <meta name="description" content="Manage your rental properties and view property details." />
      </Helmet>
      <AppShell>
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>Properties</h1>
                <p className="text-muted-foreground">Manage your rental properties</p>
              </div>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </div>

            {properties.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first property to get started</p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Property
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <Card
                    key={property.id}
                    className="shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden flex flex-col"
                  >
                    <div className="aspect-video w-full bg-muted shrink-0 overflow-hidden">
                      {property.image ? (
                        <img
                          src={pb.files.getUrl(property, property.image)}
                          alt={property.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[140px] flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/15 via-muted to-muted text-muted-foreground px-4">
                          <Building2 className="w-14 h-14 opacity-40" strokeWidth={1.25} />
                          <span className="text-xs font-medium">No photo yet — add one when editing</span>
                        </div>
                      )}
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl leading-tight">{property.name}</CardTitle>
                      <div
                        className="flex items-start gap-2 text-sm text-muted-foreground pt-2 border-t border-border/60 mt-3"
                        title={property.location?.trim() || undefined}
                      >
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden />
                        <span className="leading-snug line-clamp-3 break-words">
                          {property.location?.trim() ? property.location.trim() : 'Location not set'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {property.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{property.description}</p>
                      )}
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(property)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(property.id)}
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
        <PropertyForm
          property={selectedProperty}
          onClose={handleFormClose}
          onSuccess={fetchProperties}
        />
      )}
    </>
  );
};

export default PropertyManagement;
