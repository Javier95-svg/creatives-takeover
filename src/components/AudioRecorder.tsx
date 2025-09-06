import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Square, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AudioRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscription, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setHasRecording(true);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access microphone');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const playRecording = useCallback(() => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
    }
  }, [audioBlob]);

  const deleteRecording = useCallback(() => {
    setAudioBlob(null);
    setHasRecording(false);
    audioChunksRef.current = [];
  }, []);

  const transcribeAudio = useCallback(async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        try {
          const { data, error } = await supabase.functions.invoke('speech-to-text', {
            body: { audio: base64Audio }
          });

          if (error) {
            throw error;
          }

          if (data?.text) {
            onTranscription(data.text);
            deleteRecording();
            toast.success('Audio transcribed successfully!');
          } else {
            throw new Error('No transcription received');
          }
        } catch (transcriptionError) {
          console.error('Transcription error:', transcriptionError);
          toast.error('Failed to transcribe audio');
        } finally {
          setIsProcessing(false);
        }
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Failed to process audio');
      setIsProcessing(false);
    }
  }, [audioBlob, onTranscription, deleteRecording]);

  if (hasRecording) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={playRecording}
          className="h-8 w-8 p-0"
        >
          <Play className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 text-sm text-muted-foreground">
          Recording ready
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={deleteRecording}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        
        <Button
          onClick={transcribeAudio}
          disabled={isProcessing}
          size="sm"
          className="h-8"
        >
          {isProcessing ? 'Processing...' : 'Send'}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant={isRecording ? "destructive" : "ghost"}
      size="sm"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled}
      className="h-10 w-10 p-0"
    >
      {isRecording ? (
        <Square className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
};