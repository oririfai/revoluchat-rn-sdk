import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { ChatClient } from './ChatClient';
import { useChatStore } from '../data/datasources/ChatStore';
import { TenantConfig } from '../domain/entities/TenantConfig';
import { CallModal } from './components/CallModal';
import { CallProvider } from './CallProvider';
import { RevoluchatTheme, defaultTheme } from './theme';

interface RevoluchatContextType {
  client: ChatClient;
  userId: string;
  connectionStatus: string;
  theme: RevoluchatTheme;
}

const RevoluchatContext = createContext<RevoluchatContextType | undefined>(undefined);

interface RevoluchatProviderProps {
  config: TenantConfig;
  userId: string;
  theme?: Partial<RevoluchatTheme>;
  children: React.ReactNode;
}

export const RevoluchatProvider: React.FC<RevoluchatProviderProps> = ({ 
  config, 
  userId, 
  theme: customTheme, 
  children 
}) => {
  const client = useMemo(() => ChatClient.getInstance(), []);
  const connectionStatus = useChatStore((state) => state.connectionStatus);

  const theme = useMemo(() => ({
    ...defaultTheme,
    ...customTheme,
    colors: { ...defaultTheme.colors, ...customTheme?.colors },
    spacing: { ...defaultTheme.spacing, ...customTheme?.spacing },
    typography: { ...defaultTheme.typography, ...customTheme?.typography },
  }), [customTheme]);

  useEffect(() => {
    // initialize() already handles joinUserChannel() internally
    client.initialize(config, userId);
    return () => {
      client.disconnect();
    };
  }, [client, config, userId]);

  return (
    <RevoluchatContext.Provider value={{ client, userId, connectionStatus, theme }}>
      <CallProvider>
        {children}
        <CallModal />
      </CallProvider>
    </RevoluchatContext.Provider>
  );
};

export const useRevoluchat = () => {
  const context = useContext(RevoluchatContext);
  if (!context) {
    throw new Error('useRevoluchat must be used within a RevoluchatProvider');
  }
  return context;
};
