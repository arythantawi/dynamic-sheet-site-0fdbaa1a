import { useEffect, useState, useRef, createRef } from "react";
import html2canvas from "html2canvas";
import { fetchIPData } from "@/services/googleSheetService";
import { IPData } from "@/types/ipData";
import { IPInfoCard } from "./IPInfoCard";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Search, Shield, AlertTriangle, RefreshCw, Download } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

export function IPDashboard() {
  const [data, setData] = useState<IPData[]>([]);
  const [filteredData, setFilteredData] = useState<IPData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "blocked" | "alerted">("all");
  const [downloading, setDownloading] = useState(false);
  const cardRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());

  // Get high risk IPs (score > 75)
  const highRiskIPs = data.filter((d) => d.AbuseConfidenceScore > 75);

  const handleDownloadAll = async () => {
    if (highRiskIPs.length === 0) {
      toast.error("No high risk IPs to download");
      return;
    }

    setDownloading(true);
    toast.info(`Downloading ${highRiskIPs.length} high risk IP reports...`);

    try {
      for (const ip of highRiskIPs) {
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
      toast.success(`Downloaded ${highRiskIPs.length} IP reports`);
    } catch (error) {
      console.error("Failed to download screenshots:", error);
      toast.error("Failed to download some screenshots");
    } finally {
      setDownloading(false);
    }
  };

  // Create refs for high risk IPs
  const getCardRef = (ip: string) => {
    if (!cardRefs.current.has(ip)) {
      cardRefs.current.set(ip, createRef<HTMLDivElement>());
    }
    return cardRefs.current.get(ip)!;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchIPData();
      setData(result);
      setFilteredData(result);
    } catch (err) {
      setError("Failed to load data from Google Sheet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
            disabled={loading || downloading || highRiskIPs.length === 0}
          >
            <Download className={`mr-2 h-4 w-4 ${downloading ? "animate-pulse" : ""}`} />
            Download ({highRiskIPs.length})
          </Button>
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

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
