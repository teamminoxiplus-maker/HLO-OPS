import { createServiceClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import { LogoMark } from "@/components/logo";
import { UnsubscribeClient } from "./unsubscribe-client";

export const dynamic = "force-dynamic";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";

  let email: string | null = null;
  let already = false;
  let invalid = false;

  if (uuidRe.test(token)) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("email_subscribers")
      .select("email, status")
      .eq("unsubscribe_token", token)
      .maybeSingle();
    if (!data) {
      invalid = true;
    } else {
      email = data.email as string;
      already = data.status === "unsubscribed";
    }
  } else {
    invalid = true;
  }

  return (
    <div className="hlo-surface flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <LogoMark className="mx-auto mb-4 h-12 w-12" />
        <h1 className="text-lg font-bold">{BRAND.name}</h1>
        <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
          {invalid ? (
            <p className="text-sm text-muted-foreground">
              This unsubscribe link is invalid or has expired.
            </p>
          ) : already ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{email}</span> is
              already unsubscribed. You won&apos;t receive marketing emails from
              us.
            </p>
          ) : (
            <UnsubscribeClient token={token} email={email!} />
          )}
        </div>
      </div>
    </div>
  );
}
