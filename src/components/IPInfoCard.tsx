import { forwardRef } from "react";
import { IPData } from "@/types/ipData";
import { ConfidenceBar } from "./ConfidenceBar";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AlertTriangle, Shield, ExternalLink, Info } from "lucide-react";

interface IPInfoCardProps {
  data: IPData;
}

export const IPInfoCard = forwardRef<HTMLDivElement, IPInfoCardProps>(({ data }, ref) => {
  const getActionBadge = (action: string) => {
    if (action.toLowerCase() === "blocked") {
      return <Badge variant="destructive">BLOCKED</Badge>;
    }
    return <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">ALERTED</Badge>;
  };

  const getScoreStatus = (score: number) => {
    if (score >= 75) return { text: "High Risk", icon: AlertTriangle, class: "text-danger" };
    if (score >= 50) return { text: "Medium Risk", icon: AlertTriangle, class: "text-warning" };
    if (score >= 25) return { text: "Low Risk", icon: Shield, class: "text-primary" };
    return { text: "Clean", icon: Shield, class: "text-success" };
  };

  const status = getScoreStatus(data.AbuseConfidenceScore);

  return (
    <Card ref={ref} className="overflow-hidden border-0 shadow-lg">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <h2 className="text-xl font-semibold text-danger">
          {data.IP} <span className="text-foreground font-normal">was found in our database!</span>
        </h2>
      </div>

      {/* Confidence Section */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            This IP was reported <span className="font-semibold text-foreground">{data.TotalReports.toLocaleString()} times</span>.
            Confidence of Abuse is <span className="font-semibold text-foreground">{data.AbuseConfidenceScore}%</span>:
          </p>
          <button className="rounded-full p-1 hover:bg-muted">
            <Info className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <ConfidenceBar score={data.AbuseConfidenceScore} />
      </div>

      {/* Details */}
      <div className="bg-card px-6 py-4">
        <div className="space-y-3">
          <InfoRow label="ISP" value={data.ISP} />
          <InfoRow label="Usage Type" value={data.UsageType} />
          <InfoRow label="ASN" value={data.ASN} />
          <InfoRow label="Domain Name" value={data.Domain} isLink />
          <InfoRow label="Country" value={`🇮🇩 ${data.Country}`} />
          <InfoRow label="City" value={data.City} />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-muted/50 px-6 py-3">
        <p className="mb-3 text-xs text-muted-foreground italic">
          IP info including ISP, and Location provided by <span className="text-primary font-medium">IPInfo</span>. Updated regularly.
        </p>
        <div className="flex gap-3">
          <Button variant="default" className="flex-1">
            <AlertTriangle className="mr-2 h-4 w-4" />
            REPORT {data.IP}
          </Button>
          <Button variant="secondary" className="flex-1">
            <ExternalLink className="mr-2 h-4 w-4" />
            WHOIS {data.IP}
          </Button>
        </div>
      </div>
    </Card>
  );
});

IPInfoCard.displayName = "IPInfoCard";

function InfoRow({
  label,
  value,
  isLink = false
}: {
  label: string;
  value: string;
  isLink?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <span className="w-32 shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </span>
      {isLink ? (
        <a
          href={`https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className="text-sm text-foreground">{value}</span>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
