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
    const activeCallRef = useRef<CallSession | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [remoteStreamKey, setRemoteStreamKey] = useState(0);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoudspeaker, setIsLoudspeaker] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [callDuration, setCallDuration] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const socketClient = DI.socketClient;

    // Keep activeCallRef in sync so signaling listener always has latest call data
    useEffect(() => {
        activeCallRef.current = activeCall;
    }, [activeCall]);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startTimer = useCallback((connectedAt: number) => {
        stopTimer();
        setCallDuration(0);
        timerRef.current = setInterval(() => {
            const diff = Math.floor((Date.now() - connectedAt) / 1000);
            setCallDuration(diff > 0 ? diff : 0);
        }, 1000);
    }, [stopTimer]);

    const resetState = useCallback(() => {
        setRemoteStream(null);
        setLocalStream(null);
        setIsMuted(false);
        setIsLoudspeaker(false);
        setIsVideoEnabled(true);
        setCallDuration(0);
        useChatStore.getState().setActiveCall(null);
        setIsProcessing(false);
    }, []);

    const cleanup = useCallback((forceImmediate: boolean = false) => {
        console.log('[useCallControls] Cleaning up call resources');
        hasCleanedUp.current = true;
        NativeAudioRoute.stop();
        stopTimer();
        rtcRef.current?.close();
        rtcRef.current = null;
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        
        if (forceImmediate) {
            resetState();
        } else {
            setTimeout(resetState, 2000);
        }
    }, [stopTimer, resetState]);

    const finishCall = useCallback((finalStatus: 'completed' | 'rejected') => {
        setActiveCall(prev => prev ? { ...prev, status: finalStatus } : prev);
        cleanup(false);
    }, [setActiveCall, cleanup]);

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
                socketClient.sendCallSignal(currentCall.conversationId, 'call:signal', {
                    call_id: currentCall.id,
                    signal: { type: 'candidate', candidate }
                }).catch(e => console.warn('[RTC] ICE send failed', e));
            },
            (stream) => {
                console.log('[RTC] Remote stream received!');
                setRemoteStream(stream);
                setRemoteStreamKey(prev => prev + 1);
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
        try {
            const perms = await requestCallPermissions(type, true);
            if (!perms.granted) {
                return;
            }

            const shouldLoudspeaker = type === 'video';
            setIsLoudspeaker(shouldLoudspeaker);
            NativeAudioRoute.setSpeakerphoneOn(shouldLoudspeaker);

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
            };

            setActiveCall(newCall);

            // Setup RTC and add stream — offer sent when call:accepted arrives
            await setupRTC(newCall);
            rtcRef.current?.addStream(stream);
            console.log('[useCallControls] CALLER ready. Waiting for receiver...');

        } catch (error) {
            console.error('[useCallControls] Failed to initiate call', error);
            cleanup(true);
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

            const shouldLoudspeaker = activeCall.type === 'video';
            setIsLoudspeaker(shouldLoudspeaker);
            NativeAudioRoute.setSpeakerphoneOn(shouldLoudspeaker);

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

            const updatedCall: CallSession = { ...activeCall, status: 'connected', startedAt: new Date() };

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
            cleanup(true);
        } finally {
            setIsProcessing(false);
        }
    }, [activeCall, isProcessing, socketClient, setActiveCall, setupRTC, cleanup]);

    const rejectCall = useCallback(async () => {
        if (!activeCall) return;
        const callId = activeCall.id;
        finishCall('rejected');
        socketClient.sendUserSignal('call:respond', {
            call_id: callId,
            response: 'reject'
        }).catch(err => console.warn('[useCallControls] Reject failed', err));
    }, [activeCall, socketClient, finishCall]);

    const hangup = useCallback(async () => {
        if (!activeCall) return;
        const cid = activeCall.conversationId;
        const callId = activeCall.id;
        finishCall('completed');
        try {
            await socketClient.sendCallSignal(cid, 'call:hangup', { call_id: callId });
        } catch (error) {
            console.error('[useCallControls] Hangup signal failed', error);
        }
    }, [activeCall, socketClient, finishCall]);

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

    const toggleVideo = useCallback(() => {
        if (!localStream) return;
        const newState = !isVideoEnabled;
        rtcRef.current?.toggleVideo(localStream, newState);
        setIsVideoEnabled(newState);
    }, [localStream, isVideoEnabled]);

    const switchCamera = useCallback(() => {
        if (!localStream) return;
        rtcRef.current?.switchCamera(localStream);
    }, [localStream]);

    // 1. Auto-Ringing (Active Hook Only)
    useEffect(() => {
        if (activeCall &&
            activeCall.status === 'dialing' &&
            activeCall.callerId !== (userId ? parseInt(userId) : 0)) {
            socketClient.sendCallSignal(activeCall.conversationId, 'call:ringing', {
                call_id: activeCall.id
            });
        }
    }, [activeCall, userId, socketClient]);

    useEffect(() => {
        if (!activeCall) return;
        if (activeCall.status === 'connected') {
            NativeAudioRoute.setSpeakerphoneOn(isLoudspeaker);
        }
    }, [activeCall?.status, isLoudspeaker]);

    // 3. Audio & Timer Lifecycle
    useEffect(() => {
        if (!activeCall) {
            if (!hasCleanedUp.current) cleanup(true);
            return;
        } else {
            // NEW CALL starts -> reset the cleanup flag so we can process events!
            hasCleanedUp.current = false;
        }

        if (activeCall.status === 'connected') {
            if (!timerRef.current && activeCall.startedAt) {
                // Determine synchronization timestamp
                const syncStamp = activeCall.startedAt.getTime ? activeCall.startedAt.getTime() : new Date(activeCall.startedAt).getTime();
                startTimer(syncStamp);
            }
        } else {
            stopTimer();
        }
    }, [activeCall?.status, activeCall?.id, cleanup, startTimer, stopTimer]);

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
                setActiveCall((prev) => prev ? { ...prev, status: 'connected', startedAt: new Date() } : prev);

                const myId = userId ? parseInt(userId) : 0;
                const dynamicIsCaller = call.callerId === myId;
                console.log(`[useCallControls] I am the CALLER? ${dynamicIsCaller} (MyId: ${myId}, CallerId: ${call.callerId})`);

                // CALLER: receiver accepted → create and send offer via user channel directly to receiver
                if (dynamicIsCaller && rtcRef.current) {
                    console.log('[useCallControls] CALLER: Creating offer after accept...');
                    try {
                        const offer = await rtcRef.current.createOffer();
                        // Send offer directly to receiver's user channel
                        await socketClient.sendCallSignal(call.conversationId, 'call:signal', {
                            call_id: call.id,
                            signal: offer
                        });
                        console.log('[useCallControls] CALLER: Offer sent to receiver via user channel!');
                    } catch (e) {
                        console.error('[useCallControls] CALLER: Offer failed', e);
                    }
                }
                return;
            }

            if (!isIdMatch) return;

            if (event === 'call:rejected') {
                finishCall('rejected');
                return;
            }
            if (event === 'call:hangup') {
                finishCall('completed');
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
                        await socketClient.sendCallSignal(call.conversationId, 'call:signal', {
                            call_id: call.id,
                            signal: answer
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
        remoteStreamKey,
        isMuted,
        isLoudspeaker,
        isVideoEnabled,
        callDuration,
        initiateCall,
        acceptCall,
        rejectCall,
        hangup,
        toggleMute,
        toggleLoudspeaker,
        toggleVideo,
        switchCamera,
        cleanup,
        isProcessing
    };
};
