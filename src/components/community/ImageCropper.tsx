import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { RotateCw, ZoomIn, Square, Maximize2, Monitor, Smartphone } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
  aspectRatio?: number | null; // null for free aspect ratio
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Aspect ratio presets
const ASPECT_RATIOS = [
  { label: 'Free', value: null, icon: Maximize2 },
  { label: 'Square', value: 1, icon: Square },
  { label: '16:9', value: 16 / 9, icon: Monitor },
  { label: '4:3', value: 4 / 3, icon: Monitor },
  { label: '9:16', value: 9 / 16, icon: Smartphone },
  { label: '3:4', value: 3 / 4, icon: Smartphone },
  { label: '21:9', value: 21 / 9, icon: Monitor },
];

export const ImageCropper: React.FC<ImageCropperProps> = ({
  image,
  onCropComplete,
  onCancel,
  aspectRatio: initialAspectRatio = null,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(initialAspectRatio);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onRotationChange = useCallback((rotation: number) => {
    setRotation(rotation);
  }, []);

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getRadianAngle = (degreeValue: number) => {
    return (degreeValue * Math.PI) / 180;
  };

  const rotateSize = (width: number, height: number, rotation: number) => {
    const rotRad = getRadianAngle(rotation);
    return {
      width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
      height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
  };

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    
    // Create canvas for the final cropped image
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // If there's rotation, we need to handle it properly
    if (rotation !== 0) {
      // Create a temporary canvas to rotate the entire image first
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      if (!tempCtx) {
        throw new Error('No 2d context for temp canvas');
      }

      const rotRad = getRadianAngle(rotation);
      
      // Calculate bounding box of the rotated image
      const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
      );

      tempCanvas.width = bBoxWidth;
      tempCanvas.height = bBoxHeight;

      // Rotate the entire image
      tempCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
      tempCtx.rotate(rotRad);
      tempCtx.translate(-image.width / 2, -image.height / 2);
      tempCtx.drawImage(image, 0, 0);

      // Calculate offset for the bounding box
      const offsetX = (bBoxWidth - image.width) / 2;
      const offsetY = (bBoxHeight - image.height) / 2;

      // Crop from the rotated image
      // The pixelCrop coordinates need to be adjusted for the rotation offset
      const sourceX = Math.max(0, Math.min(pixelCrop.x + offsetX, bBoxWidth));
      const sourceY = Math.max(0, Math.min(pixelCrop.y + offsetY, bBoxHeight));
      const sourceWidth = Math.min(pixelCrop.width, bBoxWidth - sourceX);
      const sourceHeight = Math.min(pixelCrop.height, bBoxHeight - sourceY);

      ctx.drawImage(
        tempCanvas,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
    } else {
      // No rotation - simple direct crop
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
    }

    // Return as a blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      console.error('No crop area selected');
      return;
    }

    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation);
      onCropComplete(croppedImage);
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => {
      if (!open) {
        handleCancel();
      }
    }}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Crop & Adjust Your Image</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose an aspect ratio or use free form. Drag to reposition, use sliders to adjust.
          </p>
        </DialogHeader>
        
        {/* Aspect Ratio Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Aspect Ratio:</span>
          {ASPECT_RATIOS.map((ratio) => {
            const Icon = ratio.icon;
            const isSelected = aspectRatio === ratio.value;
            return (
              <Button
                key={ratio.label}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setAspectRatio(ratio.value)}
                className="flex items-center gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {ratio.label}
              </Button>
            );
          })}
        </div>

        <div className="relative w-full h-[500px] bg-gradient-to-br from-gray-900 to-black rounded-lg overflow-hidden border border-gray-800">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspectRatio || undefined}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onRotationChange={onRotationChange}
            onCropComplete={onCropCompleteCallback}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                position: 'relative',
              },
            }}
          />
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <ZoomIn className="h-4 w-4" />
                <span>Zoom</span>
              </div>
              <span className="text-muted-foreground">{zoom.toFixed(1)}x</span>
            </div>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(value) => onZoomChange(value[0])}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <RotateCw className="h-4 w-4" />
                <span>Rotation</span>
              </div>
              <span className="text-muted-foreground">{rotation}°</span>
            </div>
            <Slider
              value={[rotation]}
              min={0}
              max={360}
              step={1}
              onValueChange={(value) => onRotationChange(value[0])}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isProcessing || !croppedAreaPixels}>
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : (
              'Apply Crop'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

