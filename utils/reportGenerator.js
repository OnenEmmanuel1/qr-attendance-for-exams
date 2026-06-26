const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function generatePDFReport(records, examInfo, filePath) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Title
        doc.fontSize(18).font('Helvetica-Bold').text('Attendance Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(`Course: ${examInfo.course_code} - ${examInfo.course_title}`, { align: 'center' });
        doc.text(`Date: ${examInfo.exam_date} | Venue: ${examInfo.venue}`, { align: 'center' });
        doc.moveDown();

        // Summary
        const present = records.filter(r => r.status === 'present').length;
        const absent = records.filter(r => r.status === 'absent').length;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(`Total: ${records.length} | Present: ${present} | Absent: ${absent} | Rate: ${records.length > 0 ? Math.round(present / records.length * 100) : 0}%`);
        doc.moveDown();

        // Table Header
        const tableTop = doc.y;
        const col = { num: 50, name: 80, matric: 250, dept: 340, status: 430, time: 490 };
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('#', col.num, tableTop);
        doc.text('Name', col.name, tableTop);
        doc.text('Matric No.', col.matric, tableTop);
        doc.text('Department', col.dept, tableTop);
        doc.text('Status', col.status, tableTop);
        doc.text('Time', col.time, tableTop);
        doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

        // Table Rows
        let y = tableTop + 25;
        doc.font('Helvetica').fontSize(9);
        records.forEach((r, i) => {
            if (y > 700) { doc.addPage(); y = 50; }
            doc.text(i + 1, col.num, y);
            doc.text(`${r.first_name} ${r.last_name}`, col.name, y);
            doc.text(r.matric_number || '', col.matric, y);
            doc.text(r.department_name || '', col.dept, y);
            doc.text(r.status || '', col.status, y);
            doc.text(r.scanned_at ? new Date(r.scanned_at).toLocaleTimeString() : '—', col.time, y);
            y += 18;
        });

        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
    });
}

async function generateExcelReport(records, examInfo, filePath) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance Report');

    // Header
    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = `Attendance Report - ${examInfo.course_code} - ${examInfo.course_title}`;
    sheet.getCell('A1').font = { size: 14, bold: true };

    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = `Date: ${examInfo.exam_date} | Venue: ${examInfo.venue}`;

    // Column headers
    sheet.getRow(4).values = ['#', 'Student Name', 'Matric Number', 'Department', 'Status', 'Scanned At'];
    sheet.getRow(4).font = { bold: true };
    sheet.columns = [
        { width: 5 }, { width: 25 }, { width: 18 }, { width: 20 }, { width: 12 }, { width: 20 }
    ];

    // Data
    records.forEach((r, i) => {
        sheet.getRow(i + 5).values = [
            i + 1,
            `${r.first_name} ${r.last_name}`,
            r.matric_number || '',
            r.department_name || '',
            r.status || '',
            r.scanned_at ? new Date(r.scanned_at).toLocaleString() : '—'
        ];
    });

    await workbook.xlsx.writeFile(filePath);
}

module.exports = { generatePDFReport, generateExcelReport };
