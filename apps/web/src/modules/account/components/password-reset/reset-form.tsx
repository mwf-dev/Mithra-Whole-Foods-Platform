"use client"

import { resetPassword } from "@lib/data/customer"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useActionState } from "react"

export default function ResetForm({ token, email }: { token: string; email: string }) {
  const [state, formAction] = useActionState(resetPassword, null)

  if (!token || !email) {
    return (
      <p className="text-base-regular">
        This reset link is incomplete.{" "}
        <LocalizedClientLink href="/forgot-password" className="underline">
          Request a new one
        </LocalizedClientLink>
        .
      </p>
    )
  }

  return (
    <div className="max-w-sm w-full flex flex-col items-center">
      <h1 className="text-large-semi uppercase mb-6">Choose a new password</h1>
      <form className="w-full" action={formAction}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="email" value={email} />
        <div className="flex flex-col gap-y-2">
          <Input label="New password" name="password" type="password" autoComplete="new-password" required data-testid="reset-password-input" />
          <Input label="Confirm password" name="confirm" type="password" autoComplete="new-password" required data-testid="reset-confirm-input" />
        </div>
        {state?.message && (
          <p role="status" className={`mt-4 text-small-regular ${state.ok ? "text-green-700" : "text-rose-600"}`} data-testid="reset-message">
            {state.message}
          </p>
        )}
        {state?.ok ? (
          <LocalizedClientLink href="/account" className="block mt-6 text-center underline">
            Go to sign in
          </LocalizedClientLink>
        ) : (
          <SubmitButton className="w-full mt-6" data-testid="reset-submit">
            Update password
          </SubmitButton>
        )}
      </form>
    </div>
  )
}
