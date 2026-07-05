# Module Context: Home

## Description
This module contains the components that make up the landing page of the application. It focuses heavily on marketing, brand identity, and guiding users to primary category funnels.

## Components Exported
- `Home`: The primary assembly component used in `app/page.tsx`.

## Architecture Rules Specific to this Module
- Components should rely on static data or fast server-side fetches.
- Images should be aggressively optimized (using Next/Image) to ensure the LCP (Largest Contentful Paint) is within Core Web Vitals limits.
- High use of Apple-inspired aesthetic (ample whitespace, crisp typography).
