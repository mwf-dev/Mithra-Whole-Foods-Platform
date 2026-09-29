"use server"

import { setWelcomePromptDismissed } from "./cookies"

/**
 * Remembers that the visitor closed the sign-in invite, so it never returns.
 * A Server Action because cookies can only be written outside of render.
 */
export async function dismissWelcomePrompt() {
  await setWelcomePromptDismissed()
}
