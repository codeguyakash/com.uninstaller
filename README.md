Got it — here’s a complete **README.md** for your Uninstaller App project, blending technical clarity with practical usage instructions.

---

# 📱 Uninstaller App

A React Native–powered Android utility for **viewing, searching, sharing, and uninstalling** installed apps with a clean, modern UI.

---

## 🚀 Features

- **📋 Installed Apps List** — Displays all installed applications (excluding this app) with names, package IDs, and icons.
- **🔍 Search & Filter** — Search by app name or package name with optimized debounce for performance.
- **❌ Uninstall Apps** — Initiate native uninstall dialogs directly from the app.
- **📤 Share Apps** — Long-press any app to share its Play Store link or package.
- **🌙 Dark Mode Support** — Automatically adapts UI colors to match system theme.
- **⚡ Optimized Performance** — Uses `FlatList` with tuned rendering for large app inventories.
- **📳 Haptic Feedback** — Vibrates on long-press for improved UX.
- **⏳ Loading Indicators** — Shows an activity indicator while fetching app data.

---

## 🛠️ Tech Stack

- [React Native](https://reactnative.dev/) — Cross-platform mobile framework.
- **Native Android Module** (`AppUninstaller`) — Handles native uninstall and share actions.
- \[JavaScript/TypeScript] — Core app logic.
- **Metro Bundler** — JavaScript build tool.
- **Android SDK** — Native build environment.

---

## 📂 Project Structure

```
src/
  └── screens/
      └── HomeScreen.tsx   # Main UI for app listing, search, uninstall, and share
android/
  └── app/                 # Native Android project files
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```sh
git clone https://github.com/your-username/uninstaller-app.git
cd uninstaller-app
```

### 2️⃣ Install Dependencies

```sh
npm install
# or
yarn install
```

### 3️⃣ Run Metro Bundler

```sh
npm start
# or
yarn start
```

### 4️⃣ Build & Run (Debug Mode)

**Android:**

```sh
npm run android
# or
yarn android
```

---

## 📦 Build APK (Release Mode)

Generate a production-ready APK:

```sh
cd android
./gradlew assembleRelease
```

The APK will be available at:

```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 📱 Usage

- Launch the app — all installed apps will be listed.
- **Search**: Type in the search bar to filter by app or package name.
- **Uninstall**: Tap the **Uninstall** button on any app.
- **Share**: Long-press an app, choose **Share**, and send its Play Store link/package.

---

## 🐞 Troubleshooting

- **No apps shown** — Ensure the native `AppUninstaller` module is properly linked and permissions are granted.
- **Uninstall not working** — This feature requires Android; it will not function on iOS.
- **Metro errors** — Try clearing cache:

```sh
npx react-native start --reset-cache
```

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
