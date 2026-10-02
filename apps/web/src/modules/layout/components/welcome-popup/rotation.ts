import type { WelcomeCard } from "./cards"

/**
 * What the browser remembers between visits (localStorage). Small on purpose:
 * which rotation cards have had their turn, the last one shown, and which
 * date-windowed cards were already featured on which day.
 */
export type RotationState = {
  seen: string[]
  last?: string
  featured: Record<string, string>
}

export const EMPTY_STATE: RotationState = { seen: [], featured: {} }

const scheduled = (c: WelcomeCard) => !!(c.showFrom || c.showUntil)

/** `today` is a local YYYY-MM-DD; string comparison is correct for that format. */
export const inWindow = (c: WelcomeCard, today: string) =>
  (!c.showFrom || c.showFrom <= today) && (!c.showUntil || c.showUntil >= today)

/**
 * Chooses the one card for this visit and the state to remember afterwards.
 *
 *  1. A card the admin scheduled for today comes first, once per day.
 *  2. Otherwise a random card that hasn't had its turn yet, so the same card
 *     never repeats until every other one has been seen.
 *  3. A brand-new visitor (nothing seen) gets the sign-up card first.
 *
 * `random` is injectable so tests are deterministic.
 */
export function pickCard(
  cards: WelcomeCard[],
  state: RotationState,
  today: string,
  random: () => number = Math.random
): { card: WelcomeCard | null; next: RotationState } {
  const eligible = cards.filter((c) => inWindow(c, today))
  const choose = <T,>(list: T[]) => list[Math.floor(random() * list.length)]

  const featured = eligible.filter(
    (c) => scheduled(c) && state.featured[c.id] !== today
  )
  if (featured.length > 0) {
    const card = choose(featured)
    return {
      card,
      next: { ...state, last: card.id, featured: { ...state.featured, [card.id]: today } },
    }
  }

  const rotation = eligible.filter((c) => !scheduled(c))
  if (rotation.length === 0) {
    return { card: null, next: state }
  }

  let seen = state.seen.filter((id) => rotation.some((c) => c.id === id))
  let pool = rotation.filter((c) => !seen.includes(c.id))
  if (pool.length === 0) {
    // Everyone has had a turn: start over, but never open the new round with
    // the card that closed the last one.
    seen = []
    pool = rotation.length > 1 ? rotation.filter((c) => c.id !== state.last) : rotation
  }

  const signup = seen.length === 0 ? pool.find((c) => c.kind === "signup") : undefined
  const card = signup ?? choose(pool)
  return { card, next: { ...state, seen: [...seen, card.id], last: card.id } }
}
