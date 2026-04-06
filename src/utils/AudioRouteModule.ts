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
    }
};
