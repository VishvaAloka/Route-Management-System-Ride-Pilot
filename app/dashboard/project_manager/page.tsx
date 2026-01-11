'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Clock, Check, X, AlertCircle, User, Map, History, Eye, ArrowLeftRight, ArrowRight, Gauge } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MapModal } from '@/components/MapModal';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Ride {
  _id: string;
  userId: string;
  status: string;
  distanceKm: number;
  tripType: 'one-way' | 'return-trip';
  startLocation: { 
    lat: number;
    lng: number;
    address: string;
  };
  endLocation: { 
    lat: number;
    lng: number;
    address: string;
  };
  user?: User;
  approval?: {
    projectManager?: {
      approved: boolean;
      approvedAt: string;
      approvedBy?: string;
    };
  };
  startMileage?: number;
  endMileage?: number;
  totalMileage?: number;
  createdAt: string;
}

export default function ProjectManagerDashboard() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    try {
      const response = await fetch('/api/rides/pm-rides');
      if (response.ok) {
        const data = await response.json();
        setRides(data);
      }
    } catch (error) {
      console.error('Failed to fetch rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveRide = async (rideId: string) => {
    try {
      const response = await fetch(`/api/rides/${rideId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert('✅ Ride approved! Sent to Admin for driver assignment.');
        fetchRides();
      } else {
        const error = await response.json();
        alert('Failed to approve ride: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to approve ride:', error);
      alert('Error approving ride');
    }
  };

  const rejectRide = async (rideId: string) => {
    const rejectionReason = prompt('Please enter the reason for rejection (optional):');
    
    if (rejectionReason === null) {
      return;
    }

    try {
      const response = await fetch(`/api/rides/${rideId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason || 'No specific reason provided'
        }),
      });

      if (response.ok) {
        alert('❌ Ride rejected! User has been notified.');
        fetchRides();
      } else {
        const error = await response.json();
        alert('Failed to reject ride: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to reject ride:', error);
      alert('Error rejecting ride');
    }
  };

  const handleViewMap = (ride: Ride) => {
    setSelectedRide(ride);
    setShowMap(true);
  };

  const pendingRides = rides.filter(ride => ride.status === 'awaiting_pm');
  const processedRides = rides.filter(ride => ride.approval?.projectManager);

  const getStatusBadge = (status: string) => {
    const statusColors = {
      awaiting_pm: 'bg-orange-100 text-orange-800',
      awaiting_admin: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      assigned: 'bg-purple-100 text-purple-800',
      rejected: 'bg-red-100 text-red-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getTripTypeBadge = (tripType: 'one-way' | 'return-trip') => {
    return (
      <Badge className={`${
        tripType === 'return-trip' 
          ? 'bg-purple-100 text-purple-800 border-purple-300' 
          : 'bg-blue-100 text-blue-800 border-blue-300'
      } border`}>
        {tripType === 'return-trip' ? (
          <><ArrowLeftRight className="w-3 h-3 mr-1" /> Return Trip</>
        ) : (
          <><ArrowRight className="w-3 h-3 mr-1" /> One-Way</>
        )}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Project Manager Dashboard</h1>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <AlertCircle className="w-4 h-4 mr-2" />
              {pendingRides.length} Pending
            </Badge>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingRides.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Approved Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {processedRides.filter(ride => 
                  ride.approval?.projectManager?.approved && 
                  new Date(ride.approval.projectManager.approvedAt).toDateString() === new Date().toDateString()
                ).length}
              </div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Long Distance Rides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rides.filter(ride => ride.distanceKm >= 25).length}
              </div>
              <p className="text-xs text-gray-500">≥25km rides</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{processedRides.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <AlertCircle className="w-4 h-4 mr-1 inline" />
              Pending Approvals ({pendingRides.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <History className="w-4 h-4 mr-1 inline" />
              History ({processedRides.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading rides...</div>
          </div>
        ) : (
          <>
            {/* Pending Approvals Tab */}
            {activeTab === 'pending' && (
              <div className="space-y-6">
                {pendingRides.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">All caught up!</h3>
                      <p className="text-gray-500">No rides pending your approval at the moment.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    {pendingRides.map((ride) => (
                      <Card key={ride._id} className="border-l-4 border-l-orange-500">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                                <AlertCircle className="w-5 h-5 text-orange-600" />
                                Ride #{ride._id.slice(-6)} - Approval Required
                                {getTripTypeBadge(ride.tripType)}
                              </CardTitle>
                              <CardDescription>
                                Long distance ride ({ride.distanceKm.toFixed(1)} km) - Requested on {new Date(ride.createdAt).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            <Badge className="bg-orange-100 text-orange-800">
                              Awaiting PM Approval
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Customer Information */}
                            {ride.user && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  Customer Information
                                </h4>
                                <div className="grid md:grid-cols-2 gap-3">
                                  <div>
                                    <span className="text-sm text-gray-600">Name:</span>
                                    <span className="ml-2 font-medium">{ride.user.name}</span>
                                  </div>
                                  <div>
                                    <span className="text-sm text-gray-600">Email:</span>
                                    <span className="ml-2 font-medium">{ride.user.email}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Trip Details */}
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-sm">Pickup Location</p>
                                    <p className="text-gray-600">{ride.startLocation.address}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-sm">Destination</p>
                                    <p className="text-gray-600">{ride.endLocation.address}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="p-4 bg-yellow-50 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                                    <span className="font-medium text-yellow-800">Long Distance Alert</span>
                                  </div>
                                  <p className="text-sm text-yellow-700 mb-2">
                                    This {ride.tripType === 'return-trip' ? 'return trip' : 'one-way trip'} is {ride.distanceKm.toFixed(1)} km, exceeding the 25 km threshold.
                                  </p>
                                  {ride.tripType === 'return-trip' && (
                                    <p className="text-xs text-yellow-600 flex items-center gap-1">
                                      <ArrowLeftRight className="w-3 h-3" />
                                      Return trip - Distance has been doubled
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">
                                    Requested: {new Date(ride.createdAt).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t">
                              <Button
                                onClick={() => approveRide(ride._id)}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-4 h-4" />
                                Approve Ride
                              </Button>
                              <Button
                                onClick={() => rejectRide(ride._id)}
                                variant="outline"
                                className="flex items-center gap-2 text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                                Reject Ride
                              </Button>
                              <Button
                                onClick={() => handleViewMap(ride)}
                                variant="outline"
                                className="flex items-center gap-2"
                              >
                                <Map className="w-4 h-4" />
                                View on Map
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <Card>
                <CardHeader>
                  <CardTitle>Approval History</CardTitle>
                  <CardDescription>
                    View all rides you have approved or rejected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {processedRides.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No processed rides found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ride ID</TableHead>
                          <TableHead>Trip Type</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Distance</TableHead>
                          <TableHead>Decision</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Mileage</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processedRides.map((ride) => (
                          <TableRow key={ride._id}>
                            <TableCell className="font-medium">#{ride._id.slice(-6)}</TableCell>
                            <TableCell>{getTripTypeBadge(ride.tripType)}</TableCell>
                            <TableCell>
                              {ride.user ? (
                                <div>
                                  <div className="font-medium">{ride.user.name}</div>
                                  <div className="text-sm text-gray-500">{ride.user.email}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">Unknown</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <div className="text-xs text-gray-600 truncate">From: {ride.startLocation.address}</div>
                                <div className="text-xs text-gray-600 truncate">To: {ride.endLocation.address}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {ride.distanceKm.toFixed(1)} km
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {ride.approval?.projectManager?.approved ? (
                                <Badge className="bg-green-100 text-green-800">Approved</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {ride.approval?.projectManager?.approvedAt && 
                                new Date(ride.approval.projectManager.approvedAt).toLocaleDateString()
                              }
                            </TableCell>
                            <TableCell>{getStatusBadge(ride.status)}</TableCell>
                            <TableCell>
                              {ride.startMileage && ride.endMileage ? (
                                <div className="text-xs space-y-1">
                                  <div className="flex items-center gap-1">
                                    <Gauge className="w-3 h-3 text-green-600" />
                                    <span>{ride.startMileage} km</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Gauge className="w-3 h-3 text-blue-600" />
                                    <span>{ride.endMileage} km</span>
                                  </div>
                                  <div className="font-medium text-purple-600">
                                    {ride.totalMileage?.toFixed(1)} km
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Not recorded</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewMap(ride)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Map Modal */}
        {selectedRide && (
          <MapModal
            isOpen={showMap}
            onClose={() => setShowMap(false)}
            startLocation={selectedRide.startLocation}
            endLocation={selectedRide.endLocation}
            rideId={selectedRide._id}
            distance={selectedRide.distanceKm}
          />
        )}
      </div>
    </DashboardLayout>
  );
}