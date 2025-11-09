"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, Music } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Extract filename without extension and clean it up
      const filename = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      const cleanTitle = filename
        .replace(/[_-]/g, " ") // Replace underscores and hyphens with spaces
        .replace(/\s+/g, " ") // Normalize multiple spaces
        .trim();
      setTitle(cleanTitle);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      await response.json(); // Parse response but don't use it
      setProgress(100);

      // Redirect to home page after successful upload
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 pb-32">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Upload New Mix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="audio">Audio File *</Label>
              <Input
                id="audio"
                name="audio"
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/m4a"
                required
                disabled={uploading}
                className="cursor-pointer"
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground">
                Supported formats: MP3, WAV, AAC, OGG, M4A (Max 200MB)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Summer Vibes Mix 2024"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="artist">DJ / Artist *</Label>
              <Input
                id="artist"
                name="artist"
                placeholder="DJ Name"
                defaultValue={session?.user?.name || ""}
                required
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Tell us about this mix..."
                rows={4}
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="isPublic">Visibility</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="isPublic" className="text-sm text-muted-foreground font-normal cursor-pointer">
                    Private (logged-in users only)
                  </Label>
                  <Switch id="isPublic" name="isPublic" defaultChecked disabled={uploading} />
                  <Label htmlFor="isPublic" className="text-sm text-muted-foreground font-normal cursor-pointer">
                    Public
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Public mixes are visible to everyone. Private mixes require login to view.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverArt">Cover Art (Optional)</Label>
              <Input
                id="coverArt"
                name="coverArt"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground">
                Supported formats: JPG, PNG, WebP (Recommended: 1000x1000px)
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={uploading} className="flex-1">
                <Music className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Mix"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
