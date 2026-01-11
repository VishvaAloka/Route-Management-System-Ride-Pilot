"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MapPin,
  Truck,
  Clock,
  Grid3X3,
  List,
  LayoutGrid,
  Search,
  RefreshCw,
  Signal,
  Gauge,
  Calendar,
  Phone,
  Navigation,
  Zap,
  AlertCircle,
  CheckCircle,
  Activity,
  Settings,
  Eye,
} from "lucide-react"
import { toast } from "sonner"

interface Device {
  _id: string
  terminalId: string
  vehicle: string
  vehicleType: string
  status: string
  latitude: string
  longitude: string
  speed: number
  lastMessage: string
  expire?: string
  phone?: string
  speedLimit?: number
}

type ViewMode = "grid" | "list" | "masonry"

const AnimatedIconStyle = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
    50% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  .animate-pulse-glow {
    animation: pulse-glow 2s infinite;
  }
  .animate-spin-slow {
    animation: spin-slow 4s linear infinite;
  }
`

export default function DeviceMap() {
  const [devices, setDevices] = useState<Device[]>([])
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = AnimatedIconStyle
    document.head.appendChild(style)

    fetchDevices()
    const interval = setInterval(fetchDevices, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterDevices()
  }, [devices, searchQuery, statusFilter])

  const fetchDevices = async () => {
    try {
      setRefreshing(true)
      const response = await fetch("/api/devices")
      if (response.ok) {
        const data = await response.json()
        setDevices(data)
        toast.success("Devices updated successfully")
      } else {
        toast.error("Failed to fetch devices")
      }
    } catch (error) {
      console.error("Failed to fetch devices:", error)
      toast.error("Network error while fetching devices")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filterDevices = () => {
    let filtered = devices

    if (searchQuery) {
      filtered = filtered.filter(
        (device) =>
          device.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          device.terminalId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          device.vehicleType.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((device) => device.status === statusFilter)
    }

    setFilteredDevices(filtered)
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      online: {
        color: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300",
        icon: CheckCircle,
        pulse: true,
      },
      offline: {
        color: "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-300",
        icon: AlertCircle,
        pulse: false,
      },
      idle: {
        color: "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-300",
        icon: Clock,
        pulse: true,
      },
    }
    return configs[status as keyof typeof configs] || configs.offline
  }

  const getVehicleIcon = (vehicleType: string) => {
    const icons = {
      truck: "🚛",
      car: "🚗",
      van: "🚐",
      bike: "🏍️",
      bus: "🚌",
    }
    return icons[vehicleType.toLowerCase() as keyof typeof icons] || "🚙"
  }

  const getSpeedStatus = (speed: number) => {
    if (speed === 0) return { color: "text-gray-500", status: "Stopped" }
    if (speed < 30) return { color: "text-green-600", status: "Slow" }
    if (speed < 60) return { color: "text-yellow-600", status: "Moderate" }
    return { color: "text-red-600", status: "Fast" }
  }

  const DeviceCard = ({ device, compact = false }: { device: Device; compact?: boolean }) => {
    const statusConfig = getStatusConfig(device.status)
    const StatusIcon = statusConfig.icon
    const speedStatus = getSpeedStatus(device.speed)

    return (
      <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border-l-4 border-l-blue-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <CardHeader className={`relative ${compact ? "pb-2" : "pb-3"}`}>
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-3 ${compact ? "text-base" : "text-lg"}`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-float transition-transform duration-300">
                  {getVehicleIcon(device.vehicleType)}
                </span>
                <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                  {device.vehicle}
                </span>
              </div>
            </CardTitle>
            <Badge
              className={`${statusConfig.color} border transition-all duration-300 ${statusConfig.pulse ? "animate-pulse" : ""}`}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {device.status}
            </Badge>
          </div>
          {!compact && (
            <p className="text-sm text-gray-500">
              {device.vehicleType.charAt(0).toUpperCase() + device.vehicleType.slice(1)} • ID: {device.terminalId}
            </p>
          )}
        </CardHeader>

        <CardContent className="relative space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/50 group-hover:bg-blue-100 transition-colors duration-300">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:animate-pulse-glow">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Location</p>
                <p className="text-sm font-mono text-gray-900 truncate">
                  {Number.parseFloat(device.latitude).toFixed(3)}, {Number.parseFloat(device.longitude).toFixed(3)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50/50 group-hover:bg-purple-100 transition-colors duration-300">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Gauge className="w-4 h-4 text-purple-600 group-hover:animate-spin-slow" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Speed</p>
                <p className={`text-sm font-bold ${speedStatus.color}`}>{device.speed} km/h</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 group-hover:border-gray-200 transition-colors duration-300">
            <Clock className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors duration-300" />
            <span className="text-xs text-gray-500">Last seen: {new Date(device.lastMessage).toLocaleString()}</span>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 group-hover:bg-blue-50 group-hover:border-blue-300 group-hover:text-blue-700 transition-all duration-300 hover:scale-105 bg-transparent"
                onClick={() => setSelectedDevice(device)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </DialogTrigger>
            <DeviceDetailsDialog device={device} />
          </Dialog>
        </CardContent>
      </Card>
    )
  }

  const DeviceDetailsDialog = ({ device }: { device: Device }) => {
    const statusConfig = getStatusConfig(device.status)
    const StatusIcon = statusConfig.icon
    const speedStatus = getSpeedStatus(device.speed)

    return (
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <span className="text-3xl animate-float">{getVehicleIcon(device.vehicleType)}</span>
            <div>
              <span className="text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                {device.vehicle}
              </span>
              <p className="text-sm text-gray-500 font-normal">
                {device.vehicleType.charAt(0).toUpperCase() + device.vehicleType.slice(1)} Vehicle
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>Detailed information and real-time status for vehicle {device.vehicle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Current Status</h3>
                <Badge className={`${statusConfig.color} border ${statusConfig.pulse ? "animate-pulse" : ""}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {device.status.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <Gauge className="w-6 h-6 text-blue-600 mx-auto mb-1 hover:animate-spin-slow transition-all" />
                  <p className="text-xs text-gray-500">Speed</p>
                  <p className={`font-bold ${speedStatus.color}`}>{device.speed} km/h</p>
                  <p className="text-xs text-gray-400">{speedStatus.status}</p>
                </div>

                <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <Signal className="w-6 h-6 text-green-600 mx-auto mb-1 animate-pulse" />
                  <p className="text-xs text-gray-500">Signal</p>
                  <p className="font-bold text-green-600">Strong</p>
                  <p className="text-xs text-gray-400">GPS Active</p>
                </div>

                <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <Activity className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">Activity</p>
                  <p className="font-bold text-purple-600">{device.speed > 0 ? "Moving" : "Stationary"}</p>
                  <p className="text-xs text-gray-400">Real-time</p>
                </div>

                <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <Zap className="w-6 h-6 text-orange-600 mx-auto mb-1 animate-pulse" />
                  <p className="text-xs text-gray-500">Engine</p>
                  <p className="font-bold text-orange-600">{device.status === "online" ? "ON" : "OFF"}</p>
                  <p className="text-xs text-gray-400">Status</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-all duration-300 hover:scale-105">
                  <Truck className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Vehicle ID</p>
                    <p className="text-sm text-gray-600">{device.vehicle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-all duration-300 hover:scale-105">
                  <Navigation className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Terminal ID</p>
                    <p className="text-sm text-gray-600 font-mono">{device.terminalId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-all duration-300 hover:scale-105">
                  <Activity className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Vehicle Type</p>
                    <p className="text-sm text-gray-600 capitalize">{device.vehicleType}</p>
                  </div>
                </div>

                {device.phone && (
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-all duration-300 hover:scale-105">
                    <Phone className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Contact</p>
                      <p className="text-sm text-gray-600">{device.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:shadow-md transition-all duration-300">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Latitude</p>
                    <p className="text-lg font-mono text-blue-600">{device.latitude}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Longitude</p>
                    <p className="text-lg font-mono text-blue-600">{device.longitude}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-all duration-300">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last Update</p>
                    <p className="text-sm text-gray-600">{new Date(device.lastMessage).toLocaleString()}</p>
                  </div>
                </div>

                {device.expire && (
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg hover:shadow-md transition-all duration-300">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Service Expires</p>
                      <p className="text-sm text-yellow-600">{new Date(device.expire).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    )
  }

  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredDevices.map((device, index) => (
        <div key={device._id} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
          <DeviceCard device={device} />
        </div>
      ))}
    </div>
  )

  const ListView = () => (
    <div className="space-y-4">
      {filteredDevices.map((device, index) => (
        <Card
          key={device._id}
          className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 animate-fade-in-up bg-gradient-to-r from-gray-50/50 to-white hover:from-blue-50/50 hover:to-white"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-3xl animate-float">{getVehicleIcon(device.vehicleType)}</span>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                    {device.vehicle}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {device.vehicleType} • {device.terminalId}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Badge className={getStatusConfig(device.status).color}>{device.status}</Badge>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Speed</p>
                  <p className="font-bold text-gray-900">{device.speed} km/h</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Last Seen</p>
                  <p className="text-xs text-gray-600">{new Date(device.lastMessage).toLocaleTimeString()}</p>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:scale-105 transition-transform duration-300 bg-transparent"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Details
                    </Button>
                  </DialogTrigger>
                  <DeviceDetailsDialog device={device} />
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const MasonryView = () => (
    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
      {filteredDevices.map((device, index) => (
        <div
          key={device._id}
          className="break-inside-avoid animate-fade-in-up"
          style={{ animationDelay: `${index * 75}ms` }}
        >
          <DeviceCard device={device} compact />
        </div>
      ))}
    </div>
  )

  const LoadingView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const onlineDevices = devices.filter((d) => d.status === "online").length
  const offlineDevices = devices.filter((d) => d.status === "offline").length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Live Vehicle Tracking
          </h1>
          <p className="text-gray-600">Monitor your fleet in real-time with live GPS tracking</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={fetchDevices}
            disabled={refreshing}
            variant="outline"
            className="flex items-center gap-2 hover:scale-105 transition-transform duration-300 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center hover:animate-pulse-glow transition-all">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center animate-pulse">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Online</p>
                <p className="text-2xl font-bold text-gray-900">{onlineDevices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Offline</p>
                <p className="text-2xl font-bold text-gray-900">{offlineDevices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center animate-pulse">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Moving</p>
                <p className="text-2xl font-bold text-gray-900">{devices.filter((d) => d.speed > 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300">
        <CardContent className="p-0">
          <div className="h-64 bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 flex items-center justify-center relative hover:from-blue-150 hover:via-purple-100 transition-all duration-300">
            <div className="text-center z-10 animate-float">
              <MapPin className="w-16 h-16 text-blue-500 mx-auto mb-4 hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Interactive Map View</h3>
              <p className="text-gray-500 max-w-md">
                This area will display an interactive Google Maps integration showing all vehicle locations with
                real-time markers and route tracking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search vehicles, terminals, or types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 hover:border-blue-400 transition-colors duration-300 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="hover:scale-105 transition-transform duration-300"
            >
              All
            </Button>
            <Button
              variant={statusFilter === "online" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("online")}
              className="text-green-600 hover:text-green-700 hover:scale-105 transition-all duration-300"
            >
              Online
            </Button>
            <Button
              variant={statusFilter === "offline" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("offline")}
              className="text-red-600 hover:text-red-700 hover:scale-105 transition-all duration-300"
            >
              Offline
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg p-1 hover:shadow-md transition-all duration-300">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="flex items-center gap-2 hover:scale-105 transition-transform duration-300"
          >
            <Grid3X3 className="w-4 h-4" />
            Grid
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="flex items-center gap-2 hover:scale-105 transition-transform duration-300"
          >
            <List className="w-4 h-4" />
            List
          </Button>
          <Button
            variant={viewMode === "masonry" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("masonry")}
            className="flex items-center gap-2 hover:scale-105 transition-transform duration-300"
          >
            <LayoutGrid className="w-4 h-4" />
            Masonry
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <p>
          Showing {filteredDevices.length} of {devices.length} vehicles
          {searchQuery && ` for "${searchQuery}"`}
          {statusFilter !== "all" && ` with status "${statusFilter}"`}
        </p>
        <p className="text-xs">Last updated: {new Date().toLocaleTimeString()}</p>
      </div>

      {loading ? (
        <LoadingView />
      ) : filteredDevices.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-float" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No vehicles found</h3>
            <p className="text-gray-500">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "No vehicles are currently available in the system"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === "grid" && <GridView />}
          {viewMode === "list" && <ListView />}
          {viewMode === "masonry" && <MasonryView />}
        </>
      )}
    </div>
  )
}
