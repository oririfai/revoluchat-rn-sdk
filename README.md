# Revoluchat React Native SDK 🚀

The official React Native SDK for **Revoluchat**, an enterprise-grade, multi-tenant real-time chat platform. Built with a **Clean Architecture** mindset, this SDK offers both a headless logic layer (Hooks) and a set of beautiful, customizable UI components.

[![npm version](https://img.shields.io/npm/v/revoluchat-rn-sdk.svg?style=flat-square)](https://www.npmjs.com/package/revoluchat-rn-sdk)
[![license](https://img.shields.io/npm/l/revoluchat-rn-sdk.svg?style=flat-square)](LICENSE)

## ✨ Features

- **Real-time Engine**: Powered by Phoenix Channels for instant message delivery and presence tracking.
- **Enterprise Ready**: Seamless support for multi-tenant configurations (`tenantId`, `appId`).
- **Offline First**: High-performance caching using `react-native-mmkv` for instant loading.
- **Clean Architecture**: Strictly separated layers (Domain, Data, Presentation) for high maintainability.
- **Headless Hooks**: Logic-only hooks (`useChannels`, `useMessages`) for building custom UIs.
- **UI Components**: Out-of-the-box components (`ChannelList`, `MessageList`, `MessageInput`).
- **Push Notifications**: Built-in support for parsing FCM/APNS messages.
- **Media Support**: Easy handling for image and file attachments.

## 📦 Installation

```bash
yarn add revoluchat-rn-sdk
# or
npm install revoluchat-rn-sdk
```

Don't forget to install the required peer dependencies:

```bash
yarn add react-native-mmkv zustand phoenix
```

## 🚀 Quick Start

### 1. Wrap your app with `RevoluchatProvider`

```tsx
import { RevoluchatProvider } from 'revoluchat-rn-sdk';

const config = {
  tenantId: 'your-tenant-id',
  appId: 'your-app-id',
  baseUrl: 'https://api.yourchat.com',
  socketUrl: 'wss://api.yourchat.com/socket',
  authToken: 'user-jwt-token',
};

export default function App() {
  return (
    <RevoluchatProvider config={config} userId="user-123">
      {/* Your app content */}
    </RevoluchatProvider>
  );
}
```

### 2. Display a Chat Thread

```tsx
import { MessageList, MessageInput } from 'revoluchat-rn-sdk';

export const ChatScreen = ({ roomId }) => {
  return (
    <View style={{ flex: 1 }}>
      <MessageList roomId={roomId} />
      <MessageInput roomId={roomId} />
    </View>
  );
};
```

## 🛠️ Customization & Theming

The SDK comes with a powerful theme system. Pass a `theme` object to the provider:

```tsx
const customTheme = {
  colors: {
    primary: '#6200EE',
    background: '#F5F5F5',
    bubbleUser: '#6200EE',
    text: '#000000',
  },
  typography: {
    fontFamily: 'Inter-Regular',
  }
};

<RevoluchatProvider theme={customTheme} ...>
```

## 🪝 Headless Hooks (Advanced)

Build your custom UI using our reactivity engine:

```tsx
import {
  useChannels,
  useMessages,
  useConnectionStatus,
} from 'revoluchat-rn-sdk';

const MyCustomList = () => {
  const channels = useChannels();
  const status = useConnectionStatus();

  return (
    <View>
      <Text>Status: {status}</Text>
      {channels.map((c) => (
        <Text key={c.id}>{c.name}</Text>
      ))}
    </View>
  );
};
```

## 🔔 Push Notifications

Parse incoming data messages seamlessly:

```tsx
import { RevoluchatNotifications } from 'revoluchat-rn-sdk';

messaging().onMessage(async (remoteMessage) => {
  if (RevoluchatNotifications.isRevoluchatNotification(remoteMessage)) {
    const message = RevoluchatNotifications.parseRemoteMessage(remoteMessage);
    // Show local alert or update state
  }
});
```

## 📂 Architecture Overview

The SDK is built following **Enterprise Clean Architecture**:

- `domain/`: Pure business logic (Entities, Use Cases, Repository Contracts).
- `data/`: Data persistence and network implementation (Repositories, DataSources).
- `presentation/`: React specific layer (Components, Hooks, Providers).
- `di/`: Dependency Injection container for loose coupling.

## 📄 License

MIT © [Achmad Rifai](https://github.com/achmadrifai)
