const { createObjectCsvStringifier } = require('csv-writer');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Stream a CSV file to the HTTP response.
 *
 * @param {Object[]}  data     - array of row objects
 * @param {{ id: string, title: string }[]} columns - column definitions
 * @param {string}    filename - download file name (without extension)
 * @param {import('express').Response} res
 */
function exportCSV(data, columns, filename, res) {
  const csvStringifier = createObjectCsvStringifier({
    header: columns.map((col) => ({ id: col.id, title: col.title })),
  });

  const header = csvStringifier.getHeaderString();
  const records = csvStringifier.stringifyRecords(data);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  res.write(header);
  res.write(records);
  res.end();
}

/**
 * Stream an Excel workbook to the HTTP response.
 *
 * @param {Object[]}  data      - array of row objects
 * @param {{ id: string, title: string, width?: number }[]} columns
 * @param {string}    sheetName
 * @param {string}    filename  - download file name (without extension)
 * @param {import('express').Response} res
 */
async function exportExcel(data, columns, sheetName, filename, res) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Atlas HR Recruitment Portal';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);

  // Define columns
  sheet.columns = columns.map((col) => ({
    header: col.title,
    key: col.id,
    width: col.width || 20,
  }));

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  data.forEach((row) => {
    const values = {};
    columns.forEach((col) => {
      values[col.id] = row[col.id] !== undefined ? row[col.id] : '';
    });
    sheet.addRow(values);
  });

  // Auto-filter on header
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}.xlsx"`
  );

  await workbook.xlsx.write(res);
  res.end();
}

/**
 * Stream a basic PDF table to the HTTP response.
 *
 * @param {Object[]}  data     - array of row objects
 * @param {{ id: string, title: string, width?: number }[]} columns
 * @param {string}    title    - document title
 * @param {string}    filename - download file name (without extension)
 * @param {import('express').Response} res
 */
function exportPDF(data, columns, title, filename, res) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}.pdf"`
  );
  doc.pipe(res);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Title
  doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#666666')
    .text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1);

  // Calculate column widths
  const totalDefinedWidth = columns.reduce((s, c) => s + (c.width || 0), 0);
  const colWidths = columns.map((col) => {
    if (col.width && totalDefinedWidth > 0) {
      return (col.width / totalDefinedWidth) * pageWidth;
    }
    return pageWidth / columns.length;
  });

  const rowHeight = 22;
  const fontSize = 8;
  const headerFontSize = 9;
  let y = doc.y;

  // Draw header row
  function drawHeader() {
    doc.fillColor('#1E3A5F').rect(doc.page.margins.left, y, pageWidth, rowHeight).fill();
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(headerFontSize);

    let x = doc.page.margins.left;
    columns.forEach((col, i) => {
      doc.text(col.title, x + 4, y + 6, {
        width: colWidths[i] - 8,
        height: rowHeight,
        ellipsis: true,
      });
      x += colWidths[i];
    });

    y += rowHeight;
  }

  drawHeader();

  // Draw data rows
  doc.font('Helvetica').fontSize(fontSize);

  data.forEach((row, rowIndex) => {
    // Check for page break
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader();
      doc.font('Helvetica').fontSize(fontSize);
    }

    // Alternating row background
    if (rowIndex % 2 === 0) {
      doc.fillColor('#F3F4F6').rect(doc.page.margins.left, y, pageWidth, rowHeight).fill();
    }

    doc.fillColor('#111827');
    let x = doc.page.margins.left;
    columns.forEach((col, i) => {
      const value = row[col.id] !== undefined && row[col.id] !== null ? String(row[col.id]) : '';
      doc.text(value, x + 4, y + 6, {
        width: colWidths[i] - 8,
        height: rowHeight,
        ellipsis: true,
      });
      x += colWidths[i];
    });

    y += rowHeight;
  });

  // Footer
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(7)
      .fillColor('#999999')
      .text(
        `Page ${i + 1} of ${totalPages}`,
        doc.page.margins.left,
        doc.page.height - 30,
        { align: 'center', width: pageWidth }
      );
  }

  doc.end();
}

module.exports = {
  exportCSV,
  exportExcel,
  exportPDF,
};
