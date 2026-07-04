import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Shown when RESEND_API_KEY isn't configured yet. The list still works for
// collecting contacts; only sending is disabled.
export function EmailSetupNotice() {
  return (
    <Card className="border-teal-300 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-teal-800 dark:text-teal-200">
          Finish email setup to start sending
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-teal-800 dark:text-teal-200">
        <p>
          You can build your contact list now. To actually send emails, add a{" "}
          <strong>Resend</strong> API key:
        </p>
        <ol className="ml-5 list-decimal space-y-1">
          <li>
            Create a free account at <code>resend.com</code> and copy an API
            key.
          </li>
          <li>
            In Vercel → your project → <strong>Settings → Environment
            Variables</strong>, add <code>RESEND_API_KEY</code>.
          </li>
          <li>
            To send from your own address (not just test), verify your domain in
            Resend and add <code>EMAIL_FROM</code> (e.g.{" "}
            <code>Happy Life Organics &lt;news@happylifeorganics.ph&gt;</code>).
          </li>
          <li>Redeploy, and this notice disappears.</li>
        </ol>
      </CardContent>
    </Card>
  );
}
