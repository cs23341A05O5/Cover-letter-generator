import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure the PDFJS worker using the local Vite-resolved URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extracts plain text from a PDF file.
 * Supports progress callback for smoother UI updates.
 * @param {File} file - The uploaded PDF file
 * @param {Function} onProgress - Callback function for progress updates (0 to 100)
 * @returns {Promise<string>} - The extracted plain text
 */
export const extractPdfText = async (file, onProgress = () => {}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target.result);
        const loadingTask = pdfjsLib.getDocument({ data: typedArray });
        
        // Track loading progress
        loadingTask.onProgress = (progressData) => {
          if (progressData.total > 0) {
            const pct = Math.round((progressData.loaded / progressData.total) * 50); // First 50% is loading
            onProgress(pct);
          }
        };

        const pdf = await loadingTask.promise;
        let extractedText = '';
        const numPages = pdf.numPages;

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Reconstruct lines based on items
          let lastY = null;
          let pageText = '';
          
          for (const item of textContent.items) {
            // Add newline if Y coordinate changes significantly
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
              pageText += '\n';
            } else if (lastY !== null) {
              pageText += ' ';
            }
            pageText += item.str;
            lastY = item.transform[5];
          }
          
          extractedText += pageText + '\n\n';
          
          // Remaining 50% is page processing
          const processingPct = 50 + Math.round((i / numPages) * 50);
          onProgress(processingPct);
        }

        resolve(extractedText.trim());
      } catch (err) {
        console.error('Error extracting PDF text:', err);
        reject(new Error(`Failed to read PDF structure: ${err.message || err}`));
      }
    };
    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      reject(new Error('Failed to read file content.'));
    };
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Dynamic parser that uses Groq AI API or falls back to regex.
 * @param {string} rawText - The raw text of the resume
 * @param {string} apiKey - Groq API key
 * @returns {Promise<{structuredText: string, atsScore: number, atsFeedback: string, parsedData: object}>}
 */
export const parseResumeSections = async (rawText, apiKey) => {
  if (!rawText || !rawText.trim()) {
    throw new Error('No text found in resume to parse.');
  }

  // If API key is available, run AI parsing
  if (apiKey) {
    try {
      const prompt = `
You are an expert resume parser and ATS system optimizer.
Analyze the following raw text extracted from a PDF resume and structure it into a clean, professional, and readable text format.

Requirements:
1. Extract or infer the following sections:
   - Full Name
   - Email
   - Phone Number
   - Location
   - LinkedIn
   - GitHub
   - Portfolio Website
   - Summary / Objective
   - Skills
   - Education
   - Experience
   - Projects
   - Certifications
   - Achievements
2. Compute an estimated ATS match score (0-100) based on standard ATS parameters:
   - Clear section headings
   - Contact info completeness
   - Bulleted descriptions
   - Professional formatting indicators
3. Generate brief (1-2 sentences) constructive ATS feedback.

Format the response EXACTLY in this JSON format. Do not add any markdown wrapper like \`\`\`json. Return only the JSON object.

{
  "fullName": "Name of the candidate",
  "email": "Email address",
  "phone": "Phone number",
  "location": "City, State / Country",
  "linkedin": "LinkedIn profile link",
  "github": "GitHub link",
  "portfolio": "Portfolio or personal website link",
  "atsScore": 85,
  "atsFeedback": "Excellent layout and clear contact details, but could include more action verbs in job descriptions.",
  "summary": "Professional summary paragraph...",
  "skills": "Skill 1, Skill 2, Skill 3...",
  "education": "Degree, Institution, Graduation Year...",
  "experience": "Job Title at Company, Dates - Bullet points...",
  "projects": "Project Name, Tech stack - Details...",
  "certifications": "Certifications details...",
  "achievements": "Key achievements and awards..."
}

Raw Resume Text:
${rawText}
`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.2
        })
      });

      if (response.ok) {
        const data = await response.json();
        const contentText = data.choices?.[0]?.message?.content?.trim();
        
        // Clean markdown tags if the model still outputs them
        let cleanJson = contentText;
        const firstOpenBrace = cleanJson.indexOf('{');
        const lastCloseBrace = cleanJson.lastIndexOf('}');
        if (firstOpenBrace !== -1 && lastCloseBrace !== -1 && lastCloseBrace > firstOpenBrace) {
          cleanJson = cleanJson.substring(firstOpenBrace, lastCloseBrace + 1);
        }
        
        try {
          const parsed = JSON.parse(cleanJson);
          
          // Generate a beautiful, uniform output text for the textarea
          const structuredText = formatParsedResumeToText(parsed);
          
          return {
            structuredText,
            atsScore: parsed.atsScore || 70,
            atsFeedback: parsed.atsFeedback || 'Parsed successfully using AI.',
            parsedData: parsed
          };
        } catch (jsonErr) {
          console.warn('AI parser returned invalid JSON, falling back to text regex parsing:', jsonErr);
        }
      } else {
        console.warn('AI Parsing API failed with status:', response.status);
      }
    } catch (err) {
      console.warn('AI Parsing call failed. Falling back to local parser:', err);
    }
  }

  // Fallback to local regex-based parsing if API failed or no apiKey is present
  return localFallbackParse(rawText);
};

/**
 * Formats a parsed resume JSON object into a structured string for the textarea.
 */
const formatParsedResumeToText = (data) => {
  const parts = [];
  
  if (data.fullName) parts.push(data.fullName.toUpperCase());
  
  const contactInfo = [data.email, data.phone, data.location].filter(Boolean).join(' | ');
  if (contactInfo) parts.push(contactInfo);
  
  const links = [];
  if (data.linkedin) links.push(`LinkedIn: ${data.linkedin}`);
  if (data.github) links.push(`GitHub: ${data.github}`);
  if (data.portfolio) links.push(`Portfolio: ${data.portfolio}`);
  if (links.length > 0) parts.push(links.join(' | '));
  
  parts.push('\n');

  const addSection = (title, content) => {
    if (content && content.trim() && content.trim().toLowerCase() !== 'not specified') {
      parts.push(`### ${title}`);
      parts.push(content.trim());
      parts.push('');
    }
  };

  addSection('Summary / Objective', data.summary);
  addSection('Skills', data.skills);
  addSection('Education', data.education);
  addSection('Experience', data.experience);
  addSection('Projects', data.projects);
  addSection('Certifications', data.certifications);
  addSection('Achievements', data.achievements);

  return parts.join('\n').trim();
};

/**
 * Local regex-based fallback resume parser.
 * Extracts contact details and tries to group blocks of text under matched headings.
 */
const localFallbackParse = (rawText) => {
  const lines = rawText.split('\n');
  
  // Find Name (assume first non-empty line of reasonable length)
  let fullName = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && trimmed.length > 3 && trimmed.length < 40 && !trimmed.includes('@') && !trimmed.includes('://')) {
      fullName = trimmed;
      break;
    }
  }

  // Regexes for links and contact info
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  
  const emails = rawText.match(emailRegex) || [];
  const phones = rawText.match(phoneRegex) || [];
  
  const email = emails[0] || '';
  const phone = phones[0] || '';
  
  // Extract Links
  const linkedinRegex = /(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i;
  const githubRegex = /(github\.com\/[a-zA-Z0-9_-]+)/i;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  const linkedinMatch = rawText.match(linkedinRegex);
  const githubMatch = rawText.match(githubRegex);
  const allUrls = rawText.match(urlRegex) || [];
  
  const linkedin = linkedinMatch ? linkedinMatch[0] : '';
  const github = githubMatch ? githubMatch[0] : '';
  
  // Filter out linkedin and github from websites to find portfolio
  const portfolio = allUrls.find(url => !url.includes('linkedin.com') && !url.includes('github.com')) || '';

  // Determine section titles and content
  const sectionHeaders = [
    { key: 'summary', regex: /^(summary|objective|professional summary|about me)/i, title: 'Summary / Objective' },
    { key: 'skills', regex: /^(skills|technical skills|key skills|technologies|expertise)/i, title: 'Skills' },
    { key: 'education', regex: /^(education|academic background|academic profile)/i, title: 'Education' },
    { key: 'experience', regex: /^(experience|work experience|employment history|professional experience|work history)/i, title: 'Experience' },
    { key: 'projects', regex: /^(projects|academic projects|personal projects)/i, title: 'Projects' },
    { key: 'certifications', regex: /^(certifications|licenses|courses)/i, title: 'Certifications' },
    { key: 'achievements', regex: /^(achievements|awards|honors)/i, title: 'Achievements' }
  ];

  const parsed = {
    fullName,
    email,
    phone,
    location: '',
    linkedin,
    github,
    portfolio,
    summary: '',
    skills: '',
    education: '',
    experience: '',
    projects: '',
    certifications: '',
    achievements: ''
  };

  let currentSectionKey = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line matches a header
    let matchedHeader = false;
    for (const header of sectionHeaders) {
      if (header.regex.test(trimmed)) {
        currentSectionKey = header.key;
        matchedHeader = true;
        break;
      }
    }

    if (matchedHeader) continue;

    if (currentSectionKey) {
      parsed[currentSectionKey] += (parsed[currentSectionKey] ? '\n' : '') + trimmed;
    }
  }

  // Calculate simple ATS score based on found components
  let score = 30; // base score
  if (parsed.fullName) score += 10;
  if (parsed.email) score += 10;
  if (parsed.phone) score += 10;
  if (parsed.skills) score += 10;
  if (parsed.experience) score += 15;
  if (parsed.education) score += 15;
  
  const atsScore = Math.min(score, 100);
  const atsFeedback = atsScore >= 80 
    ? 'Great coverage of essential sections. Contact information and key core fields parsed successfully.' 
    : 'Some key sections might be missing or could not be detected automatically. Consider manual additions.';

  return {
    structuredText: formatParsedResumeToText(parsed),
    atsScore,
    atsFeedback,
    parsedData: parsed
  };
};
