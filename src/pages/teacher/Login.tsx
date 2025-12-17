import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberCard, CyberCardHeader, CyberCardTitle, CyberCardContent } from "@/components/ui/cyber-card";
import { ArrowLeft, GraduationCap, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TeacherLogin = () => {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim() || !password.trim()) {
      toast({
        title: "Xato",
        description: "Iltimos, barcha maydonlarni to'ldiring",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Login with email format: nickname@cyberbrain.local
      const email = `${nickname.toLowerCase()}@cyberbrain.local`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Kirish xatosi",
          description: "Nickname yoki parol noto'g'ri",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Check if user is blocked
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_blocked')
        .eq('user_id', data.user.id)
        .single();

      if (profile?.is_blocked) {
        await supabase.auth.signOut();
        toast({
          title: "Bloklangan",
          description: "Sizning hisobingiz bloklangan. Admin bilan bog'laning.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Muvaffaqiyat!",
        description: "Tizimga kirdingiz",
      });
      navigate("/teacher/dashboard");
    } catch (err) {
      toast({
        title: "Xato",
        description: "Tizimga kirishda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background cyber-grid flex flex-col">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
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
        <CyberCard glow="secondary" className="w-full max-w-md">
          <CyberCardHeader>
            <div className="flex justify-center mb-4">
              <GraduationCap className="w-12 h-12 text-secondary" />
            </div>
            <CyberCardTitle className="text-center">
              O'qituvchi Kirish
            </CyberCardTitle>
          </CyberCardHeader>
          <CyberCardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <CyberInput
                label="Nickname"
                type="text"
                placeholder="teacher_john"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoFocus
              />
              <div className="relative">
                <CyberInput
                  label="Parol"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <CyberButton
                type="submit"
                variant="secondary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Kirilmoqda..." : "Kirish"}
              </CyberButton>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground font-mono">
              Hisobingiz yo'qmi?{" "}
              <span className="text-secondary">Admin bilan bog'laning</span>
            </p>
          </CyberCardContent>
        </CyberCard>
      </main>
    </div>
  );
};

export default TeacherLogin;
