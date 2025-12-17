import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberCard, CyberCardHeader, CyberCardTitle, CyberCardContent } from "@/components/ui/cyber-card";
import { ArrowLeft, Plus, Trash2, Save, GripVertical, Loader2, Clock, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Question {
  id?: string;
  question_text: string;
  options: string[];
  correct_option: number;
  time_seconds: number;
  max_points: number;
  order_index: number;
  isNew?: boolean;
}

const QuizBlockEdit = () => {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/teacher/login");
        return;
      }
      if (!isNew) {
        fetchBlock();
      }
    };
    checkAuth();
  }, [navigate, isNew]);

  const fetchBlock = async () => {
    const { data: block, error } = await supabase
      .from('quiz_blocks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !block) {
      toast({ title: "Xato", description: "Blok topilmadi", variant: "destructive" });
      navigate("/teacher/blocks");
      return;
    }

    setTitle(block.title);
    setDescription(block.description || "");
    setIsPublic(block.is_public);

    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('block_id', id)
      .order('order_index');

    if (questionsData) {
      setQuestions(questionsData.map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options as string[] : []
      })));
    }

    setIsLoading(false);
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      question_text: "",
      options: ["", "", "", ""],
      correct_option: 0,
      time_seconds: 30,
      max_points: 100,
      order_index: questions.length,
      isNew: true
    }]);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions(questions.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  };

  const removeQuestion = async (index: number) => {
    const question = questions[index];
    
    if (question.id) {
      const { error } = await supabase.from('questions').delete().eq('id', question.id);
      if (error) {
        toast({ title: "Xato", description: "Savolni o'chirishda xatolik", variant: "destructive" });
        return;
      }
    }

    setQuestions(questions.filter((_, i) => i !== index));
    toast({ title: "Muvaffaqiyat", description: "Savol o'chirildi" });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Xato", description: "Blok nomini kiriting", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      let blockId = id;

      if (isNew) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Foydalanuvchi topilmadi");

        const { data: newBlock, error } = await supabase
          .from('quiz_blocks')
          .insert({
            title,
            description: description || null,
            is_public: isPublic,
            teacher_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        blockId = newBlock.id;
      } else {
        const { error } = await supabase
          .from('quiz_blocks')
          .update({ title, description: description || null, is_public: isPublic })
          .eq('id', id);

        if (error) throw error;
      }

      // Save questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionData = {
          block_id: blockId,
          question_text: q.question_text,
          options: q.options,
          correct_option: q.correct_option,
          time_seconds: q.time_seconds,
          max_points: q.max_points,
          order_index: i
        };

        if (q.id && !q.isNew) {
          await supabase.from('questions').update(questionData).eq('id', q.id);
        } else {
          await supabase.from('questions').insert(questionData);
        }
      }

      toast({ title: "Muvaffaqiyat", description: "Blok saqlandi" });
      navigate("/teacher/blocks");
    } catch (err) {
      toast({ title: "Xato", description: "Saqlashda xatolik yuz berdi", variant: "destructive" });
    } finally {
      setIsSaving(false);
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
          <Link to="/teacher/blocks">
            <CyberButton variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              Orqaga
            </CyberButton>
          </Link>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="font-display text-3xl font-bold uppercase mb-8">
          <span className="text-primary">{isNew ? "Yangi" : "Tahrirlash"}</span>{" "}
          <span className="text-foreground">Blok</span>
        </h1>

        {/* Block Info */}
        <CyberCard glow="primary" className="mb-8">
          <CyberCardHeader>
            <CyberCardTitle>Blok Ma'lumotlari</CyberCardTitle>
          </CyberCardHeader>
          <CyberCardContent className="space-y-4">
            <CyberInput
              label="Blok Nomi"
              placeholder="Masalan: Matematika 5-sinf"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <CyberInput
              label="Tavsif (ixtiyoriy)"
              placeholder="Qo'shimcha ma'lumot..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-5 h-5 accent-primary"
              />
              <label htmlFor="isPublic" className="text-muted-foreground font-mono text-sm">
                Ommaviy (boshqa o'qituvchilar ko'rishi mumkin)
              </label>
            </div>
          </CyberCardContent>
        </CyberCard>

        {/* Questions */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl uppercase">Savollar ({questions.length})</h2>
          <CyberButton onClick={addQuestion} variant="secondary" size="sm">
            <Plus className="w-4 h-4" />
            Savol Qo'shish
          </CyberButton>
        </div>

        <div className="space-y-6">
          {questions.map((question, qIndex) => (
            <CyberCard key={qIndex}>
              <CyberCardHeader>
                <CyberCardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span>Savol {qIndex + 1}</span>
                  </div>
                  <CyberButton
                    variant="destructive"
                    size="sm"
                    onClick={() => removeQuestion(qIndex)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </CyberButton>
                </CyberCardTitle>
              </CyberCardHeader>
              <CyberCardContent className="space-y-4">
                <CyberInput
                  label="Savol matni"
                  placeholder="Savolni kiriting..."
                  value={question.question_text}
                  onChange={(e) => updateQuestion(qIndex, { question_text: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <CyberInput
                      label="Vaqt (soniya)"
                      type="number"
                      min={5}
                      max={120}
                      value={question.time_seconds}
                      onChange={(e) => updateQuestion(qIndex, { time_seconds: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-muted-foreground" />
                    <CyberInput
                      label="Maksimal ball"
                      type="number"
                      min={10}
                      max={1000}
                      value={question.max_points}
                      onChange={(e) => updateQuestion(qIndex, { max_points: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="font-mono text-sm text-muted-foreground">Javob variantlari</label>
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={question.correct_option === oIndex}
                        onChange={() => updateQuestion(qIndex, { correct_option: oIndex })}
                        className="w-5 h-5 accent-accent"
                      />
                      <span className="font-display text-lg w-6">{String.fromCharCode(65 + oIndex)}.</span>
                      <input
                        type="text"
                        placeholder={`Variant ${String.fromCharCode(65 + oIndex)}`}
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        className="flex-1 bg-input border-2 border-border p-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground font-mono">
                    To'g'ri javobni belgilash uchun radio tugmasini bosing
                  </p>
                </div>
              </CyberCardContent>
            </CyberCard>
          ))}

          {questions.length === 0 && (
            <CyberCard className="text-center py-8">
              <CyberCardContent>
                <p className="text-muted-foreground font-mono mb-4">Savollar yo'q</p>
                <CyberButton onClick={addQuestion}>
                  <Plus className="w-4 h-4" />
                  Birinchi Savolni Qo'shish
                </CyberButton>
              </CyberCardContent>
            </CyberCard>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <CyberButton onClick={handleSave} disabled={isSaving} className="min-w-40">
            <Save className="w-4 h-4" />
            {isSaving ? "Saqlanmoqda..." : "Saqlash"}
          </CyberButton>
        </div>
      </main>
    </div>
  );
};

export default QuizBlockEdit;