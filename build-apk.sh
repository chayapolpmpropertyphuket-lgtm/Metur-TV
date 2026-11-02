#!/bin/bash
# Metur TV - Automated APK Builder Script
set -e

echo "=========================================="
echo "  Metur TV - Building Android TV APK      "
echo "=========================================="

echo "[1/4] Building Vite React Web Assets..."
npm run build

echo "[2/4] Syncing Assets to Android TV Assets Folder..."
mkdir -p android/app/src/main/assets/dist
rm -rf android/app/src/main/assets/dist/*
cp -r dist/* android/app/src/main/assets/dist/

echo "[3/4] Preparing Android Build..."
cd android

# If gradlew doesn't exist yet, gradle can generate wrapper
if [ ! -f "gradlew" ]; then
    echo "Setting up Gradle wrapper..."
    gradle wrapper --gradle-version 8.4 || true
fi

if [ -f "gradlew" ]; then
    chmod +x gradlew
    echo "[4/4] Compiling Release APK with Gradle..."
    ./gradlew assembleRelease
else
    echo "[4/4] Compiling Release APK with system gradle..."
    gradle assembleRelease
fi

echo "=========================================="
echo "  Build Complete!                         "
echo "  APK Location:                           "
echo "  android/app/build/outputs/apk/release/  "
echo "=========================================="
