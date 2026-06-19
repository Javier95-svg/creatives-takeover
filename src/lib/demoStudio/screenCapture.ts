// Screen capture for the Demo Studio editor (CaptureMethod 'screen'). Built on
// the browser getDisplayMedia API. This module imports only types, so the pure
// mapping helper stays importable under `node --experimental-strip-types` for
// tests — all DOM/navigator access happens inside function bodies, never at the
// module top level.

export interface ScreenFrame {
  blob: Blob;
  width: number;
  height: number;
}

export interface FrameStepInput {
  position: number;
  fileName: string;
  blob: Blob;
  width: number;
  height: number;
}

/** True when the browser can share a screen/tab/window for capture. */
export function isScreenCaptureSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getDisplayMedia === 'function' &&
    typeof HTMLCanvasElement !== 'undefined'
  );
}

/**
 * Grab the current frame from a playing <video> as a JPEG blob, capping the
 * longest edge so a 4K screen stays under the step-asset upload limit (5MB).
 */
export function captureVideoFrame(
  video: HTMLVideoElement,
  maxEdge = 1920,
  quality = 0.92,
): Promise<ScreenFrame> {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) {
    return Promise.reject(new Error('The screen share is not ready yet. Try again in a moment.'));
  }

  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas is not supported in this browser.'));
  ctx.drawImage(video, 0, 0, width, height);

  return new Promise<ScreenFrame>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not capture this frame.'));
          return;
        }
        resolve({ blob, width, height });
      },
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Pure mapping from kept capture frames to ordered step inputs, appended after
 * the demo's existing steps. Positions run sequentially from `startPosition` and
 * filenames are stable and ordered; blob/dimensions pass through untouched.
 */
export function mapFramesToStepInputs(
  frames: ScreenFrame[],
  startPosition: number,
): FrameStepInput[] {
  return frames.map((frame, index) => {
    const position = startPosition + index;
    return {
      position,
      fileName: `screen-${position + 1}.jpg`,
      blob: frame.blob,
      width: frame.width,
      height: frame.height,
    };
  });
}
