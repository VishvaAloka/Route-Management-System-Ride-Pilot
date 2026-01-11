"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, RefreshCw, Activity } from "lucide-react"

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
}

interface GoogleMapProps {
  devices: Device[]
  onDeviceSelect?: (device: Device) => void
  height?: string
}

export default function GoogleMap({ devices, onDeviceSelect, height = "500px" }: GoogleMapProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  if (error) {
    return (
      <Card className="border-2 border-red-200 rounded-2xl shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-pink-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Map Error</h3>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl h-10 hover:scale-105 transition-transform duration-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden border-2 border-slate-200 rounded-2xl shadow-xl transition-all duration-300">
      <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-slate-100">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span>Live Vehicle Tracking</span>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-300 rounded-full px-3 py-1 flex items-center gap-1.5"
            >
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              {devices.filter((d) => d.status === "online").length} Online
            </Badge>
            <Badge
              variant="outline"
              className="bg-red-50 text-red-700 border-red-300 rounded-full px-3 py-1 flex items-center gap-1.5"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              {devices.filter((d) => d.status === "offline").length} Offline
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          <div ref={mapRef} style={{ height }} className="w-full bg-gradient-to-br from-slate-50 to-slate-100" />
          {isLoading && (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100/80 to-slate-50/80 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 animate-spin">
                  <div className="w-12 h-12 bg-white rounded-full"></div>
                </div>
                <p className="text-sm font-medium text-slate-700">Loading map...</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-t-2 border-slate-200">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
              <span className="font-medium text-slate-700">Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></div>
              <span className="font-medium text-slate-700">Offline</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full shadow-lg shadow-amber-500/50"></div>
              <span className="font-medium text-slate-700">Idle</span>
            </div>
            <div className="ml-auto text-xs text-slate-500 flex items-center gap-1">
              <Activity className="w-4 h-4" />
              {devices.length} vehicles total
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
