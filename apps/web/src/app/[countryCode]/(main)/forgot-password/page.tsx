import { Metadata } from "next"
import ForgotForm from "@modules/account/components/password-reset/forgot-form"

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false },
}

export default function ForgotPasswordPage() {
  return (
    <div className="w-full flex justify-center px-8 py-12">
      <ForgotForm />
    </div>
  )
}
