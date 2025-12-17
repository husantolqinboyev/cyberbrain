import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard, CyberCardContent } from "@/components/ui/cyber-card";
import { Plus, Play, LogOut, FileText, Users, Loader2, HelpCircle, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  totalBlocks: number;
  totalQuestions: number;
  totalGames: number;
  totalParticipants: number;
}

const TeacherDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalBlocks: 0, totalQuestions: 0, totalGames: 0, totalParticipants: 0 });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/teacher/login");
        return;
      }
      setUser(session.user);
      await fetchStats(session.user.id);
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/teacher/login");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchStats = async (userId: string) => {
    // Fetch blocks count
    const { count: blocksCount } = await supabase
      .from('quiz_blocks')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', userId);

    // Fetch questions count (through blocks)
    const { data: blocks } = await supabase
      .from('quiz_blocks')
      .select('id')
      .eq('teacher_id', userId);

    let questionsCount = 0;
    if (blocks && blocks.length > 0) {
      const blockIds = blocks.map(b => b.id);
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .in('block_id', blockIds);
      questionsCount = count || 0;
    }

    // Fetch games count
    const { count: gamesCount } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', userId);

    // Fetch participants count
    const { data: sessions } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('teacher_id', userId);

    let participantsCount = 0;
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds);
      participantsCount = count || 0;
    }

    setStats({
      totalBlocks: blocksCount || 0,
      totalQuestions: questionsCount,
      totalGames: gamesCount || 0,
      totalParticipants: participantsCount
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Chiqildi",
      description: "Tizimdan muvaffaqiyatli chiqdingiz",
    });
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background cyber-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const nickname = user?.email?.split("@")[0] || "O'qituvchi";

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      </div>

      <header className="relative z-10 border-b-2 border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <BrainLogo size="sm" />
            <span className="font-display text-xl font-bold text-primary text-glow-primary">
              CYBERBRAIN
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground font-mono text-sm">
              Salom, <span className="text-secondary">{nickname}</span>
            </span>
            <CyberButton variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Chiqish
            </CyberButton>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold uppercase mb-2">
            <span className="text-primary">Boshqaruv</span>{" "}
            <span className="text-foreground">Paneli</span>
          </h1>
          <p className="text-muted-foreground font-mono">
            Test bloklarini yarating va o'yinlarni boshlang
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Link to="/teacher/blocks/new">
            <CyberCard glow="primary" className="cursor-pointer h-full hover:scale-[1.02] transition-transform">
              <CyberCardContent className="flex flex-col items-center text-center pt-8">
                <Plus className="w-12 h-12 text-primary mb-4" />
                <h3 className="font-display text-lg uppercase mb-2">Yangi Test</h3>
                <p className="text-muted-foreground font-mono text-sm">
                  Yangi test blokini yaratish
                </p>
              </CyberCardContent>
            </CyberCard>
          </Link>

          <Link to="/teacher/blocks">
            <CyberCard glow="secondary" className="cursor-pointer h-full hover:scale-[1.02] transition-transform">
              <CyberCardContent className="flex flex-col items-center text-center pt-8">
                <FileText className="w-12 h-12 text-secondary mb-4" />
                <h3 className="font-display text-lg uppercase mb-2">Mening Bloklarim</h3>
                <p className="text-muted-foreground font-mono text-sm">
                  Mavjud test bloklari ro'yxati
                </p>
              </CyberCardContent>
            </CyberCard>
          </Link>

          <Link to="/teacher/start">
            <CyberCard glow="accent" className="cursor-pointer h-full hover:scale-[1.02] transition-transform">
              <CyberCardContent className="flex flex-col items-center text-center pt-8">
                <Play className="w-12 h-12 text-accent mb-4" />
                <h3 className="font-display text-lg uppercase mb-2">O'yin Boshlash</h3>
                <p className="text-muted-foreground font-mono text-sm">
                  Blokni tanlab o'yinni boshlash
                </p>
              </CyberCardContent>
            </CyberCard>
          </Link>
        </div>

        {/* Stats Section */}
        <h2 className="font-display text-xl uppercase mb-4 text-muted-foreground">Statistika</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Jami Bloklar" value={stats.totalBlocks} icon={<FileText className="w-5 h-5" />} />
          <StatCard label="Jami Savollar" value={stats.totalQuestions} icon={<HelpCircle className="w-5 h-5" />} />
          <StatCard label="O'tkazilgan O'yinlar" value={stats.totalGames} icon={<Trophy className="w-5 h-5" />} />
          <StatCard label="Ishtirokchilar" value={stats.totalParticipants} icon={<Users className="w-5 h-5" />} />
        </div>
      </main>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <CyberCard className="text-center">
      <CyberCardContent className="pt-4">
        <div className="flex justify-center mb-2 text-primary">{icon}</div>
        <p className="font-display text-3xl font-bold text-primary mb-1">{value}</p>
        <p className="text-muted-foreground font-mono text-xs uppercase">{label}</p>
      </CyberCardContent>
    </CyberCard>
  );
}

export default TeacherDashboard;
