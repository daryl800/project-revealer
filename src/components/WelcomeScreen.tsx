import { Loader2 } from "lucide-react";

const WelcomeScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))]">
      <div className="text-center">
        <div className="mb-8">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Memory Keeper
        </h1>
        <p className="text-lg text-gray-400">Connecting to server...</p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
