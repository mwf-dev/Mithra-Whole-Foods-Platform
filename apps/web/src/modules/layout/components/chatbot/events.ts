/**
 * Fired by the arrival popup once it is out of the way (closed, or decided not
 * to show), so the support chat can greet without two things popping up at
 * once. Also mirrored on `window.__mithraWelcomeSettled` for a listener that
 * mounts after the event.
 */
export const WELCOME_SETTLED_EVENT = "mithra:welcome-settled"

/**
 * `window.__mithraWelcomeOpen` is true while the popup is on screen. The chat's
 * fallback timer checks it, so a visitor who is still reading the card is
 * never greeted over the top of it.
 */
export const WELCOME_OPEN_FLAG = "__mithraWelcomeOpen"
