# Mithra Whole Foods

## Full Technical Architecture (Next.js + Medusa.js)

# Vision

Build a premium grocery and traditional foods e-commerce platform
inspired by:

-   Nature Mills
-   Bliss Tree
-   Flipkart Grocery
-   Apple (spacing, typography, visual hierarchy)

The experience should be category-first, conversion-focused, visually
premium, and easy to manage from an admin panel.

------------------------------------------------------------------------

# Tech Stack

## Frontend

-   Next.js 15 (App Router)
-   React 19
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   Framer Motion
-   TanStack Query
-   Zustand
-   React Hook Form
-   Zod
-   Embla Carousel
-   Swiper

## Backend

Medusa.js v2

Reasons: - Products - Categories - Collections - Inventory - Customers -
Authentication - Cart - Checkout - Orders - Shipping - Discounts -
Promotions - Returns - Taxes - Gift Cards - Admin Dashboard - Workflows
SDK

Database: - PostgreSQL

ORM: - MikroORM (via Medusa)

Cache: - Redis

Storage: - Cloudinary or Amazon S3

Payments: - Razorpay - Stripe

Shipping: - Shiprocket - Delhivery - Blue Dart

Email: - Resend

Analytics: - PostHog - Google Analytics

Deployment: Frontend: Vercel Backend: Railway / Render / DigitalOcean
Database: Neon PostgreSQL Redis: Upstash

------------------------------------------------------------------------

# Frontend Architecture

app/ components/ features/ hooks/ lib/ services/ store/ types/ styles/

Feature folders

-   Home
-   Products
-   Categories
-   Search
-   Cart
-   Checkout
-   Account
-   Orders
-   Wishlist
-   Blog

------------------------------------------------------------------------

# Homepage Layout

Announcement Bar

Header - Logo - Search - Login - Wishlist - Cart

Main Navigation

Left Sticky Category Sidebar

Hero Banner

Offer Cards

Trust Strip

Best Sellers

Shop By Category

Category Sections - Millets - Rice - Oils - Ghee - Health Mixes -
Sweeteners

Farmer Story

Testimonials

Newsletter

Footer

------------------------------------------------------------------------

# UI Design System

Colors

Primary Green #2E7D32

Dark Green #1F4D1F

Cream #FAF8F3

Earth Brown #8D6E63

Typography

Heading - Playfair Display

Body - Inter

Spacing 8 16 24 32 48 64 96

Cards - 20px radius

Buttons - 12px radius

Design Goals

-   Apple spacing
-   Flipkart discoverability
-   Nature Mills structure
-   Bliss Tree navigation
-   Premium AI imagery

------------------------------------------------------------------------

# Product Card

Image

Badge

Product Name

Weight

Rating

Price

Add To Cart

Hover - Image zoom - Lift animation - Soft shadow

------------------------------------------------------------------------

# Medusa Modules

Core

Products

Categories

Collections

Inventory

Orders

Customers

Shipping

Payments

Discounts

Returns

Taxes

Promotions

Gift Cards

Wishlist

Custom Modules

Banner Module

Homepage CMS

Farmer Story

Recipe Module

Nutrition Module

Blog Module

AI Recommendation Module

Seasonal Products Module

Testimonials Module

Analytics Module

------------------------------------------------------------------------

# Homepage CMS

Editable from Admin

Hero Banner

Offer Cards

Category Cards

Trust Badges

Featured Products

Testimonials

Statistics

Footer

No code changes required.

------------------------------------------------------------------------

# Admin Dashboard

Dashboard

Orders

Products

Categories

Collections

Customers

Inventory

Coupons

Discounts

Promotions

Banners

Homepage CMS

Recipes

Blogs

Analytics

Settings

------------------------------------------------------------------------

# Workflows (Medusa)

Order Created

↓

Reserve Inventory

↓

Capture Payment

↓

Generate Invoice

↓

Send Email

↓

Create Shipment

↓

Notify Customer

↓

Update Dashboard

Additional Workflows

Refund

Return

Stock Sync

Low Inventory Alert

Abandoned Cart Email

------------------------------------------------------------------------

# Search

Phase 1

Medusa Search

Phase 2

Typesense

Features

Autocomplete

Category Filter

Brand Filter

Price Filter

Popularity

------------------------------------------------------------------------

# Integrations

Cloudinary

Razorpay

Stripe

Shiprocket

Resend

Google Analytics

PostHog

WhatsApp Notifications

Firebase Push Notifications

------------------------------------------------------------------------

# AI Roadmap

AI Enhanced Product Images

Related Products

Frequently Bought Together

Smart Search

Seasonal Recommendations

Recipe Suggestions

Healthy Alternatives

Demand Forecasting

------------------------------------------------------------------------

# Folder Structure

apps/

web/

backend/

packages/

shared-ui/

shared-types/

Backend

src/

modules/

banner/

homepage/

recipe/

nutrition/

blog/

recommendation/

workflow/

subscriber/

jobs/

api/

------------------------------------------------------------------------

# Development Phases

Phase 1 - Storefront - Products - Categories - Cart - Checkout - Orders

Phase 2 - Wishlist - Coupons - Reviews - Blog - Homepage CMS

Phase 3 - AI Recommendations - Loyalty - Referrals - Recipes - Farmer
Stories

Phase 4 - Mobile App - Voice Search - Subscriptions - Advanced Analytics

------------------------------------------------------------------------

# Key UX Decisions

-   Left category sidebar always visible
-   Product-first shopping
-   Storytelling after shopping sections
-   Premium AI-enhanced product photography
-   Category based browsing
-   Offer cards beside hero
-   Trust badges under hero
-   Minimal clutter
-   Apple-inspired spacing
-   Responsive mobile-first design
