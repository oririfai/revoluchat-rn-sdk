import { NativeModules, Platform } from 'react-native';

const { FileDownloadModule } = NativeModules;

/**
 * Utility for downloading files using Native Modules (no external libraries).
 * Android: Uses DownloadManager for background downloads and notifications.
 * iOS: Uses URLSession and shows a Share Sheet to save/open.
 */
export class FileDownloader {
    /**
     * Download a file to the device.
     */
    public static async download(url: string, fileName: string, mimeType: string = ''): Promise<void> {
        if (!FileDownloadModule) {
            console.warn('[Revoluchat SDK] Native FileDownloadModule not found. Verify native implementation and rebuild.');
            return;
        }

        try {
            console.log(`[Revoluchat SDK] Native download request:`, { fileName, mimeType, url });
            await FileDownloadModule.downloadFile(url, fileName, mimeType);
        } catch (error) {
            console.error('[Revoluchat SDK] Native download failed:', error);
            throw error;
        }
    }
}
