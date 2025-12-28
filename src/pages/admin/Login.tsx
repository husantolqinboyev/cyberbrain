import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberCard, CyberCardHeader, CyberCardTitle, CyberCardContent } from "@/components/ui/cyber-card";
import { ArrowLeft, Crown, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminLogin = () => {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Generate CSRF token on component mount
  const [csrfToken] = useState(() => {
    return crypto.randomUUID();
  });

  // Check if account is locked
  useEffect(() => {
    const lockTime = localStorage.getItem('adminLockTime');
    const attempts = parseInt(localStorage.getItem('loginAttempts') || '0');
    
    if (lockTime && new Date().getTime() < parseInt(lockTime)) {
      setIsLocked(true);
      const remainingTime = Math.ceil((parseInt(lockTime) - new Date().getTime()) / 60000);
      toast({
        title: "Account Locked",
        description: `Account locked for ${remainingTime} minutes due to too many failed attempts`,
        variant: "destructive",
      });
    } else if (attempts >= 5) {
      // Reset after lock period expires
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('adminLockTime');
      setLoginAttempts(0);
    } else {
      setLoginAttempts(attempts);
    }
  }, [toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      toast({
        title: "Account Locked",
        description: "Please try again later",
        variant: "destructive",
      });
      return;
    }
    
    if (!nickname.trim() || !password.trim()) {
      toast({
        title: "Xato",
        description: "Iltimos, barcha maydonlarni to'ldiring",
        variant: "destructive",
      });
      return;
    }

    // Check password strength
    if (password.length < 8) {
      toast({
        title: "Xato",
        description: "Parol kamida 8 ta belgidan iborat bo'lishi kerak",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const email = `${nickname.toLowerCase()}@cyberbrain.local`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Increment login attempts
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem('loginAttempts', newAttempts.toString());
        
        // Lock account after 5 failed attempts
        if (newAttempts >= 5) {
          const lockTime = new Date().getTime() + (15 * 60 * 1000); // 15 minutes
          localStorage.setItem('adminLockTime', lockTime.toString());
          setIsLocked(true);
          
          toast({
            title: "Account Locked",
            description: "Too many failed attempts. Account locked for 15 minutes",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Kirish xatosi",
            description: `Nickname yoki parol noto'g'ri. ${5 - newAttempts} attempts remaining`,
            variant: "destructive",
          });
        }
        
        setIsLoading(false);
        return;
      }

      // Reset login attempts on successful login
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('adminLockTime');
      setLoginAttempts(0);

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .single();

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        toast({
          title: "Ruxsat yo'q",
          description: "Siz admin emassiz",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Muvaffaqiyat!",
        description: "Admin paneliga xush kelibsiz",
      });
      navigate("/admin/dashboard");
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
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      </div>

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

      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <CyberCard glow="accent" className="w-full max-w-md">
          <CyberCardHeader>
            <div className="flex justify-center mb-4">
              <Crown className="w-12 h-12 text-accent" />
            </div>
            <CyberCardTitle className="text-center">
              Admin Kirish
            </CyberCardTitle>
          </CyberCardHeader>
          <CyberCardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <CyberInput
                label="Nickname"
                type="text"
                placeholder="admin"
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
                  className="absolute right-3 top-9 text-muted-foreground hover:text-accent transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <CyberButton
                type="submit"
                variant="accent"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Kirilmoqda..." : "Kirish"}
              </CyberButton>
            </form>
          </CyberCardContent>
        </CyberCard>
      </main>
    </div>
  );
};

export default AdminLogin;
