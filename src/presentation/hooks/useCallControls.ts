import { useState, useCallback, useRef, useEffect } from 'react';
import { RTCIceCandidate, RTCSessionDescription, MediaStream, mediaDevices } from 'react-native-webrtc';
import { useChatStore } from '../../data/datasources/ChatStore';
import { DI } from '../../di';
import { RTCConnection, RTCConnectionConfig } from '../../data/datasources/RTCConnection';
import { CallSession, CallType } from '../../domain/entities/Call';

export const useCallControls = () => {
    const { activeCall, setActiveCall } = useChatStore();
    const rtcRef = useRef<RTCConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    const socketClient = DI.socketClient;

    // TODO: Dynamic ICE server fetching from backend
    const defaultRtcConfig: RTCConnectionConfig = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    const cleanup = useCallback(() => {
        rtcRef.current?.close();
        rtcRef.current = null;
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        setRemoteStream(null);
        setLocalStream(null);
        setActiveCall(null);
    }, [setActiveCall]);

    const setupRTC = useCallback(async (config = defaultRtcConfig) => {
        rtcRef.current = new RTCConnection(
            config,
            (candidate) => {
                if (activeCall) {
                    socketClient.sendCallSignal(activeCall.conversationId, 'call:signal', {
                        call_id: activeCall.id,
                        signal: { type: 'candidate', candidate }
                    });
                }
            },
            (stream) => {
                setRemoteStream(stream);
            }
        );
        await rtcRef.current.createPeerConnection();
    }, [activeCall, socketClient]);

    const initiateCall = useCallback(async (conversationId: string, receiverId: number, type: CallType) => {
        try {
            const stream = await mediaDevices.getUserMedia({
                audio: true,
                video: type === 'video'
            }) as MediaStream;

            localStreamRef.current = stream;
            setLocalStream(stream);

            const resp = await socketClient.sendCallSignal(conversationId, 'call:request', {
                type,
                receiver_id: receiverId
            });

            const newCall: CallSession = {
                id: resp.call_id,
                type,
                status: 'dialing',
                conversationId,
                callerId: 0, // Should be populated from user store in real app
                receiverId,
                startedAt: new Date()
            };

            setActiveCall(newCall);
            await setupRTC();
            rtcRef.current?.addStream(stream);

            const offer = await rtcRef.current?.createOffer();
            await socketClient.sendCallSignal(conversationId, 'call:signal', {
                call_id: newCall.id,
                signal: offer
            });

        } catch (error) {
            console.error('Failed to initiate call', error);
            cleanup();
        }
    }, [socketClient, setActiveCall, setupRTC, cleanup]);

    const acceptCall = useCallback(async () => {
        if (!activeCall) return;

        try {
            const stream = await mediaDevices.getUserMedia({
                audio: true,
                video: activeCall.type === 'video'
            }) as MediaStream;

            localStreamRef.current = stream;
            setLocalStream(stream);

            await socketClient.sendCallSignal(activeCall.conversationId, 'call:respond', {
                call_id: activeCall.id,
                response: 'accept'
            });

            setActiveCall({ ...activeCall, status: 'connected' });
            await setupRTC();
            rtcRef.current?.addStream(stream);

        } catch (error) {
            console.error('Failed to accept call', error);
            cleanup();
        }
    }, [activeCall, socketClient, setActiveCall, setupRTC, cleanup]);

    const rejectCall = useCallback(async () => {
        if (!activeCall) return;
        await socketClient.sendCallSignal(activeCall.conversationId, 'call:respond', {
            call_id: activeCall.id,
            response: 'reject'
        });
        cleanup();
    }, [activeCall, socketClient, cleanup]);

    const hangup = useCallback(async () => {
        if (!activeCall) return;
        await socketClient.sendCallSignal(activeCall.conversationId, 'call:hangup', {
            call_id: activeCall.id
        });
        cleanup();
    }, [activeCall, socketClient, cleanup]);

    // Signaling listener
    useEffect(() => {
        if (!activeCall) return;

        // Note: Realistically, the signaling logic should be managed by a global service
        // that handles incoming signals even if the hook isn't active on a specific screen.
        // For this SDK logic, we assume the hook or a context provider is managing this.

        const handleSignal = async (event: string, payload: any) => {
            if (payload.call_id !== activeCall.id) return;

            switch (event) {
                case 'call:ringing':
                    setActiveCall({ ...activeCall, status: 'ringing' });
                    break;
                case 'call:accepted':
                    setActiveCall({ ...activeCall, status: 'connected' });
                    break;
                case 'call:rejected':
                case 'call:hangup':
                    cleanup();
                    break;
                case 'call:signal':
                    const signal = payload.signal;
                    if (signal.type === 'offer') {
                        const answer = await rtcRef.current?.handleOffer(signal);
                        socketClient.sendCallSignal(activeCall.conversationId, 'call:signal', {
                            call_id: activeCall.id,
                            signal: answer
                        });
                    } else if (signal.type === 'answer') {
                        await rtcRef.current?.handleAnswer(signal);
                    } else if (signal.type === 'candidate') {
                        await rtcRef.current?.addIceCandidate(signal.candidate);
                    }
                    break;
            }
        };

        // This is a placeholder: in the real SDK, we'd subscribe to the socket client's event bus
        // or ensure the active call screen implements these listeners.
        // For demonstration, we'll assume the component using this hook receives events.

    }, [activeCall, setActiveCall, cleanup, socketClient]);

    return {
        activeCall,
        localStream,
        remoteStream,
        initiateCall,
        acceptCall,
        rejectCall,
        hangup
    };
};
