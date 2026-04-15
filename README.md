# Revoluchat React Native SDK 🚀

**Version**: `v1.4.0` (WebRTC Calls, Native Audio Routing, Call History, Singleton Call Context)

The official React Native SDK for **Revoluchat**, an enterprise-grade, multi-tenant real-time chat platform. Built with a **Clean Architecture** mindset, offering both a headless logic layer (Hooks) and ready-made modern UI components.

[![npm version](https://img.shields.io/npm/v/revoluchat-rn-sdk.svg?style=flat-square)](https://www.npmjs.com/package/revoluchat-rn-sdk)
[![license](https://img.shields.io/npm/l/revoluchat-rn-sdk.svg?style=flat-square)](LICENSE)

---

## ✨ Key Features

- **Real-Time Engine**: Powered by Phoenix Channels with 100% resilient auto-reconnections.
- **Audio & Video Calls**: P2P WebRTC calls featuring auto-ringing, state synchronization, hardware camera switching, UI overlays, and native Loudspeaker routing.
- **Micro-Frontend Ready**: Designed with a Singleton `CallProvider` context, eliminating duplicate stream instances or signaling conflicts across screens.
- **Presence & Read Receipts**: Real-time "Online/Offline" detection and per-message read receipts.
- **Robust JWT Handling**: Automatic 60-second expiry-guard scheduler triggering seamless token refreshes without disconnecting sockets.
- **Offline First (Zero-Latency)**: Instant UI loading using **Encrypted MMKV** persistence. The SDK automatically caches the latest 100 messages per conversation locally for instant access while synchronizing history in the background.
- **Feature Tiering**: Built-in support for `Basic`, `Standard`, and `Pro` tier mode to conditionally gate UI features like Voice/Video calling and file attachments.
- **Optimized Scrolling**: Smart auto-scroll logic that distinguishes between new messages and history loads, combined with `maintainVisibleContentPosition` for maximum stability.
- **Headless Hooks**: Access pure capabilities using `useChannels`, `useMessages`, `useCallHistory`, `useChannel`, and `useRevoluchat`.
- **UI Components**: Drop-in `ChatHeader`, `ChannelList`, `MessageList`, `CallHistoryList`, `CallModal`.

---

## 📦 Installation

```bash
yarn add revoluchat-rn-sdk
```

### Peer Dependencies

Ensure you install these dependencies, as they are required by the SDK for low-level functionalities:

```bash
yarn add react-native-mmkv zustand phoenix react-native-webrtc react-native-svg
```

---

## 📱 WebRTC & Permissions Configuration

To support audio and video calls, you must request Native OS capabilities and permissions.

### iOS (`Info.plist`)

Add the following permission descriptors to your `ios/YourApp/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera for video calls.</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone for audio/video calls.</string>
```

### Android (`AndroidManifest.xml`)

Add the following permissions:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

### Android Native Audio Routing (Critical)

To prevent `WAKE_LOCK` permission crash limits and route audio between the Earpiece and Loudspeaker effectively, you **must** implement this native module in your Android Host App `revolu-app`.

Create `AudioRouteModule.kt` and `AudioRoutePackage.kt` following the code format below inside your `android/app/src/main/java/com/yourpackage`:

<details>
<summary>View Android Kotlin AudioRouteModule Setup</summary>

**1. Include Custom Tones**
Place your MP3 ringtone and ringback assets inside your Android raw resources folder (`android/app/src/main/res/raw/`):

- `incallmanager_ringtone.mp3`
- `incallmanager_ringback.mp3`

**2. `AudioRouteModule.kt`**

```kotlin
package com.revoluapp

import android.content.Context
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.AudioAttributes
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.util.Log

class AudioRouteModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var mediaPlayer: MediaPlayer? = null
    private val TAG = "AudioRouteModule"

    override fun getName() = "AudioRouteModule"

    @ReactMethod
    fun setSpeakerphoneOn(on: Boolean) {
        val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager.requestAudioFocus(null, AudioManager.STREAM_VOICE_CALL, AudioManager.AUDIOFOCUS_GAIN)
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        audioManager.isSpeakerphoneOn = on

        val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL)
        if (audioManager.getStreamVolume(AudioManager.STREAM_VOICE_CALL) < maxVolume / 3) {
            audioManager.setStreamVolume(AudioManager.STREAM_VOICE_CALL, maxVolume / 2, 0)
        }
    }

    @ReactMethod
    fun stop() {
        stopTones()
        val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager.mode = AudioManager.MODE_NORMAL
        audioManager.isSpeakerphoneOn = false
    }

    @ReactMethod
    fun startRingback(filename: String) {
        playSound(filename, false)
    }

    @ReactMethod
    fun startRingtone(filename: String) {
        playSound(filename, true)

        // Vibrate logic
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = reactApplicationContext.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            reactApplicationContext.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        val pattern = longArrayOf(0, 1000, 1000)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(pattern, 0)
        }
    }

    @ReactMethod
    fun stopTones() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
            mediaPlayer = null

            // Stop vibration
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = reactApplicationContext.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                reactApplicationContext.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }
            vibrator.cancel()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping tones: ${e.message}")
        }
    }

    private fun playSound(filename: String, isRingtone: Boolean) {
        stopTones()
        try {
            val resId = reactApplicationContext.resources.getIdentifier(filename, "raw", reactApplicationContext.packageName)
            if (resId == 0) return

            val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            if (isRingtone) {
                audioManager.mode = AudioManager.MODE_RINGTONE
                audioManager.isSpeakerphoneOn = true
            } else {
                audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
            }

            val attributesBuilder = AudioAttributes.Builder()
            if (isRingtone) {
                attributesBuilder.setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            } else {
                attributesBuilder.setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            }

            val streamType = if (isRingtone) AudioManager.STREAM_RING else AudioManager.STREAM_MUSIC
            if (!isRingtone) {
                val maxVol = audioManager.getStreamMaxVolume(streamType)
                audioManager.setStreamVolume(streamType, maxVol, 0)
            }

            audioManager.requestAudioFocus(null, streamType, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)

            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(attributesBuilder.build())
                val afd = reactApplicationContext.resources.openRawResourceFd(resId)
                setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                afd.close()
                prepare()
                isLooping = true
                setVolume(1.0f, 1.0f)
                start()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error playing sound: ${e.message}")
        }
    }
}
```

**3. `AudioRoutePackage.kt`**

```kotlin
package com.revoluapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AudioRoutePackage : ReactPackage {
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
    override fun createNativeModules(reactContext: ReactApplicationContext): MutableList<NativeModule> = mutableListOf(AudioRouteModule(reactContext))
}
```

Then register `AudioRoutePackage()` in your `MainApplication.kt` packages list.

</details>

---

## 🚀 Quick Initialization

Wrap the root of your application in the `<RevoluchatProvider>`. This automatically mounts the Socket Engine, `CallProvider`, `CallModal`, and global logic listeners.

```tsx
import { RevoluchatProvider } from 'revoluchat-rn-sdk';

const config = {
  tenantId: 'your-tenant-id',
  appId: 'your-app-id',
  baseUrl: 'https://api.yourchat.com',
  socketUrl: 'wss://api.yourchat.com/socket',
  apiKey: 'your-developer-api-key',
  authToken: userJwtToken,
  tier: 'pro', // Supports 'basic' | 'standard' | 'pro'

  rtcConfig: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // Production apps should add robust TURN servers (e.g. Twilio)
    ],
  },

  onTokenRefresh: async () => {
    // Automatically called ~60s before token expiration
    const res = await api.post('/login/refresh');
    return res.data.token;
  },
  onSessionExpired: () => {
    // Force user logout
    navigation.replace('Login');
  },
};

### Configuration Options

The `config` object passed to `RevoluchatProvider` supports the following properties:

| Property | Description | Required |
| :--- | :--- | :---: |
| `tenantId` | Unique ID for the tenant | ✅ |
| `appId` | Application identifier | ✅ |
| `baseUrl` | HTTP API base URL | ✅ |
| `socketUrl` | WebSocket base URL | ✅ |
| `apiKey` | Developer API Key | ✅ |
| `authToken` | User's JWT Token | ❌ |
| `tier` | Feature plan: `'basic'`, `'standard'`, or `'pro'` | ❌ (Default: `'pro'`) |
| `rtcConfig` | WebRTC configuration (ICE servers) | ❌ |
| `onTokenRefresh` | Async callback to refresh JWT before expiry | ❌ |
| `onSessionExpired` | Callback for handle expired session/logout | ❌ |

---

export default function App() {
  return (
    <RevoluchatProvider config={config} userId="user-123">
      {/*
        This Provider automatically wraps your UI with the <CallModal />
        and the Singleton <CallProvider />
      */}
      <YourAppNavigation />
    </RevoluchatProvider>
  );
}
```

---

## 🎨 Implementing the User Interface

### 1. Chat Room / Thread

We provide fully modular UI components to build standard chat screens.

```tsx
import { ChatHeader, MessageList, MessageInput } from 'revoluchat-rn-sdk';

export const ChatScreen = ({ route, navigation }) => {
  const { roomId } = route.params;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ChatHeader
        roomId={roomId}
        onBack={() => navigation.goBack()}
        // Note: The Video/Audio call buttons are automatically embedded in ChatHeader
        // based on the channel context. Pressing them launches CallModal seamlessly.
      />
      <MessageList roomId={roomId} />
      <MessageInput roomId={roomId} />
    </View>
  );
};
```

### 2. Calling Layout & Call History

The SDK handles calls internally using `CallModal` which acts as an App-level Overlay. However, if you want to implement a custom recent calls list screen, you can drop in `CallHistoryList`:

```tsx
import { CallHistoryList } from 'revoluchat-rn-sdk';

export const CallHistoryScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      {/* Automatically loads, formats, loops, and lists history, plus triggers call-backs */}
      <CallHistoryList />
    </View>
  );
};
```

---

## 🧠 Advanced Usage & Architecture

### Contacts & Custom Chat Invocations

If you need to programmatically fetch users or create custom chats without the native UI wrappers:

```ts
import { ChatClient } from 'revoluchat-rn-sdk';

const chatClient = ChatClient.getInstance();

// Start a new 1-on-1 conversation
const conversation = await chatClient.createConversation('target_user_id');

// You can now Navigate to the Chat Screen using:
navigation.navigate('ChatScreen', { roomId: conversation.id });
```

### Headless Hooks

If you want to construct your custom User Interface components or custom states:

```tsx
import { useCallHistory, useChannel, usePresence } from 'revoluchat-rn-sdk';

const CustomFeature = ({ roomId }) => {
  const { history, isLoading, refresh } = useCallHistory();
  const { receiver, isOnline } = useChannel(roomId);

  // E.g. Building custom indicators
  return (
    <Text>
      {receiver?.name} is {isOnline ? 'Online 🟢' : 'Away 😴'}
    </Text>
  );
};
```

### JWT Analytics & Checks

```ts
import {
  decodeJWT,
  isTokenExpired,
  msUntilTokenExpiry,
} from 'revoluchat-rn-sdk';

const isExpired = isTokenExpired(token); // Checks with 60 second grace buffer
const data = decodeJWT(token);
```

---

## 📚 Theming & Personalization

Revoluchat SDK uses a centralized theme system that allows you to customize every aspect of the UI. Pass your custom theme to the `RevoluchatProvider`.

### 🎨 Color Palette

| Key               | Description                                      | Default   |
| :---------------- | :----------------------------------------------- | :-------- |
| `primary`         | Main brand color (Headers, FAB, primary buttons) | `#007AFF` |
| `primaryText`     | Text color on primary background                 | `#FFFFFF` |
| `secondary`       | Accent color                                     | `#5856D6` |
| `background`      | Main screen background                           | `#FFFFFF` |
| `surface`         | Card/component backgrounds                       | `#F2F2F7` |
| `text`            | Primary text color                               | `#000000` |
| `textSecondary`   | Muted text color                                 | `#8E8E93` |
| `bubbleUser`      | Chat bubble for your own messages                | `#007AFF` |
| `bubbleUserText`  | Text color in your own chat bubbles              | `#FFFFFF` |
| `bubbleOther`     | Chat bubble for received messages                | `#E9E9EB` |
| `bubbleOtherText` | Text color in received chat bubbles              | `#000000` |
| `border`          | Border and divider color                         | `#C6C6C8` |
| `error`           | Destructive actions and error states             | `#FF3B30` |
| `online`          | Presence "Online" indicator                      | `#4CD964` |
| `inputBackground` | Background for the message input area            | `#F2F2F7` |

### 🖋️ Typography

| Key              | Description                             | Default     |
| :--------------- | :-------------------------------------- | :---------- |
| `fontFamily`     | Custom font family name                 | `undefined` |
| `fontSizeSm`     | Small text (timestamps, secondary info) | `12`        |
| `fontSizeMd`     | Medium text (standard messages)         | `14`        |
| `fontSizeLg`     | Large text (headers, primary titles)    | `16`        |
| `fontWeightBold` | Weight for bold text                    | `600`       |

### 📐 Spacing & Layout

| Key          | Description                                   | Default |
| :----------- | :-------------------------------------------- | :------ |
| `roundness`  | Border radius for cards, bubbles, and buttons | `12`    |
| `spacing.xs` | Extra small padding/margin                    | `4`     |
| `spacing.sm` | Small padding/margin                          | `8`     |
| `spacing.md` | Medium (Standard) padding/margin              | `12`    |
| `spacing.lg` | Large padding/margin                          | `16`    |
| `spacing.xl` | Extra large padding/margin                    | `24`    |

---

## 🛠️ Implementation Example

```tsx
const myCustomTheme = {
  colors: {
    primary: '#6C4AB6',
    primaryText: '#FFFFFF',
    bubbleUser: '#6C4AB6',
    bubbleOther: '#E9E9F2',
    background: '#F9F9FF',
  },
  roundness: 8,
};

<RevoluchatProvider theme={myCustomTheme} ...>
```

---

## 📄 Architecture Overview

- `domain/`: Pure business logic (Entities, Use Cases, Repository Contracts).
- `data/`: Network & persistence layer (Repositories, MMKV DataSources, Phoenix Socket).
- `presentation/`: React-logic layer (UI Components, Master Contexts, Headless Hooks).
- `di/`: Central Dependency Injection system linking backend logics.

## License

MIT © [Achmad Rifai](https://github.com/achmadrifai)
