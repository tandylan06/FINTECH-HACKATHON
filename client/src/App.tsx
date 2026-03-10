import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Themes from "@/pages/Themes";
import Correlation from "@/pages/Correlation";
import Memory from "@/pages/Memory";
import Risk from "@/pages/Risk";
import Settings from "@/pages/Settings";
import Analysis from "@/pages/Analysis";
import Layout from "@/components/Layout";
import NewsTicker from "@/components/NewsTicker";

function Router() {
  return (
    <>
      <NewsTicker />
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard}/>
          <Route path="/analysis" component={Analysis}/>
          <Route path="/themes" component={Themes}/>
          <Route path="/correlation" component={Correlation}/>
          <Route path="/memory" component={Memory}/>
          <Route path="/risk" component={Risk}/>
          <Route path="/settings" component={Settings}/>
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
