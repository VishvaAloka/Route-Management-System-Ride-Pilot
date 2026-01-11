"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, Clock, Route, AlertCircle } from "lucide-react"

interface Location {
  lat?: number
  lng?: number
  address: string
}

interface MapModalProps {
  isOpen: boolean
  onClose: () => void
  startLocation: Location
  endLocation: Location
  rideId: string
  distance: number
}

export function MapModal({ isOpen, onClose, startLocation, endLocation, rideId, distance }: MapModalProps) {
  const [isLoading, setIsLoading] = useState(true)

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] rounded-2xl overflow-hidden border-2 border-slate-200 shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-slate-200">
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <span>
              Ride Route -{" "}
              <span className="text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text font-bold">
                #{rideId.slice(-6)}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900">Pickup Location</p>
                  <p className="text-sm text-slate-600 mt-1">{startLocation.address}</p>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <Route className="w-6 h-6 text-blue-600 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900">Destination</p>
                  <p className="text-sm text-slate-600 mt-1">{endLocation.address}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="bg-blue-50 border-2 border-blue-300 text-blue-700 rounded-full px-4 py-2 flex items-center gap-2 font-semibold"
            >
              <Clock className="w-4 h-4" />
              <span>{distance.toFixed(1)} km</span>
            </Badge>
            {distance > 25 && (
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full px-4 py-2 flex items-center gap-2 font-semibold shadow-lg">
                <AlertCircle className="w-4 h-4" />
                Long Distance Ride
              </Badge>
            )}
          </div>

          <div className="flex-1 min-h-[400px] rounded-2xl overflow-hidden border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 relative shadow-lg">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                <div className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 animate-spin">
                    <div className="w-12 h-12 bg-white rounded-full"></div>
                  </div>
                  <p className="text-sm font-medium text-slate-700">Loading map...</p>
                </div>
              </div>
            )}
            <div className="w-full h-full flex items-center justify-center text-slate-500">Map will render here</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
