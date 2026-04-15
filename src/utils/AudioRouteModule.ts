import { NativeModules } from 'react-native';

const { AudioRouteModule } = NativeModules;

export const NativeAudioRoute = {
    setSpeakerphoneOn: (on: boolean) => {
        try {
            if (AudioRouteModule) {
                AudioRouteModule.setSpeakerphoneOn(on);
            } else {
                console.warn('[NativeAudioRoute] AudioRouteModule is not linked in host app.');
            }
        } catch (e) {
            console.warn('[NativeAudioRoute] Error setting speakerphone', e);
        }
    },
    stop: () => {
        try {
            if (AudioRouteModule) {
                AudioRouteModule.stop();
            }
        } catch (e) {
            console.warn('[NativeAudioRoute] Error stopping audio route', e);
        }
    },
    startRingback: (filename: string) => {
        try {
            if (AudioRouteModule && AudioRouteModule.startRingback) {
                AudioRouteModule.startRingback(filename);
            }
        } catch (e) {
            console.warn('[NativeAudioRoute] Error starting ringback', e);
        }
    },
    startRingtone: (filename: string) => {
        try {
            if (AudioRouteModule && AudioRouteModule.startRingtone) {
                AudioRouteModule.startRingtone(filename);
            }
        } catch (e) {
            console.warn('[NativeAudioRoute] Error starting ringtone', e);
        }
    },
    stopTones: () => {
        try {
            if (AudioRouteModule && AudioRouteModule.stopTones) {
                AudioRouteModule.stopTones();
            }
        } catch (e) {
            console.warn('[NativeAudioRoute] Error stopping tones', e);
        }
    }
};
