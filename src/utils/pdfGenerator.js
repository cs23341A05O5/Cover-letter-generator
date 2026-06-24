import { jsPDF } from 'jspdf';

/**
 * Generates and downloads a professional PDF for the cover letter.
 * @param {string} coverLetterText - The cover letter text (from greeting to signature)
 * @param {string} companyName - The target company name
 * @param {string} role - The job role/position name
 */
export const downloadCoverLetterPDF = (coverLetterText, companyName, role) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageHeight = 297;
  const pageWidth = 210;
  const margin = 20; // 20mm margin (recruiter standard)
  const contentWidth = pageWidth - (2 * margin);

  // Set initial Y position
  let currentY = margin;
  const lineHeight = 6.5; // Space between lines

  // Date Formatting
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Typography Settings
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(33, 37, 41); // Slate black/dark grey for premium look

  // 1. Date
  doc.text(dateStr, margin, currentY);
  currentY += lineHeight * 2;

  // 2. Hiring Manager Info
  doc.text('Hiring Manager', margin, currentY);
  currentY += lineHeight;
  doc.text(companyName || 'Hiring Team', margin, currentY);
  currentY += lineHeight * 2;

  // 3. Subject Line (Bold)
  doc.setFont('Helvetica', 'bold');
  const subjectText = `Subject: Application for ${role || 'Job Opportunity'}`;
  doc.text(subjectText, margin, currentY);
  doc.setFont('Helvetica', 'normal');
  currentY += lineHeight * 2;

  // 4. Split and draw cover letter paragraphs
  // Normalize newlines and split by paragraphs
  const paragraphs = coverLetterText.split('\n\n');

  for (const para of paragraphs) {
    if (!para.trim()) continue;

    // Split paragraph text to fit page width
    const lines = doc.splitTextToSize(para.trim(), contentWidth);

    for (const line of lines) {
      // Check for page overflow
      if (currentY + lineHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }
      doc.text(line, margin, currentY);
      currentY += lineHeight;
    }
    
    // Add paragraph spacing
    currentY += 4;
  }

  // File naming: CoverLetter_CompanyName.pdf (sanitized)
  const sanitizedCompany = (companyName || '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_+|_+$/g, '');
    
  const fileName = sanitizedCompany 
    ? `CoverLetter_${sanitizedCompany}.pdf` 
    : 'CoverLetter.pdf';

  doc.save(fileName);
};
