import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Photo } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  FocusModal,
  Heading,
  Input,
  Switch,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type Issue = "no_price" | "no_photo" | "no_description" | "out_of_stock"
type Card = {
  id: string
  title: string
  handle: string
  visible: boolean
  thumbnail: string | null
  price: number | null
  stock: number | null
  category: string | null
  issues: Issue[]
}
type Detail = Card & {
  description: string
  images: { id: string; url: string }[]
  manage_inventory: boolean
  reserved: number
  multi_variant: boolean
}

const ISSUE_LABEL: Record<Issue, string> = {
  no_price: "No price",
  no_photo: "No photo",
  no_description: "No description",
  out_of_stock: "Out of stock",
}

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.message || `Request failed (${res.status})`)
  return body
}

const money = (n: number | null) => (n ? `$${n.toFixed(2)}` : null)

/** Asks the operator before anything changes what shoppers see. */
function useVisibilityConfirm() {
  const prompt = usePrompt()
  return async (title: string, makeVisible: boolean, issues: Issue[]) => {
    const warn = makeVisible && issues.length
      ? ` Heads up: ${issues.map((i) => ISSUE_LABEL[i].toLowerCase()).join(", ")}.`
      : ""
    return prompt({
      title: makeVisible ? `Show "${title}" on the website?` : `Hide "${title}" from the website?`,
      description: makeVisible
        ? `Shoppers will be able to find and buy it — in the shop, search and on its own page — within a few minutes.${warn}`
        : "Shoppers will no longer see it anywhere: shop, search, collections or its own page. It is also taken out of any open carts, and nobody can check out with it. You can show it again any time.",
      confirmText: makeVisible ? "Yes, show it" : "Yes, hide it",
      cancelText: "Cancel",
    })
  }
}

function ProductCard({
  p,
  onOpen,
  onToggle,
}: {
  p: Card
  onOpen: () => void
  onToggle: (next: boolean) => void
}) {
  return (
    <div className={`rounded-xl border border-ui-border-base bg-ui-bg-base overflow-hidden ${p.visible ? "" : "opacity-80"}`}>
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="aspect-square bg-ui-bg-subtle">
          {p.thumbnail ? (
            <img src={p.thumbnail} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-ui-fg-muted text-sm">No photo</div>
          )}
        </div>
        <div className="p-3">
          <Text size="small" weight="plus" className="line-clamp-2 min-h-[2.5rem]">{p.title}</Text>
          <Text size="small" className={p.price ? "" : "text-ui-fg-muted italic"}>
            {money(p.price) ?? "Coming soon"}
          </Text>
          <div className="mt-2 flex flex-wrap gap-1">
            {p.issues.map((i) => (
              <Badge key={i} size="2xsmall" color={i === "out_of_stock" ? "orange" : "red"}>
                {ISSUE_LABEL[i]}
              </Badge>
            ))}
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-ui-border-base px-3 py-2">
        <Badge size="2xsmall" color={p.visible ? "green" : "grey"}>{p.visible ? "Live on website" : "Hidden"}</Badge>
        <Switch checked={p.visible} onCheckedChange={onToggle} aria-label={`Show ${p.title} on the website`} />
      </div>
    </div>
  )
}

function Editor({
  id,
  storefrontUrl,
  onClose,
  onChanged,
}: {
  id: string
  storefrontUrl: string | null
  onClose: () => void
  onChanged: (d: Detail) => void
}) {
  const confirmVisibility = useVisibilityConfirm()
  const prompt = usePrompt()
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)

  const [saved, setSaved] = useState<Detail | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hydrate = useCallback((d: Detail) => {
    setSaved(d)
    setTitle(d.title)
    setDescription(d.description)
    setPrice(d.price ? String(d.price) : "")
    setStock(d.stock === null ? "" : String(d.stock))
    setImages(d.images.map((i) => i.url))
    setActive(0)
  }, [])

  useEffect(() => {
    api(`/admin/catalog-manager/${id}`).then((r) => hydrate(r.product)).catch((e) => setError(e.message))
  }, [id, hydrate])

  const changes = useMemo(() => {
    if (!saved) return {}
    const c: Record<string, unknown> = {}
    if (title.trim() !== saved.title) c.title = title.trim()
    if (description.trim() !== saved.description.trim()) c.description = description.trim()
    if (JSON.stringify(images) !== JSON.stringify(saved.images.map((i) => i.url))) c.images = images
    const p = price.trim() === "" ? null : Number(price)
    if (p !== saved.price) c.price = p
    if (saved.manage_inventory && stock.trim() !== "" && Number(stock) !== saved.stock) c.stock = Number(stock)
    return c
  }, [saved, title, description, images, price, stock])

  const dirty = Object.keys(changes).length > 0
  const priceInvalid = price.trim() !== "" && !(Number(price) >= 0)
  const stockInvalid = stock.trim() !== "" && !(Number.isInteger(Number(stock)) && Number(stock) >= 0)

  const upload = async (files: FileList | null, replaceIndex?: number) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const f of Array.from(files)) {
        const fd = new FormData()
        fd.append("files", f)
        const res = await fetch("/admin/uploads", { method: "POST", body: fd, credentials: "include" })
        const data = await res.json().catch(() => ({}))
        const url = data?.files?.[0]?.url
        if (!res.ok || !url) throw new Error(data?.message || "Upload failed")
        urls.push(url)
      }
      setImages((cur) => {
        if (replaceIndex !== undefined && urls[0]) {
          const next = [...cur]
          next[replaceIndex] = urls[0]
          return next
        }
        return [...cur, ...urls].slice(0, 12)
      })
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
      if (replaceRef.current) replaceRef.current.value = ""
    }
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return
    setImages((cur) => {
      const next = [...cur]
      const [x] = next.splice(from, 1)
      next.splice(to, 0, x)
      return next
    })
    setActive(to)
  }

  const remove = (i: number) => {
    setImages((cur) => cur.filter((_, idx) => idx !== i))
    setActive(0)
  }

  const save = async (): Promise<Detail | null> => {
    if (!saved || !dirty || priceInvalid || stockInvalid) return saved
    setBusy(true)
    try {
      const r = await api(`/admin/catalog-manager/${id}`, { method: "POST", body: JSON.stringify(changes) })
      hydrate(r.product)
      onChanged(r.product)
      toast.success(saved.visible ? "Saved — live on the website" : "Saved")
      return r.product
    } catch (e: any) {
      toast.error(e.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  const setVisible = async (next: boolean) => {
    if (!saved) return
    // Judge the warnings on what's on screen, including unsaved edits.
    const current: Issue[] = []
    if (!(price.trim() && Number(price) > 0)) current.push("no_price")
    if (!images.length) current.push("no_photo")
    if (!description.trim()) current.push("no_description")
    if (!(await confirmVisibility(saved.title, next, current))) return false
    setBusy(true)
    try {
      if (dirty) {
        const s = await save()
        if (!s) return false
      }
      const r = await api(`/admin/catalog-manager/${id}/visibility`, {
        method: "POST",
        body: JSON.stringify({ visible: next, confirm: true }),
      })
      hydrate(r.product)
      onChanged(r.product)
      toast.success(next ? "Now live on the website" : "Hidden from the website")
      return true
    } catch (e: any) {
      toast.error(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const close = async () => {
    if (dirty) {
      const ok = await prompt({
        title: "Discard your changes?",
        description: "You have edits that haven't been saved.",
        confirmText: "Discard",
        cancelText: "Keep editing",
      })
      if (!ok) return
    }
    onClose()
  }

  const heroUrl = images[active] ?? images[0]
  const editable =
    "w-full rounded-md bg-transparent px-2 -mx-2 outline-none ring-1 ring-transparent hover:ring-ui-border-strong focus:ring-2 focus:ring-ui-border-interactive"

  return (
    <FocusModal open onOpenChange={(o) => !o && close()}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Heading level="h2">{saved?.title ?? "Loading…"}</Heading>
              {saved && (
                <Badge size="2xsmall" color={saved.visible ? "green" : "grey"}>
                  {saved.visible ? "Live on website" : "Hidden"}
                </Badge>
              )}
            </div>
            {saved?.visible && storefrontUrl && (
              <a href={`${storefrontUrl}/us/products/${saved.handle}`} target="_blank" rel="noreferrer" className="text-sm underline">
                View on website ↗
              </a>
            )}
          </div>
        </FocusModal.Header>

        <FocusModal.Body className="overflow-y-auto">
          {error && <Text className="p-6 text-ui-fg-error">{error}</Text>}
          {!saved && !error && <Text className="p-6 text-ui-fg-subtle">Loading…</Text>}
          {saved && (
            <div className="mx-auto max-w-5xl p-6">
              <Text size="small" className="mb-4 text-ui-fg-subtle">
                This is how the product looks on the website. Click the photo, name, price or description to edit it.
              </Text>

              <div className="grid gap-8 md:grid-cols-2">
                {/* Gallery — same layout as the product page */}
                <div>
                  <button
                    type="button"
                    className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-ui-bg-subtle ring-1 ring-ui-border-base hover:ring-ui-border-interactive"
                    onClick={() => (heroUrl ? replaceRef.current?.click() : fileRef.current?.click())}
                    title={heroUrl ? "Click to replace this photo" : "Click to add a photo"}
                  >
                    {heroUrl ? (
                      <img src={heroUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-ui-fg-muted">Click to add a photo</span>
                    )}
                    {uploading && (
                      <span className="absolute inset-0 flex items-center justify-center bg-ui-bg-base/70 text-sm">Uploading…</span>
                    )}
                  </button>
                  <input ref={replaceRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files, active)} />
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />

                  <div className="mt-3 flex flex-wrap gap-2">
                    {images.map((url, i) => (
                      <div key={url + i} className={`w-20 ${i === active ? "ring-2 ring-ui-border-interactive" : "ring-1 ring-ui-border-base"} rounded-lg overflow-hidden bg-ui-bg-base`}>
                        <button type="button" onClick={() => setActive(i)} className="block aspect-square w-full">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </button>
                        <div className="flex justify-between px-1 py-0.5 text-xs">
                          <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move earlier">←</button>
                          <button type="button" onClick={() => remove(i)} aria-label="Remove photo" className="text-ui-fg-error">✕</button>
                          <button type="button" disabled={i === images.length - 1} onClick={() => move(i, i + 1)} aria-label="Move later">→</button>
                        </div>
                        {i === 0 && <div className="bg-ui-bg-subtle text-center text-[10px]">Cover</div>}
                      </div>
                    ))}
                    {images.length < 12 && (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex aspect-square w-20 items-center justify-center rounded-lg border border-dashed border-ui-border-strong text-2xl text-ui-fg-muted hover:bg-ui-bg-subtle"
                        aria-label="Add photos"
                      >
                        +
                      </button>
                    )}
                  </div>
                  <Text size="xsmall" className="mt-2 text-ui-fg-muted">The first photo is the cover shown on product cards.</Text>
                </div>

                {/* Info — same order as the product page */}
                <div className="flex flex-col gap-4">
                  {saved.category && <Text size="small" className="text-ui-fg-muted">{saved.category}</Text>}
                  <input
                    className={`${editable} text-3xl font-semibold leading-10`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    aria-label="Product name"
                    placeholder="Product name"
                  />

                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-semibold">$</span>
                    <input
                      className={`${editable} w-32 text-2xl font-semibold`}
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Coming soon"
                      aria-label="Price in US dollars"
                    />
                    {!price.trim() && <Text size="small" className="text-ui-fg-muted">Leave empty to show “Coming soon”.</Text>}
                  </div>
                  {priceInvalid && <Text size="small" className="text-ui-fg-error">Enter a price like 4.99.</Text>}

                  <div className="flex items-center gap-2">
                    <Text size="small" weight="plus">In stock:</Text>
                    {saved.manage_inventory ? (
                      <>
                        <Input
                          size="small"
                          className="w-24"
                          inputMode="numeric"
                          value={stock}
                          onChange={(e) => setStock(e.target.value)}
                          aria-label="Stock quantity"
                        />
                        {saved.reserved > 0 && <Text size="xsmall" className="text-ui-fg-muted">{saved.reserved} reserved by open orders</Text>}
                      </>
                    ) : (
                      <Text size="small" className="text-ui-fg-muted">Not tracked — always available</Text>
                    )}
                  </div>
                  {stockInvalid && <Text size="small" className="text-ui-fg-error">Stock must be a whole number.</Text>}

                  <Textarea
                    className="min-h-[200px] whitespace-pre-line"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the product — what it is, how it's made, how to use it."
                    aria-label="Description"
                  />
                  {saved.multi_variant && (
                    <Text size="xsmall" className="text-ui-fg-error">
                      This product has several variants — price and stock here apply to the first one only.
                    </Text>
                  )}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between rounded-xl border border-ui-border-base p-4">
                <div>
                  <Text weight="plus">Show this product on the website</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {saved.visible
                      ? "Customers can see and buy it. Turn off to hide it everywhere."
                      : "Hidden — customers can't see it anywhere. Turn on to publish."}
                  </Text>
                </div>
                <Switch checked={saved.visible} disabled={busy} onCheckedChange={setVisible} aria-label="Show on website" />
              </div>
            </div>
          )}
        </FocusModal.Body>

        <div className="flex items-center justify-end gap-2 border-t border-ui-border-base px-6 py-3">
          <Text size="small" className="mr-auto text-ui-fg-subtle">
            {dirty ? "You have unsaved changes." : "All changes saved."}
            {dirty && saved?.visible && " Saving updates the live website."}
          </Text>
          <Button variant="secondary" onClick={close}>{dirty ? "Cancel" : "Close"}</Button>
          <Button variant="secondary" disabled={!dirty || busy || priceInvalid || stockInvalid} isLoading={busy} onClick={save}>
            Save changes
          </Button>
          {saved && !saved.visible && (
            <Button disabled={busy || priceInvalid || stockInvalid} onClick={() => setVisible(true)}>
              {dirty ? "Save & publish…" : "Publish…"}
            </Button>
          )}
        </div>
      </FocusModal.Content>
    </FocusModal>
  )
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "hidden", label: "Hidden" },
  { key: "attention", label: "Needs attention" },
] as const
type FilterKey = (typeof FILTERS)[number]["key"]

const ProductStudioPage = () => {
  const confirmVisibility = useVisibilityConfirm()
  const [products, setProducts] = useState<Card[] | null>(null)
  const [storefrontUrl, setStorefrontUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [filter, setFilter] = useState<FilterKey>("all")
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await api("/admin/catalog-manager")
      setProducts(r.products)
      setStorefrontUrl(r.storefront_url)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(() => {
    const ps = products ?? []
    return {
      all: ps.length,
      live: ps.filter((p) => p.visible).length,
      hidden: ps.filter((p) => !p.visible).length,
      attention: ps.filter((p) => p.issues.some((i) => i !== "out_of_stock")).length,
    }
  }, [products])

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (products ?? []).filter((p) => {
      if (term && !p.title.toLowerCase().includes(term)) return false
      if (filter === "live") return p.visible
      if (filter === "hidden") return !p.visible
      if (filter === "attention") return p.issues.some((i) => i !== "out_of_stock")
      return true
    })
  }, [products, q, filter])

  const patch = (d: Card) => setProducts((ps) => (ps ?? []).map((p) => (p.id === d.id ? { ...p, ...d } : p)))

  const toggle = async (p: Card, next: boolean) => {
    if (!(await confirmVisibility(p.title, next, p.issues))) return
    try {
      const r = await api(`/admin/catalog-manager/${p.id}/visibility`, {
        method: "POST",
        body: JSON.stringify({ visible: next, confirm: true }),
      })
      patch(r.product)
      toast.success(next ? `"${p.title}" is now live` : `"${p.title}" is hidden`)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <Container className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div>
          <Heading level="h1">Product studio</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Your products as customers see them. Click one to edit it; use the switch to show or hide it on the website.
          </Text>
        </div>
        <Input className="w-64" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-2 border-y border-ui-border-base px-6 py-3">
        {FILTERS.map((f) => (
          <Button key={f.key} size="small" variant={filter === f.key ? "primary" : "secondary"} onClick={() => setFilter(f.key)}>
            {f.label} ({counts[f.key]})
          </Button>
        ))}
      </div>

      <div className="px-6 py-5">
        {error && <Text className="text-ui-fg-error">Couldn't load products: {error}</Text>}
        {!products && !error && <Text className="text-ui-fg-subtle">Loading…</Text>}
        {products && shown.length === 0 && <Text className="text-ui-fg-subtle">No products match.</Text>}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {shown.map((p) => (
            <ProductCard key={p.id} p={p} onOpen={() => setOpenId(p.id)} onToggle={(n) => toggle(p, n)} />
          ))}
        </div>
      </div>

      {openId && (
        <Editor id={openId} storefrontUrl={storefrontUrl} onClose={() => setOpenId(null)} onChanged={patch} />
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Product studio",
  icon: Photo,
})

export default ProductStudioPage
