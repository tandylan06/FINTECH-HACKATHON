import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Flame, Activity, TrendingUp, Maximize2, ExternalLink, FileText, Newspaper } from "lucide-react";

interface Theme {
  id: string;
  name: string;
  headline: string;
  description: string;
  url?: string;
  heat: number;
  phase: string;
  category: string;
}

interface HeatAnalysisPanelProps {
  topics: Theme[];
  loading: boolean;
  selectedId?: string;
  onSelect: (theme: Theme) => void;
}

// Frontend Summarizer Utility
function cleanAndSummarize(text: string | undefined): string {
  if (!text) return "No summary available.";
  
  let cleanText = text.replace(/<[^>]*>?/gm, '');
  cleanText = cleanText.replace(/Read more.*/gi, '');
  cleanText = cleanText.replace(/Click here.*/gi, '');
  cleanText = cleanText.trim();

  const sentences = cleanText.match(/[^.!?]+[.!?]+/g);
  
  if (sentences && sentences.length > 0) {
    return sentences.slice(0, 2).join(' ').trim();
  }
  
  return cleanText.length > 150 ? cleanText.substring(0, 150) + '...' : cleanText;
}

export default function HeatAnalysisPanel({ topics, loading, selectedId, onSelect }: HeatAnalysisPanelProps) {
  const [modalTopic, setModalTopic] = useState<Theme | null>(null);

  if (loading) {
    return (
      <Card className="bg-[#132F4C] border-[#1E3A5F]">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2 text-white">
            <Activity className="w-5 h-5 text-[#FFB347] animate-pulse" />
            Active Macro Themes & Heat Index
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-gray-500">
          <span className="animate-pulse">Aggregating live market vectors...</span>
        </CardContent>
      </Card>
    );
  }

  if (!topics || topics.length === 0) return null;

  return (
    <>
      <Card className="bg-[#132F4C] border-[#1E3A5F]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2 text-white">
              <Activity className="w-5 h-5 text-[#FFB347]" />
              Active Macro Themes & Heat Index
            </CardTitle>
            <Badge variant="outline" className="border-red-500/50 text-red-400 bg-red-500/10 hidden sm:flex">
              <Flame className="w-3 h-3 mr-1" /> HIGH VOLATILITY
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {topics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => {
                  onSelect(topic); 
                  setModalTopic(topic); 
                }}
                className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-200 group flex flex-col justify-between min-h-[100px] ${
                  selectedId === topic.id
                    ? "bg-[#1E3A5F] border-[#FFB347]/50 shadow-[0_0_15px_rgba(255,179,71,0.15)]"
                    : "bg-[#0A1929]/60 border-[#1E3A5F] hover:border-[#2D5A88] hover:bg-[#132F4C]"
                }`}
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  {/* CHANGED: Inverted the colors! Base is white, hover is yellow */}
                  <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight group-hover:text-[#FFB347] transition-colors">
                    {topic.name}
                  </h3>
                  <Flame className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${topic.heat > 80 ? 'text-red-500' : 'text-[#FFB347]'}`} />
                </div>
                {/* Heat progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Heat Index</span>
                    <span className={`text-[10px] font-mono font-bold ${topic.heat > 80 ? 'text-red-400' : topic.heat > 65 ? 'text-amber-400' : 'text-emerald-400'}`}>{topic.heat}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0A1929] rounded-full overflow-hidden border border-[#1E3A5F]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${topic.heat > 80 ? 'bg-gradient-to-r from-orange-500 to-red-500' : topic.heat > 65 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                      style={{ width: `${topic.heat}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#1E3A5F]/50">
                  <span className="text-[10px] text-gray-500 font-mono uppercase truncate max-w-[90px]" title={topic.category}>
                    {topic.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-[9px] h-4 px-1 py-0 ${
                        topic.phase === 'burst' 
                          ? 'border-red-500/30 text-red-400 bg-red-500/10' 
                          : 'border-[#FFB347]/30 text-[#FFB347] bg-[#FFB347]/10'
                      }`}
                    >
                      <TrendingUp className="w-2 h-2 mr-1" />
                      {topic.phase}
                    </Badge>
                    <Maximize2 className="w-3.5 h-3.5 text-gray-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!modalTopic} onOpenChange={(isOpen) => !isOpen && setModalTopic(null)}>
        <DialogContent className="bg-[#0A1929] text-white border-[#1E3A5F] w-[95vw] sm:max-w-[700px] max-h-[85vh] overflow-y-auto shadow-[0_0_40px_rgba(0,0,0,0.5)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1E3A5F] hover:[&::-webkit-scrollbar-thumb]:bg-[#2D5A88] [&::-webkit-scrollbar-thumb]:rounded-full">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-xl md:text-2xl font-bold leading-tight pr-6">
              {modalTopic?.name}
            </DialogTitle>
            
            <DialogDescription asChild>
              <div className="space-y-5 mt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-[#132F4C] px-3 py-1.5 rounded border border-[#1E3A5F] min-w-[160px]">
                    <Flame className={`w-4 h-4 shrink-0 ${modalTopic?.heat && modalTopic.heat > 80 ? 'text-red-500' : 'text-[#FFB347]'}`} />
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[10px] text-gray-400 font-bold">Heat Index</span>
                        <span className={`text-[10px] font-mono font-bold ${modalTopic?.heat && modalTopic.heat > 80 ? 'text-red-400' : modalTopic?.heat && modalTopic.heat > 65 ? 'text-amber-400' : 'text-emerald-400'}`}>{modalTopic?.heat}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#0A1929] rounded-full overflow-hidden border border-[#1E3A5F]">
                        <div
                          className={`h-full rounded-full ${modalTopic?.heat && modalTopic.heat > 80 ? 'bg-gradient-to-r from-orange-500 to-red-500' : modalTopic?.heat && modalTopic.heat > 65 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                          style={{ width: `${modalTopic?.heat ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-sm px-3 py-1.5 ${
                      modalTopic?.phase === 'burst' 
                        ? 'border-red-500/30 text-red-400 bg-red-500/10' 
                        : 'border-[#FFB347]/30 text-[#FFB347] bg-[#FFB347]/10'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Phase: {modalTopic?.phase?.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="border-[#1E3A5F] text-gray-300 text-sm px-3 py-1.5 bg-[#0A1929]">
                    Source: {modalTopic?.category}
                  </Badge>
                </div>

                <div className="bg-[#0A1929] border border-[#1E3A5F] p-4 rounded-lg flex gap-3 items-start">
                  <Newspaper className="w-5 h-5 text-[#FFB347] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Primary Market Driver</h4>
                    <p className="text-sm text-gray-200 font-medium leading-snug">{modalTopic?.headline}</p>
                  </div>
                </div>
                
                <div className="bg-[#132F4C]/40 border border-[#1E3A5F] p-6 rounded-lg border-l-4 border-l-[#FFB347]">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-[#FFB347]" />
                    <h4 className="text-xs text-[#FFB347] uppercase font-bold tracking-wider">Executive Summary</h4>
                  </div>
                  <p className="text-base text-gray-200 leading-relaxed font-medium">
                    {cleanAndSummarize(modalTopic?.description)}
                  </p>
                </div>

                {modalTopic?.url && (
                  <div className="flex justify-end pt-2">
                    <Button 
                      onClick={() => window.open(modalTopic.url, '_blank')}
                      className="bg-[#1E3A5F] hover:bg-[#2D5A88] text-white border border-[#2D5A88]"
                    >
                      Read Source Article <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}