import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Square, Maximize2, Monitor, Smartphone, Scissors, Play, Pause } from 'lucide-react';

interface VideoCropperProps {
  video: string;
  onCropComplete: (croppedVideo: string) => void;
  onCancel: () => void;
}

// Aspect ratio presets
const ASPECT_RATIOS = [
  { label: 'Original', value: null, icon: Maximize2 },
  { label: 'Square', value: 1, icon: Square },
  { label: '16:9', value: 16 / 9, icon: Monitor },
  { label: '4:3', value: 4 / 3, icon: Monitor },
  { label: '9:16', value: 9 / 16, icon: Smartphone },
  { label: '3:4', value: 3 / 4, icon: Smartphone },
  { label: '21:9', value: 21 / 9, icon: Monitor },
];

export const VideoCropper: React.FC<VideoCropperProps> = ({
  video,
  onCropComplete,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropWidth, setCropWidth] = useState(100);
  const [cropHeight, setCropHeight] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
      setEndTime(videoElement.duration);
      setVideoDimensions({
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
      });
      // Initialize crop to full video
      setCropWidth(100);
      setCropHeight(100);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [video]);

  const togglePlayPause = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    videoElement.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const applyAspectRatio = useCallback((ratio: number | null) => {
    if (!ratio) {
      setCropWidth(100);
      setCropHeight(100);
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement || videoDimensions.width === 0) return;

    const videoAspect = videoDimensions.width / videoDimensions.height;
    
    if (videoAspect > ratio) {
      // Video is wider than desired ratio
      setCropHeight(100);
      setCropWidth(100 * ratio * (videoDimensions.height / videoDimensions.width));
    } else {
      // Video is taller than desired ratio
      setCropWidth(100);
      setCropHeight(100 * (videoDimensions.width / videoDimensions.height) / ratio);
    }
  }, [videoDimensions]);

  useEffect(() => {
    applyAspectRatio(aspectRatio);
  }, [aspectRatio, applyAspectRatio]);

  const cropVideo = async (): Promise<string> => {
    const videoElement = videoRef.current;
    const canvas = canvasRef.current;
    if (!videoElement || !canvas) {
      throw new Error('Video or canvas not available');
    }

    setIsProcessing(true);

    try {
      // Set canvas dimensions based on crop
      const cropWidthPx = (videoDimensions.width * cropWidth) / 100;
      const cropHeightPx = (videoDimensions.height * cropHeight) / 100;
      const cropXPx = (videoDimensions.width * cropX) / 100;
      const cropYPx = (videoDimensions.height * cropY) / 100;

      canvas.width = cropWidthPx;
      canvas.height = cropHeightPx;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Create a MediaRecorder to capture the cropped video
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      return new Promise((resolve, reject) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          resolve(url);
        };

        mediaRecorder.onerror = (e) => {
          reject(e);
        };

        // Draw frames and record
        videoElement.currentTime = startTime;
        mediaRecorder.start();

        const drawFrame = () => {
          if (videoElement.currentTime >= endTime || videoElement.ended) {
            mediaRecorder.stop();
            return;
          }

          ctx.drawImage(
            videoElement,
            cropXPx,
            cropYPx,
            cropWidthPx,
            cropHeightPx,
            0,
            0,
            cropWidthPx,
            cropHeightPx
          );

          requestAnimationFrame(drawFrame);
        };

        videoElement.play();
        drawFrame();
      });
    } catch (error) {
      console.error('Error cropping video:', error);
      // Fallback: return original video if cropping fails
      return video;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    try {
      const croppedVideo = await cropVideo();
      onCropComplete(croppedVideo);
    } catch (error) {
      console.error('Error processing video:', error);
      alert('Failed to process video. Using original video.');
      onCropComplete(video);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Crop & Trim Your Video</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose an aspect ratio, trim the duration, and adjust the crop area.
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

        {/* Video Player */}
        <div className="relative w-full bg-gradient-to-br from-gray-900 to-black rounded-lg overflow-hidden border border-gray-800">
          <video
            ref={videoRef}
            src={video}
            className="w-full max-h-[400px] object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
          
          {/* Play/Pause Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="rounded-full w-16 h-16 opacity-80 hover:opacity-100"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Time Controls */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                <span>Trim Video</span>
              </div>
              <span className="text-muted-foreground">
                {formatTime(startTime)} - {formatTime(endTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Start:</span>
                <Slider
                  value={[startTime]}
                  min={0}
                  max={duration}
                  step={0.1}
                  onValueChange={(value) => {
                    setStartTime(value[0]);
                    if (videoRef.current) {
                      videoRef.current.currentTime = value[0];
                    }
                  }}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-12">{formatTime(startTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">End:</span>
                <Slider
                  value={[endTime]}
                  min={0}
                  max={duration}
                  step={0.1}
                  onValueChange={(value) => {
                    setEndTime(value[0]);
                    if (videoRef.current) {
                      videoRef.current.currentTime = value[0];
                    }
                  }}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-12">{formatTime(endTime)}</span>
              </div>
            </div>
          </div>

          {/* Crop Position Controls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span>Crop Position</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">X Position (%)</label>
                <Slider
                  value={[cropX]}
                  min={0}
                  max={100 - cropWidth}
                  step={1}
                  onValueChange={(value) => setCropX(value[0])}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Y Position (%)</label>
                <Slider
                  value={[cropY]}
                  min={0}
                  max={100 - cropHeight}
                  step={1}
                  onValueChange={(value) => setCropY(value[0])}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Processing Video...
              </>
            ) : (
              'Apply Crop & Trim'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

