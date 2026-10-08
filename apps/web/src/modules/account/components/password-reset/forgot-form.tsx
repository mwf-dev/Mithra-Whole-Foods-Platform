"use client"

import { requestPasswordReset } from "@lib/data/customer"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useActionState } from "react"

export default function ForgotForm() {
  const [state, formAction] = useActionState(requestPasswordReset, null)

  return (
    <div className="max-w-sm w-full flex flex-col items-center">
      <h1 className="text-large-semi uppercase mb-6">Forgot password</h1>
      <p className="text-center text-base-regular mb-8">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>
      <form className="w-full" action={formAction}>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          data-testid="forgot-email-input"
        />
        {state?.message && (
          <p
            role="status"
            className={`mt-4 text-small-regular ${state.ok ? "text-green-700" : "text-rose-600"}`}
            data-testid="forgot-message"
          >
            {state.message}
          </p>
        )}
        <SubmitButton className="w-full mt-6" data-testid="forgot-submit">
          Send reset link
        </SubmitButton>
      </form>
      <LocalizedClientLink href="/account" className="mt-6 text-small-regular underline">
        Back to sign in
      </LocalizedClientLink>
    </div>
  )
}
