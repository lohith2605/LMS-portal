const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Format a Date instance or date string to a clean, formal readable string.
 * e.g., "November 5, 2026"
 */
const formatFormalDate = (dateVal) => {
  if (!dateVal) return 'Recently Issued';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return 'Recently Issued';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Generate a professional, high-resolution Landscape A4 PDF certificate buffer.
 *
 * @param {Object} certificateData
 * @param {string} certificateData.certificateId - e.g. "LS-2026-A1B2-C3D4"
 * @param {string} certificateData.studentName - Full name of the student
 * @param {string} certificateData.courseTitle - Title of the completed course
 * @param {string} [certificateData.instructorName] - Course instructor or academic lead
 * @param {string|Date} [certificateData.completionDate] - Date of course completion
 * @param {number} [certificateData.finalGrade] - Final evaluation grade (0-100)
 * @param {string} [certificateData.category] - Course category / domain
 * @param {string} [certificateData.clientBaseUrl] - Base URL for public verification link
 * @returns {Promise<Buffer>} Resolves with binary PDF Buffer
 */
const generateCertificatePdf = async ({
  certificateId,
  studentName,
  courseTitle,
  instructorName = 'LearnSpace Educator',
  completionDate = new Date(),
  finalGrade = 100,
  category = 'Specialization',
  clientBaseUrl,
}) => {
  const formattedDate = formatFormalDate(completionDate);
  const safeStudentName = (studentName || 'Verified Learner').trim();
  const safeCourseTitle = (courseTitle || 'Course of Study').trim();
  const safeInstructor = (instructorName || 'LearnSpace Educator').trim();
  const safeId = (certificateId || 'LS-CREDENTIAL').toUpperCase().trim();

  const baseUrl = (clientBaseUrl || process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5174')
    .toString()
    .trim()
    .replace(/\/+$/, '');
  const verificationUrl = `${baseUrl}/verify/${safeId}`;

  // Generate QR code buffer for credential authentication
  let qrBuffer = null;
  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      margin: 1,
      color: {
        dark: '#1E3A8A',
        light: '#FFFFFF',
      },
      width: 140,
    });
    const base64Data = qrDataUrl.split(',')[1];
    if (base64Data) {
      qrBuffer = Buffer.from(base64Data, 'base64');
    }
  } catch (_qrErr) {
    qrBuffer = null;
  }

  return new Promise((resolve, reject) => {
    // Landscape A4: 841.89 x 595.28 points
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 0,
      info: {
        Title: `LearnSpace Certificate - ${safeStudentName} - ${safeCourseTitle}`,
        Author: 'LearnSpace Academy',
        Subject: 'Certificate of Course Completion',
        Keywords: 'LearnSpace, Certificate, Completion, Education, Verified Credential',
      },
    });

    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    const width = doc.page.width;   // ~841.89
    const height = doc.page.height; // ~595.28

    // 1. Pristine Parchment Background
    doc.rect(0, 0, width, height).fill('#FCFDFE');

    // 2. Subtle Accent Corner Motifs
    // Top-left and bottom-right decorative geometric bands
    doc.save();
    doc.rect(0, 0, 10, height).fill('#1E3A8A');
    doc.rect(10, 0, 4, height).fill('#D97706');
    doc.restore();

    // 3. Double Framing Borders
    // Outer Deep Navy Border
    doc.rect(26, 20, width - 46, height - 40)
      .lineWidth(2.5)
      .stroke('#1E3A8A');

    // Inner Warm Gold Accent Border
    doc.rect(32, 26, width - 58, height - 52)
      .lineWidth(0.85)
      .stroke('#D97706');

    // Subtle Corner Diamond Accents
    const drawDiamond = (cx, cy, r = 4) => {
      doc.polygon([cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]).fill('#D97706');
    };
    drawDiamond(32, 26);
    drawDiamond(width - 26, 26);
    drawDiamond(32, height - 26);
    drawDiamond(width - 26, height - 26);

    // 4. Header: Brand & Eyebrow
    doc.fillColor('#1E3A8A')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('LEARNSPACE ACADEMY', 32, 48, {
        align: 'center',
        characterSpacing: 3,
      });

    doc.fillColor('#D97706')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('OFFICIAL CREDENTIAL OF ACADEMIC COMPLETION', 32, 70, {
        align: 'center',
        characterSpacing: 2,
      });

    // 5. Grand Title
    doc.fillColor('#0F172A')
      .font('Helvetica-Bold')
      .fontSize(27)
      .text('CERTIFICATE OF COMPLETION', 32, 96, {
        align: 'center',
        characterSpacing: 1.5,
      });

    // Subtle divider below title
    const lineY = 135;
    doc.moveTo(width / 2 - 140, lineY)
      .lineTo(width / 2 + 140, lineY)
      .lineWidth(0.75)
      .stroke('#CBD5E1');

    drawDiamond(width / 2, lineY, 3);

    // 6. Presentation Statement
    doc.fillColor('#64748B')
      .font('Helvetica')
      .fontSize(11)
      .text('THIS IS PROUDLY CONFERRED UPON', 32, 156, {
        align: 'center',
        characterSpacing: 1.2,
      });

    // 7. Student Name (Heroic Display)
    doc.fillColor('#1E3A8A')
      .font('Helvetica-Bold')
      .fontSize(28)
      .text(safeStudentName, 50, 182, {
        align: 'center',
        width: width - 100,
      });

    // Underline beneath student name
    const nameY = 220;
    doc.moveTo(width / 2 - 160, nameY)
      .lineTo(width / 2 + 160, nameY)
      .lineWidth(1)
      .stroke('#D97706');

    // 8. Curriculum Fulfillment Narrative
    doc.fillColor('#475569')
      .font('Helvetica')
      .fontSize(11)
      .text(
        'for successfully completing all curriculum requirements, rigorous assessments, and practical evaluations for the course',
        80,
        236,
        {
          align: 'center',
          width: width - 160,
          lineGap: 3,
        }
      );

    // 9. Course Title Box & Text
    doc.fillColor('#0F172A')
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(safeCourseTitle, 60, 276, {
        align: 'center',
        width: width - 120,
      });

    if (category) {
      doc.fillColor('#64748B')
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(`SPECIALIZATION: ${category.toUpperCase()}`, 32, 312, {
          align: 'center',
          characterSpacing: 1,
        });
    }

    // 10. Horizontal Footer Separator
    const footLineY = 385;
    doc.moveTo(60, footLineY)
      .lineTo(width - 60, footLineY)
      .lineWidth(0.5)
      .stroke('#E2E8F0');

    // 11. Metadata Columns (Bottom Grid)
    const colY = 415;

    // Col 1: Completion Date
    doc.fillColor('#64748B')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('ISSUED ON', 65, colY, { characterSpacing: 1 });
    doc.fillColor('#0F172A')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(formattedDate, 65, colY + 14);
    if (finalGrade && finalGrade > 0) {
      doc.fillColor('#64748B')
        .font('Helvetica')
        .fontSize(8.5)
        .text(`Performance: ${finalGrade}%`, 65, colY + 30);
    }

    // Col 2: Instructor Signature / Approval
    doc.fillColor('#64748B')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('AUTHORIZED INSTRUCTOR', 245, colY, { characterSpacing: 1 });
    doc.fillColor('#0F172A')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(safeInstructor, 245, colY + 14);
    doc.fillColor('#64748B')
      .font('Helvetica')
      .fontSize(8.5)
      .text('LearnSpace Certified Educator', 245, colY + 30);

    // Col 3: Certificate ID & Link
    doc.fillColor('#64748B')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('CREDENTIAL IDENTIFIER', 450, colY, { characterSpacing: 1 });
    doc.fillColor('#1E3A8A')
      .font('Helvetica-Bold')
      .fontSize(11.5)
      .text(safeId, 450, colY + 14, { characterSpacing: 1 });
    doc.fillColor('#0284C7')
      .font('Helvetica')
      .fontSize(8)
      .text('learnspace.io/verify', 450, colY + 30);

    // Col 4: QR Code for Verification
    if (qrBuffer) {
      const qrX = width - 150;
      const qrY = colY - 12;
      doc.image(qrBuffer, qrX, qrY, { width: 68, height: 68 });
      doc.fillColor('#64748B')
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text('SCAN TO VERIFY', qrX - 5, qrY + 72, {
          width: 78,
          align: 'center',
          characterSpacing: 0.5,
        });
    }

    // 12. Bottom Edge Guarantee Notice
    doc.fillColor('#94A3B8')
      .font('Helvetica')
      .fontSize(7)
      .text(
        `This certified academic credential is cryptographically logged and authenticated by LearnSpace LMS. Credential: ${safeId}`,
        32,
        height - 35,
        {
          align: 'center',
          width: width - 64,
        }
      );

    doc.end();
  });
};

module.exports = {
  generateCertificatePdf,
  formatFormalDate,
};

