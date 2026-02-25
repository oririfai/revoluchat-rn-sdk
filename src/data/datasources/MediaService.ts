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
        authToken: string
    ): Promise<{ url: string; type: string }> {
        const formData = new FormData();
        formData.append('file', file as any);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
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
}
