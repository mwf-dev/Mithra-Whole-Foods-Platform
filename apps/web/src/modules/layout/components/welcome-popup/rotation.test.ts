import { describe, expect, it } from "vitest"
import { EMPTY_STATE, pickCard, type RotationState } from "./rotation"
import type { WelcomeCard } from "./cards"

const world = { bg: "#000", ink: "#fff", deep: "#000" }
const card = (id: string, extra: Partial<WelcomeCard> = {}): WelcomeCard => ({
  id,
  kind: "product",
  title: id,
  cta: "Go",
  href: "/",
  world,
  ...extra,
})

const first = () => 0
const TODAY = "2026-10-31"

describe("pickCard", () => {
  it("gives a new visitor the sign-up card first", () => {
    const cards = [card("a"), card("signup", { kind: "signup" }), card("b")]
    expect(pickCard(cards, EMPTY_STATE, TODAY, first).card?.id).toBe("signup")
  })

  it("never repeats a card until every card has been shown", () => {
    const cards = [card("a"), card("b"), card("c")]
    let state: RotationState = EMPTY_STATE
    const shown: string[] = []
    for (let i = 0; i < 3; i++) {
      const r = pickCard(cards, state, TODAY, first)
      shown.push(r.card!.id)
      state = r.next
    }
    expect(new Set(shown).size).toBe(3)
  })

  it("starts a new round without opening with the card that ended the last", () => {
    const cards = [card("a"), card("b")]
    const state: RotationState = { seen: ["a", "b"], last: "b", featured: {} }
    const r = pickCard(cards, state, TODAY, first)
    expect(r.card?.id).toBe("a")
    expect(r.next.seen).toEqual(["a"])
  })

  it("shows an admin card scheduled for today first, once per day", () => {
    const promo = card("promo", { kind: "custom", showFrom: "2026-10-30", showUntil: "2026-11-02" })
    const cards = [card("a"), promo]
    const r1 = pickCard(cards, EMPTY_STATE, TODAY, first)
    expect(r1.card?.id).toBe("promo")
    const r2 = pickCard(cards, r1.next, TODAY, first)
    expect(r2.card?.id).toBe("a")
    const r3 = pickCard(cards, r2.next, "2026-11-01", first)
    expect(r3.card?.id).toBe("promo")
  })

  it("skips a scheduled card outside its window", () => {
    const promo = card("promo", { kind: "custom", showFrom: "2026-11-05" })
    expect(pickCard([promo, card("a")], EMPTY_STATE, TODAY, first).card?.id).toBe("a")
  })

  it("returns nothing when there are no eligible cards", () => {
    expect(pickCard([], EMPTY_STATE, TODAY).card).toBeNull()
  })

  it("ignores remembered ids that no longer exist", () => {
    const state: RotationState = { seen: ["gone"], last: "gone", featured: {} }
    expect(pickCard([card("a")], state, TODAY, first).card?.id).toBe("a")
  })
})
