import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberCard, CyberCardHeader, CyberCardTitle, CyberCardContent } from "@/components/ui/cyber-card";
import { Crown, LogOut, UserPlus, Users, Ban, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Teacher {
  id: string;
  user_id: string;
  nickname: string;
  full_name: string | null;
  is_blocked: boolean;
  created_at: string;
}

const AdminDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [newNickname, setNewNickname] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin/login");
        return;
      }

      // Verify admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        navigate("/admin/login");
        return;
      }

      setUser(session.user);
      setIsLoading(false);
      fetchTeachers();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/admin/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchTeachers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Filter to get only teachers (not admins)
      const teacherProfiles = data.filter(p => p.nickname !== 'husanboy');
      setTeachers(teacherProfiles);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newNickname.trim() || !newPassword.trim()) {
      toast({
        title: "Xato",
        description: "Nickname va parolni kiriting",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Xato",
        description: "Parol kamida 6 ta belgidan iborat bo'lishi kerak",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const email = `${newNickname.toLowerCase()}@cyberbrain.local`;
      
      // Create teacher using admin API
      const response = await fetch('https://dwvosiwottjjixudppca.supabase.co/functions/v1/create-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: newPassword,
          nickname: newNickname,
          full_name: newFullName
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create teacher');
      }

      const data = { user: result };

      // Add teacher role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: result.user_id,
          role: 'teacher',
        });

      if (roleError) {
        toast({
          title: "Xato",
          description: roleError.message,
          variant: "destructive",
        });
        setIsCreating(false);
        return;
      }

      toast({
        title: "Muvaffaqiyat!",
        description: `O'qituvchi "${newNickname}" yaratildi`,
      });

      setNewNickname("");
      setNewPassword("");
      setNewFullName("");
      setDialogOpen(false);
      
      // Refresh teachers list after a short delay
      setTimeout(fetchTeachers, 1000);
    } catch (err) {
      toast({
        title: "Xato",
        description: "O'qituvchi yaratishda xatolik",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleBlock = async (teacher: Teacher) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: !teacher.is_blocked })
      .eq('id', teacher.id);

    if (error) {
      toast({
        title: "Xato",
        description: "Statusni o'zgartirishda xatolik",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Muvaffaqiyat",
        description: teacher.is_blocked ? "O'qituvchi blokdan chiqarildi" : "O'qituvchi bloklandi",
      });
      fetchTeachers();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background cyber-grid flex items-center justify-center">
        <BrainLogo size="lg" animated />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-float" />
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
            <span className="text-muted-foreground font-mono text-sm flex items-center gap-2">
              <Crown className="w-4 h-4 text-accent" />
              <span className="text-accent">ADMIN</span>
            </span>
            <CyberButton variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Chiqish
            </CyberButton>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase mb-2">
              <span className="text-accent">Admin</span>{" "}
              <span className="text-foreground">Panel</span>
            </h1>
            <p className="text-muted-foreground font-mono">
              O'qituvchilarni boshqarish
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <CyberButton variant="accent">
                <UserPlus className="w-4 h-4" />
                O'qituvchi Qo'shish
              </CyberButton>
            </DialogTrigger>
            <DialogContent className="bg-card border-2 border-accent">
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-accent">
                  Yangi O'qituvchi
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTeacher} className="space-y-4 mt-4">
                <CyberInput
                  label="Nickname (login)"
                  type="text"
                  placeholder="teacher_ali"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                />
                <CyberInput
                  label="To'liq ism (ixtiyoriy)"
                  type="text"
                  placeholder="Ali Valiyev"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                />
                <div className="relative">
                  <CyberInput
                    label="Parol"
                    type={showPassword ? "text" : "password"}
                    placeholder="Kamida 6 ta belgi"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                  disabled={isCreating}
                >
                  {isCreating ? "Yaratilmoqda..." : "Yaratish"}
                </CyberButton>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <CyberCard className="text-center">
            <CyberCardContent className="pt-4">
              <Users className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="font-display text-3xl font-bold text-accent">{teachers.length}</p>
              <p className="text-muted-foreground font-mono text-sm uppercase">Jami O'qituvchilar</p>
            </CyberCardContent>
          </CyberCard>
          <CyberCard className="text-center">
            <CyberCardContent className="pt-4">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-display text-3xl font-bold text-primary">
                {teachers.filter(t => !t.is_blocked).length}
              </p>
              <p className="text-muted-foreground font-mono text-sm uppercase">Faol</p>
            </CyberCardContent>
          </CyberCard>
          <CyberCard className="text-center">
            <CyberCardContent className="pt-4">
              <Ban className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="font-display text-3xl font-bold text-destructive">
                {teachers.filter(t => t.is_blocked).length}
              </p>
              <p className="text-muted-foreground font-mono text-sm uppercase">Bloklangan</p>
            </CyberCardContent>
          </CyberCard>
        </div>

        {/* Teachers List */}
        <CyberCard>
          <CyberCardHeader>
            <CyberCardTitle>O'qituvchilar Ro'yxati</CyberCardTitle>
          </CyberCardHeader>
          <CyberCardContent>
            {teachers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-mono">
                  Hozircha o'qituvchilar yo'q
                </p>
                <p className="text-muted-foreground font-mono text-sm mt-2">
                  "O'qituvchi Qo'shish" tugmasini bosing
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className={`flex items-center justify-between p-4 border-2 rounded ${
                      teacher.is_blocked 
                        ? "border-destructive/30 bg-destructive/5" 
                        : "border-border hover:border-primary/50"
                    } transition-colors`}
                  >
                    <div>
                      <p className="font-display text-lg">
                        <span className="text-primary">{teacher.nickname}</span>
                        {teacher.full_name && (
                          <span className="text-muted-foreground ml-2">
                            ({teacher.full_name})
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground font-mono text-sm">
                        {new Date(teacher.created_at).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {teacher.is_blocked && (
                        <span className="text-destructive font-mono text-sm uppercase">
                          Bloklangan
                        </span>
                      )}
                      <CyberButton
                        variant={teacher.is_blocked ? "outline" : "destructive"}
                        size="sm"
                        onClick={() => handleToggleBlock(teacher)}
                      >
                        <Ban className="w-4 h-4" />
                        {teacher.is_blocked ? "Blokdan chiqarish" : "Bloklash"}
                      </CyberButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CyberCardContent>
        </CyberCard>
      </main>
    </div>
  );
};

export default AdminDashboard;
