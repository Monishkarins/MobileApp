# Karins Fleet Mobile App — Premium Glass Dashboard Update

This source package contains the reviewed and updated React Native codebase for the Karins Fleet mobile dashboard. The dashboard has been reorganised around fleet health, critical actions, wallet balance, toll spend, compliance, E-Challans, claims, and Karins services, with a restrained premium glassmorphism design system.

## Main improvements

- Premium dark navy layered background and reusable glass surfaces
- Fleet Health hero card with score ring, action state, and compliance totals
- Critical compliance action strip above secondary analytics
- Refined search, wallet, E-Challan, metric cards, and floating bottom navigation
- Consistent semantic status colours for success, warning, critical, and information
- Centralised colour, typography, spacing, radius, glass, and elevation tokens
- Responsive behaviour for compact mobile widths
- Android-safe non-blur fallback for glass surfaces
- Accessibility labels and improved touch-target sizing on redesigned controls
- TypeScript, ESLint, Jest, Babel, Metro, environment, and package-lock configuration

## Prerequisites

- Node.js 20.19.4 or newer
- pnpm 10.x
- A complete React Native native project for device builds
- Backend/API credentials and platform configuration for live integration testing

## Install

```bash
pnpm install
cp .env.example .env
```

Update `.env` with the correct Karins API endpoint and environment-specific values.

## Validation

```bash
pnpm validate
```

This runs:

```bash
pnpm type-check
pnpm lint
pnpm test
```

## JavaScript bundle validation

```bash
pnpm exec react-native bundle \
  --entry-file index.js \
  --platform android \
  --dev false \
  --bundle-output /tmp/index.android.bundle \
  --assets-dest /tmp/android-assets

pnpm exec react-native bundle \
  --entry-file index.js \
  --platform ios \
  --dev false \
  --bundle-output /tmp/main.jsbundle \
  --assets-dest /tmp/ios-assets
```

## Important source-package limitation

The uploaded archive did not include `android/` or `ios/` native projects, native signing configuration, Firebase configuration files, CocoaPods files, platform entitlements, or production API credentials. The supplied source therefore supports JavaScript/TypeScript validation and Metro production bundle generation, but it cannot independently produce an APK, AAB, or IPA.

Integrate this source package into the complete Karins React Native repository before device testing and release signing.

## Fonts

The design tokens reference Manrope for display/KPI typography and Inter for operational UI text. The supplied source archive did not contain native font assets. Add the approved font assets through the complete native application repository, or retain the platform system fallback defined in `src/theme/typography.ts`.

## Documentation

- `IMPLEMENTATION_REPORT.md` — architecture review and completed changes
- `TEST_REPORT.md` — executed validation and remaining device/E2E scope
- `docs/reference/` — before screen and premium target reference
- `docs/test-results/` — validation and Metro bundle logs
