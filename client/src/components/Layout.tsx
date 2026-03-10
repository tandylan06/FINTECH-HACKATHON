import { Link, useLocation } from "wouter";
import { 
  Activity, 
  BarChart2, 
  Globe2, 
  Clock, 
  AlertTriangle, 
  Settings,
  Bell,
  MessageSquare,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast"; // Added Toast hook

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { toast } = useToast(); // Initialize toast

  const navItems = [
    { icon: Activity, label: "Dashboard", path: "/" },
    { icon: Zap, label: "Analysis & Alerts", path: "/analysis" },
    { icon: BarChart2, label: "Themes", path: "/themes" },
    { icon: Globe2, label: "Global Correlation", path: "/correlation" },
    { icon: Clock, label: "Institutional Memory", path: "/memory" },
    { icon: AlertTriangle, label: "Risk Engine", path: "/risk" },
  ];

  return (
    <div className="flex h-screen bg-[#0A1929] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-[#1E3A5F] bg-[#0A1929]/80 backdrop-blur-xl flex flex-col z-20">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#FFB347] to-orange-600 flex items-center justify-center font-bold text-black">
              M
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              MakanSense
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group cursor-pointer ${
                  isActive 
                    ? "bg-[#1E3A5F] text-[#FFB347] font-medium" 
                    : "text-gray-400 hover:text-gray-100 hover:bg-[#1E3A5F]/50"
                }`}>
                  <item.icon className={`w-5 h-5 ${isActive ? "text-[#FFB347]" : "text-gray-400 group-hover:text-gray-100"}`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#1E3A5F]">
          <Link href="/settings">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-400 hover:text-gray-100 hover:bg-[#1E3A5F]/50 transition-colors cursor-pointer">
              <Settings className="w-5 h-5" />
              Settings
            </div>
          </Link>
          <div className="mt-4 flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-full bg-[#1E3A5F] border border-[#FFB347]/30 flex items-center justify-center text-sm">
              AM
            </div>
            <div className="text-sm">
              <div className="font-medium">Asset Manager</div>
              <div className="text-xs text-gray-500">Premium Plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-[#1E3A5F] bg-[#0A1929]/90 backdrop-blur flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-[#FFB347] font-bold tracking-widest text-xs uppercase">MakanSense</span>
            <span className="text-gray-600">·</span>
            <span>Live Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-white hover:bg-[#1E3A5F] relative"
              onClick={() => toast({ title: "Notifications", description: "You have 1 new risk alert regarding US Core CPI." })}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-white hover:bg-[#1E3A5F]"
              onClick={() => toast({ title: "Messages", description: "No new team messages at this time." })}
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}