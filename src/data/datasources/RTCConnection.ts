import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, MediaStream } from 'react-native-webrtc';

export interface RTCConnectionConfig {
    iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }>;
}

export class RTCConnection {
    private pc: RTCPeerConnection | null = null;
    private config: RTCConnectionConfig;
    private onIceCandidate: (candidate: RTCIceCandidate) => void;
    private onTrack: (stream: MediaStream) => void;

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

        this.pc.addEventListener('track', (event) => {
            if (event.streams && event.streams[0]) {
                this.onTrack(event.streams[0]);
            }
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
        await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answer);
        return this.pc!.localDescription!;
    }

    public async handleAnswer(answer: RTCSessionDescription): Promise<void> {
        if (!this.pc) throw new Error('PeerConnection not initialized');
        await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    }

    public async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
        if (!this.pc) throw new Error('PeerConnection not initialized');
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }

    public addStream(stream: MediaStream): void {
        if (!this.pc) throw new Error('PeerConnection not initialized');
        stream.getTracks().forEach((track) => {
            this.pc!.addTrack(track, stream);
        });
    }

    public close(): void {
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
    }
}
