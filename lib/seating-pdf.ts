type SeatingRow = {
  guestName: string;
  tableNumber: number;
  tableName: string;
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
