import { useEffect, useState, useRef, createRef, useCallback } from "react";
import html2canvas from "html2canvas";
import pptxgen from "pptxgenjs";
import { fetchIPData } from "@/services/googleSheetService";
import { IPData } from "@/types/ipData";
import { IPInfoCard } from "./IPInfoCard";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Search, Shield, AlertTriangle, RefreshCw, Download, Pause, Play, FileSliders } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

export function IPDashboard() {
  const [data, setData] = useState<IPData[]>([]);
  const [filteredData, setFilteredData] = useState<IPData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "blocked" | "alerted">("all");
  const [downloading, setDownloading] = useState(false);
  const [generatingPPT, setGeneratingPPT] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const cardRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());

  // Get high risk IPs (score > 75) - unique IPs only
  const highRiskIPs = data.filter((d) => d.AbuseConfidenceScore > 75);
  const uniqueHighRiskIPs = highRiskIPs.filter(
    (item, index, self) => self.findIndex((t) => t.IP === item.IP) === index
  );

  const handleDownloadAll = async () => {
    if (uniqueHighRiskIPs.length === 0) {
      toast.error("No high risk IPs to download");
      return;
    }

    setDownloading(true);
    toast.info(`Downloading ${uniqueHighRiskIPs.length} unique high risk IP reports...`);

    try {
      for (const ip of uniqueHighRiskIPs) {
        const ref = cardRefs.current.get(ip.IP);
        if (ref?.current) {
          const canvas = await html2canvas(ref.current, {
            backgroundColor: "#ffffff",
            scale: 2,
          });

          const link = document.createElement("a");
          link.download = `ip-report-${ip.IP}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();

          // Small delay between downloads
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
      toast.success(`Downloaded ${uniqueHighRiskIPs.length} unique IP reports`);
    } catch (error) {
      console.error("Failed to download screenshots:", error);
      toast.error("Failed to download some screenshots");
    } finally {
      setDownloading(false);
    }
  };

  const handleGeneratePPT = async () => {
    if (uniqueHighRiskIPs.length === 0) {
      toast.error("No high risk IPs to generate PPT");
      return;
    }

    setGeneratingPPT(true);
    toast.info(`Generating PPT with ${uniqueHighRiskIPs.length} unique high risk IPs...`);

    try {
      const pptx = new pptxgen();
      pptx.layout = "LAYOUT_WIDE";
      pptx.title = "IP Threat Report";
      pptx.author = "IP Threat Monitor";

      const CARDS_PER_SLIDE = 6;
      const CARDS_PER_ROW = 3;
      const totalSlides = Math.ceil(uniqueHighRiskIPs.length / CARDS_PER_SLIDE);

      // Capture all screenshots first
      const screenshots: { ip: string; dataUrl: string }[] = [];
      for (const ip of uniqueHighRiskIPs) {
        const ref = cardRefs.current.get(ip.IP);
        if (ref?.current) {
          const canvas = await html2canvas(ref.current, {
            backgroundColor: "#ffffff",
            scale: 1.5,
          });
          screenshots.push({ ip: ip.IP, dataUrl: canvas.toDataURL("image/png") });
        }
      }

      for (let slideIndex = 0; slideIndex < totalSlides; slideIndex++) {
        const slide = pptx.addSlide();
        slide.background = { color: "FFFFFF" };

        // Get screenshots for this slide
        const startIdx = slideIndex * CARDS_PER_SLIDE;
        const endIdx = Math.min(startIdx + CARDS_PER_SLIDE, screenshots.length);
        const slideScreenshots = screenshots.slice(startIdx, endIdx);

        // Card dimensions and positions (4 columns x 2 rows) - larger and proportional
        const cardWidth = 4.3;
        const cardHeight = 3.26;
        const startX = 0.15;
        const startY = 0.15;
        const gapX = 0.15;
        const gapY = 0.15;

        slideScreenshots.forEach((screenshot, idx) => {
          const row = Math.floor(idx / CARDS_PER_ROW);
          const col = idx % CARDS_PER_ROW;
          const x = startX + col * (cardWidth + gapX);
          const y = startY + row * (cardHeight + gapY);

          slide.addImage({
            data: screenshot.dataUrl,
            x,
            y,
            w: cardWidth,
            h: cardHeight,
          });
        });
      }

      // Download the PPT
      const fileName = `IP-Threat-Report-${new Date().toISOString().split("T")[0]}.pptx`;
      await pptx.writeFile({ fileName });
      toast.success(`PPT generated successfully with ${totalSlides} slide(s)`);
    } catch (error) {
      console.error("Failed to generate PPT:", error);
      toast.error("Failed to generate PPT");
    } finally {
      setGeneratingPPT(false);
    }
  };

  // Create refs for high risk IPs
  const getCardRef = (ip: string) => {
    if (!cardRefs.current.has(ip)) {
      cardRefs.current.set(ip, createRef<HTMLDivElement>());
    }
    return cardRefs.current.get(ip)!;
  };

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const result = await fetchIPData();
      setData(result);
      setFilteredData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError("Failed to load data from Google Sheet");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadData(false); // Don't show loading state for auto-refresh
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  useEffect(() => {
    let result = data;

    // Apply search filter
    if (searchQuery) {
      result = result.filter(
        (item) =>
          item.IP.includes(searchQuery) ||
          item.ISP.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.Domain.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply action filter
    if (filter !== "all") {
      result = result.filter(
        (item) => item.Action.toLowerCase() === filter
      );
    }

    setFilteredData(result);
  }, [searchQuery, filter, data]);

  const stats = {
    total: data.length,
    blocked: data.filter((d) => d.Action.toLowerCase() === "blocked").length,
    alerted: data.filter((d) => d.Action.toLowerCase() === "alerted").length,
    highRisk: data.filter((d) => d.AbuseConfidenceScore >= 75).length,
  };

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-danger" />
          <p className="text-lg font-medium text-foreground">{error}</p>
          <Button onClick={loadData} variant="default" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total IPs"
          value={loading ? "-" : stats.total.toString()}
          icon={Shield}
          variant="default"
        />
        <StatCard
          title="Blocked"
          value={loading ? "-" : stats.blocked.toString()}
          icon={AlertTriangle}
          variant="danger"
        />
        <StatCard
          title="Alerted"
          value={loading ? "-" : stats.alerted.toString()}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="High Risk"
          value={loading ? "-" : stats.highRisk.toString()}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by IP, ISP, or Domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Badge
            variant={filter === "all" ? "default" : "outline"}
            className="cursor-pointer px-4 py-2"
            onClick={() => setFilter("all")}
          >
            All
          </Badge>
          <Badge
            variant={filter === "blocked" ? "destructive" : "outline"}
            className="cursor-pointer px-4 py-2"
            onClick={() => setFilter("blocked")}
          >
            Blocked
          </Badge>
          <Badge
            className={`cursor-pointer px-4 py-2 ${filter === "alerted" ? "bg-warning text-warning-foreground hover:bg-warning/90" : ""}`}
            variant={filter === "alerted" ? "default" : "outline"}
            onClick={() => setFilter("alerted")}
          >
            Alerted
          </Badge>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleDownloadAll} 
            disabled={loading || downloading || uniqueHighRiskIPs.length === 0}
          >
            <Download className={`mr-2 h-4 w-4 ${downloading ? "animate-pulse" : ""}`} />
            Download ({uniqueHighRiskIPs.length})
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleGeneratePPT} 
            disabled={loading || generatingPPT || uniqueHighRiskIPs.length === 0}
          >
            <FileSliders className={`mr-2 h-4 w-4 ${generatingPPT ? "animate-pulse" : ""}`} />
            PPT ({uniqueHighRiskIPs.length})
          </Button>
          <Button 
            variant={autoRefresh ? "default" : "outline"} 
            size="icon" 
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? "Auto-refresh ON (10s)" : "Auto-refresh OFF"}
          >
            {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => loadData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Last Updated Info */}
      {lastUpdated && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Last updated: {lastUpdated.toLocaleTimeString('id-ID')}</span>
          {autoRefresh && <span className="text-success">• Auto-refresh active</span>}
        </div>
      )}

      {/* IP Cards Grid */}
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[400px] w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {filteredData.map((item, index) => (
            <IPInfoCard 
              key={`${item.IP}-${index}`} 
              data={item} 
              ref={item.AbuseConfidenceScore > 75 ? getCardRef(item.IP) : undefined}
            />
          ))}
        </div>
      )}

      {!loading && filteredData.length === 0 && (
        <div className="flex min-h-[200px] items-center justify-center">
          <p className="text-muted-foreground">No IP addresses found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  variant: "default" | "danger" | "warning" | "success";
}

function StatCard({ title, value, icon: Icon, variant }: StatCardProps) {
  const variantClasses = {
    default: "bg-card border-border",
    danger: "bg-danger/10 border-danger/20",
    warning: "bg-warning/10 border-warning/20",
    success: "bg-success/10 border-success/20",
  };

  const iconClasses = {
    default: "text-primary",
    danger: "text-danger",
    warning: "text-warning",
    success: "text-success",
  };

  return (
    <div className={`rounded-lg border p-4 ${variantClasses[variant]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${iconClasses[variant]}`} />
      </div>
    </div>
  );
}
