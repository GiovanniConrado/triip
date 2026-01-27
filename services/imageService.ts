import { supabase } from './supabaseClient';

// Bucket name - make sure this matches your Supabase Storage bucket
const BUCKET_NAME = 'images';

export interface UploadResult {
    success: boolean;
    url?: string;
    error?: string;
}

export const imageService = {
    /**
     * Upload an image file to Supabase Storage
     */
    async uploadImage(file: File, folder: 'trips' | 'profiles' | 'items'): Promise<UploadResult> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'Usuário não autenticado' };
            }

            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;

            // Upload file
            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                console.error('[imageService] Upload error:', uploadError);
                return { success: false, error: uploadError.message };
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(fileName);

            return { success: true, url: publicUrl };
        } catch (error: any) {
            console.error('[imageService] Error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Upload a cropped image from a blob
     */
    async uploadCroppedImage(blob: Blob, folder: 'trips' | 'profiles' | 'items'): Promise<UploadResult> {
        const file = new File([blob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
        return this.uploadImage(file, folder);
    },

    /**
     * Delete an image from Supabase Storage
     */
    async deleteImage(url: string): Promise<boolean> {
        try {
            // Extract path from URL
            const urlParts = url.split(`${BUCKET_NAME}/`);
            if (urlParts.length < 2) return false;

            const filePath = urlParts[1];

            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([filePath]);

            if (error) {
                console.error('[imageService] Delete error:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('[imageService] Error deleting image:', error);
            return false;
        }
    },

    /**
     * Create a cropped image blob from canvas
     */
    createCroppedImage(
        imageSrc: string,
        pixelCrop: { x: number; y: number; width: number; height: number }
    ): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.src = imageSrc;

            image.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Set canvas size to crop size
                canvas.width = pixelCrop.width;
                canvas.height = pixelCrop.height;

                // Draw cropped image
                ctx.drawImage(
                    image,
                    pixelCrop.x,
                    pixelCrop.y,
                    pixelCrop.width,
                    pixelCrop.height,
                    0,
                    0,
                    pixelCrop.width,
                    pixelCrop.height
                );

                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create blob'));
                        }
                    },
                    'image/jpeg',
                    0.9
                );
            };

            image.onerror = () => reject(new Error('Failed to load image'));
        });
    },

    /**
     * Read file as data URL
     */
    readFileAsDataURL(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },
};
