import { Platform } from 'react-native';

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
    public async uploadToUrl(
        url: string,
        file: { uri: string; name: string; type: string; base64?: string },
        method: string = 'PUT',
        params?: Record<string, any>
    ): Promise<void> {
        try {
            if (method === 'POST' && params) {
                const uploadUrl = url;

                return (async () => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 60000);

                    try {
                        const formData = new FormData();
                        Object.entries(params).forEach(([key, value]) => {
                            formData.append(key, String(value));
                        });
                        
                        // Use Base64 if available (Solution for Android file access/interceptor issues)
                        if (file.base64) {
                            formData.append('file', `data:${file.type || 'image/jpeg'};base64,${file.base64}`);
                        } else {
                            // Fallback to URI (standard)
                            const rawUri = file.uri.startsWith('file://') ? file.uri : (file.uri.startsWith('content://') ? file.uri : `file://${file.uri}`);
                            const cleanUri = decodeURIComponent(rawUri);
                            // @ts-ignore
                            formData.append('file', {
                                uri: cleanUri,
                                name: file.name || 'upload.jpg',
                                type: file.type || 'image/jpeg',
                            } as any);
                        }

                        const response = await fetch(uploadUrl, {
                            method: 'POST',
                            body: formData,
                            signal: controller.signal,
                        });

                        clearTimeout(timeoutId);

                        if (!response.ok) {
                            const responseText = await response.text();
                            throw new Error(`Cloudinary Error: ${response.status} ${responseText}`);
                        }
                    } catch (error: any) {
                        clearTimeout(timeoutId);
                        console.error('[Revoluchat SDK] Upload Failed:', error);
                        throw error;
                    }
                })();
            }

            // Fallback for S3 (PUT) or other raw uploads
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open(method, url);
                if (method === 'PUT') xhr.setRequestHeader('Content-Type', file.type);
                xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(xhr.responseText));
                xhr.onerror = (e) => reject(new TypeError('Network request failed'));
                xhr.send({ uri: file.uri } as any);
            });
        } catch (error) {
            console.error('[Revoluchat SDK] uploadToUrl critical failure:', error);
            throw error;
        }
    }
}
