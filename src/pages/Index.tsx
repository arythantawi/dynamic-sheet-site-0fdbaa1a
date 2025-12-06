import { IPDashboard } from "@/components/IPDashboard";
import bankJatimLogo from "@/assets/bank-jatim-logo.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <img src={bankJatimLogo} alt="Bank Jatim" className="h-8 w-auto object-contain" />
            <div>
              <h1 className="text-xl font-bold text-foreground">IP Threat Monitor</h1>
              <p className="text-sm text-muted-foreground">Real-time IP abuse detection dashboard</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <IPDashboard />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Data sourced from Google Sheets • Auto-refreshed on page load
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
