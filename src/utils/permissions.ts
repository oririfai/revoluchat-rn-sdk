import { Platform, PermissionsAndroid, Alert } from 'react-native';

export interface PermissionResult {
    granted: boolean;
    denied: string[];
    blocked: string[]; // Permanently denied - must go to Settings
}

/**
 * Requests all permissions required to make or receive a call.
 * On Android: Requests RECORD_AUDIO (and CAMERA for video calls).
 * On iOS: getUserMedia() triggers permission natively, so no pre-check needed.
 *
 * @param type - 'audio' | 'video' (video also requests camera)
 * @param showAlert - If true, shows an Alert when permission is blocked
 */
export async function requestCallPermissions(
    type: 'audio' | 'video' = 'audio',
    showAlert = true
): Promise<PermissionResult> {
    const denied: string[] = [];
    const blocked: string[] = [];

    if (Platform.OS !== 'android') {
        // iOS: permissions are handled by getUserMedia itself
        return { granted: true, denied: [], blocked: [] };
    }

    const permissionsToRequest: string[] = [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ];

    if (type === 'video') {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.CAMERA);
    }

    try {
        const results = await PermissionsAndroid.requestMultiple(permissionsToRequest as any[]);

        for (const [permission, status] of Object.entries(results)) {
            const friendlyName = permissionFriendlyName(permission);
            if (status === PermissionsAndroid.RESULTS.DENIED) {
                denied.push(friendlyName);
            } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                blocked.push(friendlyName);
            }
        }

        const allGranted = denied.length === 0 && blocked.length === 0;

        if (!allGranted && showAlert) {
            if (blocked.length > 0) {
                Alert.alert(
                    'Izin Diperlukan',
                    `Izin berikut telah ditolak permanen dan harus diaktifkan secara manual di Pengaturan HP Anda:\n\n• ${blocked.join('\n• ')}\n\nBuka: Pengaturan → Aplikasi → ${appName()} → Izin`,
                    [{ text: 'OK' }]
                );
            } else if (denied.length > 0) {
                Alert.alert(
                    'Izin Dibutuhkan',
                    `Aplikasi membutuhkan izin berikut untuk melakukan panggilan:\n\n• ${denied.join('\n• ')}`,
                    [{ text: 'OK' }]
                );
            }
        }

        console.log('[SDK Permissions] Result:', { allGranted, denied, blocked });
        return { granted: allGranted, denied, blocked };

    } catch (err) {
        console.error('[SDK Permissions] Error requesting permissions:', err);
        return { granted: false, denied: ['Unknown error'], blocked: [] };
    }
}

/**
 * Checks current permission status without prompting the user.
 */
export async function checkCallPermissions(
    type: 'audio' | 'video' = 'audio'
): Promise<PermissionResult> {
    const denied: string[] = [];
    const blocked: string[] = [];

    if (Platform.OS !== 'android') {
        return { granted: true, denied: [], blocked: [] };
    }

    const permissionsToCheck: string[] = [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ];

    if (type === 'video') {
        permissionsToCheck.push(PermissionsAndroid.PERMISSIONS.CAMERA);
    }

    for (const permission of permissionsToCheck) {
        const status = await PermissionsAndroid.check(permission as any);
        if (!status) {
            denied.push(permissionFriendlyName(permission));
        }
    }

    return {
        granted: denied.length === 0,
        denied,
        blocked,
    };
}

function permissionFriendlyName(permission: string): string {
    const map: Record<string, string> = {
        'android.permission.RECORD_AUDIO': 'Mikrofon',
        'android.permission.CAMERA': 'Kamera',
        'android.permission.WAKE_LOCK': 'Keep Screen On',
        'android.permission.MODIFY_AUDIO_SETTINGS': 'Pengaturan Audio',
    };
    return map[permission] || permission;
}

function appName(): string {
    try {
        // Try to get app name from native module (React Native)
        return 'Aplikasi';
    } catch {
        return 'Aplikasi';
    }
}
