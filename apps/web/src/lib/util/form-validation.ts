/**
 * Minimal server-side form validation for server actions.
 *
 * Browser `required`/`type=email` attributes are advisory only — a crafted
 * request bypasses them, so every server action must re-validate. Returns
 * trimmed values plus the first human-readable error (the actions surface a
 * single error string via useActionState).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[\d\s\-().]{5,31}$/
const COUNTRY_CODE_RE = /^[a-zA-Z]{2}$/

export type FieldRule = {
  label: string
  required?: boolean
  maxLength?: number
  minLength?: number
  kind?: "email" | "phone" | "countryCode"
}

export type ValidationResult = {
  values: Record<string, string>
  error: string | null
}

export function validateFormFields(
  formData: FormData,
  rules: Record<string, FieldRule>
): ValidationResult {
  const values: Record<string, string> = {}

  for (const [field, rule] of Object.entries(rules)) {
    const raw = formData.get(field)
    const value = typeof raw === "string" ? raw.trim() : ""
    values[field] = value

    if (!value) {
      if (rule.required) {
        return { values, error: `${rule.label} is required.` }
      }
      continue
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      return {
        values,
        error: `${rule.label} must be at most ${rule.maxLength} characters.`,
      }
    }

    if (rule.minLength && value.length < rule.minLength) {
      return {
        values,
        error: `${rule.label} must be at least ${rule.minLength} characters.`,
      }
    }

    if (rule.kind === "email" && !EMAIL_RE.test(value)) {
      return { values, error: `Please enter a valid email address.` }
    }

    if (rule.kind === "phone" && !PHONE_RE.test(value)) {
      return { values, error: `Please enter a valid phone number.` }
    }

    if (rule.kind === "countryCode" && !COUNTRY_CODE_RE.test(value)) {
      return { values, error: `Please select a valid country.` }
    }
  }

  return { values, error: null }
}

export const addressRules = (
  prefix = ""
): Record<string, FieldRule> => ({
  [`${prefix}first_name`]: { label: "First name", required: true, maxLength: 100 },
  [`${prefix}last_name`]: { label: "Last name", required: true, maxLength: 100 },
  [`${prefix}company`]: { label: "Company", maxLength: 200 },
  [`${prefix}address_1`]: { label: "Address", required: true, maxLength: 255 },
  [`${prefix}address_2`]: { label: "Apartment/suite", maxLength: 255 },
  [`${prefix}city`]: { label: "City", required: true, maxLength: 100 },
  [`${prefix}postal_code`]: { label: "Postal code", required: true, maxLength: 20 },
  [`${prefix}province`]: { label: "State/Province", maxLength: 100 },
  [`${prefix}country_code`]: {
    label: "Country",
    required: true,
    kind: "countryCode",
  },
  [`${prefix}phone`]: { label: "Phone", maxLength: 32, kind: "phone" },
})
