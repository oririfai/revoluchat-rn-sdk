import { Platform, NativeModules } from 'react-native';

const { FileDownloadModule } = NativeModules;

/**
 * Service for handling media uploads.
 * Wraps simple fetch/axios for multipart uploads to the backend.
 */
export class MediaService {
    private static instance: MediaService;

    public static getInstance(): MediaService {
        if (!MediaService.instance) {
            MediaService.instance = new MediaService();
        }
        return MediaService.instance;
    }

    /**
     * Upload a file to the backend.
     * Expects a compatible React Native file object.
     */
    public async upload(
        endpoint: string,
        file: { uri: string; name: string; type: string },
        authToken: string,
        apiKey: string
    ): Promise<{ url: string; type: string }> {
        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.type,
        } as any);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'X-API-KEY': apiKey,
                    'Accept': 'application/json',
                },
                body: formData,
            });

            // Log secure info (redact token)
            const redactedAuth = authToken ? `${authToken.substring(0, 5)}...` : 'none';
            console.log(`[Revoluchat SDK] Uploading ${file.name} to ${endpoint} (Auth: ${redactedAuth})`);

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const data = await response.json();
            return {
                url: data.url,
                type: file.type,
            };
        } catch (error) {
            console.error('[Revoluchat SDK] Media upload error', error);
            throw error;
        }
    }

    /**
     * Upload a file using a pre-signed URL (direct to storage).
     * Uses PUT method as required by most S3-compatible providers.
     */
    private sanitizeFilename(name: string): string {
        if (!name) return 'upload_file';
        // Replace everything except alphanumeric, dot, and dash with underscore
        // This ensures SQL safety and file system compatibility
        return name.replace(/[^a-zA-Z0-9.-]/g, '_');
    }

    /**
     * Upload a file using a pre-signed URL (direct to storage).
     */
    public async uploadToUrl(
        url: string,
        file: { uri: string; name: string; type: string; base64?: string },
        method: string = 'PUT',
        params?: Record<string, any>
    ): Promise<void> {
        const safeName = this.sanitizeFilename(file.name);
        
        // "100% Native Path" for Android: Use OkHttp directly to avoid bridge issues
        if (Platform.OS === 'android' && method === 'POST' && params) {
            try {
                if (FileDownloadModule && FileDownloadModule.uploadFile) {
                    console.log(`[Revoluchat SDK] Starting 100% Native Upload for: ${safeName}`);
                    
                    // Force resource_type to 'raw' for non-images to match backend expected path
                    const uploadParams = { ...params };
                    const isImage = file.type?.startsWith('image/') || 
                                    /\.(jpg|jpeg|png|gif|webp)$/i.test(safeName);
                    
                    if (!isImage && (!uploadParams.resource_type || uploadParams.resource_type === 'auto')) {
                        console.log(`[Revoluchat SDK] Forcing resource_type: raw for document upload`);
                        uploadParams.resource_type = 'raw';
                    }

                    const response = await FileDownloadModule.uploadFile(
                        url,
                        file.uri,
                        safeName,
                        file.type || 'application/octet-stream',
                        uploadParams
                    );
                    console.log(`[Revoluchat SDK] Native Upload Success! Response:`, response);
                    return;
                }
            } catch (e) {
                console.warn('[Revoluchat SDK] Native upload failed, falling back to fetch:', e);
            }
        }

        // Fallback or iOS Path (using fetch)
        let finalUri = file.uri;
        if (Platform.OS === 'android' && file.uri.startsWith('content://')) {
            try {
                if (FileDownloadModule && FileDownloadModule.copyFileToCache) {
                    finalUri = await FileDownloadModule.copyFileToCache(file.uri, safeName);
                }
            } catch (e) {
                console.warn('[Revoluchat SDK] Cache bridge failed:', e);
            }
        }

        const fileBody = {
            uri: finalUri,
            type: file.type || 'application/octet-stream',
            name: safeName
        };

        try {
            if (method === 'POST' && params) {
                const formData = new FormData();
                Object.entries(params).forEach(([key, value]) => {
                    formData.append(key, String(value));
                });
                formData.append('file', fileBody as any);

                console.log(`[Revoluchat SDK] Sending Multipart/Binary to ${url} via fetch...`);
                const response = await fetch(url, { method: 'POST', body: formData });
                const responseText = await response.text();
                
                if (response.ok) {
                    console.log(`[Revoluchat SDK] Upload completed successfully: ${safeName}`);
                    console.log(`[Revoluchat SDK] Server Response:`, responseText);
                } else {
                    throw new Error(`Upload status ${response.status}: ${responseText}`);
                }
            } else {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': file.type || 'application/octet-stream' },
                    body: fileBody as any,
                });
                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`Upload failed: ${response.status} - ${errorBody}`);
                }
            }
        } catch (error) {
            console.error('[Revoluchat SDK] Upload execution error:', error);
            throw error;
        }
    }
}
