# Building APK for Audio Notes App

## Prerequisites
1. Install Android Studio
2. Install Java Development Kit (JDK) 11 or higher
3. Set up Android SDK and accept licenses

## Build Steps

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Add Android Platform (first time only)
\`\`\`bash
npx cap add android
\`\`\`

### 3. Build and Sync
\`\`\`bash
npm run build:mobile
\`\`\`

### 4. Open in Android Studio
\`\`\`bash
npm run android:open
\`\`\`

### 5. Generate APK in Android Studio
1. In Android Studio, go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for build to complete
3. APK will be generated in `android/app/build/outputs/apk/debug/`

### 6. Alternative: Command Line Build
\`\`\`bash
# For debug APK
npm run android:build

# For release APK (requires signing)
cd android
./gradlew assembleRelease
\`\`\`

## Install APK on Phone
1. Enable "Unknown Sources" in Android settings
2. Transfer APK file to phone
3. Install the APK file

## Notes
- Debug APK works for testing
- For Play Store, you need a signed release APK
- The app includes audio recording permissions
- Works offline after initial load
