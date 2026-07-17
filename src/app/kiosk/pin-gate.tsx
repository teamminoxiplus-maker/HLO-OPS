"use client";

import { useFormState, useFormStatus } from "react-dom";
import { unlockKiosk } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-blue-700 px-6 py-4 text-base font-semibold text-white disabled:opacity-50"
      style={{ minHeight: 52 }}
    >
      {pending ? "…" : "Unlock Kiosk"}
    </button>
  );
}

export function PinGate() {
  const [state, action] = useFormState(unlockKiosk, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700">Kiosk PIN</label>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          required
          className="mt-1 w-full rounded-lg border-2 border-slate-200 px-3.5 py-3 text-lg tracking-widest outline-none focus:border-blue-700"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">
          Location tag (optional)
        </label>
        <input
          name="loc"
          type="text"
          placeholder="hal. sm_north"
          className="mt-1 w-full rounded-lg border-2 border-slate-200 px-3.5 py-3 outline-none focus:border-blue-700"
        />
      </div>
      {state?.error && (
        <p className="text-sm font-medium text-red-600">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
