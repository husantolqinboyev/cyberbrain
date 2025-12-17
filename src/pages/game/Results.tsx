import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard, CyberCardHeader, CyberCardTitle, CyberCardContent } from "@/components/ui/cyber-card";
import { Trophy, Medal, CheckCircle, XCircle, Loader2, Home, RotateCcw, Star, Sparkles } from "lucide-react";
import { useGameSession } from "@/hooks/useGameSession";
import { supabase } from "@/integrations/supabase/client";

interface AnswerResult {
  question_text: string;
  selected_option: number;
  correct_option: number;
  is_correct: boolean;
  points_earned: number;
  options: string[];
}

interface RankingEntry {
  nickname: string;
  total_score: number;
  rank: number;
}

const GameResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const participantId = searchParams.get("pid") || "";
  const { sessionData, isLoading: sessionLoading, leaveSession, checkSession } = useGameSession();
  
  const [answers, setAnswers] = useState<AnswerResult[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [myRank, setMyRank] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Logout function
  const handleLogout = () => {
    // Clear session data
    localStorage.removeItem('gameSession');
    leaveSession();
    navigate('/');
  };

  useEffect(() => {
    if (!sessionData && !sessionLoading) {
      checkSession(participantId);
    }
  }, [sessionData, sessionLoading, checkSession, participantId]);

  useEffect(() => {
    if (!sessionLoading && !sessionData) {
      navigate('/play');
      return;
    }

    if (sessionData) {
      fetchResults();
    }
  }, [sessionData, sessionLoading, navigate]);

  const fetchResults = async () => {
    if (!sessionData?.sessionId || !sessionData?.participantId) return;

    try {
      // Fetch all answers for this participant with question details
      const { data: answersData } = await supabase
        .from('answers')
        .select(`
          selected_option,
          is_correct,
          points_earned,
          question_id
        `)
        .eq('participant_id', sessionData.participantId);

      if (answersData) {
        // Fetch question details for each answer
        const questionIds = answersData.map(a => a.question_id);
        const { data: questionsData } = await supabase
          .from('questions')
          .select('id, question_text, options, correct_option, order_index')
          .in('id', questionIds)
          .order('order_index');

        if (questionsData) {
          const results: AnswerResult[] = answersData.map(answer => {
            const question = questionsData.find(q => q.id === answer.question_id);
            return {
              question_text: question?.question_text || '',
              selected_option: answer.selected_option,
              correct_option: question?.correct_option || 0,
              is_correct: answer.is_correct,
              points_earned: answer.points_earned,
              options: Array.isArray(question?.options) ? question.options as string[] : []
            };
          });
          
          // Sort by question order
          results.sort((a, b) => {
            const qA = questionsData.find(q => q.question_text === a.question_text);
            const qB = questionsData.find(q => q.question_text === b.question_text);
            return (qA?.order_index || 0) - (qB?.order_index || 0);
          });

          setAnswers(results);
        }
      }

      // Fetch rankings
      const { data: participantsData } = await supabase
        .from('participants')
        .select('id, nickname, total_score')
        .eq('session_id', sessionData.sessionId)
        .order('total_score', { ascending: false }) as any;

      if (participantsData) {
        const rankedParticipants = participantsData.map((p, index) => ({
          nickname: p.nickname,
          total_score: p.total_score,
          rank: index + 1
        }));
        setRankings(rankedParticipants);

        const myPosition = rankedParticipants.findIndex(p => p.nickname === sessionData.nickname);
        setMyRank(myPosition + 1);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAgain = async () => {
    await leaveSession();
    navigate('/play');
  };

  const handleGoHome = async () => {
    await leaveSession();
    navigate('/');
  };

  if (isLoading || sessionLoading) {
    return (
      <div className="min-h-screen bg-background cyber-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const correctCount = answers.filter(a => a.is_correct).length;
  const totalScore = sessionData?.totalScore || answers.reduce((sum, a) => sum + a.points_earned, 0);

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

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      </div>

      <header className="relative z-10 border-b-2 border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <Link to="/" className="flex items-center gap-3">
            <BrainLogo size="sm" />
            <span className="font-display text-xl font-bold text-primary text-glow-primary">
              CYBERBRAIN
            </span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-3xl">
        {/* Congratulations Animation for Top 3 */}
        {myRank <= 3 && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center animate-bounce">
                <div className="flex justify-center gap-2 mb-4">
                  {[...Array(6)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-8 h-8 text-yellow-400 animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <div className="flex justify-center gap-4">
                  <Sparkles className="w-12 h-12 text-accent animate-spin" style={{ animationDuration: '3s' }} />
                  <Trophy className="w-16 h-16 text-yellow-500 animate-pulse" />
                  <Sparkles className="w-12 h-12 text-accent animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
                </div>
                <h2 className="font-display text-3xl font-bold text-accent mt-4 animate-pulse">
                  {myRank === 1 ? "CHAMPION!" : myRank === 2 ? "AMAZING!" : "EXCELLENT!"}
                </h2>
              </div>
            </div>
          </div>
        )}

        {/* Trophy/Rank Display */}
        <CyberCard glow={myRank <= 3 ? 'accent' : 'primary'} className="mb-8 text-center">
          <CyberCardContent className="py-8">
            <div className="flex justify-center mb-4">
              {myRank <= 3 ? (
                getRankIcon(myRank)
              ) : (
                <Trophy className="w-12 h-12 text-primary" />
              )}
            </div>
            
            <h1 className="font-display text-2xl uppercase mb-2">
              {myRank === 1 ? "G'olib!" : myRank <= 3 ? "Ajoyib!" : "O'yin Tugadi!"}
            </h1>
            
            <p className="text-muted-foreground font-mono mb-4">
              {sessionData?.nickname}
            </p>

            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <p className={`font-display text-4xl font-bold ${getRankColor(myRank)}`}>
                  #{myRank}
                </p>
                <p className="text-muted-foreground font-mono text-sm">O'rin</p>
              </div>
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-accent">
                  {totalScore}
                </p>
                <p className="text-muted-foreground font-mono text-sm">Ball</p>
              </div>
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-primary">
                  {correctCount}/{answers.length}
                </p>
                <p className="text-muted-foreground font-mono text-sm">To'g'ri</p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <CyberButton onClick={handlePlayAgain} variant="secondary">
                <RotateCcw className="w-4 h-4" />
                Yana O'ynash
              </CyberButton>
              <CyberButton onClick={handleLogout} variant="destructive">
                <Home className="w-4 h-4" />
                O'yindan Chiqish
              </CyberButton>
            </div>
          </CyberCardContent>
        </CyberCard>

        {/* Leaderboard */}
        <CyberCard glow="secondary" className="mb-8">
          <CyberCardHeader>
            <CyberCardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Reyting
            </CyberCardTitle>
          </CyberCardHeader>
          <CyberCardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {rankings.map((entry) => (
                <div className={`flex items-center justify-between p-3 border-2 rounded-lg transition-all duration-300 ${
                    entry.nickname === sessionData?.nickname
                      ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/25'
                      : entry.rank <= 3
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-display text-lg w-8 ${getRankColor(entry.rank)}`}>
                      {entry.rank <= 3 ? getRankIcon(entry.rank) : `#${entry.rank}`}
                    </span>
                    <span className="font-mono">
                      {entry.nickname}
                      {entry.nickname === sessionData?.nickname && (
                        <span className="text-accent ml-2">(Siz)</span>
                      )}
                    </span>
                  </div>
                  <span className="font-display text-lg text-primary">
                    {entry.total_score}
                  </span>
                </div>
              ))}
            </div>
          </CyberCardContent>
        </CyberCard>

        {/* Answer Details */}
        <CyberCard>
          <CyberCardHeader>
            <CyberCardTitle>Javoblar Tafsiloti</CyberCardTitle>
          </CyberCardHeader>
          <CyberCardContent>
            <div className="space-y-4">
              {answers.map((answer, index) => (
                <div key={index} className="border-2 border-border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {answer.is_correct ? (
                        <CheckCircle className="w-5 h-5 text-accent shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive shrink-0" />
                      )}
                      <span className="font-mono text-sm text-muted-foreground">
                        Savol {index + 1}
                      </span>
                    </div>
                    <span className={`font-display ${answer.is_correct ? 'text-accent' : 'text-destructive'}`}>
                      +{answer.points_earned}
                    </span>
                  </div>
                  <p className="font-display text-sm mb-3">{answer.question_text}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className={`p-2 border ${
                      answer.selected_option === answer.correct_option
                        ? 'border-accent bg-accent/10'
                        : 'border-destructive bg-destructive/10'
                    }`}>
                      <span className="text-muted-foreground font-mono text-xs">Sizning javob:</span>
                      <p className="font-mono">{answer.options[answer.selected_option] || '-'}</p>
                    </div>
                    {!answer.is_correct && (
                      <div className="p-2 border border-accent bg-accent/10">
                        <span className="text-muted-foreground font-mono text-xs">To'g'ri javob:</span>
                        <p className="font-mono">{answer.options[answer.correct_option] || '-'}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {answers.length === 0 && (
                <p className="text-center text-muted-foreground font-mono py-8">
                  Javoblar topilmadi
                </p>
              )}
            </div>
          </CyberCardContent>
        </CyberCard>
      </main>
    </div>
  );
};

export default GameResults;