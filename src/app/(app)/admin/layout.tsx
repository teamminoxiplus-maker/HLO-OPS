import { getAdminEmail } from "@/lib/assessment/admin";

// Assessment admin (spec §12). Sign-in already happened (app layout guards it);
// this gates on ADMIN_ALLOWLIST. Non-allowlisted users get 403, not a redirect.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = await getAdminEmail();
  if (!email) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-2xl font-bold">403 — No access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is not on the assessment admin allowlist. Ask an admin to
          add your email to <code>ADMIN_ALLOWLIST</code>.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
