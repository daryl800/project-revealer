import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TalkPanelProps {
  isRecording: boolean;
  seconds: number;
  handlePressIn: () => void;
  handlePressOut: () => void;
  handlePress: () => void;
  autoStop: boolean;
  error: string | null;
}

const TalkPanel = ({
  isRecording,
  seconds,
  handlePressIn,
  handlePressOut,
  handlePress,
  autoStop,
  error,
}: TalkPanelProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-4">
      {error && (
        <div className="text-xs sm:text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg text-center max-w-[90vw]">
          Connection error. Retrying...
        </div>
      )}

      {isRecording && (
        <div className="text-base sm:text-lg font-mono text-primary">
          {formatTime(seconds)}
        </div>
      )}

      <Button
        size="lg"
        variant={isRecording ? "destructive" : "default"}
        className={`
          w-14 h-14 sm:w-16 sm:h-16 rounded-full 
          transition-all duration-200 touch-manipulation
          ${
            isRecording
              ? "animate-pulse scale-110"
              : "active:scale-95 hover:scale-105"
          }
        `}
        onMouseDown={autoStop ? undefined : handlePressIn}
        onMouseUp={autoStop ? undefined : handlePressOut}
        onMouseLeave={autoStop ? undefined : handlePressOut}
        onTouchStart={autoStop ? undefined : handlePressIn}
        onTouchEnd={autoStop ? undefined : handlePressOut}
        onClick={autoStop ? handlePress : undefined}
      >
        {isRecording ? (
          <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
        ) : (
          <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
        )}
      </Button>

      <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-[85vw] sm:max-w-xs px-2">
        {autoStop
          ? "Tap to start recording, will auto-stop on silence"
          : "Hold to record, release to send"}
      </p>
    </div>
  );
};

export default TalkPanel;
