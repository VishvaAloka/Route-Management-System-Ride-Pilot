"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Menu, X, LogOut, Truck, Bell, Settings, UserIcon, ChevronRight, Zap, Compass } from "lucide-react"

interface User {
  _id: string
  name: string
  email: string
  role: string
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

const getRoleBadgeColor = (role: string): string => {
  const colors: Record<string, string> = {
    admin: "bg-red-500 text-white",
    project_manager: "bg-blue-500 text-white",
    driver: "bg-purple-500 text-white",
    user: "bg-gray-500 text-white",
  }
  return colors[role] || "bg-gray-500 text-white"
}

const getUserRoleDisplay = (role: string): string => {
  const displays: Record<string, string> = {
    admin: "Admin",
    project_manager: "Project Manager",
    driver: "Driver",
    user: "User",
  }
  return displays[role] || role
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Mock user for demo - replace with actual auth
    setUser({
      _id: "1",
      name: "John Doe",
      email: "john.doe@example.com",
      role: "admin",
    })
  }, [])

  const logout = async () => {
    router.push("/login")
  }

  const getNavigationItems = () => {
    const baseItems = [
      {
        name: "Map View",
        href: "/map",
        icon: Compass,
        roles: ["project_manager", "admin"],
        gradient: "from-emerald-400 to-teal-500",
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-700",
      },
    ]

    return baseItems.filter((item) => item.roles.includes(user?.role || ""))
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-2xl border-0 rounded-2xl bg-white/10 backdrop-blur-xl border-white/20">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center animate-pulse">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="h-3 bg-gray-100 rounded-full w-3/4 mx-auto animate-pulse"></div>
            </div>
            <p className="text-sm text-gray-500 mt-4">Loading your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-md z-40 lg:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-gradient-to-b from-white to-slate-50 backdrop-blur-xl shadow-2xl border-r-2 border-slate-200 transform transition-all duration-500 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="relative h-20 px-6 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-white tracking-tight">RideManager</span>
                <p className="text-blue-100 text-xs font-medium">Transport Solutions</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl hover:bg-white/20 transition-all duration-200 group active:scale-90"
            >
              <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>

        <div className="flex flex-col h-[calc(100vh-80px)]">
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  {getInitials(user.name)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full animate-pulse shadow-lg"></div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate text-lg">{user.name}</h3>
                <p className="text-sm text-slate-600 truncate">{user.email}</p>
                <Badge
                  className={`mt-2 text-xs font-semibold px-3 py-1 rounded-full ${getRoleBadgeColor(user.role)} shadow-lg hover:scale-105 transition-transform duration-200 cursor-default`}
                >
                  <Zap className="w-3 h-3 mr-1" />
                  {getUserRoleDisplay(user.role)}
                </Badge>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3">Navigation</p>
            </div>

            {getNavigationItems().map((item, index) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <div key={item.name} className="relative group">
                  <Link href={item.href} onClick={() => setSidebarOpen(false)}>
                    <button
                      className={`w-full flex items-center justify-between px-4 py-4 text-sm font-semibold rounded-2xl transition-all duration-300 transform hover:scale-[1.03] hover:shadow-lg ${
                        isActive
                          ? `${item.bgColor} ${item.textColor} scale-[1.02] border-2 border-slate-300 shadow-md`
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                      }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center mr-4 transition-all duration-300 ${
                            isActive
                              ? `bg-white shadow-md`
                              : `bg-gradient-to-br ${item.gradient} group-hover:shadow-lg group-hover:scale-110 opacity-80 group-hover:opacity-100`
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${isActive ? item.textColor : "text-white"}`} />
                        </div>
                        <span className="font-semibold">{item.name}</span>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 transition-all duration-300 ${
                          isActive
                            ? "opacity-100 translate-x-0"
                            : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                        }`}
                      />
                    </button>
                  </Link>

                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full shadow-lg"></div>
                  )}
                </div>
              )
            })}
          </nav>

          <div className="px-4 py-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="mb-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3">Quick Actions</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center p-4 bg-white hover:bg-blue-50 rounded-xl transition-all duration-300 group border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md active:scale-95">
                <Bell className="w-5 h-5 text-slate-600 mb-2 group-hover:scale-125 group-hover:text-blue-600 transition-all duration-300" />
                <span className="text-xs text-slate-600 font-semibold">Alerts</span>
              </button>
              <button className="flex flex-col items-center p-4 bg-white hover:bg-slate-100 rounded-xl transition-all duration-300 group border border-slate-200 hover:border-slate-400 shadow-sm hover:shadow-md active:scale-95">
                <Settings className="w-5 h-5 text-slate-600 mb-2 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
                <span className="text-xs text-slate-600 font-semibold">Settings</span>
              </button>
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-white">
            <Button
              onClick={logout}
              className="w-full group bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 hover:from-red-100 hover:to-pink-100 hover:border-red-400 text-red-700 hover:text-red-800 transition-all duration-300 transform hover:scale-[1.02] h-11 rounded-xl font-semibold active:scale-95"
            >
              <LogOut className="w-4 h-4 mr-2 group-hover:animate-pulse transition-all" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:pl-80 min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl shadow-md border-b border-slate-200 flex-shrink-0 transition-all duration-300">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-all duration-200 group active:scale-90"
              >
                <Menu className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
              </button>

              <div className="hidden lg:block">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                    <UserIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900">
                      Welcome back,{" "}
                      <span className="text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text font-bold">
                        {user.name.split(" ")[0]}
                      </span>
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">Have a productive day!</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-full border-2 border-emerald-200 shadow-sm">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                <span className="text-sm font-semibold text-emerald-700">Online</span>
              </div>

              <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-all duration-200 group active:scale-90">
                <Bell className="w-5 h-5 text-slate-600 group-hover:scale-120 group-hover:text-blue-600 transition-all duration-300" />
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gradient-to-r from-red-500 to-pink-500 border-2 border-white rounded-full animate-bounce shadow-lg"></div>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50/50">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
