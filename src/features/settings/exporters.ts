import { ExportSnapshot } from '@/types';

type ReportLineVariant = 'title' | 'meta' | 'heading' | 'body' | 'spacer';

interface ReportLine {
  text: string;
  variant: ReportLineVariant;
}

interface PdfInstruction {
  text: string;
  x: number;
  y: number;
  font: 'F1' | 'F2';
  size: number;
}

const FILE_STAMP_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function formatDisplayTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFileStamp(value: Date) {
  return FILE_STAMP_FORMATTER.format(value).replace(/[/:,\s]+/g, '-');
}

function formatMetric(value: number, suffix: string) {
  const normalized = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return `${normalized}${suffix}`;
}

function buildReportLines(snapshot: ExportSnapshot): ReportLine[] {
  const batteryLookup = new Map(snapshot.batteries.map((battery) => [battery.id, battery.name]));
  const checkedIn = snapshot.batteries.filter((battery) => battery.status === 'Checked In').length;
  const checkedOut = snapshot.batteries.length - checkedIn;
  const healthCounts = snapshot.batteries.reduce<Record<string, number>>((acc, b) => {
    acc[b.health] = (acc[b.health] ?? 0) + 1;
    return acc;
  }, {});
  const fleetHealth = snapshot.batteries.length === 0
    ? 'N/A'
    : (healthCounts['bad'] ?? 0) > 0 ? 'Bad'
    : (healthCounts['fair'] ?? 0) > 0 ? 'Fair'
    : 'Good';

  const lines: ReportLine[] = [
    { text: 'VoltTrack Battery Report', variant: 'title' },
    { text: `Generated: ${formatDisplayTimestamp(snapshot.exportedAt)}`, variant: 'meta' },
    { text: `Database entries: ${snapshot.batteries.length} batteries, ${snapshot.logs.length} log records`, variant: 'meta' },
    { text: '', variant: 'spacer' },
    { text: 'Summary', variant: 'heading' },
    { text: `Total batteries: ${snapshot.batteries.length}`, variant: 'body' },
    { text: `Checked in: ${checkedIn}`, variant: 'body' },
    { text: `Checked out: ${checkedOut}`, variant: 'body' },
    { text: `Fleet health: ${fleetHealth}`, variant: 'body' },
    { text: '', variant: 'spacer' },
    { text: 'Inventory', variant: 'heading' },
  ];

  if (snapshot.batteries.length === 0) {
    lines.push({ text: 'No batteries found in the database.', variant: 'body' });
  } else {
    snapshot.batteries.forEach((battery, index) => {
      lines.push({ text: `${index + 1}. ${battery.name}`, variant: 'body' });
      lines.push({ text: `   ID: ${battery.id}`, variant: 'body' });
      lines.push({ text: `   Status: ${battery.status}`, variant: 'body' });
      lines.push({ text: `   Voltage: ${formatMetric(battery.currentVoltage, ' V')}`, variant: 'body' });
      lines.push({ text: `   Resistance: ${formatMetric(battery.resistance, ' mOhm')}`, variant: 'body' });
      lines.push({ text: `   Charge: ${battery.chargeLevel}%`, variant: 'body' });
      lines.push({ text: `   Health: ${battery.health.charAt(0).toUpperCase()}${battery.health.slice(1)}`, variant: 'body' });
      lines.push({ text: `   Last updated: ${formatDisplayTimestamp(battery.lastUpdated)}`, variant: 'body' });
      lines.push({ text: '', variant: 'spacer' });
    });
  }

  lines.push({ text: 'Activity Log', variant: 'heading' });
  if (snapshot.logs.length === 0) {
    lines.push({ text: 'No battery activity has been recorded yet.', variant: 'body' });
  } else {
    snapshot.logs.forEach((log) => {
      const batteryName = batteryLookup.get(log.batteryId) ?? log.batteryId;
      lines.push({
        text: `${formatDisplayTimestamp(log.timestamp)} | ${log.type.toUpperCase()} | ${batteryName} | ${formatMetric(log.voltage, ' V')} | ${formatMetric(log.resistance, ' mOhm')} | ${log.chargeLevel}%`,
        variant: 'body',
      });
    });
  }

  return lines;
}

export function buildExportFileName(kind: 'backup' | 'report', extension: 'db' | 'txt' | 'pdf') {
  const stamp = formatFileStamp(new Date());
  return `volttrack-${kind}-${stamp}.${extension}`;
}

export function buildTextReport(snapshot: ExportSnapshot) {
  return buildReportLines(snapshot).map((line) => line.text).join('\n');
}

function wrapText(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return [text];
  }

  const words = text.split(' ');
  const wrapped: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maxChars) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      wrapped.push(currentLine);
    }

    if (word.length <= maxChars) {
      currentLine = word;
      return;
    }

    let remaining = word;
    while (remaining.length > maxChars) {
      wrapped.push(remaining.slice(0, maxChars));
      remaining = remaining.slice(maxChars);
    }
    currentLine = remaining;
  });

  if (currentLine) {
    wrapped.push(currentLine);
  }

  return wrapped;
}

function escapePdfText(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function createPdfPages(snapshot: ExportSnapshot) {
  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 48;
  const marginTop = 52;
  const marginBottom = 40;
  const usableWidth = pageWidth - (marginX * 2);
  const pages: PdfInstruction[][] = [[]];
  let currentPage = pages[0];
  let y = pageHeight - marginTop;

  const lineStyle = (variant: ReportLineVariant) => {
    switch (variant) {
      case 'title':
        return { font: 'F2' as const, size: 20, lineHeight: 28 };
      case 'heading':
        return { font: 'F2' as const, size: 12, lineHeight: 18 };
      case 'meta':
        return { font: 'F1' as const, size: 10, lineHeight: 14 };
      case 'body':
        return { font: 'F1' as const, size: 10, lineHeight: 14 };
      default:
        return { font: 'F1' as const, size: 10, lineHeight: 10 };
    }
  };

  const newPage = () => {
    currentPage = [];
    pages.push(currentPage);
    y = pageHeight - marginTop;
  };

  buildReportLines(snapshot).forEach((line) => {
    if (line.variant === 'spacer') {
      if (y - 10 < marginBottom) {
        newPage();
      } else {
        y -= 10;
      }
      return;
    }

    const style = lineStyle(line.variant);
    const maxChars = Math.max(24, Math.floor(usableWidth / (style.size * 0.6)));
    const parts = wrapText(line.text, maxChars);

    parts.forEach((part) => {
      if (y - style.lineHeight < marginBottom) {
        newPage();
      }

      currentPage.push({
        text: part,
        x: marginX,
        y,
        font: style.font,
        size: style.size,
      });
      y -= style.lineHeight;
    });
  });

  return pages.map((page, index) => {
    const footerText = `Page ${index + 1} of ${pages.length}`;
    return [
      ...page,
      {
        text: footerText,
        x: pageWidth - marginX - (footerText.length * 6),
        y: 22,
        font: 'F1' as const,
        size: 9,
      },
    ];
  });
}

export function buildPdfReport(snapshot: ExportSnapshot) {
  const pages = createPdfPages(snapshot);
  const objects: string[] = [];

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Count 0 /Kids [] >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>';

  let nextObjectId = 5;
  const pageIds: number[] = [];

  pages.forEach((page) => {
    const stream = [
      'BT',
      ...page.map((instruction) => (
        `/${instruction.font} ${instruction.size} Tf 1 0 0 1 ${instruction.x} ${instruction.y} Tm (${escapePdfText(instruction.text)}) Tj`
      )),
      'ET',
    ].join('\n');

    const contentObjectId = nextObjectId;
    objects[contentObjectId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    nextObjectId += 1;

    const pageObjectId = nextObjectId;
    objects[pageObjectId] = [
      '<< /Type /Page',
      '/Parent 2 0 R',
      '/MediaBox [0 0 612 792]',
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >>`,
      `/Contents ${contentObjectId} 0 R`,
      '>>',
    ].join('\n');
    pageIds.push(pageObjectId);
    nextObjectId += 1;
  });

  objects[2] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((pageId) => `${pageId} 0 R`).join(' ')}] >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
