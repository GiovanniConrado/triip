import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { imageService } from '../services/imageService';

interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedBlob: Blob) => void;
    onCancel: () => void;
    aspectRatio?: number;
    cropShape?: 'rect' | 'round';
}

const ImageCropper: React.FC<ImageCropperProps> = ({
    imageSrc,
    onCropComplete,
    onCancel,
    aspectRatio = 16 / 9,
    cropShape = 'rect',
}) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropChange = useCallback((location: { x: number; y: number }) => {
        setCrop(location);
    }, []);

    const onZoomChange = useCallback((newZoom: number) => {
        setZoom(newZoom);
    }, []);

    const onCropCompleteHandler = useCallback(
        (_croppedArea: CropArea, croppedAreaPixels: CropArea) => {
            setCroppedAreaPixels(croppedAreaPixels);
        },
        []
    );

    const handleSave = async () => {
        if (!croppedAreaPixels) return;

        setIsProcessing(true);
        try {
            const croppedBlob = await imageService.createCroppedImage(imageSrc, croppedAreaPixels);
            onCropComplete(croppedBlob);
        } catch (error) {
            console.error('Error cropping image:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-sunset-dark text-white">
                <button
                    onClick={onCancel}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                    <span className="font-medium">Cancelar</span>
                </button>
                <h2 className="font-bold">Ajustar Imagem</h2>
                <button
                    onClick={handleSave}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-terracotta-500 rounded-xl font-bold active:scale-95 transition-all disabled:opacity-50"
                >
                    {isProcessing ? (
                        <>
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            <span>Processando</span>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">check</span>
                            <span>Aplicar</span>
                        </>
                    )}
                </button>
            </div>

            {/* Cropper Area */}
            <div className="flex-1 relative">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspectRatio}
                    cropShape={cropShape}
                    showGrid={true}
                    onCropChange={onCropChange}
                    onZoomChange={onZoomChange}
                    onCropComplete={onCropCompleteHandler}
                />
            </div>

            {/* Zoom Controls */}
            <div className="bg-sunset-dark px-6 py-4 flex items-center gap-4">
                <span className="material-symbols-outlined text-white/60">photo_size_select_small</span>
                <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-2 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-terracotta-500"
                />
                <span className="material-symbols-outlined text-white/60">photo_size_select_large</span>
            </div>
        </div>
    );
};

export default ImageCropper;
