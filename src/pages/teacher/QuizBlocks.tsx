import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard, CyberCardHeader, CyberCardTitle, CyberCardContent } from "@/components/ui/cyber-card";
import { Plus, Edit, Trash2, FileText, ArrowLeft, Loader2, Eye, EyeOff, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QuizBlock {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  question_count: number;
}

const QuizBlocks = () => {
  const [blocks, setBlocks] = useState<QuizBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        is_public,
        created_at,
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
    })) || [];

    setBlocks(formattedBlocks);
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu blokni o'chirishni xohlaysizmi?")) return;

    const { error } = await supabase.from('quiz_blocks').delete().eq('id', id);
    
    if (error) {
      toast({ title: "Xato", description: "Blokni o'chirishda xatolik", variant: "destructive" });
      return;
    }

    toast({ title: "Muvaffaqiyat", description: "Blok o'chirildi" });
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const togglePublic = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('quiz_blocks')
      .update({ is_public: !currentState })
      .eq('id', id);

    if (error) {
      toast({ title: "Xato", description: "Yangilashda xatolik", variant: "destructive" });
      return;
    }

    setBlocks(blocks.map(b => b.id === id ? { ...b, is_public: !currentState } : b));
  };

  const handleDuplicate = async (blockId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Foydalanuvchi topilmadi");

      // Get original block
      const { data: originalBlock } = await supabase
        .from('quiz_blocks')
        .select('*')
        .eq('id', blockId)
        .single();

      if (!originalBlock) throw new Error("Blok topilmadi");

      // Create new block
      const { data: newBlock, error: blockError } = await supabase
        .from('quiz_blocks')
        .insert({
          title: `${originalBlock.title} (nusxa)`,
          description: originalBlock.description,
          is_public: false,
          teacher_id: user.id
        })
        .select()
        .single();

      if (blockError || !newBlock) throw blockError;

      // Copy questions
      const { data: questions } = await supabase
        .from('questions')
        .select('question_text, options, correct_option, time_seconds, max_points, order_index')
        .eq('block_id', blockId);

      if (questions && questions.length > 0) {
        const newQuestions = questions.map(q => ({
          ...q,
          block_id: newBlock.id
        }));
        await supabase.from('questions').insert(newQuestions);
      }

      toast({ title: "Muvaffaqiyat", description: "Blok nusxalandi" });
      fetchBlocks();
    } catch (err) {
      toast({ title: "Xato", description: "Nusxalashda xatolik", variant: "destructive" });
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
          <Link to="/teacher/dashboard">
            <CyberButton variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              Orqaga
            </CyberButton>
          </Link>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase mb-2">
              <span className="text-secondary">Test</span>{" "}
              <span className="text-foreground">Bloklari</span>
            </h1>
            <p className="text-muted-foreground font-mono">
              Barcha test bloklaringiz
            </p>
          </div>
          <Link to="/teacher/blocks/new">
            <CyberButton>
              <Plus className="w-4 h-4" />
              Yangi Blok
            </CyberButton>
          </Link>
        </div>

        {blocks.length === 0 ? (
          <CyberCard className="text-center py-12">
            <CyberCardContent>
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl mb-2">Bloklar yo'q</h3>
              <p className="text-muted-foreground font-mono mb-6">
                Yangi test blokini yarating
              </p>
              <Link to="/teacher/blocks/new">
                <CyberButton>
                  <Plus className="w-4 h-4" />
                  Yangi Blok
                </CyberButton>
              </Link>
            </CyberCardContent>
          </CyberCard>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blocks.map(block => (
              <CyberCard key={block.id} glow="primary">
                <CyberCardHeader>
                  <CyberCardTitle className="flex items-center justify-between">
                    <span className="truncate">{block.title}</span>
                    <button
                      onClick={() => togglePublic(block.id, block.is_public)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title={block.is_public ? "Ommaviy" : "Shaxsiy"}
                    >
                      {block.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </CyberCardTitle>
                </CyberCardHeader>
                <CyberCardContent>
                  <p className="text-muted-foreground font-mono text-sm mb-4 line-clamp-2">
                    {block.description || "Tavsif yo'q"}
                  </p>
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-muted-foreground font-mono">
                      {block.question_count} savol
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {new Date(block.created_at).toLocaleDateString('uz')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/teacher/blocks/${block.id}`} className="flex-1">
                      <CyberButton variant="secondary" className="w-full" size="sm">
                        <Edit className="w-4 h-4" />
                        Tahrirlash
                      </CyberButton>
                    </Link>
                    <CyberButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(block.id)}
                      title="Nusxalash"
                    >
                      <Copy className="w-4 h-4" />
                    </CyberButton>
                    <CyberButton
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(block.id)}
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </CyberButton>
                  </div>
                </CyberCardContent>
              </CyberCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default QuizBlocks;