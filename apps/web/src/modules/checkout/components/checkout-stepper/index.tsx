"use client"

import { CheckCircleSolid } from "@medusajs/icons"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

type CheckoutStep = "address" | "delivery" | "payment"

type CheckoutStepperProps = {
  hasAddress: boolean
  hasShipping: boolean
  hasPayment: boolean
}

export default function CheckoutStepper({
  hasAddress,
  hasShipping,
  hasPayment,
}: CheckoutStepperProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentStep = (searchParams.get("step") as CheckoutStep) || "address"

  const steps = [
    {
      id: "address" as CheckoutStep,
      number: 1,
      title: "Delivery Address",
      isComplete: hasAddress,
      isActive: currentStep === "address",
    },
    {
      id: "delivery" as CheckoutStep,
      number: 2,
      title: "Shipping Method",
      isComplete: hasShipping,
      isActive: currentStep === "delivery",
    },
    {
      id: "payment" as CheckoutStep,
      number: 3,
      title: "Payment & Review",
      isComplete: hasPayment,
      isActive: currentStep === "payment" || currentStep === "review" as any,
    },
  ]

  const handleStepClick = (stepId: CheckoutStep, isAccessible: boolean) => {
    if (!isAccessible) return
    const params = new URLSearchParams(searchParams)
    params.set("step", stepId)
    router.push(pathname + "?" + params.toString(), { scroll: false })
  }

  // Active step index (0, 1, or 2)
  const activeIdx = steps.findIndex((s) => s.isActive)
  const progressPercent = activeIdx === 2 ? 100 : activeIdx === 1 ? 50 : 0

  return (
    <div className="w-full mb-8 bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-6 shadow-xs">
      <div className="relative flex items-center justify-between max-w-2xl mx-auto">
        {/* Background Track Line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 -z-0" />
        
        {/* Active Progress Line */}
        <div
          className="absolute top-4 left-6 h-0.5 bg-emerald-700 transition-all duration-500 -z-0"
          style={{ width: `calc(${progressPercent}% * 0.88)` }}
        />

        {steps.map((step, idx) => {
          const isAccessible = idx === 0 || (idx === 1 && hasAddress) || (idx === 2 && hasShipping)

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(step.id, isAccessible)}
              disabled={!isAccessible}
              className={`relative z-10 flex flex-col items-center text-center group transition-all ${
                isAccessible ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              }`}
            >
              {/* Step Circle Indicator */}
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm border-2 transition-all shadow-xs ${
                  step.isActive
                    ? "bg-emerald-700 border-emerald-700 text-white ring-4 ring-emerald-100 scale-105"
                    : step.isComplete
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {step.isComplete && !step.isActive ? (
                  <CheckCircleSolid className="w-5 h-5 text-white" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>

              {/* Title & Status Subtitle */}
              <span
                className={`mt-2 text-xs sm:text-sm font-bold transition-colors ${
                  step.isActive
                    ? "text-emerald-900 font-extrabold"
                    : step.isComplete
                    ? "text-gray-900"
                    : "text-gray-400"
                }`}
              >
                {step.title}
              </span>
              <span className="text-[11px] font-medium text-gray-500 hidden sm:block">
                {step.isActive ? "In Progress" : step.isComplete ? "Completed" : "Next"}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
