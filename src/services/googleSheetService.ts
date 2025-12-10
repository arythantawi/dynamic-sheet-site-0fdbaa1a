import { IPData } from "@/types/ipData";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBFpMLtVE2pJi8aeTRcpon2teV7ToLGIMSnTbxU-o8InMOhRVPmc1_XCt8w4sXMfE0WKIAnodtkUFP/pub?gid=0&single=true&output=csv";

// Multiple proxy options for fallback
const PROXY_URLS = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => url, // Direct fetch as last resort
];

export async function fetchIPData(): Promise<IPData[]> {
  let lastError: Error | null = null;

  for (const proxyFn of PROXY_URLS) {
    try {
      const proxyUrl = proxyFn(SHEET_URL);
      console.log('Trying to fetch from:', proxyUrl.substring(0, 50));

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv,text/plain,*/*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();

      if (!csvText || csvText.length < 10) {
        throw new Error('Empty or invalid response');
      }

      console.log('CSV fetched successfully, length:', csvText.length);

      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('Not enough data lines');
      }

      const data: IPData[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);

        if (values.length < 11) continue;

        const item: IPData = {
          IP: values[0] || '',
          Country: values[1] || '',
          ISP: values[2] || '',
          Domain: values[3] || '',
          AbuseConfidenceScore: parseInt(values[4]) || 0,
          TotalReports: parseInt(values[5]) || 0,
          LastReportedAt: values[6] || '',
          JenisAktivitas: values[8] || '',
          Count: parseInt(values[9]) || 0,
          Action: values[10] || '',
          UsageType: values[11] || '-',
          ASN: values[12] || '-',
          City: values[13] || '-',
        };

        data.push(item);
      }

      console.log('Parsed', data.length, 'IP records');
      return data;

    } catch (error) {
      console.warn('Proxy failed:', error);
      lastError = error as Error;
      continue;
    }
  }

  console.error('All proxies failed:', lastError);
  throw lastError || new Error('Failed to fetch data');
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
