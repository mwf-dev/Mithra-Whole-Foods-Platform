# Mithra Whole Foods - Technical & Design Specification

## Vision

Build a modern grocery e-commerce platform inspired by: - Nature Mills
(category-first shopping) - Bliss Tree (conversion-focused grocery UI) -
Flipkart Grocery (offers and discoverability) - Apple (spacing,
typography, visual hierarchy)

Goal: Keep the shopping experience familiar while dramatically improving
aesthetics, trust, and usability.

------------------------------------------------------------------------

# Design Principles

-   Product-first experience
-   Large whitespace (Apple-inspired)
-   Organic color palette
-   Premium product photography
-   Fast product discovery
-   Category-first navigation
-   Minimal visual clutter
-   High conversion CTA placement

## Color Palette

Primary Green: `#2E7D32` Dark Green: `#1F4D1F` Cream: `#FAF8F3` Earth
Brown: `#8D6E63` Text: `#1F1F1F`

## Typography

Headings: - Playfair Display or DM Serif Display

Body: - Inter

Spacing Scale: 8, 16, 24, 32, 48, 64, 96 px

Border Radius: - Cards: 20px - Buttons: 12px

------------------------------------------------------------------------

# Homepage Layout

1.  Announcement Bar
2.  Header
    -   Logo
    -   Search
    -   Login
    -   Wishlist
    -   Cart
3.  Navigation
4.  Left Sidebar Categories (sticky)
5.  Hero Banner
6.  Promotional Offer Cards
7.  Trust Strip
8.  Best Sellers
9.  Shop by Category
10. Category Product Sections
11. Farm Story
12. Statistics
13. Footer

------------------------------------------------------------------------

# Left Sidebar Categories

-   Millets
-   Rice & Dals
-   Cold Pressed Oils
-   Ghee
-   Health Mixes
-   Natural Sweeteners
-   Herbs & Spices
-   Flours
-   Snacks
-   Tea & Beverages
-   Dry Fruits
-   Combo Packs
-   New Arrivals
-   Best Sellers

------------------------------------------------------------------------

# Hero

Left: - Headline - Description - CTA

Right: - Premium AI-enhanced product imagery

Below: - Three offer cards

------------------------------------------------------------------------

# Product Cards

Fields: - Badge (Bestseller/New) - Image - Product Name - Weight -
Rating - Price - Add to Cart

Hover: - Soft lift - Shadow increase - Slight image zoom

------------------------------------------------------------------------

# AI Asset Strategy

Existing images: - Preserve branding and packaging. - Improve
lighting/background only. - Do not redesign logos or package labels. -
Replace low-quality photos with premium lifestyle compositions.

Campaign banners: - Millets - Cold Pressed Oils - Ghee - Natural
Sweeteners - Farm Story

------------------------------------------------------------------------

# Backend Features

## Authentication

-   Email/Password
-   Google Login
-   OTP (optional)

## Catalog

-   Categories
-   Subcategories
-   Products
-   Variants
-   Inventory

## Search

-   Full text search
-   Category filter
-   Price filter
-   Brand filter

## Cart

-   Persistent cart
-   Coupons
-   Tax
-   Shipping

## Orders

-   Checkout
-   Payment
-   Order tracking
-   Invoice

## Admin

-   Dashboard
-   Product CRUD
-   Category CRUD
-   Banner Management
-   Coupon Management
-   Orders
-   Customers
-   Analytics

------------------------------------------------------------------------

# Tech Stack

## Frontend

-   Next.js 15
-   React
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   Framer Motion
-   React Query
-   Zustand

## Backend

-   NestJS
-   PostgreSQL
-   Prisma ORM
-   Redis
-   JWT
-   Cloudinary
-   Stripe / Razorpay
-   Nodemailer

## Storage

-   Cloudinary (images)
-   S3 compatible (optional)

## Deployment

Frontend: - Vercel

Backend: - Railway / Render / DigitalOcean

Database: - Neon PostgreSQL

Redis: - Upstash

------------------------------------------------------------------------

# Database

Users Categories Products ProductImages Variants Inventory Cart Orders
OrderItems Coupons Addresses Reviews Wishlist Banners

------------------------------------------------------------------------

# Performance

-   Server Components
-   Image optimization
-   Lazy loading
-   CDN
-   ISR for product pages

------------------------------------------------------------------------

# Future

-   AI recommendations
-   Recently viewed
-   Voice search
-   Subscription products
-   Loyalty points
-   Referral system
-   Farmer stories CMS
-   Blog

------------------------------------------------------------------------

# UX Decisions

-   Keep left category sidebar.
-   Use Flipkart-style promotional cards.
-   Apple-inspired spacing.
-   Storytelling only after shopping sections.
-   Product-first homepage.
-   Trust badges immediately below hero.
-   Premium AI-enhanced product imagery.
-   Category-based browsing instead of endless grids.
