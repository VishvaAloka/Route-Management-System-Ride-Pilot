'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Clock, Check, X, Plus, Users, Car, UserCheck, History, Navigation, Activity, Eye, RefreshCw, MapPinIcon, ArrowLeftRight, ArrowRight, Gauge, BarChart3, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LiveLocationModal } from '@/components/LiveTrackingMap';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  isAvailable?: boolean;
}

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

interface VehicleWithMileage extends Vehicle {
  monthlyMileage: number;
}

interface Ride {
  _id: string;
  userId: string;
  driverId?: string;
  vehicleId?: string;
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
  driver?: User;
  vehicle?: Vehicle;
  approval?: {
    projectManager?: {
      approved: boolean;
      approvedAt: string;
      approvedBy?: string;
    };
    admin?: {
      approved: boolean;
      approvedAt: string;
      approvedBy?: string;
    };
  };
  assignedAt?: string;
  startedAt?: string;
  startMileage?: number;
  endMileage?: number;
  totalMileage?: number;
  createdAt: string;
}

interface Device {
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

interface LiveRide extends Ride {
  currentLocation: {
    lat: number;
    lng: number;
  };
}

interface MileageHistory {
  _id: string;
  vehicleId: string;
  month: number;
  year: number;
  totalMileage: number;
  rides: Array<{
    rideId?: string;
    dailyRideId?: string;
    type: 'user-ride' | 'daily-ride';
    mileage: number;
    date: string;
  }>;
}

export default function AdminDashboard() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [liveRides, setLiveRides] = useState<LiveRide[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [vehicleMileages, setVehicleMileages] = useState<VehicleWithMileage[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveLoading, setLiveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('rides');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [selectedLiveRide, setSelectedLiveRide] = useState<LiveRide | null>(null);
  const [showLiveLocation, setShowLiveLocation] = useState(false);
  const [assignmentData, setAssignmentData] = useState<{[key: string]: {driverId: string, vehicleId: string}}>({});
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'driver'
  });
  
  // Mileage history modal
  const [showMileageHistory, setShowMileageHistory] = useState(false);
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState<MileageHistory[]>([]);
  const [selectedVehicleName, setSelectedVehicleName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'tracking') {
      fetchLiveRides();
      const interval = setInterval(fetchLiveRides, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const [ridesRes, usersRes, devicesRes] = await Promise.all([
        fetch('/api/rides'),
        fetch('/api/users'),
        fetch('/api/devices')
      ]);

      if (ridesRes.ok) {
        const ridesData = await ridesRes.json();
        setRides(ridesData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
        setDrivers(usersData.filter((user: User) => user.role === 'driver'));
      }

      if (devicesRes.ok) {
        const devicesData = await devicesRes.json();
        setDevices(devicesData);
        // Fetch mileage for each vehicle
        await fetchVehicleMileages(devicesData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

    // Vehicle management states
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    terminalId: '',
    vehicle: '',
    vehicleType: ''
  });

  const fetchVehicleMileages = async (devicesData: Device[]) => {
    try {
      const mileagePromises = devicesData.map(async (device) => {
        try {
          const response = await fetch(`/api/vehicles/mileage?vehicleId=${device.terminalId}`);
          if (response.ok) {
            const data = await response.json();
            return {
              ...device,
              monthlyMileage: data.totalMileage || 0
            };
          }
        } catch (err) {
          console.error(`Failed to fetch mileage for ${device.terminalId}:`, err);
        }
        return {
          ...device,
          monthlyMileage: 0
        };
      });
      
      const mileagesData = await Promise.all(mileagePromises);
      setVehicleMileages(mileagesData);
    } catch (error) {
      console.error('Failed to fetch mileages:', error);
    }
  };

  const fetchLiveRides = async () => {
    setLiveLoading(true);
    try {
      const response = await fetch('/api/rides/live');
      if (response.ok) {
        const liveRidesData = await response.json();
        setLiveRides(liveRidesData);
      }
    } catch (error) {
      console.error('Failed to fetch live rides:', error);
    } finally {
      setLiveLoading(false);
    }
  };

  const fetchMileageHistory = async (vehicleId: string, vehicleName: string) => {
    try {
      const response = await fetch(`/api/vehicles/mileage-history?vehicleId=${vehicleId}&limit=12`);
      if (response.ok) {
        const history = await response.json();
        setSelectedVehicleHistory(history);
        setSelectedVehicleName(vehicleName);
        setShowMileageHistory(true);
      }
    } catch (error) {
      console.error('Failed to fetch mileage history:', error);
      alert('Failed to load mileage history');
    }
  };

  const handleViewLiveLocation = (ride: LiveRide) => {
    setSelectedLiveRide(ride);
    setShowLiveLocation(true);
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
        alert('✅ Ride approved! User has been notified via email.');
        fetchData();
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
        alert('❌ Ride rejected! User has been notified via email.');
        fetchData();
      } else {
        const error = await response.json();
        alert('Failed to reject ride: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to reject ride:', error);
      alert('Error rejecting ride');
    }
  };

  const assignDriverAndVehicle = async (rideId: string) => {
    const assignment = assignmentData[rideId];
    if (!assignment?.driverId || !assignment?.vehicleId) {
      alert('Please select both driver and vehicle');
      return;
    }

    try {
      const response = await fetch(`/api/rides/${rideId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          driverId: assignment.driverId, 
          vehicleId: assignment.vehicleId 
        }),
      });

      if (response.ok) {
        alert('✅ Driver and vehicle assigned! Notifications sent to user and PM.');
        setAssignmentData(prev => {
          const newData = { ...prev };
          delete newData[rideId];
          return newData;
        });
        fetchData();
      } else {
        const error = await response.json();
        alert('Failed to assign: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to assign driver and vehicle:', error);
      alert('Error assigning driver and vehicle');
    }
  };

  const updateAssignment = (rideId: string, field: 'driverId' | 'vehicleId', value: string) => {
    setAssignmentData(prev => ({
      ...prev,
      [rideId]: {
        ...prev[rideId],
        [field]: value
      }
    }));
  };

  const createUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setIsCreateUserOpen(false);
        setNewUser({ name: '', email: '', password: '', role: 'driver' });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

    const addVehicle = async () => {
    if (!newVehicle.terminalId || !newVehicle.vehicle || !newVehicle.vehicleType) {
      alert('Please fill all fields');
      return;
    }

    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVehicle),
      });

      if (response.ok) {
        alert('✅ Vehicle added successfully!');
        setShowAddVehicle(false);
        setNewVehicle({ terminalId: '', vehicle: '', vehicleType: '' });
        fetchData();
      } else {
        const error = await response.json();
        alert('Failed to add vehicle: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to add vehicle:', error);
      alert('Error adding vehicle');
    }
  };

  const deleteVehicle = async (vehicleId: string, vehicleName: string) => {
    if (!confirm(`Are you sure you want to delete vehicle "${vehicleName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vehicles?id=${vehicleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Vehicle deleted successfully!');
        fetchData();
      } else {
        const error = await response.json();
        alert('Failed to delete vehicle: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
      alert('Error deleting vehicle');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      awaiting_pm: 'bg-blue-100 text-blue-800',
      awaiting_admin: 'bg-orange-100 text-orange-800',
      approved: 'bg-green-100 text-green-800',
      assigned: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
      rejected: 'bg-red-100 text-red-800',
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

  const getTripTypeBadge = (tripType: 'one-way' | 'return-trip') => {
    return (
      <Badge className={`${
        tripType === 'return-trip' 
          ? 'bg-purple-100 text-purple-800 border-purple-300' 
          : 'bg-blue-100 text-blue-800 border-blue-300'
      } border`}>
        {tripType === 'return-trip' ? (
          <><ArrowLeftRight className="w-3 h-3 mr-1" /> Return</>
        ) : (
          <><ArrowRight className="w-3 h-3 mr-1" /> One-Way</>
        )}
      </Badge>
    );
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || 'Unknown';
  };

  // ✅ UPDATED: Show <25km rides awaiting admin approval
  const pendingRides = rides.filter(ride => ride.status === 'awaiting_admin');
  const approvedRides = rides.filter(ride => ride.status === 'approved');
  const completedRides = rides.filter(ride => ['completed', 'rejected'].includes(ride.status));
  const availableDevices = devices.filter(device => device.isAvailable && device.status === 'online');

  const availableDrivers = drivers.filter(driver => driver.isAvailable !== false);
  
  // Calculate total monthly mileage
  const totalMonthlyMileage = vehicleMileages.reduce((sum, v) => sum + v.monthlyMileage, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-3">
            {activeTab === 'tracking' && (
              <Button 
                onClick={fetchLiveRides} 
                variant="outline" 
                size="sm"
                disabled={liveLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${liveLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Create a new driver or project manager account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createUser} className="w-full">
                    Create User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-7 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingRides.length}</div>
              <p className="text-xs text-gray-500">&gt;25km rides</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Live Rides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{liveRides.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{drivers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Available Vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{availableDevices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Rides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rides.filter(ride => ['approved', 'assigned', 'in_progress'].includes(ride.status)).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Completed Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {rides.filter(ride => 
                  ride.status === 'completed' && 
                  new Date(ride.createdAt).toDateString() === new Date().toDateString()
                ).length}
              </div>
            </CardContent>
          </Card>
          {/* ✅ NEW: Monthly Mileage Card */}
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Monthly Mileage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {totalMonthlyMileage.toFixed(1)} km
              </div>
              <p className="text-xs text-purple-600">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('rides')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rides'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Ride Management
            </button>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tracking'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Navigation className="w-4 h-4 mr-1 inline" />
              Live Tracking ({liveRides.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4 mr-1 inline" />
              User Management
            </button>
            {/* ✅ NEW: Vehicle Management Tab */}
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'vehicles'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Car className="w-4 h-4 mr-1 inline" />
              Vehicle Management
            </button>
            {/* ✅ NEW: Vehicle Mileage Tab */}
            <button
              onClick={() => setActiveTab('mileage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mileage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Gauge className="w-4 h-4 mr-1 inline" />
              Vehicle Mileage
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
              History
            </button>
          </div>
        </div>

        {/* Live Tracking Tab */}
        {activeTab === 'tracking' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Live Vehicle Tracking
                  {liveLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
                </CardTitle>
                <CardDescription>
                  Real-time tracking of {liveRides.length} ongoing rides with live location monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                {liveRides.length === 0 ? (
                  <div className="text-center py-12">
                    <Navigation className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No active rides</h3>
                    <p className="text-gray-500">No rides are currently in progress</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ride ID</TableHead>
                        <TableHead>Trip Type</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Distance</TableHead>
                        <TableHead>Speed</TableHead>
                        <TableHead>Mileage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {liveRides.map((ride) => (
                        <TableRow key={ride._id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full animate-pulse" 
                                style={{ 
                                  backgroundColor: ride.vehicle?.status === 'online' ? '#10b981' : '#ef4444' 
                                }}
                              ></div>
                              #{ride._id.slice(-6)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getTripTypeBadge(ride.tripType)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-blue-600" />
                              {ride.driver?.name || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Car className="w-4 h-4 text-purple-600" />
                                {ride.vehicle?.vehicle || 'Unknown'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {ride.vehicle?.vehicleType} • {ride.vehicle?.terminalId}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-green-600" />
                              {ride.user?.name || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs space-y-1">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-green-600" />
                                <span className="text-xs truncate">{ride.startLocation.address}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-red-600" />
                                <span className="text-xs truncate">{ride.endLocation.address}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {ride.distanceKm.toFixed(1)} km
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ 
                                  backgroundColor: (ride.vehicle?.speed || 0) > 0 ? '#10b981' : '#ef4444' 
                                }}
                              ></div>
                              <span className="font-medium">{ride.vehicle?.speed || 0} km/h</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {ride.startMileage ? (
                              <div className="text-xs space-y-1">
                                <div className="flex items-center gap-1">
                                  <Gauge className="w-3 h-3 text-green-600" />
                                  <span>Start: {ride.startMileage} km</span>
                                </div>
                                {ride.endMileage && (
                                  <div className="flex items-center gap-1">
                                    <Gauge className="w-3 h-3 text-blue-600" />
                                    <span>End: {ride.endMileage} km</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Not recorded</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getStatusBadge(ride.status)}
                              {getVehicleStatusBadge(ride.vehicle?.status || 'offline')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewLiveLocation(ride)}
                              className="flex items-center gap-2"
                            >
                              <MapPinIcon className="w-3 h-3" />
                              Live
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* ✅ NEW: Monthly Vehicle Mileage Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-purple-600" />
                  Monthly Vehicle Mileage
                </CardTitle>
                <CardDescription>
                  Current month mileage for each vehicle - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Terminal ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Availability</TableHead>
                      <TableHead>Monthly Mileage</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicleMileages.map((vehicle) => (
                      <TableRow key={vehicle._id}>
                        <TableCell className="font-medium">{vehicle.vehicle}</TableCell>
                        <TableCell>{vehicle.vehicleType}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{vehicle.terminalId}</Badge>
                        </TableCell>
                        <TableCell>{getVehicleStatusBadge(vehicle.status)}</TableCell>
                        <TableCell>
                          {vehicle.isAvailable ? (
                            <Badge className="bg-green-100 text-green-800">Available</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">In Use</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-purple-600" />
                            <span className="font-bold text-purple-600">{vehicle.monthlyMileage.toFixed(1)} km</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchMileageHistory(vehicle.terminalId, vehicle.vehicle)}
                            className="flex items-center gap-1"
                          >
                            <BarChart3 className="w-3 h-3" />
                            History
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ride Management Tab */}
        {activeTab === 'rides' && (
          <div className="space-y-6">
            {/* ✅ UPDATED: Only >25km rides pending approval */}
            <Card>
              <CardHeader>
                <CardTitle>Rides Awaiting Admin Approval</CardTitle>
                <CardDescription>
                  {pendingRides.length} short-distance rides (&lt;25km) need your approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRides.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No rides pending approval (only &lt;25km rides appear here)</p>
                ) : (
                  <div className="space-y-4">
                    {pendingRides.map((ride) => (
                      <div key={ride._id} className="border rounded-lg p-4 border-l-4 border-l-orange-500">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="font-medium">Ride #{ride._id.slice(-6)}</h4>
                            {getTripTypeBadge(ride.tripType)}
                            <Badge className="bg-orange-100 text-orange-800">
                              Long Distance: {ride.distanceKm.toFixed(1)} km
                            </Badge>
                            <p className="text-sm text-gray-600">
                              {new Date(ride.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {getStatusBadge(ride.status)}
                        </div>
                        {ride.approval?.projectManager?.approved && (
                          <div className="mb-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                            ✓ PM Approved on {new Date(ride.approval.projectManager.approvedAt).toLocaleDateString()}
                          </div>
                        )}
                        <div className="grid md:grid-cols-2 gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <span className="text-sm">{ride.startLocation.address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-600" />
                            <span className="text-sm">{ride.endLocation.address}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveRide(ride._id)}>
                            <Check className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectRide(ride._id)}>
                            <X className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Driver and Vehicle Assignment */}
             <Card>
              <CardHeader>
                <CardTitle>Approved Rides - Driver & Vehicle Assignment</CardTitle>
                <CardDescription>
                  {approvedRides.length} approved rides need driver and vehicle assignment (includes PM-approved ≥25km rides and Admin-approved &lt;25km rides)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {approvedRides.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No approved rides awaiting assignment</p>
                ) : (
                  <div className="space-y-4">
                    {approvedRides.map((ride) => (
                      <div key={ride._id} className="border rounded-lg p-4 border-l-4 border-l-green-500">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="font-medium">Ride #{ride._id.slice(-6)}</h4>
                            {getTripTypeBadge(ride.tripType)}
                            <Badge className={ride.distanceKm <= 25 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                              {ride.distanceKm.toFixed(1)} km {ride.distanceKm <= 25 ? '(Short)' : '(Long)'}
                            </Badge>
                            <p className="text-sm text-gray-600">
                              {new Date(ride.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {getStatusBadge(ride.status)}
                        </div>
                        <div className="grid md:grid-cols-2 gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <span className="text-sm">{ride.startLocation.address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-600" />
                            <span className="text-sm">{ride.endLocation.address}</span>
                          </div>
                        </div>
                        <div className="flex gap-3 items-center flex-wrap">
                          <Select onValueChange={(driverId) => updateAssignment(ride._id, 'driverId', driverId)}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select driver" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDrivers.map((driver) => (
                                <SelectItem key={driver._id} value={driver._id}>
                                  <div className="flex items-center gap-2">
                                    <UserCheck className="w-4 h-4" />
                                    {driver.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select onValueChange={(vehicleId) => updateAssignment(ride._id, 'vehicleId', vehicleId)}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select vehicle" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDevices.map((device) => (
                                <SelectItem key={device._id} value={device.terminalId}>
                                  <div className="flex items-center gap-2">
                                    <Car className="w-4 h-4" />
                                    {device.vehicle} ({device.vehicleType})
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Button 
                            size="sm" 
                            onClick={() => assignDriverAndVehicle(ride._id)}
                            disabled={!assignmentData[ride._id]?.driverId || !assignmentData[ride._id]?.vehicleId}
                          >
                            Assign
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage drivers and project managers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.filter(user => user.role !== 'user').map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <Card>
            <CardHeader>
              <CardTitle>Ride History</CardTitle>
              <CardDescription>
                View completed and rejected rides with full details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ride ID</TableHead>
                    <TableHead>Trip Type</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Mileage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedRides.map((ride) => {
                    const driver = drivers.find(d => d._id === ride.driverId);
                    
                    return (
                      <TableRow key={ride._id}>
                        <TableCell className="font-medium">#{ride._id.slice(-6)}</TableCell>
                        <TableCell>{getTripTypeBadge(ride.tripType)}</TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="text-xs text-gray-600 truncate">From: {ride.startLocation.address}</div>
                            <div className="text-xs text-gray-600 truncate">To: {ride.endLocation.address}</div>
                          </div>
                        </TableCell>
                        <TableCell>{ride.distanceKm.toFixed(1)} km</TableCell>
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
                                Total: {ride.totalMileage?.toFixed(1)} km
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Not recorded</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(ride.status)}</TableCell>
                        <TableCell>
                          {driver ? (
                            <div className="text-xs">
                              <div className="font-medium">{driver.name}</div>
                              <div className="text-gray-500">{driver.email}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(ride.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ✅ NEW: Mileage History Modal */}
        <Dialog open={showMileageHistory} onOpenChange={setShowMileageHistory}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Mileage History - {selectedVehicleName}
              </DialogTitle>
              <DialogDescription>
                Past 12 months mileage records for this vehicle
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {selectedVehicleHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No mileage history available</p>
              ) : (
                <div className="grid gap-4">
                  {selectedVehicleHistory.map((record) => (
                    <Card key={record._id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base">
                            {getMonthName(record.month)} {record.year}
                          </CardTitle>
                          <Badge className="bg-purple-100 text-purple-800 text-lg px-4 py-1">
                            {record.totalMileage.toFixed(1)} km
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-gray-600">
                          <p><strong>Total Rides:</strong> {record.rides.length}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs font-medium">User Rides:</p>
                              <p className="text-sm">{record.rides.filter(r => r.type === 'user-ride').length} rides</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium">Daily Rides:</p>
                              <p className="text-sm">{record.rides.filter(r => r.type === 'daily-ride').length} rides</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>





        {/* ✅ NEW: Vehicle Management Tab */}
        {activeTab === 'vehicles' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Vehicle Management</CardTitle>
                  <CardDescription>
                    Add, view, and manage vehicles
                  </CardDescription>
                </div>
                <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Vehicle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Vehicle</DialogTitle>
                      <DialogDescription>
                        Enter vehicle details to add to the fleet
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="terminalId">Terminal ID</Label>
                        <Input
                          id="terminalId"
                          placeholder="e.g., TERM001"
                          value={newVehicle.terminalId}
                          onChange={(e) => setNewVehicle({ ...newVehicle, terminalId: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="vehicle">Vehicle Name</Label>
                        <Input
                          id="vehicle"
                          placeholder="e.g., Toyota Hiace"
                          value={newVehicle.vehicle}
                          onChange={(e) => setNewVehicle({ ...newVehicle, vehicle: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="vehicleType">Vehicle Type</Label>
                        <Select 
                          value={newVehicle.vehicleType} 
                          onValueChange={(value) => setNewVehicle({ ...newVehicle, vehicleType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Van">Van</SelectItem>
                            <SelectItem value="Car">Car</SelectItem>
                            <SelectItem value="Truck">Truck</SelectItem>
                            <SelectItem value="Bus">Bus</SelectItem>
                            <SelectItem value="SUV">SUV</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={addVehicle} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Vehicle
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Terminal ID</TableHead>
                    <TableHead>Vehicle Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Speed</TableHead>
                    <TableHead>Last Update</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device._id}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{device.terminalId}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{device.vehicle}</TableCell>
                      <TableCell>{device.vehicleType}</TableCell>
                      <TableCell>{getVehicleStatusBadge(device.status)}</TableCell>
                      <TableCell>
                        {device.isAvailable ? (
                          <Badge className="bg-green-100 text-green-800">Available</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">In Use</Badge>
                        )}
                      </TableCell>
                      <TableCell>{device.speed} km/h</TableCell>
                      <TableCell className="text-xs text-gray-500">{device.lastMessage}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteVehicle(device._id, device.vehicle)}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ✅ NEW: Vehicle Mileage Tab */}
        {activeTab === 'mileage' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-purple-600" />
                Vehicle Mileage Tracking
              </CardTitle>
              <CardDescription>
                Current month mileage for each vehicle - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Terminal ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Current Month Mileage</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleMileages.map((vehicle) => (
                    <TableRow key={vehicle._id}>
                      <TableCell className="font-medium">{vehicle.vehicle}</TableCell>
                      <TableCell>{vehicle.vehicleType}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{vehicle.terminalId}</Badge>
                      </TableCell>
                      <TableCell>{getVehicleStatusBadge(vehicle.status)}</TableCell>
                      <TableCell>
                        {vehicle.isAvailable ? (
                          <Badge className="bg-green-100 text-green-800">Available</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">In Use</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-purple-600" />
                          <span className="font-bold text-purple-600 text-lg">{vehicle.monthlyMileage.toFixed(1)} km</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchMileageHistory(vehicle.terminalId, vehicle.vehicle)}
                          className="flex items-center gap-1"
                        >
                          <BarChart3 className="w-3 h-3" />
                          View History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}






        {/* Live Location Modal */}
        {selectedLiveRide && (
          <LiveLocationModal
            isOpen={showLiveLocation}
            onClose={() => setShowLiveLocation(false)}
            ride={selectedLiveRide}
          />
        )}
      </div>
    </DashboardLayout>
  );
}