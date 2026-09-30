import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront, Trash, Plus } from "@medusajs/icons"
import { Container, Heading, Text, Button, Input, Label, IconButton, toast } from "@medusajs/ui"
import { useState, useEffect, useRef } from "react"

// Injected at admin build time from STOREFRONT_URL (see medusa-config.ts).
// Used for the live-preview iframe and as the postMessage target origin.
const STOREFRONT_URL: string =
  (import.meta as any).env?.VITE_STOREFRONT_URL || "http://localhost:8000"
const STOREFRONT_ORIGIN = new URL(STOREFRONT_URL).origin

type ListItem = Record<string, string>

type ListFieldDef = {
  key: string
  label: string
  placeholder?: string
  hint?: string
  type: "text" | "image" | "select"
  options?: { value: string; label: string }[]
}

// Must match OFFER_THEMES in the storefront (apps/web/src/modules/home/aisles.ts).
const OFFER_THEME_OPTIONS = [
  { value: "", label: "Automatic (cycles through the colours)" },
  { value: "ghee", label: "Ghee yellow" },
  { value: "podis", label: "Podi orange" },
  { value: "oils", label: "Oil teal" },
  { value: "ragi", label: "Ragi plum" },
  { value: "sweets", label: "Leaf green (sweets)" },
  { value: "rice", label: "Rice red" },
  { value: "millets", label: "Millet sand" },
  { value: "health", label: "Health-mix kraft" },
  { value: "festival", label: "Festival night (Diwali)" },
  { value: "mithra", label: "Mithra green" },
]

type ListSection = {
  field: "offer_cards"
  heading: string
  description: string
  maxItems: number
  itemLabel: string
  fields: ListFieldDef[]
}

// Hero slides and the category circles are now designed in code
// (apps/web/src/modules/home/aisles.ts), so only the offer cards are edited
// here. `hero_banners` / `category_tiles` / the promo and hero fields are
// still loaded and saved back untouched — they are just no longer shown.
const LIST_SECTIONS: ListSection[] = [
  {
    field: "offer_cards",
    heading: "Offers",
    description:
      "Large offer cards on the homepage. Each card gets a colour theme and, unless you upload a picture, that theme's product pack. Only list offers that are real — a discount code must exist as a promotion in Medusa.",
    maxItems: 8,
    itemLabel: "Offer",
    fields: [
      { key: "badge", label: "Badge", placeholder: "E.g. Free delivery", type: "text" },
      { key: "title", label: "Title", placeholder: "E.g. Free delivery on orders over $49", type: "text" },
      { key: "subtitle", label: "Subtitle", placeholder: "E.g. Anywhere in the US. Cash on delivery available.", type: "text" },
      { key: "code", label: "Discount code (optional)", placeholder: "E.g. DIWALI10", hint: "Shown with a Copy button. Create the promotion first under Promotions.", type: "text" },
      { key: "cta", label: "Button text", placeholder: "E.g. Shop now", type: "text" },
      { key: "link", label: "Link", placeholder: "/categories/ghee", type: "text" },
      { key: "theme", label: "Colour theme", type: "select", options: OFFER_THEME_OPTIONS },
      { key: "image_url", label: "Picture (optional)", hint: "Leave empty to use the theme's product pack. A cut-out PNG with a transparent background looks best.", type: "image" },
    ],
  },
]

const EMPTY_SETTINGS = {
  hero_title: "",
  hero_subtitle: "",
  hero_image_url: "",
  promo_card_1_title: "",
  promo_card_1_url: "",
  promo_card_2_title: "",
  promo_card_2_url: "",
  announcement_text: "",
  footer_tagline: "",
  hero_banners: [] as ListItem[],
  offer_cards: [] as ListItem[],
  category_tiles: [] as ListItem[],
}

const HomepageSettings = () => {
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<any>(EMPTY_SETTINGS)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Fetch initial data
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/admin/homepage", {
          headers: { "Content-Type": "application/json" },
        })
        const data = await res.json()
        if (data.homepage_settings) {
          const s = data.homepage_settings
          setSettings({
            ...EMPTY_SETTINGS,
            ...s,
            hero_banners: Array.isArray(s.hero_banners) ? s.hero_banners : [],
            offer_cards: Array.isArray(s.offer_cards) ? s.offer_cards : [],
            category_tiles: Array.isArray(s.category_tiles) ? s.category_tiles : [],
          })
        }
      } catch (err) {
        console.error("Failed to load homepage settings", err)
        toast.error("Failed to load settings")
      }
    }
    fetchSettings()
  }, [])

  // Send preview updates to iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "UPDATE_PREVIEW", settings },
        STOREFRONT_ORIGIN
      )
    }
  }, [settings])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSettings((prev: any) => ({ ...prev, [name]: value }))
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append("files", file)
    try {
      const res = await fetch("/admin/uploads", { method: "POST", body: formData })
      const data = await res.json()
      if (data.files && data.files.length > 0) {
        toast.success("Image uploaded")
        return data.files[0].url
      }
      toast.error("Failed to upload image")
    } catch (err) {
      console.error(err)
      toast.error("Upload error")
    }
    return null
  }

  // --- list helpers ---
  const updateListItem = (field: string, idx: number, key: string, value: string) => {
    setSettings((prev: any) => {
      const list = [...(prev[field] ?? [])]
      list[idx] = { ...list[idx], [key]: value }
      return { ...prev, [field]: list }
    })
  }

  const addListItem = (field: string) => {
    setSettings((prev: any) => ({
      ...prev,
      [field]: [...(prev[field] ?? []), {}],
    }))
  }

  const removeListItem = (field: string, idx: number) => {
    setSettings((prev: any) => {
      const list = [...(prev[field] ?? [])]
      list.splice(idx, 1)
      return { ...prev, [field]: list }
    })
  }

  const handleListImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    idx: number
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    const url = await uploadFile(file)
    setLoading(false)
    if (url) {
      updateListItem(field, idx, "image_url", url)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const res = await fetch("/admin/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        // The backend triggers storefront cache revalidation server-side
        // (keeps the revalidate secret out of the browser).
        toast.success("Settings saved successfully!")
      } else {
        const data = await res.json().catch(() => null)
        toast.error(data?.errors?.join(", ") || "Failed to save settings")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error saving settings")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-[450px_1fr] gap-6 h-[calc(100vh-80px)] overflow-hidden">
      <Container className="overflow-y-auto h-full p-6">
        <div className="flex flex-col gap-8">
          <div>
            <Heading level="h1">Homepage Settings</Heading>
            <Text className="text-ui-fg-subtle">
              Everything on the storefront homepage is managed here. Save to
              publish — the storefront updates immediately.
            </Text>
          </div>

          {/* Announcement bar */}
          <div className="flex flex-col gap-4 border-b pb-6">
            <Heading level="h2">Announcement Bar</Heading>
            <Text className="text-ui-fg-muted text-xs">
              Thin bar above the header. Leave empty to hide it.
            </Text>
            <div className="flex flex-col gap-2">
              <Label>Announcement</Label>
              <Input
                name="announcement_text"
                value={settings.announcement_text || ""}
                onChange={handleChange}
                placeholder="E.g. Free delivery on orders above ₹499"
              />
            </div>
          </div>

          {/* Offer cards */}
          {LIST_SECTIONS.map((section) => (
            <div key={section.field} className="flex flex-col gap-4 border-b pb-6">
              <Heading level="h2">{section.heading}</Heading>
              <Text className="text-ui-fg-muted text-xs">{section.description}</Text>

              {(settings[section.field] ?? []).map((item: ListItem, idx: number) => (
                <div
                  key={idx}
                  className="flex flex-col gap-3 border rounded-md p-4 bg-ui-bg-subtle"
                >
                  <div className="flex items-center justify-between">
                    <Text className="font-semibold text-sm">
                      {section.itemLabel} {idx + 1}
                    </Text>
                    <IconButton
                      size="small"
                      variant="transparent"
                      onClick={() => removeListItem(section.field, idx)}
                      aria-label={`Remove ${section.itemLabel} ${idx + 1}`}
                    >
                      <Trash />
                    </IconButton>
                  </div>
                  {section.fields.map((f) =>
                    f.type === "image" ? (
                      <div key={f.key} className="flex flex-col gap-2">
                        <Label>{f.label}</Label>
                        {f.hint && (
                          <Text className="text-ui-fg-muted text-xs">{f.hint}</Text>
                        )}
                        {item[f.key] && (
                          <div className="flex items-center gap-2">
                            <img
                              src={item[f.key]}
                              alt={f.label}
                              className="h-24 flex-1 object-contain rounded-md border bg-ui-bg-base"
                            />
                            <Button
                              size="small"
                              variant="secondary"
                              onClick={() => updateListItem(section.field, idx, f.key, "")}
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleListImageUpload(e, section.field, idx)
                          }
                        />
                      </div>
                    ) : f.type === "select" ? (
                      <div key={f.key} className="flex flex-col gap-2">
                        <Label>{f.label}</Label>
                        <select
                          value={item[f.key] || ""}
                          onChange={(e) =>
                            updateListItem(section.field, idx, f.key, e.target.value)
                          }
                          className="h-8 rounded-md border border-ui-border-base bg-ui-bg-field px-2 text-sm"
                        >
                          {f.options?.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div key={f.key} className="flex flex-col gap-2">
                        <Label>{f.label}</Label>
                        <Input
                          value={item[f.key] || ""}
                          placeholder={f.placeholder}
                          onChange={(e) =>
                            updateListItem(section.field, idx, f.key, e.target.value)
                          }
                        />
                        {f.hint && (
                          <Text className="text-ui-fg-muted text-xs">{f.hint}</Text>
                        )}
                      </div>
                    )
                  )}
                </div>
              ))}

              {(settings[section.field]?.length ?? 0) < section.maxItems && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => addListItem(section.field)}
                >
                  <Plus /> Add {section.itemLabel.toLowerCase()}
                </Button>
              )}
            </div>
          ))}

          <div className="flex flex-col gap-2 border-b pb-6">
            <Heading level="h2">Hero slides & category circles</Heading>
            <Text className="text-ui-fg-muted text-xs">
              These are designed from the product packs and live in the
              storefront code, so they always match the packaging. Ask your
              developer to add or change a slide.
            </Text>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-4 border-b pb-6">
            <Heading level="h2">Footer</Heading>
            <div className="flex flex-col gap-2">
              <Label>Footer Tagline</Label>
              <Input
                name="footer_tagline"
                value={settings.footer_tagline || ""}
                onChange={handleChange}
                placeholder="E.g. Premium quality traditional foods for a healthier you."
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={loading}
              className="w-full"
            >
              Save Settings
            </Button>
          </div>
        </div>
      </Container>

      {/* Live Preview Pane */}
      <Container className="p-0 overflow-hidden h-full flex flex-col bg-gray-50 border-l">
        <div className="p-4 border-b bg-white flex items-center justify-between">
          <Heading level="h2" className="text-gray-700">Live Preview</Heading>
          <div className="flex gap-2 items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <Text className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Syncing</Text>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          src={STOREFRONT_URL}
          className="w-full flex-1 border-none"
          title="Live Preview"
        />
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Homepage",
  icon: BuildingStorefront,
})

export default HomepageSettings
