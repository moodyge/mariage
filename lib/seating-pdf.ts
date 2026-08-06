type SeatingRow = {
  guestName: string;
  tableNumber: number;
  tableName: string;
};

export type TablePdfCard = {
  tableNumber: number;
  tableName: string;
  motto: string;
  capacity: number;
  guests: Array<{ name: string; age: string }>;
};

function ascii(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("œ", "oe")
    .replaceAll("Œ", "OE")
    .replaceAll("’", "'")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replace(/[^\x20-\x7E]/g, "?");
}

function pdfText(value: string) {
  const degreeToken = "__PDF_DEGREE__";
  return ascii(value.replaceAll("°", degreeToken))
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll(degreeToken, "\\260");
}

function shorten(value: string, max: number) {
  const clean = ascii(value);
  return clean.length <= max ? clean : clean.slice(0, Math.max(0, max - 3)).trimEnd() + "...";
}

function text(font: "F1" | "F2", size: number, x: number, y: number, value: string) {
  return `BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfText(value)}) Tj ET\n`;
}

function pageContent(rows: SeatingRow[], page: number, totalPages: number) {
  let content = "0.12 0.25 0.21 rg\n";
  content += text("F2", 19, 46, 790, "Place Parfaite");
  content += text("F1", 10, 46, 770, "Liste alphabetique du plan de table");
  content += text("F1", 8, 46, 754, "Le numero indique la table, jamais son emplacement dans la salle.");
  content += "0.93 0.96 0.94 rg 42 716 511 25 re f\n0.12 0.25 0.21 rg\n";
  content += text("F2", 9, 50, 725, "Invite");
  content += text("F2", 9, 350, 725, "N° de table");
  content += text("F2", 9, 432, 725, "Nom de table");
  let y = 704;
  rows.forEach((row, index) => {
    if (index % 2 === 1) content += `0.975 0.98 0.976 rg 42 ${y - 6} 511 20 re f\n0.12 0.25 0.21 rg\n`;
    content += text("F1", 9, 50, y, shorten(row.guestName, 48));
    content += text("F2", 9, 390, y, String(row.tableNumber));
    content += text("F1", 9, 432, y, shorten(row.tableName, 22));
    content += `0.88 0.9 0.89 RG 42 ${y - 8} m 553 ${y - 8} l S\n0.12 0.25 0.21 rg\n`;
    y -= 22;
  });
  content += text("F1", 8, 46, 28, `Page ${page} / ${totalPages}`);
  content += text("F1", 8, 450, 28, "Place Parfaite");
  return content;
}

export function createSeatingPdf(rows: SeatingRow[]) {
  const perPage = 29;
  const pages = Array.from({ length: Math.max(1, Math.ceil(rows.length / perPage)) }, (_, index) =>
    rows.slice(index * perPage, (index + 1) * perPage),
  );
  const objects: string[] = [];
  const pageRefs = pages.map((_, index) => 5 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageRefs.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((rowsOnPage, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    const stream = pageContent(rowsOnPage, index + 1, pages.length);
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}endstream`;
  });
  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "ascii")];
  const offsets = [0];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    chunks.push(Buffer.from(`${id} 0 obj\n${objects[id]}\nendobj\n`, "ascii"));
  }
  const xrefOffset = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, "ascii"));
  return Buffer.concat(chunks);
}

function circle(cx: number, cy: number, radius: number) {
  const c = radius * 0.5522847498;
  return `${cx + radius} ${cy} m ${cx + radius} ${cy + c} ${cx + c} ${cy + radius} ${cx} ${cy + radius} c ${cx - c} ${cy + radius} ${cx - radius} ${cy + c} ${cx - radius} ${cy} c ${cx - radius} ${cy - c} ${cx - c} ${cy - radius} ${cx} ${cy - radius} c ${cx + c} ${cy - radius} ${cx + radius} ${cy - c} ${cx + radius} ${cy} c`;
}

function initials(name: string) {
  return ascii(name).replace(/^(M|Mme|Mlle)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 3).map(part => part[0]?.toUpperCase()).join("");
}

function tableCard(card: TablePdfCard, x: number, y: number, width: number, height: number) {
  const green = "0.12 0.25 0.21";
  let content = `0.82 0.86 0.83 RG 0.8 w ${x} ${y} ${width} ${height} re S\n`;
  content += `0.93 0.96 0.94 rg ${x} ${y + height - 76} ${width} 76 re f\n${green} rg\n`;
  content += text("F2", 8, x + 18, y + height - 24, card.tableNumber === 0 ? "TABLE 0 - TABLE DES MARIES" : `TABLE ${card.tableNumber}`);
  content += text("F2", 17, x + 18, y + height - 48, shorten(card.tableName, 32));
  content += text("F1", 8, x + 18, y + height - 65, `<< ${shorten(card.motto, 55)} >>`);
  content += `0.82 0.88 0.84 RG ${circle(x + width - 34, y + height - 36, 21)} S\n${green} rg\n`;
  content += text("F2", 11, x + width - 47, y + height - 40, `${card.guests.length}/${card.capacity}`);
  const colWidth = (width - 46) / 2;
  card.guests.slice(0, 10).forEach((guest, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const seatX = x + 14 + col * (colWidth + 8);
    const seatY = y + height - 112 - row * 41;
    content += `0.88 0.9 0.89 RG 0.6 w ${seatX} ${seatY - 21} ${colWidth} 34 re S\n`;
    content += `0.88 0.93 0.9 rg ${circle(seatX + 17, seatY - 4, 12)} f\n${green} rg\n`;
    content += text("F2", 7, seatX + 9, seatY - 7, shorten(initials(guest.name), 4));
    content += text("F2", 8, seatX + 34, seatY + 1, shorten(guest.name, 27));
    content += text("F1", 7, seatX + 34, seatY - 12, shorten(guest.age || "Age non renseigne", 27));
  });
  if (card.guests.length > 10) content += text("F1", 7, x + 18, y + 10, `+ ${card.guests.length - 10} autre(s) invite(s)`);
  return content;
}

function tablePlanPage(cards: TablePdfCard[], page: number, totalPages: number) {
  let content = "0.12 0.25 0.21 rg\n";
  content += text("F2", 20, 38, 558, "Place Parfaite");
  content += text("F1", 10, 38, 540, "Plan de table par table");
  const positions = [{ x: 38, y: 52 }, { x: 430, y: 52 }];
  cards.forEach((card, index) => { content += tableCard(card, positions[index].x, positions[index].y, 374, 462); });
  content += text("F1", 7, 365, 17, `Page ${page} / ${totalPages}`);
  return content;
}

function tableListPage(cards: TablePdfCard[], page: number, totalPages: number) {
  const pageWidth = 842;
  const margin = 34;
  const gap = 18;
  const columnWidth = (pageWidth - margin * 2 - gap * 2) / 3;
  const columns = [542, 542, 542];
  let content = "0.10 0.10 0.10 rg\n";
  content += text("F2", 17, margin, 570, "Plan de table - liste par table");
  content += text("F1", 8, 688, 571, `Page ${page} / ${totalPages}`);
  content += `0.78 0.78 0.78 RG ${margin} 558 m ${pageWidth - margin} 558 l S\n`;

  for (const card of cards) {
    const blockHeight = 25 + card.guests.length * 10;
    const column = columns.indexOf(Math.max(...columns));
    const x = margin + column * (columnWidth + gap);
    const top = columns[column];
    const tableLabel = `TABLE ${card.tableNumber}`;
    content += `0.94 0.94 0.94 rg ${x} ${top - 14} ${columnWidth} 18 re f\n0.10 0.10 0.10 rg\n`;
    content += text("F2", 8, x + 6, top - 8, tableLabel);
    content += text("F2", 9, x + 92, top - 8, shorten(card.tableName, 29));
    let guestY = top - 27;
    card.guests.forEach((guest, index) => {
      content += text("F1", 7.5, x + 8, guestY, `${index + 1}. ${shorten(guest.name, 39)}`);
      guestY -= 10;
    });
    content += `0.86 0.86 0.86 RG ${x} ${top - blockHeight + 2} m ${x + columnWidth} ${top - blockHeight + 2} l S\n`;
    columns[column] -= blockHeight + 8;
  }
  return content;
}

export function createTablesPdf(cards: TablePdfCard[]) {
  const pages = Array.from({ length: Math.max(1, Math.ceil(cards.length / 13)) }, (_, index) => cards.slice(index * 13, (index + 1) * 13));
  const objects: string[] = [];
  const pageRefs = pages.map((_, index) => 5 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageRefs.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((cardsOnPage, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    const stream = tableListPage(cardsOnPage, index + 1, pages.length);
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}endstream`;
  });
  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "ascii")];
  const offsets = [0];
  for (let id = 1; id < objects.length; id++) { offsets[id] = chunks.reduce((sum, chunk) => sum + chunk.length, 0); chunks.push(Buffer.from(`${id} 0 obj\n${objects[id]}\nendobj\n`, "ascii")); }
  const xrefOffset = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, "ascii"));
  return Buffer.concat(chunks);
}
