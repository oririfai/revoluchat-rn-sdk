# Revoluchat React Native SDK 🚀

**Version**: `v1.2.0` (JWT Auto-Refresh & Secure Auth Support)

The official React Native SDK for **Revoluchat**, an enterprise-grade, multi-tenant real-time chat platform. Built with a **Clean Architecture** mindset, offering both a headless logic layer (Hooks) and ready-made UI components.

[![npm version](https://img.shields.io/npm/v/revoluchat-rn-sdk.svg?style=flat-square)](https://www.npmjs.com/package/revoluchat-rn-sdk)
[![license](https://img.shields.io/npm/l/revoluchat-rn-sdk.svg?style=flat-square)](LICENSE)

## ✨ Features

- **Real-time Engine**: Powered by Phoenix Channels for instant message delivery and presence tracking.
- **Presence & Online Status**: Real-time "Online/Offline" indicators for chat partners.
- **Chat Header**: Ready-to-use `ChatHeader` with partner photo, name, status, and call buttons.
- **Date Separators**: Automatic "Day, Date, Year" separators in `MessageList`.
- **Read Receipts**: Visual status indicators using optimized PNG assets (Unread, Read, Failed).
- **JWT Token Lifecycle**: Automatic expiry detection, refresh scheduling, and seamless socket reconnection.
- **OIDC Compatible**: Fully compatible with RS256 JWT tokens.
- **Enterprise Ready**: Multi-tenant configurations (`tenantId`, `appId`, `apiKey`).
- **Offline First**: High-performance caching using `react-native-mmkv`.
- **Clean Architecture**: Strictly separated layers (Domain, Data, Presentation).
- **Headless Hooks**: `useChannels`, `useMessages`, `useChannel`, `usePresence` for custom UIs.
- **UI Components**: `ChatHeader`, `ChannelList`, `MessageList`, `MessageInput`.
- **Push Notifications**: Built-in support for parsing FCM/APNS messages.
- **Media Support**: Handling for image and file attachments.

## 📦 Installation

```bash
yarn add revoluchat-rn-sdk
# or
npm install revoluchat-rn-sdk
```

Peer dependencies:

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
  apiKey: 'your-developer-api-key', // From Admin Dashboard → API Keys
  authToken: userJwtToken, // JWT from your backend login endpoint

  // ---- Token Lifecycle (recommended) ----
  onTokenRefresh: async () => {
    // Called automatically ~60s before token expires
    const res = await yourApi.post('/login', {
      /* credentials */
    });
    return res.data.token; // Return the new JWT string
  },
  onSessionExpired: () => {
    // Called if refresh fails or no handler — redirect to login
    navigation.replace('Login');
  },
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
import { ChatHeader, MessageList, MessageInput } from 'revoluchat-rn-sdk';

export const ChatScreen = ({ roomId, onBack }) => {
  return (
    <View style={{ flex: 1 }}>
      <ChatHeader 
        roomId={roomId} 
        onBack={onBack} 
      />
      <MessageList roomId={roomId} />
      <MessageInput roomId={roomId} />
    </View>
  );
};
```

## 🔐 JWT Token Management

The SDK automatically manages your authentication token lifetime:

| Behavior                | Description                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Expiry Guard**        | If the token is already expired when `connect()` is called, `onSessionExpired` is triggered immediately     |
| **Auto Refresh**        | A timer is scheduled to fire 60 seconds before expiry and call `onTokenRefresh`                             |
| **Seamless Reconnect**  | After a successful refresh, the socket reconnects transparently and all rooms are re-joined                 |
| **Graceful Disconnect** | If refresh fails or no handler is provided, the socket disconnects cleanly and `onSessionExpired` is called |

You can also use the exported JWT utilities directly:

```ts
import {
  decodeJWT,
  isTokenExpired,
  msUntilTokenExpiry,
} from 'revoluchat-rn-sdk';

const payload = decodeJWT(token); // { sub, exp, iat, app_id, ... }
const expired = isTokenExpired(token); // true / false (with 60s buffer)
const ms = msUntilTokenExpiry(token); // milliseconds until refresh fires
```

## 👥 Contacts & Multi-Chat

You can fetch registered users and initiate new conversations directly:

```ts
import { ChatClient } from 'revoluchat-rn-sdk';

const chatClient = ChatClient.getInstance();

// 1. Get list of other registered users
const contacts = await chatClient.getContacts(); 
// Returns Array<{ id, name, phone, avatarUrl }>

// 2. Start a new 1-on-1 conversation
const targetUserId = "456"; 
const conversation = await chatClient.createConversation(targetUserId);
// Returns the Conversation object. After this, you can navigate to the chat screen using conversation.id
```

## 🛠️ Customization & Theming

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

## 🌐 Localization

The `MessageList` component uses the `id-ID` (Indonesian) locale for date separators by default.

> [!NOTE]
> If you are using an older version of React Native or an engine without full `Intl` support, you may need to polyfill `Intl` to see correctly localized dates:
> `yarn add @formatjs/intl-getcanonicallocales @formatjs/intl-locale @formatjs/intl-datetimeformat`

```ts
// In your App entry point (index.js)
import '@formatjs/intl-getcanonicallocales/polyfill';
import '@formatjs/intl-locale/polyfill';
import '@formatjs/intl-datetimeformat/polyfill';
import '@formatjs/intl-datetimeformat/locale-data/id'; // Add Indonesian support
```

## 🪝 Headless Hooks (Advanced)

```tsx
import {
  useChannels,
  useMessages,
  useChannel,
  usePresence,
} from 'revoluchat-rn-sdk';

const MyChatStatus = ({ roomId }) => {
  const { receiver, isOnline } = useChannel(roomId);
  const presences = usePresence(roomId); // Full list of online users

  return (
    <Text>{receiver?.name} is {isOnline ? 'Online' : 'Offline'}</Text>
  );
};
```

## 🔔 Push Notifications

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

- `domain/`: Pure business logic (Entities, Use Cases, Repository Contracts).
- `data/`: Network & persistence layer (Repositories, DataSources, Socket Client).
- `presentation/`: React-specific layer (Components, Hooks, Providers).
- `di/`: Dependency Injection container for loose coupling.
- `utils/`: Shared helpers, including `jwtUtils`.

## 📄 License

MIT © [Achmad Rifai](https://github.com/achmadrifai)
