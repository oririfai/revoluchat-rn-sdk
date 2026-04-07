import React, { createContext, useContext, FC } from 'react';
import { useCallControls } from './hooks/useCallControls';

type CallContextType = ReturnType<typeof useCallControls>;
const CallContext = createContext<CallContextType | null>(null);

export const useCallContext = (): CallContextType => {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error('useCallContext must be used within CallProvider');
    return ctx;
};

export const CallProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
    // Exactly ONE instance of the call hook for the entire SDK
    // This perfectly routes media references across all components
    const callControls = useCallControls();

    return (
        <CallContext.Provider value={callControls}>
            {children}
        </CallContext.Provider>
    );
};
