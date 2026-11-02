import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  Smartphone,
  Tv,
  Download,
  Copy,
  Check,
  Code2,
  Terminal,
  Github,
  X,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FolderArchive,
  FileArchive,
  Loader2,
} from 'lucide-react';

interface ApkBuildModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkBuildModal: React.FC<ApkBuildModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const buildCommand = `npm run build\nmkdir -p android/app/src/main/assets/dist\ncp -r dist/* android/app/src/main/assets/dist/\ncd android && ./gradlew assembleRelease`;

  // Download all Android project files as a ready-to-build ZIP
  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // settings.gradle
      zip.file(
        'android/settings.gradle',
        `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "MeturTV"
include ':app'`
      );

      // build.gradle (root)
      zip.file(
        'android/build.gradle',
        `buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.2'
    }
}

tasks.register('clean', Delete) {
    delete rootProject.buildDir
}`
      );

      // gradle-wrapper.properties
      zip.file(
        'android/gradle/wrapper/gradle-wrapper.properties',
        `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.4-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists`
      );

      // app/build.gradle
      zip.file(
        'android/app/build.gradle',
        `plugins {
    id 'com.android.application'
}

android {
    namespace 'com.meturtv.app'
    compileSdk 34

    defaultConfig {
        applicationId "com.meturtv.app"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "2.4.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.debug
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.webkit:webkit:1.10.0'
}`
      );

      // AndroidManifest.xml
      zip.file(
        'android/app/src/main/AndroidManifest.xml',
        `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.meturtv.app">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <uses-feature android:name="android.software.leanback" android:required="false" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <uses-feature android:name="android.hardware.microphone" android:required="false" />
    <uses-feature android:name="android.hardware.wifi" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Metur TV"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.MeturTV"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true"
        tools:targetApi="34">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden"
            android:screenOrientation="landscape"
            android:theme="@style/Theme.MeturTV.Fullscreen">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`
      );

      // MainActivity.java
      zip.file(
        'android/app/src/main/java/com/meturtv/app/MainActivity.java',
        `package com.meturtv.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {

    private WebView mWebView;
    private static final int RECORD_AUDIO_PERMISSION_REQUEST = 101;
    private PermissionRequest mCurrentPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUI();

        mWebView = new WebView(this);
        mWebView.setBackgroundColor(Color.BLACK);
        setContentView(mWebView);

        setupWebView();
        checkPermissions();
        mWebView.loadUrl("file:///android_asset/dist/index.html");
    }

    private void setupWebView() {
        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        mWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                                    == PackageManager.PERMISSION_GRANTED) {
                                request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                            } else {
                                mCurrentPermissionRequest = request;
                                ActivityCompat.requestPermissions(MainActivity.this,
                                        new String[]{Manifest.permission.RECORD_AUDIO},
                                        RECORD_AUDIO_PERMISSION_REQUEST);
                            }
                            return;
                        }
                    }
                    request.grant(request.getResources());
                });
            }
        });
    }

    private void checkPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    RECORD_AUDIO_PERMISSION_REQUEST);
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            int keyCode = event.getKeyCode();
            switch (keyCode) {
                case KeyEvent.KEYCODE_DPAD_UP:
                    dispatchKeyToJs("ArrowUp");
                    return true;
                case KeyEvent.KEYCODE_DPAD_DOWN:
                    dispatchKeyToJs("ArrowDown");
                    return true;
                case KeyEvent.KEYCODE_DPAD_LEFT:
                    dispatchKeyToJs("ArrowLeft");
                    return true;
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                    dispatchKeyToJs("ArrowRight");
                    return true;
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                    dispatchKeyToJs("Enter");
                    return true;
                case KeyEvent.KEYCODE_BACK:
                    dispatchKeyToJs("Escape");
                    return true;
                case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                    dispatchKeyToJs("MediaPlayPause");
                    return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }

    private void dispatchKeyToJs(String keyName) {
        String script = "window.dispatchEvent(new KeyboardEvent('keydown', { key: '" + keyName + "', bubbles: true }));";
        mWebView.evaluateJavascript(script, null);
    }

    private void hideSystemUI() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );
    }
}`
      );

      // themes.xml & strings.xml
      zip.file(
        'android/app/src/main/res/values/themes.xml',
        `<resources>
    <style name="Theme.MeturTV" parent="Theme.AppCompat.NoActionBar">
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowBackground">#050608</item>
    </style>
    <style name="Theme.MeturTV.Fullscreen" parent="Theme.MeturTV">
        <item name="android:windowTranslucentNavigation">true</item>
        <item name="android:windowTranslucentStatus">true</item>
    </style>
</resources>`
      );
      zip.file(
        'android/app/src/main/res/values/strings.xml',
        `<resources>
    <string name="app_name">Metur TV</string>
</resources>`
      );

      // build-apk.sh
      zip.file(
        'build-apk.sh',
        `#!/bin/bash
set -e
echo "Building Metur TV Android APK..."
npm run build
mkdir -p android/app/src/main/assets/dist
cp -r dist/* android/app/src/main/assets/dist/
cd android
./gradlew assembleRelease
echo "APK Build finished! File: android/app/build/outputs/apk/release/app-release.apk"`
      );

      // GitHub Actions workflow
      zip.file(
        '.github/workflows/build-apk.yml',
        `name: Build Metur TV Android APK
on: [push, workflow_dispatch]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm run build
      - run: mkdir -p android/app/src/main/assets/dist && cp -r dist/* android/app/src/main/assets/dist/
      - uses: actions/setup-java@v4
        with: { distribution: 'zulu', java-version: '17' }
      - uses: android-actions/setup-android@v3
      - run: cd android && (chmod +x gradlew && ./gradlew assembleRelease || gradle assembleRelease)
      - uses: actions/upload-artifact@v4
        with:
          name: MeturTV-Release-APK
          path: android/app/build/outputs/apk/release/*.apk`
      );

      // Instructions README
      zip.file(
        'README_HOW_TO_BUILD.txt',
        `=============================================================
  Metur TV - Android TV APK Build Guide (วิธีสร้างไฟล์ APK)
=============================================================

1. วิธีเปิดใน Android Studio (แนะนำ):
   - เปิด Android Studio บนเครื่องคอมพิวเตอร์
   - กด 'Open Project' แล้วเลือกโฟลเดอร์ /android ใน zip นี้
   - กดเมนู Build > Build Bundle(s) / APK(s) > Build APK(s)
   - จะได้ไฟล์ app-release.apk พร้อมติดตั้ง

2. วิธีสร้างผ่าน GitHub Actions (ฟรี ไม่ต้องลงโปรแกรม):
   - สร้าง repository ใหม่บน GitHub แล้วอัปโหลดไฟล์ทั้งหมดขึ้นไป
   - ไปที่แท็บ Actions บน GitHub แล้วกด 'Run workflow'
   - รอ 2 นาที แล้วกดดาวน์โหลดไฟล์ MeturTV-Release-APK ได้เลย

3. วิธีติดตั้งบน Android TV / Google TV / Android Box:
   - นำไฟล์ .apk ใส่ Flash Drive เสียบเข้าทีวี
   - หรือใช้แอพ "Send files to TV" เพื่อส่งไฟล์ไร้สายจากมือถือเข้าทีวี
   - เปิดแอพ File Commander หรือ FX บนทีวีแล้วกด Install ครับ`
      );

      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(content);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = 'MeturTV_Android_Project.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl">
      <div className="relative w-full max-w-3xl bg-[#090b10] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-white">
              <Tv className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                ศูนย์สร้างและดาวน์โหลดไฟล์ APK สำหรับ Android TV
              </h2>
              <p className="text-xs text-slate-400">
                ดาวน์โหลดโค้ดโปรเจกต์ Android Native และวิธีสร้างไฟล์ .apk สำหรับ Metur TV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big 1-Click Download Button Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-sky-500/10 to-teal-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <FileArchive className="w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-white tracking-tight">
                ดาวน์โหลดแพ็กเกจ Android TV ทั้งหมด (.ZIP)
              </span>
              <span className="text-xs text-slate-300 mt-0.5">
                รวมไฟล์ Android Studio, Gradle, Manifest, สคริปต์ Cloud Build และคำแนะนำภาษาไทย
              </span>
            </div>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            {isZipping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังรวมไฟล์...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Check className="w-4 h-4 text-black" />
                <span>ดาวน์โหลดสำเร็จ!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>กดดาวน์โหลดไฟล์ ZIP ทันที</span>
              </>
            )}
          </button>
        </div>

        {/* APK Spec Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400">ชื่อแอพ (App Name)</span>
            <span className="text-sm font-semibold text-white">Metur TV</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400">Package ID</span>
            <span className="text-xs font-mono font-semibold text-amber-400">com.meturtv.app</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400">Target Platform</span>
            <span className="text-sm font-semibold text-white">Android TV / Google TV</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400">Version Code</span>
            <span className="text-sm font-semibold text-white">v2.4.0 (1)</span>
          </div>
        </div>

        {/* Build Options */}
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            วิธีสร้างไฟล์ APK หลังจากดาวน์โหลด ZIP
          </span>

          {/* Method 1: Cloud GitHub Actions */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Github className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-semibold text-white">
                  วิธีที่ 1: สร้างผ่าน GitHub Actions (ฟรีและง่ายสุด ไม่ต้องลงโปรแกรมในคอม)
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                แนะนำ 1-Click
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ในไฟล์ ZIP มีโฟลเดอร์ <code className="text-sky-300 font-mono">.github/workflows/build-apk.yml</code> ให้แล้ว
              เพียงนำไฟล์ขึ้น GitHub แล้วกดแท็บ <strong>Actions &gt; Run workflow</strong> บน GitHub
              ระบบจะคอมไพล์ APK ให้อัตโนมัติใน 2 นาที และมีปุ่มดาวน์โหลดไฟล์ติดตั้งได้ทันที
            </p>
          </div>

          {/* Method 2: Android Studio */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <Code2 className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-semibold text-white">
                วิธีที่ 2: เปิดโปรเจกต์ด้วย Android Studio
              </span>
            </div>
            <ol className="text-xs text-slate-300 list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
              <li>แตกไฟล์ ZIP ที่ดาวน์โหลดไปไว้ในคอมพิวเตอร์</li>
              <li>เปิดโปรแกรม <strong>Android Studio</strong> แล้วกด <em>Open</em> เลือกโฟลเดอร์ <code className="text-amber-300 font-mono">/android</code></li>
              <li>ไปที่เมนูด้านบนเลือก <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong></li>
              <li>จะได้ไฟล์ <code className="text-emerald-400 font-mono">app-release.apk</code> พร้อมนำไปลงทีวี</li>
            </ol>
          </div>

          {/* Method 3: Terminal CLI Command */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-white">
                  วิธีที่ 3: คำสั่งเทอร์มินัล (Command Line)
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(buildCommand, 1)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-slate-200 transition-colors"
              >
                {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIndex === 1 ? 'คัดลอกแล้ว' : 'คัดลอกคำสั่ง'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-slate-300 overflow-x-auto select-all">
              {buildCommand}
            </pre>
          </div>
        </div>

        {/* Sideload to TV Guide */}
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col gap-2">
          <span className="text-xs font-semibold text-indigo-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            วิธีนำไฟล์ APK ไปติดตั้งลงบน Android TV
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            1. โหลดแอพ <strong>"Send files to TV"</strong> จาก Google Play Store บนทั้งมือถือและทีวี เพื่อส่งไฟล์ APK เข้าทีวีแบบไร้สาย หรือเซฟใส่ USB Flash Drive เสียบเข้าหลังทีวี<br />
            2. ติดตั้งแอพ <strong>File Commander</strong> หรือ <strong>FX File Explorer</strong> บนทีวีเพื่อกดเปิดไฟล์ .apk และกดติดตั้ง (Install) ได้ทันที
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
          <span>โฟลเดอร์ต้นฉบับในโปรเจกต์: /android</span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-slate-200 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
