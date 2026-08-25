import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type Status = "not_started" | "draft" | "submitted" | "approved"

type BriefRow = {
  id: string
  product_id: string
  product_title: string | null
  product_handle: string | null
  status: Status
  origin: "catalog" | "client"
  archived: boolean
  archived_at: string | null
  archive_reason: string | null
  slide_count: number
  filled_slide_count: number
  image_count: number
  updated_at: string | null
  updated_by: string | null
  submitted_at: string | null
}

type SlideDetail = {
  id: string
  name: string
  content: string
  notes: string
  links: string[]
  images: { url: string; filename: string }[]
}

type Proposal = {
  title: string
  category: string
  pack_size: string
  price: string
  description: string
  ingredients: string
  notes: string
  images: { url: string; filename: string }[]
}

type BriefDetail = {
  product_title: string | null
  origin: "catalog" | "client"
  archived: boolean
  archive_reason: string | null
  summary: { tagline: string; sub_claim: string; notes: string; links: string[]; contact: string }
  slides: SlideDetail[]
  proposal: Proposal
  yaml: string
}

const BADGE_COLOR: Record<Status, "grey" | "orange" | "blue" | "green"> = {
  not_started: "grey",
  draft: "orange",
  submitted: "blue",
  approved: "green",
}

const LABEL: Record<Status, string> = {
  not_started: "Not started",
  draft: "In progress",
  submitted: "Submitted",
  approved: "Approved",
}

/**
 * Review queue for the client-facing Content Studio (/content-studio).
 * The client fills briefs there; this is where we read them, copy the YAML
 * into the image pipeline, and mark them approved.
 */
const ContentBriefsPage = () => {
  const [rows, setRows] = useState<BriefRow[]>([])
  const [studioUrl, setStudioUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<BriefDetail | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/content-briefs", { credentials: "include" })
      if (!res.ok) throw new Error(`Request failed with ${res.status}`)
      const data = await res.json()
      setRows(data.briefs ?? [])
      setStudioUrl(data.studio_url ?? null)
    } catch (error) {
      console.error(error)
      toast.error("Could not load content briefs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openBrief = async (productId: string) => {
    setBusy(productId)
    try {
      const res = await fetch(`/admin/content-briefs/${productId}`, { credentials: "include" })
      if (!res.ok) throw new Error(`Request failed with ${res.status}`)
      const data = await res.json()
      setOpen(data.brief)
    } catch (error) {
      console.error(error)
      toast.error("Could not open that brief")
    } finally {
      setBusy(null)
    }
  }

  const setStatus = async (productId: string, status: Status) => {
    setBusy(productId)
    try {
      const res = await fetch(`/admin/content-briefs/${productId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(`Request failed with ${res.status}`)
      setRows((current) =>
        current.map((row) => (row.product_id === productId ? { ...row, status } : row))
      )
      toast.success(status === "approved" ? "Brief approved" : "Sent back for edits")
    } catch (error) {
      console.error(error)
      toast.error("Could not update the brief")
    } finally {
      setBusy(null)
    }
  }

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Could not copy — select and copy manually")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Content briefs</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            What the client has written for each product&apos;s image carousel. Products
            they added themselves and products they asked to remove show up here too —
            neither touches the catalog until you act on it.
          </Text>
        </div>
        <div className="flex gap-2">
          {studioUrl ? (
            <Button
              variant="secondary"
              size="small"
              onClick={() => copy(studioUrl, "Studio link")}
            >
              Copy client link
            </Button>
          ) : (
            <Badge color="red">CONTENT_STUDIO_TOKEN not set</Badge>
          )}
          <Button variant="secondary" size="small" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text size="small" className="text-ui-fg-subtle">
            Loading…
          </Text>
        ) : rows.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            Nothing yet. Send the client the studio link and briefs will appear here as
            they save.
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Product</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Slides</Table.HeaderCell>
                <Table.HeaderCell>Images</Table.HeaderCell>
                <Table.HeaderCell>Last edited</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((row) => (
                <Table.Row key={row.id}>
                  <Table.Cell>
                    <Text size="small" weight="plus">
                      {row.product_title ?? row.product_handle ?? row.product_id}
                    </Text>
                    <div className="flex flex-wrap items-center gap-1">
                      {row.origin === "client" ? (
                        <Badge color="purple" size="2xsmall">
                          New product
                        </Badge>
                      ) : null}
                      {row.archived ? (
                        <Badge color="red" size="2xsmall">
                          Removal requested
                        </Badge>
                      ) : null}
                    </div>
                    {row.archived && row.archive_reason ? (
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        “{row.archive_reason}”
                      </Text>
                    ) : null}
                    {row.updated_by ? (
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        by {row.updated_by}
                      </Text>
                    ) : null}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={BADGE_COLOR[row.status]}>{LABEL[row.status]}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {row.filled_slide_count} / {row.slide_count}
                  </Table.Cell>
                  <Table.Cell>{row.image_count}</Table.Cell>
                  <Table.Cell>
                    {row.updated_at ? new Date(row.updated_at).toLocaleString() : "—"}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="small"
                        variant="secondary"
                        disabled={busy === row.product_id}
                        onClick={() => openBrief(row.product_id)}
                      >
                        View
                      </Button>
                      {row.status === "approved" ? (
                        <Button
                          size="small"
                          variant="transparent"
                          disabled={busy === row.product_id}
                          onClick={() => setStatus(row.product_id, "submitted")}
                        >
                          Unapprove
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          disabled={busy === row.product_id}
                          onClick={() => setStatus(row.product_id, "approved")}
                        >
                          Approve
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      <Drawer open={!!open} onOpenChange={(next) => !next && setOpen(null)}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>{open?.product_title ?? "Brief"}</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="overflow-y-auto">
            {open ? (
              <div className="flex flex-col gap-4">
                <Button size="small" onClick={() => copy(open.yaml, "Brief YAML")}>
                  Copy brief as YAML
                </Button>

                {open.archived ? (
                  <div className="border-ui-border-error rounded-lg border p-3">
                    <Text size="small" weight="plus">
                      The client asked for this to come off the shop
                    </Text>
                    <Text size="small" className="text-ui-fg-subtle whitespace-pre-line">
                      {open.archive_reason || "No reason given."}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-muted mt-1">
                      Nothing has changed in the catalog — unpublish or delete the product
                      yourself if you agree.
                    </Text>
                  </div>
                ) : null}

                {open.origin === "client" ? (
                  <div className="rounded-lg border p-3">
                    <Text size="small" weight="plus">
                      New product — not in the catalog yet
                    </Text>
                    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                      {(
                        [
                          ["Name", open.proposal.title],
                          ["Category", open.proposal.category],
                          ["Pack size", open.proposal.pack_size],
                          ["Price", open.proposal.price],
                          ["Description", open.proposal.description],
                          ["Ingredients", open.proposal.ingredients],
                          ["Notes", open.proposal.notes],
                        ] as [string, string][]
                      )
                        .filter(([, value]) => !!value)
                        .map(([label, value]) => (
                          <div key={label} className="contents">
                            <dt>
                              <Text size="xsmall" className="text-ui-fg-muted">
                                {label}
                              </Text>
                            </dt>
                            <dd>
                              <Text size="small" className="whitespace-pre-line">
                                {value}
                              </Text>
                            </dd>
                          </div>
                        ))}
                    </dl>
                    {open.proposal.images.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {open.proposal.images.map((image) => (
                          <a key={image.url} href={image.url} target="_blank" rel="noreferrer noopener">
                            <img
                              src={image.url}
                              alt={image.filename}
                              className="h-16 w-16 rounded object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <Text size="small" weight="plus">
                    Tagline
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {open.summary.tagline || "—"}
                  </Text>
                  <Text size="small" weight="plus" className="mt-2">
                    Short claim
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {open.summary.sub_claim || "—"}
                  </Text>
                  {open.summary.notes ? (
                    <>
                      <Text size="small" weight="plus" className="mt-2">
                        Notes
                      </Text>
                      <Text size="small" className="text-ui-fg-subtle whitespace-pre-line">
                        {open.summary.notes}
                      </Text>
                    </>
                  ) : null}
                </div>

                {open.slides.map((slide, index) => (
                  <div key={slide.id} className="rounded-lg border p-3">
                    <Text size="small" weight="plus">
                      {index + 1}. {slide.name || "Untitled slide"}
                    </Text>
                    {slide.content ? (
                      <Text size="small" className="text-ui-fg-subtle whitespace-pre-line">
                        {slide.content}
                      </Text>
                    ) : null}
                    {slide.notes ? (
                      <Text size="xsmall" className="text-ui-fg-muted mt-1 whitespace-pre-line">
                        Notes: {slide.notes}
                      </Text>
                    ) : null}
                    {slide.links.length > 0 ? (
                      <ul className="mt-2 list-disc pl-4">
                        {slide.links.map((link) => (
                          <li key={link}>
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-ui-fg-interactive text-xs break-all"
                            >
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {slide.images.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {slide.images.map((image) => (
                          <a key={image.url} href={image.url} target="_blank" rel="noreferrer noopener">
                            <img
                              src={image.url}
                              alt={image.filename}
                              className="h-16 w-16 rounded object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Content briefs",
  icon: DocumentText,
})

export default ContentBriefsPage
