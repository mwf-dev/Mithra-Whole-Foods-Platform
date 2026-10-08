import { Metadata } from "next"
import ResetForm from "@modules/account/components/password-reset/reset-form"

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false },
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const { token = "", email = "" } = await searchParams
  return (
    <div className="w-full flex justify-center px-8 py-12">
      <ResetForm token={token} email={email} />
    </div>
  )
}
