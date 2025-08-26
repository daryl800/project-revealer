import React, { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import WelcomeScreen from "@/components/WelcomeScreen";
import TalkPanel from "@/components/TalkPanel";
import ReminderList from "@/components/ReminderList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Trash2 } from "lucide-react";
import { MemoryItem } from "@/types/memory";
import { ReminderItem } from "@/types/reminder";
import {
  requestMicPermission,
  AudioRecorder,
  playBase64Audio,
} from "@/utils/audioUtils";
import { useAudioQueue } from "@/hooks/useAudioQueue";

const Index = () => {
  const { toast } = useToast();
  const [showWelcome, setShowWelcome] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [autoStop] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [displayedText, setDisplayedText] = useState("");

  const audioRecorder = useRef(new AudioRecorder());
  const fadeAnim = useRef(1);
  const [secondPartArrived, setSecondPartArrived] = useState(false);

  const startsWithEmoji = (text: string): boolean => {
    return /^\p{Extended_Pictographic}/u.test(text.trim());
  };

  const getCurrentTimestamp = () => {
    return new Date().toLocaleTimeString("en-US", { hour12: false });
  };

  // Typewriter effect for response text
  useEffect(() => {
    if (!responseText) return;

    let i = 0;
    if (startsWithEmoji(responseText)) {
      setDisplayedText("");
    } else {
      setDisplayedText((prev) => prev + "\n");
    }

    const interval = setInterval(() => {
      setDisplayedText((prev) => {
        const nextText = prev + responseText.charAt(i);
        i++;
        if (i >= responseText.length) {
          clearInterval(interval);
        }
        return nextText;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [responseText]);

  // Monitor displayed text for second part arrival
  useEffect(() => {
    if (displayedText.startsWith("👋") || startsWithEmoji(displayedText)) {
      const lines = displayedText.split("\n");
      setSecondPartArrived(lines.length > 1);
    } else {
      setSecondPartArrived(true);
    }
  }, [displayedText]);

  // Load reminders on mount
  useEffect(() => {
    const loadReminders = () => {
      try {
        const saved = localStorage.getItem("reminders");
        const parsed: ReminderItem[] = saved ? JSON.parse(saved) : [];
        setReminders(parsed);
      } catch (err) {
        console.error("Failed to load reminders:", err);
        setReminders([]);
      }
    };
    loadReminders();
  }, []);

  const clearReminders = () => {
    setDisplayedText("");
    localStorage.clear();
    setReminders([]);
    toast({
      title: "Reminders cleared",
      description: "All reminders have been removed.",
    });
  };

  const saveReminder = (newReminder: ReminderItem) => {
    try {
      const existing = localStorage.getItem("reminders");
      const parsed: ReminderItem[] = existing ? JSON.parse(existing) : [];
      const updated = [newReminder, ...parsed];

      localStorage.setItem("reminders", JSON.stringify(updated));
      setReminders(updated);

      toast({
        title: "Reminder added",
        description: newReminder.description,
      });
    } catch (e) {
      console.error("Failed to save reminder", e);
      toast({
        title: "Error",
        description: "Failed to save reminder",
        variant: "destructive",
      });
    }
  };

  const handleExtractionObject = (obj: MemoryItem) => {
    if (!obj) return;

    console.log("isReminder: ", obj.isReminder);
    console.log("categoryIcon: ", obj.categoryIcon);
    console.log("reminderDatetime: ", obj.reminderDatetime);
    console.log("mainEvent: ", obj.mainEvent);

    if (
      obj.isReminder &&
      obj.categoryIcon &&
      obj.reminderDatetime &&
      obj.mainEvent
    ) {
      const newReminder: ReminderItem = {
        categoryIcon: obj.categoryIcon,
        datetime: obj.reminderDatetime,
        description: obj.mainEvent,
        isDone: false,
      };
      saveReminder(newReminder);
      console.log("Saved new reminder: ", newReminder);
    }

    if (obj.transcription) {
      setResponseText(obj.reflection || "");
    }
  };

  const { addToQueue, playNextInQueue } = useAudioQueue();

  // WebSocket connection
  const {
    connected: isWsReady,
    sendMessage,
    error,
  } = useWebSocket({
    url: "wss://memorykeeper.duckdns.org/ws",
    onMessage: (data) => {
      console.log(
        `[${getCurrentTimestamp()}] 📩 Server replied, msg type: ${data.type}`
      );

      if (data.type === "obj") {
        handleExtractionObject(data.payload);
      } else if (data.type === "text") {
        setResponseText(data.payload);
        console.log(
          `[${getCurrentTimestamp()}] 📩 Server replied, msg payload: ${
            data.payload
          }`
        );
        // } else if (data.type === "audio") {
        //   console.log("Playing audio sentence ID: ", data.sentence_id);
        //   playBase64Audio(data.payload);
      } else if (data.type === "audio") {
        console.log(`📩 Server reply [sentence ID]: ${data.sentence_id}`);

        // Add to queue using the hook
        addToQueue({
          sentenceId: data.sentence_id,
          audioData: data.payload,
        });
      } else if (data.type === "error") {
        console.log(
          `[${getCurrentTimestamp()}] 📩 Server error: ${data.payload}`
        );
        toast({
          title: "Server Error",
          description: data.payload,
          variant: "destructive",
        });
      }
    },
    onClose: () => {
      console.log("🔕 Connection closed");
    },
  });

  // Auto-hide welcome screen
  useEffect(() => {
    if (isWsReady && showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isWsReady, showWelcome]);

  // Request mic permission after welcome screen
  useEffect(() => {
    if (!showWelcome && isWsReady && micReady === false) {
      (async () => {
        const granted = await requestMicPermission();
        setMicReady(granted);
        if (!granted) {
          toast({
            title: "Microphone Access Required",
            description:
              "Please allow microphone access to use voice recording.",
            variant: "destructive",
          });
        }
      })();
    }
  }, [showWelcome, isWsReady, micReady, toast]);

  // Recording timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const startRecording = async () => {
    // Request permission if not already granted
    if (!micReady) {
      const granted = await requestMicPermission();
      setMicReady(granted);
      if (!granted) {
        toast({
          title: "Microphone Access Required",
          description: "Please allow microphone access to use voice recording.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setSeconds(0);
      await audioRecorder.current.startRecording();
      setIsRecording(true);
    } catch (e) {
      console.error("Recording failed", e);
      toast({
        title: "Recording Failed",
        description: "Unable to start audio recording",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    try {
      if (!audioRecorder.current.isRecording()) return;

      const base64Audio = await audioRecorder.current.stopRecording();
      setIsRecording(false);
      setSeconds(0);

      if (base64Audio && isWsReady) {
        console.log(`[${getCurrentTimestamp()}] 📤 Sending audio to server...`);
        sendMessage({
          type: "audio",
          payload: base64Audio,
          sentence_id: 0,
        });
      }
    } catch (e) {
      console.error("Stop recording failed", e);
      toast({
        title: "Recording Error",
        description: "Failed to process audio recording",
        variant: "destructive",
      });
    }
  };

  const handlePressIn = () => {
    if (!autoStop) startRecording();
  };

  const handlePressOut = () => {
    if (!autoStop) stopRecording();
  };

  const handlePress = () => {
    if (autoStop) {
      if (!isRecording) startRecording();
    }
  };

  const sendTestMsg = () => {
    const testMessages = [
      "請提醒我今晚8點要食藥",
      "請問依家既美國總統係邊個？",
      "佛山有咩好去處？",
    ];

    const randomIndex = Math.floor(Math.random() * testMessages.length);
    const randomMessage = testMessages[randomIndex];

    sendMessage({
      type: "text",
      payload: randomMessage,
      sentence_id: 0,
    });

    // Optional: console log which message was sent
    console.log(`Sent test message ${randomIndex + 1}: ${randomMessage}`);
  };

  if (!isWsReady || showWelcome) {
    return <WelcomeScreen />;
  }
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] p-3 sm:p-4 md:p-6 safe-area-bottom">
      <div className="max-w-2xl mx-auto flex flex-col h-[100dvh]">
        {/* Header - reduced spacing for mobile */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            Memory Keeper
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Your AI-powered reminder assistant
          </p>
        </div>

        {/* Reminder list - fixed height for mobile */}
        <div className="flex-1 min-h-0 mb-4 sm:mb-6">
          <ScrollArea className="h-full max-h-[30vh] sm:max-h-[40vh]">
            <ReminderList reminders={reminders} setReminders={setReminders} />
          </ScrollArea>
        </div>

        {/* Response text - better mobile sizing */}
        {/* Response text - better mobile sizing */}
        <Card className="bg-card/80 backdrop-blur-sm mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4 h-24 sm:h-32">
            {" "}
            {/* Fixed height */}
            <ScrollArea className="h-full w-full">
              {displayedText.startsWith("👋") ||
              startsWithEmoji(displayedText) ? (
                <div className="text-sm sm:text-base">
                  <span
                    className="text-muted-foreground"
                    style={{
                      opacity: !secondPartArrived ? fadeAnim.current : 1,
                      transition: !secondPartArrived
                        ? undefined
                        : "opacity 0.3s",
                    }}
                  >
                    {displayedText.split("\n")[0]}
                  </span>
                  {displayedText.split("\n").length > 1 && (
                    <div className="text-foreground">
                      {displayedText.split("\n").slice(1).join("\n")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-foreground whitespace-pre-wrap text-sm sm:text-base">
                  {displayedText}
                </div>
              )}

              {!displayedText && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground text-center text-sm sm:text-base">
                    Start recording to see responses here
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Action buttons - better mobile spacing */}
        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          <div className="flex gap-2 justify-center">
            <Button
              onClick={sendTestMsg}
              variant="secondary"
              size="sm"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
              Test Message
            </Button>

            <Button
              onClick={clearReminders}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Talk panel - mobile bottom padding */}
        <div className="pb-2 sm:pb-4 safe-area-inset-bottom">
          <TalkPanel
            isRecording={isRecording}
            seconds={seconds}
            handlePressIn={handlePressIn}
            handlePressOut={handlePressOut}
            handlePress={handlePress}
            autoStop={autoStop}
            error={error}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
