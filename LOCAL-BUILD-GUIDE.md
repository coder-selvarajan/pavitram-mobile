# Local iOS Build & App Store Submission Guide

## Prerequisites

- Xcode installed (current: 26.1.1)
- EAS CLI installed (`npm install -g eas-cli`)
- Fastlane installed (`brew install fastlane`) — **required for local builds**
- CocoaPods installed (`brew install cocoapods`) — **required for local builds**
- Apple Developer account
- Environment variables from `.env`:
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://aalpgiepuoxnezbvighm.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_HOX4tpKKQQxBAX_8C-WKKg_Cingm2m9
  ```

## Step 1: Set Environment Variables

```bash
export EXPO_PUBLIC_SUPABASE_URL=https://aalpgiepuoxnezbvighm.supabase.co
export EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_HOX4tpKKQQxBAX_8C-WKKg_Cingm2m9
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
```

## Step 2: Build the `.ipa` Locally

```bash
eas build --platform ios --profile production-local --local
```

This runs the build entirely on your Mac — no EAS cloud queue wait time.

- First time: it will prompt you to configure Apple credentials (signing certificates & provisioning profiles)
- Output: a `.ipa` file in your project root directory
- Build time: ~10-20 minutes depending on your Mac

## Step 3: Submit to App Store Connect

Choose any one of the following options:

### Option A: EAS Submit (Easiest)

```bash
eas submit --platform ios --path ./build-*.ipa
```

This only uploads — no cloud build involved.

### Option B: Apple Transporter (GUI)

1. Download **Transporter** from the Mac App Store (free, by Apple)
2. Open Transporter and sign in with your Apple Developer account
3. Click **"+"** or drag and drop the `.ipa` file
4. Click **"Deliver"**
5. Wait for validation and upload to complete

### Option C: Command Line (`xcrun altool`)

```bash
xcrun altool --upload-app \
  --type ios \
  --file ./build-*.ipa \
  --apiKey YOUR_API_KEY_ID \
  --apiIssuer YOUR_ISSUER_ID
```

To generate API keys: App Store Connect > Users and Access > Integrations > App Store Connect API

## Step 4: Release from App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Select your app **Pavitram**
3. Go to **TestFlight** tab to distribute to testers, or **App Store** tab to submit for review

## Quick Reference

| Action              | Command                                                      |
| ------------------- | ------------------------------------------------------------ |
| Build locally       | `eas build --platform ios --profile production-local --local` |
| Submit via EAS      | `eas submit --platform ios --path ./build-*.ipa`             |
| Submit via CLI      | `xcrun altool --upload-app --type ios --file ./build-*.ipa`  |
| Submit via GUI      | Open Transporter app, drag `.ipa`, click Deliver             |

## Notes

- The `production-local` profile in `eas.json` extends the `production` profile with local build settings
- Build number auto-increments via EAS (configured in `eas.json`)
- Bundle identifier: `in.selvarajan.pavitram`
