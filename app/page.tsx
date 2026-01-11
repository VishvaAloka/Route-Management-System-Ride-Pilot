"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import LocationSearchInput from "@/components/LocationSearchInput"
import GoogleMap from "@/components/GoogleMap"
import { MapModal } from "@/components/MapModal"
import { Zap, MapPin, Users, TrendingUp } from "lucide-react"
import type { RideLocation } from "@/components/LocationSearchInput"


const mockDevices = [
  {
    _id: "1",
    terminalId: "TERM001",
    vehicle: "Vehicle 001",
    vehicleType: "truck",
    status: "online",
    latitude: "6.9271",
    longitude: "79.8612",
    speed: 45,
    lastMessage: new Date().toISOString(),
  },
  {
    _id: "2",
    terminalId: "TERM002",
    vehicle: "Vehicle 002",
    vehicleType: "van",
    status: "offline",
    latitude: "6.9300",
    longitude: "79.8700",
    speed: 0,
    lastMessage: new Date(Date.now() - 3600000).toISOString(),
  },
]

export default function Home() {
  const [pickupLocation, setPickupLocation] = useState<RideLocation | null>(null)
  const [dropoffLocation, setDropoffLocation] = useState<RideLocation | null>(null)
  const [pickupInput, setPickupInput] = useState("")
  const [dropoffInput, setDropoffInput] = useState("")
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)

  const handleStartRide = () => {
    if (pickupLocation && dropoffLocation) {
      setIsMapModalOpen(true)
    }
  }

  const calculateDistance = () => {
    if (!pickupLocation || !dropoffLocation) return 0
    // Simple distance calculation
    const latDiff = Math.abs(pickupLocation.lat - dropoffLocation.lat)
    const lngDiff = Math.abs(pickupLocation.lng - dropoffLocation.lng)
    return Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 111 // Approximate km per degree
  }

  return (
    <div className="space-y-8 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 shadow-2xl text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-blue-100 uppercase tracking-widest">Live Tracking</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">Welcome to Ride Pilot</h1>
          <p className="text-blue-100 text-lg max-w-2xl">
            Streamline your rides with intelligent route planning, live tracking, and centralized dispatch management.
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Users, label: "Active Vehicles", value: "12", color: "from-emerald-500 to-teal-500" },
          { icon: MapPin, label: "Locations Tracked", value: "156", color: "from-blue-500 to-indigo-500" },
          { icon: TrendingUp, label: "Total Distance", value: "2,456 km", color: "from-orange-500 to-red-500" },
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card
              key={index}
              className="border-2 border-slate-200 rounded-2xl hover:shadow-lg transition-all duration-300"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-semibold mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Booking Section */}
      <Card className="border-2 border-slate-200 rounded-2xl shadow-xl">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl border-b-2 border-slate-200">
          <CardTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            Plan Your Route
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <LocationSearchInput
              label="Pickup Location"
              placeholder="Enter pickup location..."
              onLocationSelect={setPickupLocation}
              selectedLocation={pickupLocation}
              value={pickupInput}
              onChange={setPickupInput}
              iconColor="#10B981"
            />
            <LocationSearchInput
              label="Dropoff Location"
              placeholder="Enter destination..."
              onLocationSelect={setDropoffLocation}
              selectedLocation={dropoffLocation}
              value={dropoffInput}
              onChange={setDropoffInput}
              iconColor="#EF4444"
            />
          </div>

          {pickupLocation && dropoffLocation && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Estimated Distance</p>
                  <p className="text-2xl font-bold text-slate-900">{calculateDistance().toFixed(1)} km</p>
                </div>
                <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full px-4 py-2 text-sm font-semibold">
                  Ready to Go
                </Badge>
              </div>
            </div>
          )}

          <Button
            onClick={handleStartRide}
            disabled={!pickupLocation || !dropoffLocation}
            className={`w-full h-12 rounded-xl font-semibold text-white transition-all duration-300 ${
              pickupLocation && dropoffLocation
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] cursor-pointer"
                : "bg-slate-300 cursor-not-allowed opacity-50"
            }`}
          >
            <MapPin className="w-4 h-4 mr-2" />
            View Route on Map
          </Button>
        </CardContent>
      </Card>

      {/* Vehicle Tracking */}
      <GoogleMap devices={mockDevices} onDeviceSelect={() => {}} height="500px" />

      {/* Map Modal */}
      {pickupLocation && dropoffLocation && (
        <MapModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          startLocation={pickupLocation}
          endLocation={dropoffLocation}
          rideId={`RIDE${Date.now()}`}
          distance={calculateDistance()}
        />
      )}
    </div>
  )
}
