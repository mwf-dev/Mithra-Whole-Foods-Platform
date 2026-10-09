import {
  SECTION_KEYS,
  decide,
  defaultSections,
  hiddenNav,
  normalizeSections,
  parseSuperEmails,
  type AccessContext,
} from "../admin-access"

const ctx = (over: Partial<AccessContext> = {}): AccessContext => ({
  enforced: true,
  isSuper: false,
  actorId: "user_client",
  sections: defaultSections(),
  ...over,
})

describe("parseSuperEmails", () => {
  it("splits on commas/spaces/semicolons, lowercases, drops junk", () => {
    expect(parseSuperEmails(" Me@X.com, you@y.co ;nope ")).toEqual(["me@x.com", "you@y.co"])
    expect(parseSuperEmails(undefined)).toEqual([])
    expect(parseSuperEmails("")).toEqual([])
  })
})

describe("normalizeSections", () => {
  it("defaults everything on and ignores unknown or non-boolean values", () => {
    expect(normalizeSections(null)).toEqual(defaultSections())
    const s = normalizeSections({ orders: false, bogus: false, products: "no" })
    expect(s.orders).toBe(false)
    expect(s.products).toBe(true)
    expect((s as any).bogus).toBeUndefined()
    expect(Object.keys(s).sort()).toEqual([...SECTION_KEYS].sort())
  })
})

describe("decide", () => {
  it("allows everything when not enforced (no super admin set up yet)", () => {
    expect(decide("POST", "/admin/invites", ctx({ enforced: false })).allow).toBe(true)
    expect(decide("GET", "/admin/platform/health", ctx({ enforced: false })).allow).toBe(true)
  })
  it("allows a super admin everything", () => {
    expect(decide("DELETE", "/admin/users/user_x", ctx({ isSuper: true })).allow).toBe(true)
    expect(decide("POST", "/admin/client-access", ctx({ isSuper: true })).allow).toBe(true)
  })
  it("blocks the technical areas for a client, including sub-paths", () => {
    for (const p of ["/admin/platform", "/admin/platform/health", "/admin/usage", "/admin/client-access", "/admin/invites", "/admin/api-keys/x"]) {
      expect(decide("GET", p, ctx()).allow).toBe(false)
    }
  })
  it("does not confuse look-alike prefixes", () => {
    expect(decide("GET", "/admin/platformx", ctx()).allow).toBe(true)
    expect(decide("GET", "/admin/usage-report", ctx()).allow).toBe(true)
  })
  it("lets a client read users and edit themselves, but not manage others", () => {
    expect(decide("GET", "/admin/users/me", ctx()).allow).toBe(true)
    expect(decide("GET", "/admin/users", ctx()).allow).toBe(true)
    expect(decide("POST", "/admin/users/me", ctx()).allow).toBe(true)
    expect(decide("POST", "/admin/users/user_client", ctx()).allow).toBe(true)
    expect(decide("POST", "/admin/users/user_other", ctx()).allow).toBe(false)
    expect(decide("DELETE", "/admin/users/user_client", ctx()).allow).toBe(false)
    expect(decide("POST", "/admin/users", ctx()).allow).toBe(false)
  })
  it("honours the section switches", () => {
    const off = ctx({ sections: { ...defaultSections(), orders: false, product_studio: false } })
    expect(decide("GET", "/admin/orders", off).allow).toBe(false)
    expect(decide("POST", "/admin/orders/order_1/fulfillments", off).allow).toBe(false)
    expect(decide("GET", "/admin/catalog-manager/p1", off).allow).toBe(false)
    expect(decide("GET", "/admin/ship-orders", off).allow).toBe(true)
    expect(decide("GET", "/admin/customers", off).allow).toBe(true)
  })
  it("always lets the shell look up its own access", () => {
    const everythingOff = ctx({ sections: Object.fromEntries(SECTION_KEYS.map((k) => [k, false])) as any })
    expect(decide("GET", "/admin/my-access", everythingOff).allow).toBe(true)
    expect(decide("GET", "/admin/users/me", everythingOff).allow).toBe(true)
  })
  it("ignores query strings and trailing slashes", () => {
    expect(decide("GET", "/admin/platform/?x=1", ctx()).allow).toBe(false)
  })
})

describe("hiddenNav", () => {
  it("hides nothing for super or when not enforced", () => {
    expect(hiddenNav(ctx({ isSuper: true }))).toEqual([])
    expect(hiddenNav(ctx({ enforced: false }))).toEqual([])
  })
  it("always hides the technical pages for a client, plus anything switched off", () => {
    const h = hiddenNav(ctx({ sections: { ...defaultSections(), inventory: false } }))
    expect(h).toEqual(expect.arrayContaining(["/platform", "/control-center", "/inventory", "/reservations"]))
    expect(h).not.toContain("/orders")
  })
})
