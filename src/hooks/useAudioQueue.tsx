// useAudioQueue.tsx
import { playBase64Audio } from "@/utils/audioUtils";
import { useState, useCallback, useRef } from "react";

interface AudioItem {
  sentenceId: number; // keep for logging/sorting if needed
  audioData: string;
}

export const useAudioQueue = () => {
  const [audioQueue, setAudioQueue] = useState<AudioItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs are the *source of truth*; state is for UI only
  const queueRef = useRef<AudioItem[]>([]);
  const isPlayingRef = useRef(false);

  const setPlaying = (val: boolean) => {
    isPlayingRef.current = val;
    setIsPlaying(val);
  };

  const syncStateFromRef = () => {
    // Mirror ref -> state for UI; do not mutate the array in place
    setAudioQueue([...queueRef.current]);
  };

  const playNext = useCallback(async () => {
    // If already playing or nothing to play, bail
    if (isPlayingRef.current || queueRef.current.length === 0) return;

    // Dequeue FIFO by index (not by sentenceId)
    const next = queueRef.current.shift();
    syncStateFromRef();

    if (!next) return;

    setPlaying(true);
    try {
      // Wait until the audio finishes
      await playBase64Audio(next.audioData);
    } catch (err) {
      console.error("Playback failed:", err);
    } finally {
      setPlaying(false);
      // Slight micro-gap to yield back to the event loop
      setTimeout(() => {
        void playNext();
      }, 0);
    }
  }, []);

  const addToQueue = useCallback(
    (item: AudioItem) => {
      // Push into ref immediately
      queueRef.current.push(item);

      // (Optional) ensure order if items can arrive out of order:
      // queueRef.current.sort((a, b) => a.sentenceId - b.sentenceId);

      syncStateFromRef();

      // Auto-start if idle (don’t rely on caller timing)
      if (!isPlayingRef.current) {
        void playNext();
      }
    },
    [playNext]
  );

  // Expose manual trigger for safety, but not required by callers
  const playNextInQueue = useCallback(() => {
    void playNext();
  }, [playNext]);

  return {
    audioQueue,
    addToQueue,
    playNextInQueue,
    isPlaying,
  };
};
