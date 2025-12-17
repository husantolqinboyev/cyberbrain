import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberCard, CyberCardHeader, CyberCardTitle, CyberCardContent } from "@/components/ui/cyber-card";
import { ArrowLeft, Gamepad2, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGameSession } from "@/hooks/useGameSession";

const Play = () => {
  const [step, setStep] = useState<"pin" | "nickname">("pin");
  const [pin, setPin] = useState("");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { sessionData, isLoading: sessionLoading, joinSession, checkSession } = useGameSession();

  // Check for existing session on mount
  useEffect(() => {
    if (!sessionLoading && sessionData) {
      // User already has an active session, redirect them
      if (sessionData.status === 'waiting') {
        navigate(`/game/waiting?pid=${sessionData.participantId}`);
      } else if (sessionData.status === 'playing') {
        navigate(`/game/playing?pid=${sessionData.participantId}`);
      }
    }
  }, [sessionLoading, sessionData, navigate]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) {
      toast({
        title: "Xato",
        description: "PIN kod 6 ta raqamdan iborat bo'lishi kerak",
        variant: "destructive",
      });
      return;
    }
    setStep("nickname");
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim().length < 2) {
      toast({
        title: "Xato",
        description: "Nickname kamida 2 ta belgidan iborat bo'lishi kerak",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const result = await joinSession(pin, nickname.trim());
    
    if (!result.success) {
      toast({
        title: "Xato",
        description: result.error?.includes('Nickname') 
          ? "Bu nickname allaqachon band" 
          : result.error || "O'yinga qo'shilishda xatolik",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    toast({
      title: "Muvaffaqiyat!",
      description: "O'qituvchi o'yinni boshlaguncha kuting",
    });
    
    setIsLoading(false);
    navigate(`/game/waiting?pid=${result.participantId}`);
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background cyber-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background cyber-grid flex flex-col">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b-2 border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <BrainLogo size="sm" />
            <span className="font-display text-xl font-bold text-primary text-glow-primary">
              CYBERBRAIN
            </span>
          </Link>
          <Link to="/">
            <CyberButton variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              Orqaga
            </CyberButton>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <CyberCard glow="primary" className="w-full max-w-md">
          <CyberCardHeader>
            <div className="flex justify-center mb-4">
              {step === "pin" ? (
                <Gamepad2 className="w-12 h-12 text-primary" />
              ) : (
                <User className="w-12 h-12 text-accent" />
              )}
            </div>
            <CyberCardTitle className="text-center">
              {step === "pin" ? "O'yinga Kirish" : "Nickname Tanlash"}
            </CyberCardTitle>
          </CyberCardHeader>
          <CyberCardContent>
            {step === "pin" ? (
              <form onSubmit={handlePinSubmit} className="space-y-6">
                <CyberInput
                  label="6 Xonali PIN Kod"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="______"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-3xl tracking-[0.5em] font-mono"
                  autoFocus
                />
                <CyberButton
                  type="submit"
                  className="w-full"
                  disabled={isLoading || pin.length !== 6}
                >
                  {isLoading ? "Tekshirilmoqda..." : "Keyingi"}
                </CyberButton>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-6">
                <div className="text-center mb-4">
                  <p className="text-muted-foreground font-mono text-sm">
                    PIN: <span className="text-primary">{pin}</span>
                  </p>
                </div>
                <CyberInput
                  label="Sizning Nickname"
                  type="text"
                  maxLength={20}
                  placeholder="CyberPlayer"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-3">
                  <CyberButton
                    type="button"
                    variant="outline"
                    onClick={() => setStep("pin")}
                    className="flex-1"
                  >
                    Orqaga
                  </CyberButton>
                  <CyberButton
                    type="submit"
                    variant="accent"
                    className="flex-1"
                    disabled={isLoading || nickname.trim().length < 2}
                  >
                    {isLoading ? "Kutilmoqda..." : "Join"}
                  </CyberButton>
                </div>
              </form>
            )}
          </CyberCardContent>
        </CyberCard>
      </main>
    </div>
  );
};

export default Play;