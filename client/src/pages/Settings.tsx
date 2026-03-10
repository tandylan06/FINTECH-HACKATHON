import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Shield, User, Globe, Database, Check, Save } from "lucide-react";

const DEFAULTS = {
  name:  "Asset Manager",
  email: "manager@makan-sense.ai",
  role:  "Senior Macro Strategist",
  regions: { northAmerica: true, eurozone: true, emerging: false },
  alerts:  { highHeat: true, causalChain: true, morningBriefing: true },
};

export default function Settings() {
  const [saved,   setSaved]   = useState(false);
  const [profile, setProfile] = useState(DEFAULTS);

  // Load saved settings on mount
  useEffect(() => {
    const stored = localStorage.getItem("makansense_settings");
    if (stored) {
      try { setProfile(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("makansense_settings", JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const setField = (key: string, value: string) =>
    setProfile(p => ({ ...p, [key]: value }));

  const setRegion = (key: string, value: boolean) =>
    setProfile(p => ({ ...p, regions: { ...p.regions, [key]: value } }));

  const setAlert = (key: string, value: boolean) =>
    setProfile(p => ({ ...p, alerts: { ...p.alerts, [key]: value } }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-gray-400 mt-1 text-sm">Manage your platform preferences</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-[#132F4C] border border-[#1E3A5F]">
          <TabsTrigger value="general"       className="data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-[#FFB347]"><User className="w-4 h-4 mr-2" />General</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-[#FFB347]"><Bell className="w-4 h-4 mr-2" />Notifications</TabsTrigger>
          <TabsTrigger value="security"      className="data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-[#FFB347]"><Shield className="w-4 h-4 mr-2" />Security</TabsTrigger>
          <TabsTrigger value="integrations"  className="data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-[#FFB347]"><Database className="w-4 h-4 mr-2" />Data Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card className="bg-[#132F4C] border-[#1E3A5F]">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your name and role appear in AI-generated briefings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={profile.name} onChange={e => setField("name", e.target.value)} className="bg-[#0A1929] border-[#1E3A5F]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" value={profile.email} onChange={e => setField("email", e.target.value)} className="bg-[#0A1929] border-[#1E3A5F]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Professional Role</Label>
                <Input id="role" value={profile.role} onChange={e => setField("role", e.target.value)} className="bg-[#0A1929] border-[#1E3A5F]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#132F4C] border-[#1E3A5F]">
            <CardHeader>
              <CardTitle>Regional Preferences</CardTitle>
              <CardDescription>Controls which regions feed into theme detection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "northAmerica", label: "North America (US/Canada)", sub: "Core market monitoring", color: "text-blue-400" },
                { key: "eurozone",     label: "Eurozone & UK",             sub: "G7 macro coverage",      color: "text-emerald-400" },
                { key: "emerging",     label: "Emerging Markets (Asia/LatAm)", sub: "Extended risk tracking", color: "text-yellow-400" },
              ].map(r => (
                <div key={r.key} className="flex items-center justify-between p-3 rounded-lg bg-[#0A1929]/50 border border-[#1E3A5F]">
                  <div className="flex items-center gap-3">
                    <Globe className={`w-5 h-5 ${r.color}`} />
                    <div>
                      <div className="font-medium text-sm">{r.label}</div>
                      <div className="text-xs text-gray-500">{r.sub}</div>
                    </div>
                  </div>
                  <Switch checked={profile.regions[r.key as keyof typeof profile.regions]} onCheckedChange={v => setRegion(r.key, v)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="bg-[#132F4C] border-[#1E3A5F]">
            <CardHeader>
              <CardTitle>Alert Thresholds</CardTitle>
              <CardDescription>Configure when you want to be notified about theme changes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "highHeat",        label: "High Heat Index Alert",       sub: "Notify when a theme heat index exceeds 80" },
                { key: "causalChain",     label: "Causal Chain Breach",         sub: "Alert on 2nd-order risk transmissions" },
                { key: "morningBriefing", label: "Morning Intelligence Briefing", sub: "Receive daily AI-generated macro summary" },
              ].map(a => (
                <div key={a.key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{a.label}</Label>
                    <p className="text-sm text-gray-500">{a.sub}</p>
                  </div>
                  <Switch checked={profile.alerts[a.key as keyof typeof profile.alerts]} onCheckedChange={v => setAlert(a.key, v)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card className="bg-[#132F4C] border-[#1E3A5F]">
            <CardContent className="py-12 text-center text-gray-500 italic">
              Security settings are managed by your organization's SSO provider.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <Card className="bg-[#132F4C] border-[#1E3A5F]">
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
              <CardDescription>Active data feeds powering MakanSense</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Business News (saurav.tech)",     status: "active",   note: "Top US business headlines" },
                { name: "Yahoo Finance (via CORS proxy)",  status: "active",   note: "OHLCV chart data" },
                { name: "Groq AI (llama-3.3-70b)",         status: "active",   note: "AI analysis & briefings" },
                { name: "Twelve Data",                     status: "fallback", note: "Chart data fallback" },
                { name: "NewsAPI.org",                     status: "legacy",   note: "Legacy feed — upgrade to Pro for direct key" },
              ].map((src, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#0A1929]/50 border border-[#1E3A5F] rounded-lg">
                  <span className="text-sm text-gray-200">{src.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{src.note}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      src.status === "active"   ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" :
                      src.status === "fallback" ? "text-amber-400 bg-amber-500/10 border-amber-500/30" :
                      "text-gray-500 bg-gray-500/10 border-gray-500/30"
                    }`}>{src.status}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t border-[#1E3A5F]">
        <Button variant="ghost" className="text-gray-400 hover:text-white"
          onClick={() => { setProfile(DEFAULTS); localStorage.removeItem("makansense_settings"); }}>
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} className={`font-semibold transition-all ${saved ? "bg-emerald-500 text-white" : "bg-[#FFB347] text-black hover:bg-[#ffba5e]"}`}>
          {saved ? <><Check className="w-4 h-4 mr-2" />Saved!</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
        </Button>
      </div>
    </div>
  );
}