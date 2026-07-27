# Karins Fleet Mobile App — Test Report

## Environment

- Node.js: v22.16.0
- pnpm: 10.14.0
- React Native: 0.86.0
- React: 19.2.3
- TypeScript: 5.9.3
- Jest: 29.7.0

## Automated validation executed

### TypeScript

Command:

```bash
pnpm type-check
```

Result: **Passed** — zero TypeScript errors.

### ESLint

Command:

```bash
pnpm lint
```

Result: **Passed** — zero lint errors and zero lint warnings.

### Unit tests

Command:

```bash
pnpm test
```

Result: **Passed**

- Test suites: 6 passed / 6 total
- Tests: 34 passed / 34 total
- Snapshots: 0

Covered areas include:

- Dashboard metric calculation
- Fleet Health compliance aggregation
- Role and landing-route access rules
- Role-aware More-menu visibility
- Number/currency formatting
- E-Challan API normalisation

### Android Metro production bundle

Result: **Passed**

- Platform: Android
- Mode: production (`--dev false`)
- Bundle produced successfully
- 19 asset files copied

### iOS Metro production bundle

Result: **Passed**

- Platform: iOS
- Mode: production (`--dev false`)
- Bundle produced successfully
- 15 asset files copied

### React Native configuration discovery

Result: **Partial / expected limitation**

- 23 React Native dependencies discovered
- Android and iOS platforms recognised
- Native project entries are `null` because the uploaded archive contains no `android/` or `ios/` folders

## Functional scope not executable from supplied archive

The following require native projects, devices/emulators, backend access, and production-like credentials:

- Login against live Karins authentication
- Customer switching against the live session API
- Dashboard API reconciliation against production data
- Wallet Recharge/payment completion
- E-Challan Pay Now completion and callback handling
- Push notification receipt, tap routing, and permissions
- Biometric/keychain/device-security flows
- Android/iOS file download and sharing
- Runtime performance on low/mid-range Android hardware
- APK/AAB/IPA compilation, signing, installation, and store validation

These items should be covered in the final integrated repository through device-level regression and UAT.

## Recommended device regression matrix

- Android 10, 12, 14, and 15
- One 320–360 dp compact device
- One mid-range 390–412 dp Android device
- One iPhone with a compact width
- One modern iPhone with Dynamic Island
- Slow/unstable network and offline recovery
- Customer, Customer Group Admin, Vehicle Group Admin, Agent, Employee, and Admin roles
- Large text at 130%
- Reduced motion and reduced transparency where supported
