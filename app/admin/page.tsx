"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Music, ListMusic, HardDrive, TrendingUp } from "lucide-react";

interface Stats {
  users: {
    total: number;
    active: number;
    admins: number;
    newThisWeek: number;
  };
  mixes: {
    total: number;
    newThisWeek: number;
  };
  playlists: {
    total: number;
    newThisWeek: number;
  };
  storage: {
    totalBytes: number;
    totalMB: number;
    totalGB: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/admin/stats");
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return <div>Failed to load statistics</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">System Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Users Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.users.active} active • {stats.users.admins} admins
            </p>
            {stats.users.newThisWeek > 0 && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" />
                +{stats.users.newThisWeek} this week
              </p>
            )}
          </CardContent>
        </Card>

        {/* Mixes Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mixes</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mixes.total}</div>
            {stats.mixes.newThisWeek > 0 && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" />
                +{stats.mixes.newThisWeek} this week
              </p>
            )}
          </CardContent>
        </Card>

        {/* Playlists Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Playlists</CardTitle>
            <ListMusic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.playlists.total}</div>
            {stats.playlists.newThisWeek > 0 && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" />
                +{stats.playlists.newThisWeek} this week
              </p>
            )}
          </CardContent>
        </Card>

        {/* Storage Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.storage.totalGB} GB</div>
            <p className="text-xs text-muted-foreground">
              {stats.storage.totalMB} MB total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/admin/users"
              className="block p-3 hover:bg-accent rounded-md transition-colors"
            >
              <p className="font-medium">Manage Users</p>
              <p className="text-sm text-muted-foreground">
                View and moderate user accounts
              </p>
            </a>
            <a
              href="/admin/settings"
              className="block p-3 hover:bg-accent rounded-md transition-colors"
            >
              <p className="font-medium">Site Settings</p>
              <p className="text-sm text-muted-foreground">
                Configure application-wide settings
              </p>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Users:</span>
              <span className="font-medium">{stats.users.active}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Administrators:</span>
              <span className="font-medium">{stats.users.admins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Public Mixes:</span>
              <span className="font-medium">
                {/* Would need to add this to stats API */}
                -
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Storage/User:</span>
              <span className="font-medium">
                {stats.users.total > 0
                  ? Math.round(stats.storage.totalMB / stats.users.total)
                  : 0}{" "}
                MB
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
