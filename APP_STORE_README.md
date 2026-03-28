# LeadSolution App Store Deployment

## Prerequisites
- Xcode 15+ (for iOS)
- Android Studio (for Android)
- Apple Developer Account ($99/year)
- Google Play Developer Account ($25 one-time)

## Setup
```bash
npm install @capacitor/core @capacitor/cli @capacitor/push-notifications @capacitor/splash-screen
npx cap init LeadSolution de.leadsolution.app --web-dir=out
npx cap add ios
npx cap add android
```

## Build
```bash
npm run build
npx next export  # or configure for static export
npx cap sync
npx cap open ios  # Opens Xcode
npx cap open android  # Opens Android Studio
```

## iOS Submission
1. In Xcode: Set Bundle ID to `de.leadsolution.app`
2. Set version and build number
3. Add App Icons (use asset catalog)
4. Configure Push Notification capability
5. Archive > Upload to App Store Connect
6. Fill out app metadata, screenshots, description

## Android Submission
1. In Android Studio: Generate signed APK/AAB
2. Upload to Google Play Console
3. Fill out store listing

## Push Notifications (Firebase)
1. Create Firebase project
2. Add iOS + Android apps
3. Download `google-services.json` / `GoogleService-Info.plist`
4. Configure in `capacitor.config.ts`
