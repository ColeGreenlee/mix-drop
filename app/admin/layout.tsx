import { requireAdmin } from "@/lib/auth-helpers";
import Link from "next/link";
import { Shield, Users, Settings, BarChart3, Home } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side admin check - redirects if not admin
  await requireAdmin();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Admin Header */}
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      {/* Admin Navigation */}
      <nav className="flex gap-2 mb-8 border-b pb-4 overflow-x-auto">
        <Link
          href="/admin"
          className="px-4 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <Home className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/admin/users"
          className="px-4 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <Users className="w-4 h-4" />
          <span>Users</span>
        </Link>
        <Link
          href="/admin/settings"
          className="px-4 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
        <Link
          href="/"
          className="px-4 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2 whitespace-nowrap ml-auto"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Back to Site</span>
        </Link>
      </nav>

      {/* Admin Content */}
      <div className="pb-32">{children}</div>
    </div>
  );
}
