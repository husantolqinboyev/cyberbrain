import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard, CyberCardHeader, CyberCardTitle, CyberCardContent } from "@/components/ui/cyber-card";
import { Trophy, Medal, Users, Clock, Home, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Participant {
  id: string;
  nickname: string;
  total_score: number;
  rank: number;
}

const ResultsAnnouncement = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(50);

  // Fetch participants and rankings
  useEffect(() => {
    if (!sessionId) {
      navigate("/teacher/dashboard");
      return;
    }

    const fetchResults = async () => {
      try {
        const { data: participantsData, error } = await supabase
          .from('participants')
          .select('id, nickname, total_score')
          .eq('session_id', sessionId)
          .order('total_score', { ascending: false }) as any;

        if (error) {
          toast({ title: "Xato", description: "Natijalarni yuklashda xatolik", variant: "destructive" });
          return;
        }

        if (participantsData) {
          const rankedParticipants = participantsData.map((p, index) => ({
            ...p,
            rank: index + 1
          }));
          setParticipants(rankedParticipants);
        }
      } catch (err) {
        console.error('Error fetching results:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [sessionId, navigate, toast]);

  // Countdown timer for auto-redirect
  useEffect(() => {
    if (countdown <= 0) {
      navigate('/teacher/dashboard');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-foreground';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background cyber-grid flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b-2 border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/teacher/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <BrainLogo size="sm" />
              <span className="font-display text-xl font-bold text-primary text-glow-primary">
                CYBERBRAIN
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              <span className="font-display text-lg text-accent">
                {countdown}s
              </span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground font-mono text-sm">O'qituvchi paneli</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Results Announcement */}
        <CyberCard glow="accent" className="mb-8 text-center">
          <CyberCardContent className="py-8">
            <div className="flex justify-center mb-6">
              <Trophy className="w-16 h-16 text-accent animate-pulse" />
            </div>
            
            <h1 className="font-display text-3xl uppercase mb-4 text-accent">
              O'yin Yakunlandi!
            </h1>
            
            <p className="text-muted-foreground font-mono mb-6">
              Barcha o'quvchilar natijalarni ko'rishlari mumkin
            </p>

            <div className="flex justify-center gap-4">
              <Link to="/teacher/dashboard">
                <CyberButton variant="secondary">
                  <Home className="w-4 h-4" />
                  Bosh Panelga Qaytish
                </CyberButton>
              </Link>
            </div>
          </CyberCardContent>
        </CyberCard>

        {/* Rankings */}
        <CyberCard glow="primary">
          <CyberCardHeader>
            <CyberCardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Reyting Jadvali
            </CyberCardTitle>
          </CyberCardHeader>
          <CyberCardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all duration-300 ${
                    participant.rank <= 3
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-display text-lg w-8 ${getRankColor(participant.rank)}`}>
                      {participant.rank <= 3 ? getRankIcon(participant.rank) : `#${participant.rank}`}
                    </span>
                    <span className="font-mono text-lg">
                      {participant.nickname}
                    </span>
                  </div>
                  <span className="font-display text-lg text-primary">
                    {participant.total_score}
                  </span>
                </div>
              ))}
            </div>
          </CyberCardContent>
        </CyberCard>
      </main>
    </div>
  );
};

export default ResultsAnnouncement;
