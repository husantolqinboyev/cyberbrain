import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard, CyberCardHeader, CyberCardTitle, CyberCardContent } from "@/components/ui/cyber-card";
import { ArrowLeft, Play, FileText, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QuizBlock {
  id: string;
  title: string;
  description: string | null;
  question_count: number;
}

const StartGame = () => {
  const [blocks, setBlocks] = useState<QuizBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/teacher/login");
        return;
      }
      fetchBlocks();
    };
    checkAuth();
  }, [navigate]);

  const fetchBlocks = async () => {
    const { data: blocksData, error } = await supabase
      .from('quiz_blocks')
      .select(`
        id,
        title,
        description,
        questions(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Xato", description: "Bloklarni yuklashda xatolik", variant: "destructive" });
      return;
    }

    const formattedBlocks = blocksData?.map(block => ({
      ...block,
      question_count: (block.questions as any)?.[0]?.count || 0
    })).filter(b => b.question_count > 0) || [];

    setBlocks(formattedBlocks);
    setIsLoading(false);
  };

  const generatePinCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleStartGame = async () => {
    if (!selectedBlock) {
      toast({ title: "Xato", description: "Blokni tanlang", variant: "destructive" });
      return;
    }

    setIsStarting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Foydalanuvchi topilmadi");

      const pinCode = generatePinCode();

      const { data: session, error } = await supabase
        .from('game_sessions')
        .insert({
          teacher_id: user.id,
          block_id: selectedBlock,
          pin_code: pinCode,
          status: 'waiting'
        })
        .select()
        .single();

      if (error) throw error;

      toast({ 
        title: "O'yin yaratildi!", 
        description: `PIN: ${pinCode}` 
      });

      navigate(`/teacher/game?session=${session.id}`);
    } catch (err) {
      toast({ title: "Xato", description: "O'yinni boshlashda xatolik", variant: "destructive" });
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background cyber-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-float" />
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
          <Link to="/teacher/dashboard">
            <CyberButton variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              Orqaga
            </CyberButton>
          </Link>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold uppercase mb-2">
          <span className="text-accent">O'yin</span>{" "}
          <span className="text-foreground">Boshlash</span>
        </h1>
        <p className="text-muted-foreground font-mono mb-8">
          Test blokini tanlang va o'yinni boshlang
        </p>

        {blocks.length === 0 ? (
          <CyberCard className="text-center py-12">
            <CyberCardContent>
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl mb-2">Bloklar yo'q</h3>
              <p className="text-muted-foreground font-mono mb-6">
                Avval test blokini yarating va savollar qo'shing
              </p>
              <Link to="/teacher/blocks/new">
                <CyberButton>
                  Yangi Blok Yaratish
                </CyberButton>
              </Link>
            </CyberCardContent>
          </CyberCard>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {blocks.map(block => (
                <CyberCard
                  key={block.id}
                  glow={selectedBlock === block.id ? 'accent' : undefined}
                  className={`cursor-pointer transition-all ${
                    selectedBlock === block.id ? 'ring-2 ring-accent' : ''
                  }`}
                  onClick={() => setSelectedBlock(block.id)}
                >
                  <CyberCardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display text-lg">{block.title}</h3>
                        <p className="text-muted-foreground font-mono text-sm">
                          {block.question_count} savol
                        </p>
                      </div>
                      {selectedBlock === block.id && (
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                          <Check className="w-5 h-5 text-accent-foreground" />
                        </div>
                      )}
                    </div>
                  </CyberCardContent>
                </CyberCard>
              ))}
            </div>

            <CyberButton
              onClick={handleStartGame}
              disabled={!selectedBlock || isStarting}
              className="w-full"
              variant="accent"
            >
              <Play className="w-5 h-5" />
              {isStarting ? "O'yin yaratilmoqda..." : "O'yinni Boshlash"}
            </CyberButton>
          </>
        )}
      </main>
    </div>
  );
};

export default StartGame;