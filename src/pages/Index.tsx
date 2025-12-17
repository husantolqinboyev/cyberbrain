import { Link } from "react-router-dom";
import { useState } from "react";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard, CyberCardHeader, CyberCardTitle, CyberCardContent } from "@/components/ui/cyber-card";
import { Users, GraduationCap, Zap, Trophy, Clock, Target, Crown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [pin, setPin] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchResults = async () => {
    if (!pin.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('id, pin_code, status, created_at, quiz_blocks!inner(title)')
        .eq('pin_code', pin.toUpperCase())
        .eq('status', 'finished')
        .order('created_at', { ascending: false }) as any;

      if (error) {
        console.error('Search error:', error);
        return;
      }

      setSearchResults(data || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background cyber-grid overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/3 rounded-full blur-3xl" />
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
          <nav className="flex items-center gap-4">
            <Link to="/teacher/login">
              <CyberButton variant="outline" size="sm">
                <GraduationCap className="w-4 h-4" />
                O'qituvchi
              </CyberButton>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="flex justify-center mb-8">
            <BrainLogo size="xl" />
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl font-black uppercase mb-6 text-foreground">
            <span className="text-primary text-glow-primary">CYBER</span>
            <span className="text-secondary text-glow-secondary">BRAIN</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 font-mono">
            Real-vaqtda interaktiv viktorina platformasi. O'yin orqali o'rganing!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
            <Link to="/play">
              <CyberButton size="xl" variant="default">
                <Zap className="w-6 h-6" />
                O'yinga Kirish
              </CyberButton>
            </Link>
            <Link to="/teacher/login">
              <CyberButton size="xl" variant="secondary">
                <GraduationCap className="w-6 h-6" />
                O'qituvchi Paneli
              </CyberButton>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard
              icon={<Clock className="w-10 h-10" />}
              title="Real-Vaqt"
              description="Barcha ishtirokchilar bir vaqtda javob beradi"
              glow="primary"
            />
            <FeatureCard
              icon={<Trophy className="w-10 h-10" />}
              title="Reyting"
              description="Tezlik va to'g'rilik asosida ball to'plang"
              glow="secondary"
            />
            <FeatureCard
              icon={<Target className="w-10 h-10" />}
              title="PIN Kod"
              description="6 xonali kod bilan o'yinga qo'shiling"
              glow="accent"
            />
          </div>
        </section>

        {/* Results Search Section */}
        <section className="container mx-auto px-4 py-20 border-t-2 border-border">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-16 uppercase">
            <span className="text-accent">Natijalarni</span>{" "}
            <span className="text-foreground">Ko'rish</span>
          </h2>

          <div className="max-w-2xl mx-auto">
            <CyberCard>
              <CyberCardHeader>
                <CyberCardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  PIN Kod orqali Natijalar
                </CyberCardTitle>
              </CyberCardHeader>
              <CyberCardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.toUpperCase())}
                      placeholder="PIN kodini kiriting"
                      className="flex-1 px-4 py-2 border-2 border-border bg-background font-mono text-lg rounded-lg focus:outline-none focus:border-primary"
                      maxLength={6}
                    />
                    <CyberButton 
                      onClick={handleSearchResults}
                      disabled={isSearching || pin.length !== 6}
                      variant="accent"
                    >
                      {isSearching ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </CyberButton>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <h3 className="font-display text-lg text-primary mb-3">Yakunlangan O'yinlar</h3>
                      {searchResults.map((game) => (
                        <div
                          key={game.id}
                          className="flex items-center justify-between p-3 border-2 border-border rounded-lg hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Trophy className="w-5 h-5 text-accent" />
                            <div>
                              <p className="font-mono text-sm text-muted-foreground">{game.pin_code}</p>
                              <p className="font-display text-base">{game.quiz_blocks?.title}</p>
                            </div>
                          </div>
                          <Link to={`/game/results?session=${game.id}`}>
                            <CyberButton variant="outline" size="sm">
                              Natijalarni Ko'rish
                            </CyberButton>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CyberCardContent>
            </CyberCard>
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-4 py-20 border-t-2 border-border">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-16 uppercase">
            <span className="text-primary">Qanday</span>{" "}
            <span className="text-foreground">Ishlaydi?</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div className="space-y-6">
              <h3 className="font-display text-xl text-secondary uppercase flex items-center gap-3">
                <GraduationCap className="w-6 h-6" />
                O'qituvchi Uchun
              </h3>
              <ul className="space-y-4 text-muted-foreground font-mono">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">01.</span>
                  Tizimga kiring va test blokini yarating
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">02.</span>
                  Savollar, vaqt va ball qo'shing
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">03.</span>
                  "Boshlash" tugmasini bosing - PIN yaratiladi
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">04.</span>
                  Natijalarni real vaqtda kuzating
                </li>
              </ul>
            </div>

            <div className="space-y-6">
              <h3 className="font-display text-xl text-accent uppercase flex items-center gap-3">
                <Users className="w-6 h-6" />
                O'quvchi Uchun
              </h3>
              <ul className="space-y-4 text-muted-foreground font-mono">
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">01.</span>
                  "O'yinga Kirish" tugmasini bosing
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">02.</span>
                  6 xonali PIN kodni kiriting
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">03.</span>
                  Nickname tanlang va "Join" bosing
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent font-bold">04.</span>
                  Savollarga tez javob bering!
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t-2 border-border bg-background/80 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground font-mono text-sm">
            © 2024 CyberBrain - Interaktiv ta'lim platformasi
          </p>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  glow: "primary" | "secondary" | "accent";
}

function FeatureCard({ icon, title, description, glow }: FeatureCardProps) {
  const glowClasses = {
    primary: "border-primary/30 hover:border-primary hover:glow-primary text-primary",
    secondary: "border-secondary/30 hover:border-secondary hover:glow-secondary text-secondary",
    accent: "border-accent/30 hover:border-accent hover:glow-accent text-accent",
  };

  return (
    <div className={`bg-card border-2 p-8 transition-all duration-300 ${glowClasses[glow]}`}>
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="font-display text-lg font-bold uppercase mb-2">{title}</h3>
      <p className="text-muted-foreground font-mono text-sm">{description}</p>
    </div>
  );
}

export default Index;
