"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, AlertCircle } from "lucide-react";

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/";
  const error = searchParams?.get("error");
  const [loading, setLoading] = useState(false);

  const handleOAuthSignIn = async () => {
    setLoading(true);
    await signIn("custom-sso", { callbackUrl });
  };

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
                {error === "OAuthAccountNotLinked"
                  ? "Email already registered with different method"
                  : "Authentication failed. Please try again."}
              </span>
            </div>
          )}

          <div className="space-y-4">
            <Button
              onClick={handleOAuthSignIn}
              variant="default"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Redirecting..." : "Sign in with SSO"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Sign in using your organization&apos;s OAuth provider
            </p>
          </div>
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
