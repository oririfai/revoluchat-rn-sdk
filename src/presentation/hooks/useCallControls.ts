import { useState, useCallback, useRef, useEffect } from 'react';
import { RTCIceCandidate, RTCSessionDescription, MediaStream, mediaDevices } from 'react-native-webrtc';

import { useChatStore } from '../../data/datasources/ChatStore';
import { useRevoluchat } from '../RevoluchatProvider';
import { DI } from '../../di';
import { RTCConnection, RTCConnectionConfig } from '../../data/datasources/RTCConnection';
import { CallSession, CallType } from '../../domain/entities/Call';
import { requestCallPermissions } from '../../utils/permissions';
import { NativeAudioRoute } from '../../utils/AudioRouteModule';

export const useCallControls = () => {
    const { activeCall, setActiveCall } = useChatStore();
    const { userId } = useRevoluchat();
    const iceServers = useChatStore((state) => state.iceServers);
    const rtcRef = useRef<RTCConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const hasCleanedUp = useRef<boolean>(false);
    const isCallerRef = useRef<boolean>(false);
    const activeCallRef = useRef<CallSession | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoudspeaker, setIsLoudspeaker] = useState(true);

    const socketClient = DI.socketClient;

    // Keep activeCallRef in sync so signaling listener always has latest call data
    useEffect(() => {
        activeCallRef.current = activeCall;
    }, [activeCall]);

    const cleanup = useCallback(() => {
        console.log('[useCallControls] Cleaning up call resources');
        hasCleanedUp.current = true;
        isCallerRef.current = false;
        NativeAudioRoute.stop();
        isCallerRef.current = false;
        rtcRef.current?.close();
        rtcRef.current = null;
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        setRemoteStream(null);
        setLocalStream(null);
        setIsMuted(false);
        setIsLoudspeaker(true);
        useChatStore.getState().setActiveCall(null);
        setIsProcessing(false);
    }, []);

    const setupRTC = useCallback(async (call: CallSession) => {
        if (rtcRef.current) {
            rtcRef.current.close();
            rtcRef.current = null;
        }
        const myId = userId ? parseInt(userId) : 0;
        rtcRef.current = new RTCConnection(
            { iceServers },
            (candidate) => {
                const currentCall = activeCallRef.current;
                if (!currentCall) return;
                // Determine ICE target: send to the OTHER party
                const targetUserId = currentCall.callerId === myId
                    ? currentCall.receiverId
                    : currentCall.callerId;
                console.log('[RTC] Sending ICE candidate to user:', targetUserId);
                socketClient.sendUserSignal('call:signal', {
                    call_id: currentCall.id,
                    signal: { type: 'candidate', candidate },
                    target_user_id: targetUserId
                }).catch(e => console.warn('[RTC] ICE send failed', e));
            },
            (stream) => {
                console.log('[RTC] Remote stream received!');
                setRemoteStream(stream);
            }
        );
        await rtcRef.current.createPeerConnection();
        console.log('[RTC] PeerConnection created');
    }, [socketClient, userId]);

    /**
     * CALLER: Setup call, get media, setup RTC.
     * Offer is NOT sent here — it is sent after receiving call:accepted.
     */
    const initiateCall = useCallback(async (conversationId: string, receiverId: number, type: CallType, receiverName?: string) => {
        hasCleanedUp.current = false;
        isCallerRef.current = true;
        try {
            const perms = await requestCallPermissions(type, true);
            if (!perms.granted) {
                isCallerRef.current = false;
                return;
            }

            NativeAudioRoute.setSpeakerphoneOn(type === 'video');

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
                callerId: userId ? parseInt(userId) : 0,
                receiverId,
                receiverName,
                startedAt: new Date()
            };

            setActiveCall(newCall);

            // Setup RTC and add stream — offer sent when call:accepted arrives
            await setupRTC(newCall);
            rtcRef.current?.addStream(stream);
            console.log('[useCallControls] CALLER ready. Waiting for receiver...');

        } catch (error) {
            console.error('[useCallControls] Failed to initiate call', error);
            cleanup();
        }
    }, [socketClient, setActiveCall, setupRTC, cleanup, userId]);

    /**
     * RECEIVER: Accept incoming call.
     * Sets up RTC BEFORE sending accept so PeerConnection is ready for the offer.
     */
    const acceptCall = useCallback(async () => {
        if (!activeCall || isProcessing) return;

        console.log('[useCallControls] Accepting call...', activeCall.id);
        setIsProcessing(true);
        try {
            const perms = await requestCallPermissions(activeCall.type, true);
            if (!perms.granted) {
                setIsProcessing(false);
                return;
            }

            NativeAudioRoute.setSpeakerphoneOn(activeCall.type === 'video');

            const streamPromise = mediaDevices.getUserMedia({
                audio: true,
                video: activeCall.type === 'video'
            }) as Promise<MediaStream>;
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('getUserMedia timeout')), 10000)
            );
            const stream = await Promise.race([streamPromise, timeoutPromise]) as MediaStream;

            localStreamRef.current = stream;
            setLocalStream(stream);

            const updatedCall: CallSession = { ...activeCall, status: 'connected' };

            // Setup RTC BEFORE sending accept so we're ready for the offer
            await setupRTC(updatedCall);
            rtcRef.current?.addStream(stream);
            console.log('[useCallControls] RECEIVER RTC ready. Sending accept...');

            setActiveCall(updatedCall);

            // This triggers the caller to send the offer
            await socketClient.sendUserSignal('call:respond', {
                call_id: activeCall.id,
                response: 'accept'
            });

            console.log('[useCallControls] RECEIVER accept sent. Waiting for offer...');

        } catch (error) {
            console.error('[useCallControls] Failed to accept call', error);
            cleanup();
        } finally {
            setIsProcessing(false);
        }
    }, [activeCall, isProcessing, socketClient, setActiveCall, setupRTC, cleanup]);

    const rejectCall = useCallback(async () => {
        if (!activeCall) return;
        const callId = activeCall.id;
        cleanup();
        socketClient.sendUserSignal('call:respond', {
            call_id: callId,
            response: 'reject'
        }).catch(err => console.warn('[useCallControls] Reject failed', err));
    }, [activeCall, socketClient, cleanup]);

    const hangup = useCallback(async () => {
        if (!activeCall) return;
        const cid = activeCall.conversationId;
        const callId = activeCall.id;
        cleanup();
        try {
            await socketClient.sendCallSignal(cid, 'call:hangup', { call_id: callId });
        } catch (error) {
            console.error('[useCallControls] Hangup signal failed', error);
        }
    }, [activeCall, socketClient, cleanup]);

    const toggleMute = useCallback(() => {
        if (!localStream) return;
        const newState = !isMuted;
        localStream.getAudioTracks().forEach(track => { track.enabled = !newState; });
        setIsMuted(newState);
    }, [localStream, isMuted]);

    const toggleLoudspeaker = useCallback(() => {
        const newState = !isLoudspeaker;
        NativeAudioRoute.setSpeakerphoneOn(newState);
        setIsLoudspeaker(newState);
    }, [isLoudspeaker]);

    // 1. Auto-Ringing
    useEffect(() => {
        if (activeCall &&
            activeCall.status === 'dialing' &&
            activeCall.callerId !== (userId ? parseInt(userId) : 0)) {
            socketClient.sendCallSignal(activeCall.conversationId, 'call:ringing', {
                call_id: activeCall.id
            });
        }
    }, [activeCall, userId, socketClient]);

    // 2. Cleanup & Audio Routing
    useEffect(() => {
        if (!activeCall) {
            if (!hasCleanedUp.current) cleanup();
            return;
        } else {
            // NEW CALL starts -> reset the cleanup flag so we can process events!
            hasCleanedUp.current = false;
        }

        if (activeCall && activeCall.status === 'connected') {
            NativeAudioRoute.setSpeakerphoneOn(isLoudspeaker);
        }
    }, [activeCall, cleanup, isLoudspeaker]);

    // 3. WebRTC Signaling Listener (stable, does not re-subscribe on every activeCall change)
    useEffect(() => {
        const onCallEvent = async (event: string, payload: any) => {
            if (hasCleanedUp.current) return;

            const call = activeCallRef.current;
            if (!call) return;

            const incomingId = String(payload.call_id || '').trim().toLowerCase();
            const currentId = String(call.id || '').trim().toLowerCase();
            const isIdMatch = incomingId === currentId;

            console.log(`[useCallControls] Event: ${event}, Match: ${isIdMatch}`);

            if (event === 'call:accepted') {
                setActiveCall((prev) => prev ? { ...prev, status: 'connected' } : prev);

                // CALLER: receiver accepted → create and send offer via user channel directly to receiver
                if (isCallerRef.current && rtcRef.current) {
                    console.log('[useCallControls] CALLER: Creating offer after accept...');
                    try {
                        const offer = await rtcRef.current.createOffer();
                        // Send offer directly to receiver's user channel
                        await socketClient.sendUserSignal('call:signal', {
                            call_id: call.id,
                            signal: offer,
                            target_user_id: call.receiverId
                        });
                        console.log('[useCallControls] CALLER: Offer sent to receiver via user channel!');
                    } catch (e) {
                        console.error('[useCallControls] CALLER: Offer failed', e);
                    }
                }
                return;
            }

            if (!isIdMatch) return;

            if (event === 'call:rejected' || event === 'call:hangup') {
                setActiveCall(() => null);
                return;
            }

            if (event === 'call:ringing') {
                setActiveCall((prev) => {
                    if (!prev || prev.status !== 'dialing') return prev;
                    return { ...prev, status: 'ringing' };
                });
                return;
            }

            if (event === 'call:signal') {
                const signal = payload.signal;
                console.log('[useCallControls] Signal type:', signal?.type);

                if (signal.type === 'offer') {
                    // RECEIVER: handle offer → send answer back to CALLER via user channel
                    console.log('[useCallControls] RECEIVER: Handling offer...');
                    if (!rtcRef.current) {
                        console.warn('[useCallControls] RECEIVER: No PeerConnection! Setting up fallback...');
                        await setupRTC(call);
                    }
                    const rtcForOffer = rtcRef.current as RTCConnection | null;
                    if (rtcForOffer && localStreamRef.current) {
                        rtcForOffer.addStream(localStreamRef.current);
                    }
                    try {
                        const answer = await rtcForOffer?.handleOffer(signal);
                        // Send answer directly to caller's user channel
                        await socketClient.sendUserSignal('call:signal', {
                            call_id: call.id,
                            signal: answer,
                            target_user_id: call.callerId
                        });
                        console.log('[useCallControls] RECEIVER: Answer sent to caller via user channel!');
                    } catch (e) {
                        console.error('[useCallControls] RECEIVER: Offer handling failed', e);
                    }
                } else if (signal.type === 'answer') {
                    // CALLER: handle answer
                    console.log('[useCallControls] CALLER: Handling answer...');
                    try {
                        await rtcRef.current?.handleAnswer(signal);
                        console.log('[useCallControls] CALLER: Answer handled! Audio should start.');
                    } catch (e) {
                        console.error('[useCallControls] CALLER: Answer failed', e);
                    }
                } else if (signal.type === 'candidate') {
                    try {
                        await rtcRef.current?.addIceCandidate(signal.candidate);
                    } catch (e) {
                        console.warn('[useCallControls] ICE candidate failed', e);
                    }
                }
            }
        };

        const unsubscribe = socketClient.onGlobalCall(onCallEvent);
        return () => { unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socketClient, setupRTC]); // Stable deps only — activeCall accessed via ref

    return {
        activeCall,
        localStream,
        remoteStream,
        isMuted,
        isLoudspeaker,
        initiateCall,
        acceptCall,
        rejectCall,
        hangup,
        toggleMute,
        toggleLoudspeaker,
        cleanup,
        isProcessing
    };
};
