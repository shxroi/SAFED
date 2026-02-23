import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

interface ReportNotePdfInput {
  note: string;
  documentationNames: string[];
}

interface ReportPdfInput {
  operationId: number;
  operationTitle: string;
  generatedAt: Date;
  summary: string;
  recommendation: string;
  notes: ReportNotePdfInput[];
}

const PAGE_MARGIN = 48;
const FONT_SIZE_BODY = 11;
const FONT_SIZE_TITLE = 18;
const LINE_HEIGHT = 16;

const splitLineByWidth = (
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (measure(next) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

export const buildFieldReportPdf = async (
  input: ReportPdfInput,
): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  let page = doc.addPage();
  let { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let cursorY = height - PAGE_MARGIN;

  const addPageIfNeeded = (requiredHeight = LINE_HEIGHT): void => {
    if (cursorY - requiredHeight >= PAGE_MARGIN) return;
    page = doc.addPage();
    const size = page.getSize();
    width = size.width;
    height = size.height;
    cursorY = height - PAGE_MARGIN;
  };

  const drawLine = (
    text: string,
    options?: { bold?: boolean; size?: number; color?: [number, number, number] },
  ): void => {
    const size = options?.size ?? FONT_SIZE_BODY;
    addPageIfNeeded(size + 6);
    page.drawText(text, {
      x: PAGE_MARGIN,
      y: cursorY,
      size,
      font: options?.bold ? boldFont : font,
      color: rgb(options?.color?.[0] ?? 0.1, options?.color?.[1] ?? 0.1, options?.color?.[2] ?? 0.1),
    });
    cursorY -= Math.max(LINE_HEIGHT, size + 4);
  };

  const drawParagraph = (text: string): void => {
    const lines = splitLineByWidth(
      text,
      width - PAGE_MARGIN * 2,
      (value) => font.widthOfTextAtSize(value, FONT_SIZE_BODY),
    );
    for (const line of lines) {
      drawLine(line);
    }
  };

  drawLine("Field Report", { bold: true, size: FONT_SIZE_TITLE, color: [0.05, 0.1, 0.25] });
  drawLine(`Operation ID: ${input.operationId}`);
  drawLine(`Operation: ${input.operationTitle}`);
  drawLine(`Generated At: ${input.generatedAt.toISOString()}`);

  cursorY -= 6;
  drawLine("Summary", { bold: true });
  drawParagraph(input.summary || "-");

  cursorY -= 6;
  drawLine("Recommendation", { bold: true });
  drawParagraph(input.recommendation || "-");

  cursorY -= 6;
  drawLine("Notes", { bold: true });

  if (input.notes.length === 0) {
    drawLine("- No notes");
  } else {
    input.notes.forEach((note, index) => {
      drawLine(`${index + 1}. ${note.note || "-"}`);
      if (note.documentationNames.length === 0) {
        drawLine("   Docs: none");
      } else {
        drawLine(`   Docs: ${note.documentationNames.join(", ")}`);
      }
      cursorY -= 2;
    });
  }

  return doc.save();
};
