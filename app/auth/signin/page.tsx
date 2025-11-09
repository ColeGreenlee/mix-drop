"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, AlertCircle } from "lucide-react";

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/";
  const error = searchParams?.get("error");
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      callbackUrl,
    });
  };

  const handleOAuthSignIn = async () => {
    setLoading(true);
    await signIn("custom-sso", { callbackUrl });
  };

  const showLocalAuth = process.env.NEXT_PUBLIC_ENABLE_LOCAL_AUTH === "true";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Music className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to MixDrop</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to upload and share your mixes
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {error === "CredentialsSignin"
                  ? "Invalid username or password"
                  : error === "OAuthAccountNotLinked"
                  ? "Email already registered with different method"
                  : "Authentication failed. Please try again."}
              </span>
            </div>
          )}

          {showLocalAuth ? (
            <Tabs defaultValue="local" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="local">Local Login</TabsTrigger>
                <TabsTrigger value="oauth">SSO</TabsTrigger>
              </TabsList>

              {/* Local Credentials Tab */}
              <TabsContent value="local" className="space-y-4 mt-4">
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username or Email</Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="admin"
                      autoComplete="username"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      disabled={loading}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>

                  {process.env.NODE_ENV === "development" && (
                    <p className="text-xs text-center text-muted-foreground">
                      Default credentials: <strong>admin</strong> /{" "}
                      <strong>admin</strong>
                    </p>
                  )}
                </form>
              </TabsContent>

              {/* OAuth SSO Tab */}
              <TabsContent value="oauth" className="space-y-4 mt-4">
                <Button
                  onClick={handleOAuthSignIn}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Redirecting..." : "Sign in with SSO"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Sign in using your organization&apos;s OAuth provider
                </p>
              </TabsContent>
            </Tabs>
          ) : (
            // OAuth only (production)
            <div className="space-y-4">
              <Button
                onClick={handleOAuthSignIn}
                variant="default"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Redirecting..." : "Sign in with SSO"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Music className="w-12 h-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
