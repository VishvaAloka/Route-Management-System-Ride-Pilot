'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, CheckCircle, Car, Plus, Gauge } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { toast } from 'sonner';

interface Vehicle {
  _id: string;
  terminalId: string;
  vehicle: string;
  vehicleType: string;
  status: string;
  isAvailable: boolean;
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

export default function DailyRidesPage() {
  const [dailyRides, setDailyRides] = useState<DailyRide[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [showDailyRideDialog, setShowDailyRideDialog] = useState(false);
  const [dailyRideForm, setDailyRideForm] = useState({
    vehicleId: '',
    destination: '',
    startMileage: ''
  });

  useEffect(() => {
    fetchDailyRides();
    fetchAvailableVehicles();
  }, []);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Daily Rides</h1>
            <p className="text-gray-500 mt-1">Manage your daily staff transport rides</p>
          </div>
          <Button onClick={() => setShowDailyRideDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Start New Daily Ride
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Today's Daily Rides</CardTitle>
            <CardDescription>
              {dailyRides.length} daily rides today
            </CardDescription>
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
              <div className="grid gap-4">
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
                <Car className="w-4 h-4 mr-2" />
                Start Daily Ride
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}