"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, RefreshCw } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    site_name: "MixDrop",
    allow_registrations: "true",
    max_upload_size_mb: "200",
    maintenance_mode: "false",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings");
      const data = await response.json();

      // Merge with defaults
      const loadedSettings = {
        site_name: data.settings.site_name?.value || "MixDrop",
        allow_registrations: data.settings.allow_registrations?.value || "true",
        max_upload_size_mb: data.settings.max_upload_size_mb?.value || "200",
        maintenance_mode: data.settings.maintenance_mode?.value || "false",
      };

      setSettings(loadedSettings);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Site Settings</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={saving}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_name">Site Name</Label>
              <Input
                id="site_name"
                value={settings.site_name}
                onChange={(e) =>
                  setSettings({ ...settings, site_name: e.target.value })
                }
                placeholder="MixDrop"
              />
              <p className="text-xs text-muted-foreground">
                Displayed in browser title and branding
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance">Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Prevent non-admin users from accessing the site
                </p>
              </div>
              <Switch
                id="maintenance"
                checked={settings.maintenance_mode === "true"}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    maintenance_mode: checked ? "true" : "false",
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Upload Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max_upload">Maximum Upload Size (MB)</Label>
              <Input
                id="max_upload"
                type="number"
                value={settings.max_upload_size_mb}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_upload_size_mb: e.target.value,
                  })
                }
                min="1"
                max="1000"
              />
              <p className="text-xs text-muted-foreground">
                Maximum file size for audio uploads (currently enforced: 200MB in
                code)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* User Settings */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="registrations">Allow New Registrations</Label>
                <p className="text-xs text-muted-foreground">
                  If disabled, only existing users can sign in via OAuth
                </p>
              </div>
              <Switch
                id="registrations"
                checked={settings.allow_registrations === "true"}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    allow_registrations: checked ? "true" : "false",
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
