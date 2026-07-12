import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Props = { disabled?: boolean; onRecorded: (file: File) => void };

export const VoiceNoteRecorder = ({ disabled, onRecorded }: Props) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const stop = (discard = false) => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.onstop = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setRecording(false);
      setSeconds(0);
      if (discard) return;
      const mimeType = (recorder.mimeType || 'audio/webm').split(';')[0];
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size > 10 * 1024 * 1024) {
        toast.error('Voice notes must be 10MB or smaller.');
        return;
      }
      onRecorded(new File([blob], `voice-note-${Date.now()}.${mimeType.includes('ogg') ? 'ogg' : 'webm'}`, { type: mimeType }));
    };
    recorder.stop();
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Voice recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const preferred = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.start(250);
      setRecording(true);
      setSeconds(0);
    } catch {
      toast.error('Microphone access is required to record a voice note.');
    }
  };

  if (recording) {
    return <div className="flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/5 px-1" role="status" aria-live="polite">
      <span className="min-w-12 text-center text-xs font-medium tabular-nums text-destructive">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
      <Button type="button" variant="ghost" className="h-10 w-10 p-0" onClick={() => stop(false)} aria-label="Finish voice note"><Square className="h-4 w-4 fill-current" /></Button>
      <Button type="button" variant="ghost" className="h-10 w-10 p-0" onClick={() => stop(true)} aria-label="Discard voice note"><Trash2 className="h-4 w-4" /></Button>
    </div>;
  }

  return <Button type="button" variant="outline" className="min-h-[44px] min-w-[44px] px-3" onClick={start} disabled={disabled} aria-label="Record voice note"><Mic className="h-4 w-4" /></Button>;
};
