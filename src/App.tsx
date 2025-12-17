import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Play from "./pages/Play";
import TeacherLogin from "./pages/teacher/Login";
import TeacherDashboard from "./pages/teacher/Dashboard";
import GameControl from "./pages/teacher/GameControl";
import QuizBlocks from "./pages/teacher/QuizBlocks";
import QuizBlockEdit from "./pages/teacher/QuizBlockEdit";
import StartGame from "./pages/teacher/StartGame";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import GameWaiting from "./pages/game/Waiting";
import GamePlaying from "./pages/game/Playing";
import GameResults from "./pages/game/Results";
import ResultsAnnouncement from "./pages/teacher/ResultsAnnouncement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/play" element={<Play />} />
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/game" element={<GameControl />} />
          <Route path="/teacher/blocks" element={<QuizBlocks />} />
          <Route path="/teacher/blocks/:id" element={<QuizBlockEdit />} />
          <Route path="/teacher/start" element={<StartGame />} />
          <Route path="/teacher/results" element={<ResultsAnnouncement />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/game/waiting" element={<GameWaiting />} />
          <Route path="/game/playing" element={<GamePlaying />} />
          <Route path="/game/results" element={<GameResults />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
