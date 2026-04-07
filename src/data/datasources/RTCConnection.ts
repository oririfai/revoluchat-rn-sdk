import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, MediaStream } from 'react-native-webrtc';

export interface RTCConnectionConfig {
    iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }>;
}

export class RTCConnection {
    private pc: RTCPeerConnection | null = null;
    private config: RTCConnectionConfig;
    private onIceCandidate: (candidate: RTCIceCandidate) => void;
    private onTrack: (stream: MediaStream) => void;

    private iceCandidateQueue: RTCIceCandidate[] = [];
    private isRemoteDescriptionSet = false;

    constructor(
        config: RTCConnectionConfig,
        onIceCandidate: (candidate: RTCIceCandidate) => void,
        onTrack: (stream: MediaStream) => void
    ) {
        this.config = config;
        this.onIceCandidate = onIceCandidate;
        this.onTrack = onTrack;
    }

    public async createPeerConnection(): Promise<RTCPeerConnection> {
        this.pc = new RTCPeerConnection(this.config);

        this.pc.addEventListener('icecandidate', (event) => {
            if (event.candidate) {
                this.onIceCandidate(event.candidate);
            }
        });

        // @ts-ignore - native react-native-webrtc event
        this.pc.addEventListener('addstream', (event: any) => {
            console.log('[RTCConnection] addstream event fired');
            if (event.stream) {
                this.onTrack(event.stream);
            }
        });

        this.pc.addEventListener('track', (event) => {
            console.log('[RTCConnection] track event fired');
            // We still keep track as a fallback, but rely on addstream for the full object
            if (event.streams && event.streams[0]) {
                this.onTrack(event.streams[0]);
            }
        });

        this.pc.addEventListener('iceconnectionstatechange', () => {
            console.log(`[RTCConnection] ICE state changed to: ${this.pc?.iceConnectionState}`);
        });

        this.pc.addEventListener('connectionstatechange', () => {
            console.log(`[RTCConnection] Connection state changed to: ${this.pc?.connectionState}`);
        });

        return this.pc;
    }

    public async createOffer(): Promise<RTCSessionDescription> {
        if (!this.pc) throw new Error('PeerConnection not initialized');
        const offer = await this.pc.createOffer({});
        await this.pc.setLocalDescription(offer);
        return this.pc.localDescription!;
    }

    public async handleOffer(offer: RTCSessionDescription): Promise<RTCSessionDescription> {
        if (!this.pc) await this.createPeerConnection();
        if (this.pc!.signalingState !== 'stable') {
            console.warn('[RTCConnection] handleOffer called while not in stable state:', this.pc!.signalingState);
        }
        await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
        this.isRemoteDescriptionSet = true;
        this.processIceCandidateQueue();

        const answer = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answer);
        return this.pc!.localDescription!;
    }

    public async handleAnswer(answer: RTCSessionDescription): Promise<void> {
        if (!this.pc) throw new Error('PeerConnection not initialized');
        if (this.pc.signalingState === 'stable') {
            console.log('[RTCConnection] Ignoring answer, connection is already stable (duplicate signal?).');
            return;
        }
        await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
        this.isRemoteDescriptionSet = true;
        this.processIceCandidateQueue();
    }

    public async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
        if (!this.pc) throw new Error('PeerConnection not initialized');

        const iceCandidate = new RTCIceCandidate(candidate);
        if (this.isRemoteDescriptionSet && this.pc.remoteDescription) {
            await this.pc.addIceCandidate(iceCandidate);
        } else {
            console.log('[RTCConnection] Remote description not set yet. Queuing ICE candidate.');
            this.iceCandidateQueue.push(iceCandidate);
        }
    }

    private async processIceCandidateQueue(): Promise<void> {
        if (!this.pc || this.iceCandidateQueue.length === 0) return;
        console.log(`[RTCConnection] Processing ${this.iceCandidateQueue.length} queued ICE candidates`);
        for (const candidate of this.iceCandidateQueue) {
            try {
                await this.pc.addIceCandidate(candidate);
            } catch (e) {
                console.warn('[RTCConnection] Failed to process queued ICE candidate', e);
            }
        }
        this.iceCandidateQueue = [];
    }

    public addStream(stream: MediaStream): void {
        if (!this.pc) throw new Error('PeerConnection not initialized');

        try {
            // @ts-ignore - native react-native-webrtc method which perfectly syncs audio/video
            if (typeof this.pc.addStream === 'function') {
                // @ts-ignore
                this.pc.addStream(stream);
                console.log('[RTCConnection] Stream fully added via pc.addStream()');
                return;
            }
        } catch (e) {
            console.warn('[RTCConnection] pc.addStream fallback failed, trying addTrack', e);
        }

        const senders = typeof this.pc.getSenders === 'function' ? this.pc.getSenders() : [];
        stream.getTracks().forEach((track) => {
            // Prevent adding the same track twice
            const isAlreadyAdded = senders.some(sender => sender.track && sender.track.id === track.id);
            if (!isAlreadyAdded) {
                try {
                    this.pc!.addTrack(track, stream);
                    console.log(`[RTCConnection] Track added: ${track.kind}`);
                } catch (e) {
                    console.warn('[RTCConnection] Error adding track:', e);
                }
            }
        });
    }

    public switchCamera(stream: MediaStream): void {
        stream.getVideoTracks().forEach(track => {
            // @ts-ignore - react-native-webrtc specific method
            if (typeof track._switchCamera === 'function') {
                // @ts-ignore
                track._switchCamera();
            }
        });
    }

    public toggleVideo(stream: MediaStream, enabled: boolean): void {
        stream.getVideoTracks().forEach(track => {
            track.enabled = enabled;
        });
    }

    public close(): void {
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
    }
}
