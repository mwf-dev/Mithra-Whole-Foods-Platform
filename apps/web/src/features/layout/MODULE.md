# Module Context: Layout (Global Shell)

## Description
This module provides the global structural components that are persistent across the entire web application, such as the Header, Footer, Top Banner, and Category Navigation.

## Components Exported
- `GlobalShell`: The primary wrapper component that includes the Header and Footer. Used directly in `app/layout.tsx`.

## State Management
- No global state. Local state only for mobile menu toggles and category dropdowns.

## Dependencies
- Uses Next.js `Link` and `next/image`.
- Uses `lucide-react` for icons.
- Uses `shadcn/ui` button/dropdown components (to be implemented).

## Architecture Rules Specific to this Module
- Layout components must be as lightweight as possible to ensure fast Initial Page Load.
- Header and navigation should primarily be Server Components, with Client Components only at the leaf nodes where interaction (like opening a mobile drawer or search bar state) is required.
