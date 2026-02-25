import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

interface ReportDocumentationPdfInput {
  fileName: string;
  filePath: string;
}

interface ReportNotePdfInput {
  note: string;
  documentations: ReportDocumentationPdfInput[];
}

interface ReportPdfInput {
  operationId: number;
  operationTitle: string;
  operationLocation: string;
  operationDate: Date;
  supervisorName: string;
  generatedAt: Date;
  referenceNumber: string;
  serialNumber: string;
  crewName: string;
  crewSignRequired: boolean;
  notes: ReportNotePdfInput[];
}

const PAGE_MARGIN = 50;
const LINE_HEIGHT = 18;

const toDiskPathFromPublicUploadPath = (
  publicUploadPath: string,
): string | null => {
  if (!publicUploadPath.startsWith("/uploads/")) return null;
  const relativePath = publicUploadPath.replace("/uploads/", "");
  return join(process.cwd(), "public", "uploads", relativePath);
};

const splitLineByWidth = (
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] => {
  const chunks = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (chunks.length === 0) return [""];

  const lines: string[] = [];

  for (const chunk of chunks) {
    const words = chunk.split(/\s+/).filter(Boolean);
    let current = "";

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (measure(next) <= maxWidth) {
        current = next;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }

    if (current) lines.push(current);
  }

  return lines.length ? lines : [""];
};

const formatIndonesianDate = (date: Date): string =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

const attachmentImageFromPublicPath = async (
  doc: PDFDocument,
  publicPath: string,
  targetBox?: {
    width: number;
    height: number;
  },
) => {
  const diskPath = toDiskPathFromPublicUploadPath(publicPath);
  if (!diskPath) return null;

  try {
    const source = await readFile(diskPath);
    const image = sharp(source).rotate();

    if (targetBox) {
      image.resize(targetBox.width, targetBox.height, {
        fit: "cover",
        position: "centre",
      });
    }

    const jpegBuffer = await image
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
    return await doc.embedJpg(jpegBuffer);
  } catch {
    return null;
  }
};

export const buildFieldReportPdf = async (
  input: ReportPdfInput,
): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  const headingFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const sansFont = await doc.embedFont(StandardFonts.Helvetica);
  const serifFont = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBoldFont = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalicFont = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const serifBoldItalicFont = await doc.embedFont(
    StandardFonts.TimesRomanBoldItalic,
  );

  const baseTextColor = rgb(0.08, 0.08, 0.08);

  let logoImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    const logoBuffer = await readFile(
      join(process.cwd(), "app", "assets", "images", "safebox-logo.png"),
    );
    logoImage = await doc.embedPng(logoBuffer);
  } catch {
    // logo not available — fall back to text
  }

  let page = doc.addPage();
  let { width, height } = page.getSize();
  let cursorY = height - PAGE_MARGIN;

  const resetCursorFromNewPage = (): void => {
    page = doc.addPage();
    const pageSize = page.getSize();
    width = pageSize.width;
    height = pageSize.height;
    cursorY = height - PAGE_MARGIN;
  };

  const drawTextLine = (
    text: string,
    options?: {
      x?: number;
      y?: number;
      size?: number;
      center?: boolean;
      bold?: boolean;
      serif?: boolean;
      italic?: boolean;
      color?: ReturnType<typeof rgb>;
    },
  ): void => {
    const size = options?.size ?? 12;
    const isSerif = options?.serif ?? true;
    const isItalic = options?.italic ?? false;
    const font = options?.bold
      ? isSerif
        ? isItalic
          ? serifBoldItalicFont
          : serifBoldFont
        : headingFont
      : isSerif
        ? isItalic
          ? serifItalicFont
          : serifFont
        : sansFont;
    const measured = font.widthOfTextAtSize(text, size);
    const x = options?.center
      ? (width - measured) / 2
      : (options?.x ?? PAGE_MARGIN);
    const y = options?.y ?? cursorY;

    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: options?.color ?? baseTextColor,
    });
  };

  const drawParagraph = (
    text: string,
    options?: {
      size?: number;
      bold?: boolean;
      serif?: boolean;
      indent?: number;
      lineHeight?: number;
      center?: boolean;
      justify?: boolean;
      firstLineIndent?: boolean;
    },
  ): void => {
    const size = options?.size ?? 12;
    const isSerif = options?.serif ?? true;
    const font = options?.bold
      ? isSerif
        ? serifBoldFont
        : headingFont
      : isSerif
        ? serifFont
        : sansFont;
    const lineHeight = options?.lineHeight ?? LINE_HEIGHT;
    const baseX = PAGE_MARGIN + (options?.indent ?? 0);
    const fullMaxWidth = width - PAGE_MARGIN * 2 - (options?.indent ?? 0);
    const FIRST_LINE_INDENT = 28;

    // Build lines: first line uses reduced width if firstLineIndent is set
    let allLines: Array<{ text: string; x: number; maxWidth: number }> = [];

    if (options?.firstLineIndent) {
      const firstMaxWidth = fullMaxWidth - FIRST_LINE_INDENT;
      // Measure how many words fit on line 1
      const firstLineWords: string[] = [];
      const allWords = text.split(/\s+/).filter(Boolean);
      let i = 0;
      let current = "";
      while (i < allWords.length) {
        const next = current ? `${current} ${allWords[i]}` : allWords[i]!;
        if (font.widthOfTextAtSize(next!, size) <= firstMaxWidth) {
          current = next!;
          firstLineWords.push(allWords[i]!);
          i += 1;
        } else {
          break;
        }
      }
      if (firstLineWords.length > 0) {
        allLines.push({
          text: firstLineWords.join(" "),
          x: baseX + FIRST_LINE_INDENT,
          maxWidth: firstMaxWidth,
        });
      }
      // Remaining lines use full width
      const remainingText = allWords.slice(firstLineWords.length).join(" ");
      if (remainingText) {
        const restLines = splitLineByWidth(remainingText, fullMaxWidth, (v) =>
          font.widthOfTextAtSize(v, size),
        );
        for (const l of restLines) {
          allLines.push({ text: l, x: baseX, maxWidth: fullMaxWidth });
        }
      }
    } else {
      const lines = splitLineByWidth(text, fullMaxWidth, (v) =>
        font.widthOfTextAtSize(v, size),
      );
      for (const l of lines) {
        allLines.push({ text: l, x: baseX, maxWidth: fullMaxWidth });
      }
    }

    for (let i = 0; i < allLines.length; i += 1) {
      const { text: line, x, maxWidth } = allLines[i]!;
      const isLastLine = i === allLines.length - 1;
      const words = line.split(" ").filter(Boolean);

      if (options?.justify && !isLastLine && words.length > 1) {
        const totalWordsWidth = words.reduce(
          (sum, word) => sum + font.widthOfTextAtSize(word, size),
          0,
        );
        const spacePerGap = (maxWidth - totalWordsWidth) / (words.length - 1);
        let currentX = x;
        for (const word of words) {
          page.drawText(word, {
            x: currentX,
            y: cursorY,
            size,
            font,
            color: baseTextColor,
          });
          currentX += font.widthOfTextAtSize(word, size) + spacePerGap;
        }
      } else {
        drawTextLine(line, {
          x,
          size,
          bold: options?.bold,
          serif: isSerif,
          center: options?.center,
        });
      }

      cursorY -= lineHeight;
    }
  };

  const drawBrandHeader = (): void => {
    if (logoImage) {
      const logoHeight = 34;
      const logoWidth = (logoImage.width / logoImage.height) * logoHeight;
      page.drawImage(logoImage, {
        x: PAGE_MARGIN,
        y: height - PAGE_MARGIN - logoHeight,
        width: logoWidth,
        height: logoHeight,
      });
    } else {
      drawTextLine("SAFEBOX.", {
        x: PAGE_MARGIN,
        y: height - 55,
        size: 28,
        bold: true,
        serif: false,
        color: rgb(0.07, 0.12, 0.32),
      });
      drawTextLine("Engine Monitoring System", {
        x: PAGE_MARGIN,
        y: height - 70,
        size: 9,
        serif: false,
        color: rgb(0.2, 0.2, 0.2),
      });
    }
  };

  drawBrandHeader();

  const locationDate = `${input.operationLocation}, ${formatIndonesianDate(input.operationDate)}`;
  drawTextLine(locationDate, {
    x: width - PAGE_MARGIN - sansFont.widthOfTextAtSize(locationDate, 11),
    y: height - 100,
    size: 13,
    serif: true,
  });

  cursorY = height - 150;
  const beritaAcara = "BERITA ACARA";
  const beritaAcaraSize = 15;
  const beritaAcaraFont = serifBoldItalicFont;
  drawTextLine(beritaAcara, {
    center: true,
    size: beritaAcaraSize,
    bold: true,
  });
  const beritaAcaraWidth = beritaAcaraFont.widthOfTextAtSize(
    beritaAcara,
    beritaAcaraSize,
  );
  const beritaAcaraX = (width - beritaAcaraWidth) / 2;
  page.drawLine({
    start: { x: beritaAcaraX, y: cursorY },
    end: { x: beritaAcaraX + beritaAcaraWidth, y: cursorY },
    thickness: 1,
    color: baseTextColor,
  });

  cursorY -= 24;

  const subtitle = "INSTALASI ENGINE MONITORING SYSTEM (EMS) SAFEBOX";
  drawTextLine(subtitle, {
    center: true,
    size: 15,
    bold: true,
  });
  const subtitleWidth = serifBoldFont.widthOfTextAtSize(subtitle, 15);
  const subtitleX = (width - subtitleWidth) / 2;
  page.drawLine({
    start: { x: subtitleX, y: cursorY - 2 },
    end: { x: subtitleX + subtitleWidth, y: cursorY - 2 },
    thickness: 1,
    color: baseTextColor,
  });
  cursorY -= 32;

  drawTextLine(`Nomor  : ${input.referenceNumber}`, { size: 13 });
  cursorY -= 20;
  drawTextLine("Perihal: Installation EMS Safebox", { size: 13 });
  cursorY -= 20;
  drawTextLine(`Lampiran: ${input.notes.length}`, { size: 13 });
  cursorY -= 30;

  const intro =
    `Pada tanggal ${formatIndonesianDate(input.operationDate)}, Tim Safebox melaksanakan instalasi modul ` +
    `Engine Monitoring System (EMS) seri M2 [${input.serialNumber}]. Instalasi ini bertujuan untuk ` +
    `memantau kinerja mesin secara real-time serta memastikan keandalan sistem dalam operasional maritim. ` +
    `Selain itu, kegiatan ini merupakan bentuk dukungan Tim Safebox kepada pengguna yang telah berkomitmen ` +
    `dalam misi kami, yaitu Membuat Dunia Maritim Menjadi Lebih Baik, dengan mengusung moto "Keep Your People Trusted".`;

  drawParagraph(intro, {
    size: 12,
    lineHeight: 20,
    justify: true,
    firstLineIndent: true,
  });
  cursorY -= 8;

  drawParagraph(
    `Setelah dilakukan Installation pada modul EMS di kapal ${input.operationTitle}, disimpulkan bahwa:`,
    { size: 12, lineHeight: 20, justify: true, firstLineIndent: true },
  );
  cursorY -= 6;

  const findings = [
    "Modul EMS Safebox dapat berjalan dengan baik.",
    `Pembacaan RPM pada kapal ${input.operationTitle} berjalan baik dan akurat.`,
    `Pembacaan GPS pada kapal ${input.operationTitle} berjalan baik dan akurat.`,
    "Ditambahkannya antena modem outdoor untuk jaringan lebih kuat.",
    "Semua data yang terbaca di EMS dapat dikirimkan ke web panel.safebox.id.",
    `Diberikannya sosialisasi terkait modul dan web kepada kru kapal ${input.operationTitle}.`,
  ];

  for (let index = 0; index < findings.length; index += 1) {
    drawParagraph(`${index + 1}. ${findings[index]}`, {
      size: 12,
      indent: 38,
      lineHeight: 20,
    });
  }

  cursorY -= 8;
  drawParagraph(
    "Demikian laporan ini kami sampaikan dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.",
    { size: 12, lineHeight: 20, justify: true, firstLineIndent: true },
  );
  cursorY -= 20;

  drawTextLine("Mengetahui,", { x: PAGE_MARGIN, size: 12 });
  cursorY -= 24;

  const leftSignX = PAGE_MARGIN;
  const rightSignX = width / 2 + 50;

  if (input.crewSignRequired) {
    // Two-column: Crew (left) + Vendor (right)
    drawTextLine(input.crewName || "Perwakilan Kapal", {
      x: leftSignX,
      size: 12,
    });
    drawTextLine("Vendor", {
      x: rightSignX,
      y: cursorY,
      size: 12,
    });
    cursorY -= 90;

    drawTextLine("(...........................................)", {
      x: leftSignX,
      size: 12,
    });
    drawTextLine("(...........................................)", {
      x: rightSignX,
      y: cursorY,
      size: 12,
    });
    cursorY -= 16;

    drawTextLine("Nahkoda / Perwakilan Kapal", {
      x: leftSignX,
      size: 11,
      italic: true,
      color: rgb(0.3, 0.3, 0.3),
    });
    cursorY -= 20;
  } else {
    // Single column left-aligned: Vendor only
    drawTextLine("Vendor", {
      x: leftSignX,
      size: 13,
    });
    cursorY -= 90;

    drawTextLine("(...........................................)", {
      x: leftSignX,
      size: 12,
    });
    cursorY -= 16;
  }

  if (input.notes.length > 0) {
    resetCursorFromNewPage();
    drawBrandHeader();
    cursorY = height - 110;
    drawTextLine("Lampiran", {
      x: PAGE_MARGIN,
      size: 15,
      bold: true,
      color: rgb(1, 0.141, 0.0),
    });
    cursorY -= 26;

    const contentWidth = width - PAGE_MARGIN * 2;
    const gutter = 12;
    const imageWidth = (contentWidth - gutter) / 2;
    const imageHeight = 210;

    const ensureSpace = (needed: number): void => {
      if (cursorY - needed >= PAGE_MARGIN) return;
      resetCursorFromNewPage();
      drawBrandHeader();
      cursorY = height - 110;
    };

    for (const note of input.notes) {
      const docs = note.documentations;

      if (docs.length === 0) {
        const textLines = splitLineByWidth(note.note, contentWidth, (value) =>
          serifFont.widthOfTextAtSize(value, 13),
        );
        ensureSpace(textLines.length * 20 + 16);
        drawParagraph(note.note, { size: 13, lineHeight: 20 });
        cursorY -= 6;
        continue;
      }

      // Render images in pairs (2 per row), then caption below each pair
      for (let index = 0; index < docs.length; index += 2) {
        const pair = docs.slice(index, index + 2);
        const captionLines = splitLineByWidth(
          note.note,
          contentWidth,
          (value) => serifFont.widthOfTextAtSize(value, 12),
        );
        ensureSpace(imageHeight + captionLines.length * 18 + 20);

        for (let pairIndex = 0; pairIndex < pair.length; pairIndex += 1) {
          const currentDoc = pair[pairIndex]!;
          const embedded = await attachmentImageFromPublicPath(
            doc,
            currentDoc.filePath,
            {
              width: Math.max(1, Math.round(imageWidth * 4)),
              height: Math.max(1, Math.round(imageHeight * 4)),
            },
          );

          const x =
            pair.length === 1
              ? PAGE_MARGIN + (contentWidth - imageWidth) / 2
              : PAGE_MARGIN + pairIndex * (imageWidth + gutter);
          const y = cursorY - imageHeight;

          page.drawRectangle({
            x,
            y,
            width: imageWidth,
            height: imageHeight,
            borderColor: rgb(0.85, 0.85, 0.85),
            borderWidth: 1,
            color: rgb(0.98, 0.98, 0.98),
          });

          if (!embedded) {
            const missingLabel = `${currentDoc.fileName} (image not found)`;
            page.drawText(missingLabel, {
              x:
                x +
                imageWidth / 2 -
                sansFont.widthOfTextAtSize(missingLabel, 9) / 2,
              y: y + imageHeight / 2,
              size: 9,
              font: sansFont,
              color: rgb(0.55, 0.2, 0.2),
            });
          } else {
            page.drawImage(embedded, {
              x,
              y,
              width: imageWidth,
              height: imageHeight,
            });
          }
        }

        cursorY -= imageHeight + 25;

        // Caption centered below the pair
        drawParagraph(note.note, {
          size: 12,
          lineHeight: 18,
          center: true,
        });
        cursorY -= 20;
      }
    }
  }

  return doc.save();
};
