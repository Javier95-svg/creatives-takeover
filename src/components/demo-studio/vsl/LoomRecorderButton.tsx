import { useEffect, useRef, useState } from 'react';
import { Video, VideoOff } from 'lucide-react';
import { createInstance, RecordingType, type LoomVideo, type SDKButtonInterface, type SDKResult } from '@loomhq/record-sdk';
import { Button } from '@/components/ui/button';

interface LoomRecorderButtonProps {
  disabled?: boolean;
  onRecorded: (video: LoomVideo) => void;
}

const loomAppId = import.meta.env.VITE_LOOM_APP_ID as string | undefined;

export default function LoomRecorderButton({ disabled, onRecorded }: LoomRecorderButtonProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<SDKResult | null>(null);
  const buttonRef = useRef<SDKButtonInterface | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!loomAppId || !mountRef.current || disabled) return;
    let active = true;

    void (async () => {
      try {
        const instance = await createInstance({
          mode: 'standard',
          publicAppId: loomAppId,
          config: {
            allowedRecordingTypes: [
              RecordingType.ScreenAndCamera,
              RecordingType.ScreenOnly,
              RecordingType.CameraOnly,
            ],
            defaultRecordingType: RecordingType.ScreenAndCamera,
            productName: 'Creatives Takeover',
            entryPointName: 'Demo Studio VSL',
            insertButtonText: 'Save VSL',
          },
        });
        if (!active || !mountRef.current) {
          instance.teardown();
          return;
        }
        instanceRef.current = instance;
        buttonRef.current = instance.configureButton({
          element: mountRef.current,
          hooks: {
            onInsertClicked: onRecorded,
            onRecordingComplete: () => undefined,
            onUploadComplete: onRecorded,
            onStart: () => undefined,
            onRecordingStarted: () => undefined,
            onCancel: () => undefined,
            onComplete: () => undefined,
            onAnalyticsEvent: () => undefined,
            onLifecycleUpdate: () => undefined,
          },
        });
        setReady(true);
      } catch {
        if (active) setFailed(true);
      }
    })();

    return () => {
      active = false;
      buttonRef.current = null;
      instanceRef.current?.teardown();
      instanceRef.current = null;
    };
  }, [disabled, onRecorded]);

  if (!loomAppId) {
    return (
      <Button type="button" variant="outline" disabled className="gap-2">
        <VideoOff className="h-4 w-4" /> Loom not configured
      </Button>
    );
  }

  if (failed) {
    return (
      <Button type="button" variant="outline" disabled className="gap-2">
        <VideoOff className="h-4 w-4" /> Recorder unavailable
      </Button>
    );
  }

  return (
    <div className="relative">
      <div ref={mountRef} />
      {!ready && (
        <Button type="button" variant="outline" disabled={disabled} className="gap-2">
          <Video className="h-4 w-4" /> Preparing Loom
        </Button>
      )}
    </div>
  );
}
