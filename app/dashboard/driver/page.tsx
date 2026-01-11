'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Clock, Play, CheckCircle, User, Car, Activity, TrendingUp, Calendar, Route, ArrowLeftRight, ArrowRight, Gauge, Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { toast } from 'sonner';

interface Vehicle {
  _id: string;
  terminalId: string;
  vehicle: string;
  vehicleType: string;
  status: string;
  latitude: string;
  longitude: string;
  speed: number;
  lastMessage: string;
  expire: string;
  isAvailable: boolean;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Ride {
  _id: string;
  userId: string;
  driverId: string;
  vehicleId?: string;
  status: string;
  distanceKm: number;
  tripType: 'one-way' | 'return-trip';
  startLocation: { address: string };
  endLocation: { address: string };
  vehicle?: Vehicle;
  user?: User;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  startMileage?: number;
  endMileage?: number;
  totalMileage?: number;
}

interface DailyRide {
  _id: string;
  driverId: string;
  vehicleId: string;
  destination: string;
  startMileage: number;
  endMileage?: number;
  totalMileage?: number;
  status: 'in_progress' | 'completed';
  startedAt: string;
  completedAt?: string;
  vehicle?: Vehicle;
}

interface DriverStats {
  totalDistance: number;
  totalRides: number;
  todayDistance: number;
  todayRides: number;
  weekDistance: number;
  weekRides: number;
  monthDistance: number;
  monthRides: number;
  vehicleDistances: Array<{
    vehicleId: string;
    distance: number;
    rideCount: number;
    vehicle: Vehicle;
  }>;
}

export default function DriverDashboard() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [dailyRides, setDailyRides] = useState<DailyRide[]>([]);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingRide, setUpdatingRide] = useState<string | null>(null);
  
  // Mileage entry states
  const [showMileageDialog, setShowMileageDialog] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [mileageAction, setMileageAction] = useState<'start' | 'complete' | null>(null);
  const [startMileage, setStartMileage] = useState('');
  const [endMileage, setEndMileage] = useState('');

  // Daily ride states
  const [showDailyRideDialog, setShowDailyRideDialog] = useState(false);
  const [dailyRideForm, setDailyRideForm] = useState({
    vehicleId: '',
    destination: '',
    startMileage: ''
  });
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    fetchData();
    fetchDailyRides();
    fetchAvailableVehicles();
  }, []);

  const fetchData = async () => {
    try {
      const [ridesResponse, statsResponse] = await Promise.all([
        fetch('/api/rides/my-rides'),
        fetch('/api/drivers/stats')
      ]);

      if (ridesResponse.ok) {
        const ridesData = await ridesResponse.json();
        setRides(ridesData);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyRides = async () => {
    try {
      const response = await fetch('/api/rides/daily-rides');
      if (response.ok) {
        const data = await response.json();
        setDailyRides(data);
      }
    } catch (error) {
      console.error('Failed to fetch daily rides:', error);
    }
  };

  const fetchAvailableVehicles = async () => {
    try {
      const response = await fetch('/api/devices');
      if (response.ok) {
        const devices = await response.json();
        setAvailableVehicles(devices.filter((d: any) => d.isAvailable && d.status === 'online'));
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    }
  };

  const handleStartRide = (ride: Ride) => {
    setSelectedRide(ride);
    setMileageAction('start');
    setStartMileage('');
    setShowMileageDialog(true);
  };

  const handleCompleteRide = (ride: Ride) => {
    setSelectedRide(ride);
    setMileageAction('complete');
    setEndMileage('');
    setShowMileageDialog(true);
  };

  const submitMileageAndUpdateStatus = async () => {
    if (!selectedRide || !mileageAction) return;

    if (mileageAction === 'start' && !startMileage) {
      toast.error('Please enter starting mileage');
      return;
    }

    if (mileageAction === 'complete' && !endMileage) {
      toast.error('Please enter ending mileage');
      return;
    }

    const mileageValue = mileageAction === 'start' 
      ? parseFloat(startMileage) 
      : parseFloat(endMileage);

    if (isNaN(mileageValue) || mileageValue <= 0) {
      toast.error('Please enter a valid mileage reading');
      return;
    }

    // Validate end mileage is greater than start mileage
    if (mileageAction === 'complete' && selectedRide.startMileage) {
      if (mileageValue <= selectedRide.startMileage) {
        toast.error('End mileage must be greater than start mileage');
        return;
      }
    }

    setUpdatingRide(selectedRide._id);
    
    try {
      if (mileageAction === 'start') {
        // Start ride endpoint
        const response = await fetch(`/api/rides/${selectedRide._id}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startMileage: mileageValue }),
        });

        if (response.ok) {
          toast.success(`Ride started! Mileage: ${mileageValue} km`);
          setShowMileageDialog(false);
          setSelectedRide(null);
          setMileageAction(null);
          setStartMileage('');
          await fetchData();
        } else {
          const errorData = await response.json();
          toast.error(`Failed to start: ${errorData.error}`);
        }
      } else {
        // Complete ride endpoint
        const response = await fetch(`/api/rides/${selectedRide._id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endMileage: mileageValue }),
        });

        if (response.ok) {
          toast.success(`Ride completed! Final mileage: ${mileageValue} km`);
          setShowMileageDialog(false);
          setSelectedRide(null);
          setMileageAction(null);
          setEndMileage('');
          await fetchData();
        } else {
          const errorData = await response.json();
          toast.error(`Failed to complete: ${errorData.error}`);
        }
      }
    } catch (error) {
      console.error('Failed to update ride:', error);
      toast.error('Failed to update ride. Please try again.');
    } finally {
      setUpdatingRide(null);
    }
  };

  const handleStartDailyRide = async () => {
    if (!dailyRideForm.vehicleId || !dailyRideForm.destination || !dailyRideForm.startMileage) {
      toast.error('Please fill all fields');
      return;
    }

    const mileageValue = parseFloat(dailyRideForm.startMileage);
    if (isNaN(mileageValue) || mileageValue <= 0) {
      toast.error('Please enter a valid start mileage');
      return;
    }

    try {
      const response = await fetch('/api/rides/daily-rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: dailyRideForm.vehicleId,
          destination: dailyRideForm.destination,
          startMileage: mileageValue
        }),
      });

      if (response.ok) {
        toast.success('Daily ride started successfully!');
        setShowDailyRideDialog(false);
        setDailyRideForm({ vehicleId: '', destination: '', startMileage: '' });
        fetchDailyRides();
        fetchAvailableVehicles();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to start daily ride');
      }
    } catch (error) {
      console.error('Start daily ride error:', error);
      toast.error('Failed to start daily ride');
    }
  };

  const handleCompleteDailyRide = async (dailyRide: DailyRide) => {
    const endMileageInput = prompt(`Enter end mileage (km):\n\nStart mileage: ${dailyRide.startMileage} km`);
    if (!endMileageInput) return;

    const endMileageValue = parseFloat(endMileageInput);
    if (isNaN(endMileageValue) || endMileageValue <= 0) {
      toast.error('Please enter a valid end mileage');
      return;
    }

    if (endMileageValue <= dailyRide.startMileage) {
      toast.error('End mileage must be greater than start mileage');
      return;
    }

    try {
      const response = await fetch('/api/rides/daily-rides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyRideId: dailyRide._id, endMileage: endMileageValue }),
      });

      if (response.ok) {
        const tripMileage = endMileageValue - dailyRide.startMileage;
        toast.success(`Daily ride completed! Trip mileage: ${tripMileage.toFixed(1)} km`);
        fetchDailyRides();
        fetchAvailableVehicles();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to complete daily ride');
      }
    } catch (error) {
      console.error('Complete daily ride error:', error);
      toast.error('Failed to complete daily ride');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      approved: 'bg-green-100 text-green-800',
      assigned: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getVehicleStatusBadge = (status: string) => {
    const statusColors = {
      online: 'bg-green-100 text-green-800',
      offline: 'bg-red-100 text-red-800',
      idle: 'bg-yellow-100 text-yellow-800',
    };
    
    return (
      <Badge variant="outline" className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const canStartRide = (status: string) => status === 'assigned';
  const canCompleteRide = (status: string) => status === 'in_progress';

  const activeRides = rides.filter(ride => ['approved', 'assigned', 'in_progress'].includes(ride.status));
  const completedRides = rides.filter(ride => ride.status === 'completed');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Driver Dashboard</h1>
          <div className="flex gap-3">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Activity className="w-4 h-4 mr-2" />
              {activeRides.length} Active
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <CheckCircle className="w-4 h-4 mr-2" />
              {completedRides.length} Completed
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading...</div>
          </div>
        ) : (
          <Tabs defaultValue="rides" className="space-y-6">
            <TabsList>
              <TabsTrigger value="rides">My Assigned Rides</TabsTrigger>
              <TabsTrigger value="daily-rides">My Daily Rides</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>

            {/* ASSIGNED RIDES TAB */}
            <TabsContent value="rides" className="space-y-6">
              {rides.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No rides assigned</h3>
                    <p className="text-gray-500">You don't have any rides assigned at the moment.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {rides.map((ride) => (
                    <Card key={ride._id} className={`border-l-4 ${
                      ride.status === 'approved' || ride.status === 'assigned' ? 'border-l-green-500' :
                      ride.status === 'in_progress' ? 'border-l-blue-500' :
                      'border-l-gray-500'
                    }`}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                              Ride #{ride._id.slice(-6)}
                              <Badge className={`${
                                ride.tripType === 'return-trip' 
                                  ? 'bg-purple-100 text-purple-800 border-purple-300' 
                                  : 'bg-blue-100 text-blue-800 border-blue-300'
                              } border`}>
                                {ride.tripType === 'return-trip' ? (
                                  <><ArrowLeftRight className="w-3 h-3 mr-1" /> Return Trip</>
                                ) : (
                                  <><ArrowRight className="w-3 h-3 mr-1" /> One-Way</>
                                )}
                              </Badge>
                            </CardTitle>
                            <CardDescription>
                              Requested on {new Date(ride.createdAt).toLocaleDateString()}
                              {ride.user && (
                                <span className="ml-2">• Customer: {ride.user.name}</span>
                              )}
                            </CardDescription>
                          </div>
                          {getStatusBadge(ride.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Vehicle Information */}
                          {ride.vehicle && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <Car className="w-4 h-4" />
                                Assigned Vehicle
                              </h4>
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Vehicle:</span>
                                    <span className="font-medium">{ride.vehicle.vehicle}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Type:</span>
                                    <span className="font-medium">{ride.vehicle.vehicleType}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Terminal ID:</span>
                                    <span className="font-medium">{ride.vehicle.terminalId}</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Status:</span>
                                    {getVehicleStatusBadge(ride.vehicle.status)}
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Speed:</span>
                                    <span className="font-medium">{ride.vehicle.speed} km/h</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Last Update:</span>
                                    <span className="text-sm">{ride.vehicle.lastMessage}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Route Information */}
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
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">
                                  Distance: {ride.distanceKm.toFixed(1)} km
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">
                                  Customer: {ride.user?.name || `ID: ${ride.userId.slice(-6)}`}
                                </span>
                              </div>
                              {ride.startedAt && (
                                <div className="flex items-center gap-2">
                                  <Play className="w-4 h-4 text-blue-500" />
                                  <span className="text-sm text-gray-600">
                                    Started: {new Date(ride.startedAt).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {ride.completedAt && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span className="text-sm text-gray-600">
                                    Completed: {new Date(ride.completedAt).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Mileage Information */}
                          {(ride.startMileage || ride.endMileage) && (
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                              <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                                <Gauge className="w-4 h-4" />
                                Vehicle Mileage
                              </h4>
                              <div className="grid grid-cols-3 gap-3">
                                {ride.startMileage && (
                                  <div className="text-center p-3 bg-white rounded-lg">
                                    <p className="text-xs text-gray-600 mb-1">Start Reading</p>
                                    <p className="text-lg font-bold text-green-600">{ride.startMileage} km</p>
                                  </div>
                                )}
                                {ride.endMileage && (
                                  <div className="text-center p-3 bg-white rounded-lg">
                                    <p className="text-xs text-gray-600 mb-1">End Reading</p>
                                    <p className="text-lg font-bold text-blue-600">{ride.endMileage} km</p>
                                  </div>
                                )}
                                {ride.startMileage && ride.endMileage && (
                                  <div className="text-center p-3 bg-white rounded-lg">
                                    <p className="text-xs text-gray-600 mb-1">Trip Mileage</p>
                                    <p className="text-lg font-bold text-purple-600">
                                      {(ride.endMileage - ride.startMileage).toFixed(1)} km
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-3 pt-4 border-t">
                            {canStartRide(ride.status) && (
                              <Button
                                onClick={() => handleStartRide(ride)}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                                disabled={updatingRide === ride._id}
                              >
                                <Play className="w-4 h-4" />
                                {updatingRide === ride._id ? 'Starting...' : 'Start Ride'}
                              </Button>
                            )}
                            {canCompleteRide(ride.status) && (
                              <Button
                                onClick={() => handleCompleteRide(ride)}
                                variant="outline"
                                className="flex items-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                                disabled={updatingRide === ride._id}
                              >
                                <CheckCircle className="w-4 h-4" />
                                {updatingRide === ride._id ? 'Completing...' : 'Complete Ride'}
                              </Button>
                            )}
                            {ride.status === 'completed' && (
                              <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                                <CheckCircle className="w-4 h-4" />
                                Completed
                              </Badge>
                            )}
                            {ride.status === 'in_progress' && (
                              <Badge className="bg-blue-100 text-blue-800 flex items-center gap-2 px-4 py-2">
                                <Activity className="w-4 h-4" />
                                In Progress
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* DAILY RIDES TAB */}
            <TabsContent value="daily-rides" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Staff Transport - Daily Rides</CardTitle>
                      <CardDescription>Create and manage your daily staff transport rides</CardDescription>
                    </div>
                    <Button onClick={() => setShowDailyRideDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Start New Daily Ride
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {dailyRides.length === 0 ? (
                    <div className="text-center py-12">
                      <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No daily rides today</h3>
                      <p className="text-gray-500 mb-4">Start a new daily ride for staff transport</p>
                      <Button onClick={() => setShowDailyRideDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Daily Ride
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dailyRides.map((ride) => (
                        <Card key={ride._id} className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-semibold text-lg flex items-center gap-2">
                                  <MapPin className="w-5 h-5 text-blue-600" />
                                  {ride.destination}
                                </h4>
                                <p className="text-sm text-gray-500">Started at {new Date(ride.startedAt).toLocaleTimeString()}</p>
                              </div>
                              <Badge className={ride.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                                {ride.status === 'completed' ? 'Completed' : 'In Progress'}
                              </Badge>
                            </div>
                            
                            {ride.vehicle && (
                              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Car className="w-4 h-4 text-gray-600" />
                                  <span className="font-medium">Vehicle Information</span>
                                </div>
                                <p className="text-sm"><strong>Vehicle:</strong> {ride.vehicle.vehicle}</p>
                                <p className="text-sm"><strong>Type:</strong> {ride.vehicle.vehicleType}</p>
                                <p className="text-sm"><strong>Terminal ID:</strong> {ride.vehicle.terminalId}</p>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-3 gap-3 mb-4">
                              <div className="text-center p-3 bg-green-50 rounded-lg">
                                <p className="text-xs text-gray-600">Start Mileage</p>
                                <p className="text-lg font-bold text-green-600">{ride.startMileage} km</p>
                              </div>
                              {ride.endMileage && (
                                <>
                                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-gray-600">End Mileage</p>
                                    <p className="text-lg font-bold text-blue-600">{ride.endMileage} km</p>
                                  </div>
                                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <p className="text-xs text-gray-600">Trip Mileage</p>
                                    <p className="text-lg font-bold text-purple-600">{ride.totalMileage} km</p>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            {ride.status === 'in_progress' && (
                              <Button onClick={() => handleCompleteDailyRide(ride)} className="w-full">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Complete Daily Ride
                              </Button>
                            )}

                            {ride.status === 'completed' && ride.completedAt && (
                              <div className="text-sm text-gray-600 text-center">
                                Completed at {new Date(ride.completedAt).toLocaleString()}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* STATISTICS TAB */}
            <TabsContent value="statistics" className="space-y-6">
              {stats && (
                <>
                  {/* Summary Statistics */}
                  <div className="grid md:grid-cols-4 gap-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Total Distance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {stats.totalDistance.toFixed(1)} km
                        </div>
                        <p className="text-sm text-gray-500">{stats.totalRides} rides completed</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Today
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {stats.todayDistance.toFixed(1)} km
                        </div>
                        <p className="text-sm text-gray-500">{stats.todayRides} rides</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          This Week
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                          {stats.weekDistance.toFixed(1)} km
                        </div>
                        <p className="text-sm text-gray-500">{stats.weekRides} rides</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          This Month
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                          {stats.monthDistance.toFixed(1)} km
                        </div>
                        <p className="text-sm text-gray-500">{stats.monthRides} rides</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Vehicle-wise Distance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Route className="w-5 h-5" />
                        Distance by Vehicle
                      </CardTitle>
                      <CardDescription>
                        Breakdown of distance traveled with each assigned vehicle
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {stats.vehicleDistances.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No vehicle data available</p>
                      ) : (
                        <div className="space-y-4">
                          {stats.vehicleDistances.map((vehicleData) => (
                            <div key={vehicleData.vehicleId} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <Car className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{vehicleData.vehicle?.vehicle || 'Unknown Vehicle'}</h4>
                                  <p className="text-sm text-gray-600">
                                    {vehicleData.vehicle?.vehicleType} • Terminal: {vehicleData.vehicleId}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-blue-600">
                                  {vehicleData.distance.toFixed(1)} km
                                </div>
                                <p className="text-sm text-gray-500">
                                  {vehicleData.rideCount} rides
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Mileage Entry Dialog */}
        <Dialog open={showMileageDialog} onOpenChange={setShowMileageDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-blue-600" />
                {mileageAction === 'start' ? 'Enter Starting Mileage' : 'Enter Ending Mileage'}
              </DialogTitle>
              <DialogDescription>
                {mileageAction === 'start' 
                  ? 'Record the vehicle odometer reading before starting the trip'
                  : 'Record the vehicle odometer reading after completing the trip'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {selectedRide && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Ride Details</p>
                  <p className="text-xs text-blue-700">
                    Trip: {selectedRide.tripType === 'return-trip' ? 'Return Trip' : 'One-Way'} • 
                    Distance: {selectedRide.distanceKm.toFixed(1)} km
                  </p>
                  {selectedRide.startMileage && (
                    <p className="text-xs text-blue-700 mt-1">
                      Starting Mileage: {selectedRide.startMileage} km
                    </p>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="mileage">
                  {mileageAction === 'start' ? 'Starting Odometer Reading (km)' : 'Ending Odometer Reading (km)'}
                </Label>
                <Input
                  id="mileage"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 15234.5"
                  value={mileageAction === 'start' ? startMileage : endMileage}
                  onChange={(e) => mileageAction === 'start' 
                    ? setStartMileage(e.target.value) 
                    : setEndMileage(e.target.value)
                  }
                  className="text-lg"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={submitMileageAndUpdateStatus}
                  className="flex-1"
                  disabled={
                    updatingRide !== null || 
                    (mileageAction === 'start' && !startMileage) || 
                    (mileageAction === 'complete' && !endMileage)
                  }
                >
                  {updatingRide ? (
                    <>Processing...</>
                  ) : (
                    <>
                      {mileageAction === 'start' ? 'Start Ride' : 'Complete Ride'}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMileageDialog(false);
                    setSelectedRide(null);
                    setMileageAction(null);
                    setStartMileage('');
                    setEndMileage('');
                  }}
                  disabled={updatingRide !== null}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Daily Ride Dialog */}
        <Dialog open={showDailyRideDialog} onOpenChange={setShowDailyRideDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                Start New Daily Ride
              </DialogTitle>
              <DialogDescription>Select vehicle, destination and enter starting mileage</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="vehicle">Select Vehicle</Label>
                <Select 
                  value={dailyRideForm.vehicleId} 
                  onValueChange={(value) => setDailyRideForm({ ...dailyRideForm, vehicleId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVehicles.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">No available vehicles</div>
                    ) : (
                      availableVehicles.map((vehicle) => (
                        <SelectItem key={vehicle.terminalId} value={vehicle.terminalId}>
                          {vehicle.vehicle} - {vehicle.vehicleType}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="destination">Destination</Label>
                <Select 
                  value={dailyRideForm.destination} 
                  onValueChange={(value) => setDailyRideForm({ ...dailyRideForm, destination: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose destination" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Site-Gampaha">Site - Gampaha</SelectItem>
                    <SelectItem value="Site-Kadana">Site - Kadana</SelectItem>
                    <SelectItem value="Site-Colombo">Site - Colombo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="startMileage">Start Mileage (km)</Label>
                <Input
                  id="startMileage"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 15234.5"
                  value={dailyRideForm.startMileage}
                  onChange={(e) => setDailyRideForm({ ...dailyRideForm, startMileage: e.target.value })}
                />
              </div>
              
              <Button 
                onClick={handleStartDailyRide} 
                className="w-full"
                disabled={!dailyRideForm.vehicleId || !dailyRideForm.destination || !dailyRideForm.startMileage}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Daily Ride
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}