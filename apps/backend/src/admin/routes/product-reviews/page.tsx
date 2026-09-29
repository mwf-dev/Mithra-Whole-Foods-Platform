import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type Status = "pending" | "approved" | "rejected"

type Review = {
  id: string
  product_id: string
  product_title: string
  customer_name: string
  rating: number
  title: string | null
  content: string
  status: Status
  verified_purchase: boolean
  created_at: string
}

const TABS: { value: Status; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

const BADGE_COLOR: Record<Status, "orange" | "green" | "red"> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
}

/**
 * Moderation queue. Reviews land as `pending` and are invisible on the
 * storefront until approved here.
 */
const ProductReviewsPage = () => {
  const [status, setStatus] = useState<Status>("pending")
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async (next: Status) => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/product-reviews?status=${next}`, {
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error(`Request failed with ${res.status}`)
      }

      const data = await res.json()
      setReviews(data.reviews ?? [])
    } catch (error) {
      console.error(error)
      toast.error("Could not load reviews")
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(status)
  }, [status, load])

  const moderate = async (id: string, next: Status) => {
    setBusyId(id)
    try {
      const res = await fetch(`/admin/product-reviews/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })

      if (!res.ok) {
        throw new Error(`Request failed with ${res.status}`)
      }

      // It no longer belongs in the list being viewed.
      setReviews((current) => current.filter((r) => r.id !== id))
      toast.success(next === "approved" ? "Review approved" : "Review rejected")
    } catch (error) {
      console.error(error)
      toast.error("Could not update the review")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Product reviews</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Reviews stay hidden from the storefront until you approve them.
          </Text>
        </div>
      </div>

      <div className="flex gap-2 px-6 py-3">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={status === tab.value ? "primary" : "secondary"}
            size="small"
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-subtle">Loading…</Text>
        ) : !reviews.length ? (
          <Text className="text-ui-fg-subtle">
            {status === "pending"
              ? "Nothing waiting for you."
              : `No ${status} reviews.`}
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Product</Table.HeaderCell>
                <Table.HeaderCell>Rating</Table.HeaderCell>
                <Table.HeaderCell>Review</Table.HeaderCell>
                <Table.HeaderCell>Customer</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {reviews.map((review) => (
                <Table.Row key={review.id}>
                  <Table.Cell>{review.product_title}</Table.Cell>
                  <Table.Cell>
                    <Badge color={BADGE_COLOR[review.status]}>
                      {review.rating} / 5
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="max-w-md">
                    {review.title && (
                      <Text weight="plus" size="small">
                        {review.title}
                      </Text>
                    )}
                    <Text size="small" className="text-ui-fg-subtle">
                      {review.content}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small">{review.customer_name}</Text>
                    {review.verified_purchase && (
                      <Badge color="green" size="2xsmall">
                        Verified
                      </Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-2">
                      {review.status !== "approved" && (
                        <Button
                          size="small"
                          variant="secondary"
                          disabled={busyId === review.id}
                          onClick={() => moderate(review.id, "approved")}
                        >
                          Approve
                        </Button>
                      )}
                      {review.status !== "rejected" && (
                        <Button
                          size="small"
                          variant="danger"
                          disabled={busyId === review.id}
                          onClick={() => moderate(review.id, "rejected")}
                        >
                          Reject
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
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Product reviews",
  icon: ChatBubbleLeftRight,
})

export default ProductReviewsPage
