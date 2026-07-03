"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/components/logo";
import { BRAND } from "@/lib/brand";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

function LoginForm() {
  const [state, formAction] = useFormState(signIn, null);
  const next = useSearchParams().get("next") ?? "/dashboard";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@happylifeorganics.ph"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="hlo-surface flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <LogoMark className="mb-4 h-14 w-14 shadow-sm" />
          <h1 className="text-xl font-bold tracking-tight">{BRAND.appName}</h1>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {BRAND.appSubtitle}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{BRAND.tagline}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Access is for {BRAND.name} team members only.
        </p>
      </div>
    </div>
  );
}
