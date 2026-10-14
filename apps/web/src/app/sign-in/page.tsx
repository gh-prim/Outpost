import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "./google-sign-in-button";
import { SsoSignInForm } from "./sso-sign-in-form";

async function SignInPageContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 p-8 dark:border-neutral-800">
        <h1 className="text-2xl font-semibold">Outpost</h1>
        <p className="mt-1 text-sm text-neutral-500">Sign in to your workspace</p>
        <div className="mt-8 space-y-6">
          <SsoSignInForm />
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            or
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          </div>
          <GoogleSignInButton />
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInPageContent />
    </Suspense>
  );
}
