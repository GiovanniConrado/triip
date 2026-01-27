import React, { useState, useRef } from 'react';
import ImageCropper from './ImageCropper';
import { imageService } from '../services/imageService';
import Toast, { ToastType } from './Toast';

interface ImageUploadProps {
    currentImage?: string;
    onImageChange: (url: string) => void;
    folder: 'trips' | 'profiles' | 'items';
    aspectRatio?: number;
    cropShape?: 'rect' | 'round';
    placeholder?: string;
    className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    currentImage,
    onImageChange,
    folder,
    aspectRatio = 16 / 9,
    cropShape = 'rect',
    placeholder = 'Selecionar Imagem',
    className = '',
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setToast({ message: 'Por favor, selecione uma imagem.', type: 'error' });
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setToast({ message: 'A imagem deve ter no máximo 10MB.', type: 'error' });
            return;
        }

        try {
            const dataUrl = await imageService.readFileAsDataURL(file);
            setSelectedImage(dataUrl);
            setShowCropper(true);
        } catch (error) {
            console.error('Error reading file:', error);
            setToast({ message: 'Erro ao carregar imagem.', type: 'error' });
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setShowCropper(false);
        setIsUploading(true);

        try {
            const result = await imageService.uploadCroppedImage(croppedBlob, folder);

            if (result.success && result.url) {
                onImageChange(result.url);
                setToast({ message: 'Imagem salva com sucesso!', type: 'success' });
            } else {
                setToast({ message: result.error || 'Erro ao fazer upload.', type: 'error' });
            }
        } catch (error) {
            console.error('Error uploading:', error);
            setToast({ message: 'Erro ao fazer upload da imagem.', type: 'error' });
        } finally {
            setIsUploading(false);
            setSelectedImage(null);
        }
    };

    const handleCropCancel = () => {
        setShowCropper(false);
        setSelectedImage(null);
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Upload Button / Preview */}
            <div className={`relative ${className}`}>
                {currentImage ? (
                    <div className="relative group w-full h-full">
                        <img
                            src={currentImage}
                            alt="Preview"
                            className={`w-full h-full object-cover ${cropShape === 'round' ? 'rounded-full' : 'rounded-2xl'} border-2 border-terracotta-100`}
                        />
                        <div className={`absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${cropShape === 'round' ? 'rounded-full' : 'rounded-2xl'}`}>
                            <button
                                onClick={triggerFileSelect}
                                disabled={isUploading}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/90 rounded-xl font-bold text-sunset-dark active:scale-95 transition-all text-sm"
                            >
                                {isUploading ? (
                                    <>
                                        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                                        <span>Enviando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-base">edit</span>
                                        <span>Alterar</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={triggerFileSelect}
                        disabled={isUploading}
                        className={`w-full h-full min-h-[120px] border-2 border-dashed border-terracotta-200 bg-terracotta-50/50 flex flex-col items-center justify-center gap-2 active:scale-[0.99] transition-all ${cropShape === 'round' ? 'rounded-full' : 'rounded-2xl'}`}
                    >
                        {isUploading ? (
                            <>
                                <span className="material-symbols-outlined text-3xl text-terracotta-400 animate-spin">progress_activity</span>
                                <span className="text-xs font-medium text-sunset-muted">Enviando...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-3xl text-terracotta-300">add_photo_alternate</span>
                                <span className="text-xs font-medium text-sunset-muted">{placeholder}</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Cropper Modal */}
            {showCropper && selectedImage && (
                <ImageCropper
                    imageSrc={selectedImage}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                    aspectRatio={aspectRatio}
                    cropShape={cropShape}
                />
            )}
        </>
    );
};

export default ImageUpload;
