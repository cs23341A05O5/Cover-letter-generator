import React from "react";
import { useState } from "react";
import "../App.css";
import ResumeInputSection from "../components/ResumeInputSection";
import { downloadCoverLetterPDF } from "../utils/pdfGenerator";

function HomePage() {
    const [formData, setFormData] = useState({
        companyName: "",
        applyingAsA: "Experienced",
        coverLetterTone: "Formal",
        jobDescription: "",
        currentResume: ""
    })

    const [parsedData, setParsedData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const getScoreColor = (score) => {
        if (score >= 80) return 'success';
        if (score >= 50) return 'warning';
        return 'danger';
    };

    async function handleGenerateData() {
        console.log("Button clicked! Function called.");
        console.log("FormDATA: ", formData);
        
        if (!formData.companyName || !formData.jobDescription) {
            setErrorMessage('Please fill in at least the company name and job description fields.');
            return;
        }
        
        setIsLoading(true);
        setErrorMessage("");
        setParsedData(null);

        const prompt = `
You are a professional career coach, recruiter, and resume optimization expert.
Your task is to analyze the user's current resume against the job description and output a tailored cover letter and a detailed resume analysis.

Inputs:
- Company Name: ${formData.companyName}
- Experience Level: ${formData.applyingAsA}  (Fresher / Experienced)
- Job Description: ${formData.jobDescription}
- Current Resume: ${formData.currentResume} (If empty, assume no resume exists and create a draft)
- Preferred Tone: ${formData.coverLetterTone}

Instructions for output:
1. Generate a cover letter. The cover letter must:
   - Begin with a professional greeting (e.g., "Dear Hiring Manager," or "Dear ${formData.companyName} Hiring Team,").
   - In the body paragraphs, dynamically reference the candidate's relevant skills, experience, achievements, and projects extracted from the Current Resume to match the job requirements.
   - Explicitly mention the Company Name (${formData.companyName}) in the body of the cover letter, tailoring the content to show specific alignment with that company.
   - Conclude with a closing (e.g., "Sincerely,") and the candidate's actual full name extracted from the Current Resume. Do NOT use generic placeholders like "[Candidate Name]" or "[Your Name]" in the signature if a name is present/detectable in the resume. Only if no name is available in the resume, fall back to using "[Candidate Name]".
   - Do NOT include the header date, recipient name/address, or subject line.
2. Determine the specific Job Role/Title applied for.
3. Compute an estimated ATS Match Score (0 to 100).
4. Provide constructive feedback on the match.
5. Identify Present and Missing keywords (extract 10-15 key terms like skills, frameworks, tools from the job description).
6. List 3-4 strengths and 3-4 weaknesses of the current resume.
7. Provide 6-8 actionable recommendations. Each recommendation must be a single, short action statement starting with a verb and no prefix (e.g., "Add React.js project metrics", "Include quantified achievements", "Add REST API development experience").
8. Provide 3-4 general enhancement tips (e.g. action verbs to add, skills to highlight).

Format the output strictly as a JSON object with the following structure. Do not output any markdown wrapper or surrounding text. Return ONLY the raw JSON string:

{
  "role": "Job Title / Position Name (e.g., Frontend Engineer)",
  "coverLetter": "The tailored cover letter text starting with Greeting and ending with the candidate's actual name in the signature.",
  "atsScore": 75,
  "atsFeedback": "Brief overview of how the resume matches the job description...",
  "presentKeywords": ["Keyword1", "Keyword2", ...],
  "missingKeywords": ["Keyword3", "Keyword4", ...],
  "strengths": ["Strength 1", "Strength 2", ...],
  "weaknesses": ["Weakness 1", "Weakness 2", ...],
  "recommendations": [
    "Add React.js project metrics",
    "Include quantified achievements",
    "Add REST API development experience"
  ],
  "enhancementTips": [
    "Action Verbs to Add: Executed, Optimized, Designed",
    "Skills to Highlight: AWS, Docker, CI/CD"
  ]
}
`;
        const url = 'https://api.groq.com/openai/v1/chat/completions';
        const options = {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2500,
                temperature: 0.3
            })
        };

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                setErrorMessage(`API Error (${response.status}): ${errorText}`);
                return;
            }
            
            const data = await response.json();
            console.log('Full API Response:', data);
            
            if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                const generatedText = data.choices[0].message.content.trim();
                console.log('Generated Groq Data: ', generatedText);
                
                let cleanJson = generatedText;
                if (cleanJson.startsWith('```')) {
                    cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
                }
                
                try {
                    const parsed = JSON.parse(cleanJson);
                    setParsedData(parsed);
                } catch (jsonErr) {
                    console.error('Failed to parse JSON response:', jsonErr);
                    setErrorMessage('Failed to parse the structured AI response. Please try generating again.');
                }
            } else {
                console.error('Unexpected API response structure:', data);
                setErrorMessage('Error: Unexpected response format from API');
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            setErrorMessage(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }
    //[your API Key]
    return (
        <div className="container-fluid min-vh-100 bg-light">
            {/* Header Section */}
            <div className="hero-section bg-primary text-white py-5 mb-4">
                <div className="container">
                    <div className="row justify-content-center text-center">
                        <div className="col-lg-8">
                            <h1 className="display-4 fw-bold mb-3">AI Resume Builder</h1>
                            <h4>By Tech Naveen</h4>
                            <p className="lead mb-0">Create professional cover letters and optimize your resume with AI-powered insights</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-lg-8">
                        {/* Form Card */}
                        <div className="card shadow-lg border-0 mb-5">
                            <div className="card-header bg-white py-4">
                                <h3 className="card-title text-center mb-0 text-primary">
                                    <i className="bi bi-file-earmark-person me-2"></i>
                                    Resume & Cover Letter Generator
                                </h3>
                            </div>
                            <div className="card-body p-4">
                                <form>
                                    <div className="row">
                                        <div className="col-md-6 mb-4">
                                            <label htmlFor="companyName" className="form-label fw-semibold">
                                                <i className="bi bi-building me-2 text-primary"></i>
                                                Company Name
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control form-control-lg" 
                                                id="companyName"
                                                placeholder="Enter company name"
                                                value={formData.companyName} 
                                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                            />
                                            <div className="form-text">Company you are applying to</div>
                                        </div>

                                        <div className="col-md-6 mb-4">
                                            <label htmlFor="applyingAsA" className="form-label fw-semibold">
                                                <i className="bi bi-person-badge me-2 text-primary"></i>
                                                Experience Level
                                            </label>
                                            <select 
                                                className="form-select form-select-lg" 
                                                id="applyingAsA"
                                                value={formData.applyingAsA} 
                                                onChange={(e) => setFormData({ ...formData, applyingAsA: e.target.value })}
                                            >
                                                <option value="Fresher">Fresher</option>
                                                <option value="Experienced">Experienced</option>
                                            </select>
                                            <div className="form-text">Are you applying as a fresher or experienced person</div>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label htmlFor="coverLetterTone" className="form-label fw-semibold">
                                            <i className="bi bi-chat-square-text me-2 text-primary"></i>
                                            Cover Letter Tone
                                        </label>
                                        <select 
                                            className="form-select form-select-lg" 
                                            id="coverLetterTone"
                                            value={formData.coverLetterTone} 
                                            onChange={(e) => setFormData({ ...formData, coverLetterTone: e.target.value })}
                                        >
                                            <option value="Formal">Formal</option>
                                            <option value="Informal">Informal</option>
                                            <option value="Casual">Casual</option>
                                        </select>
                                        <div className="form-text">Select the tone of your cover letter</div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label fw-semibold" htmlFor="jobDescription">
                                            <i className="bi bi-file-text me-2 text-primary"></i>
                                            Job Description
                                        </label>
                                        <textarea 
                                            name="jobDescription" 
                                            id="jobDescription" 
                                            className="form-control" 
                                            rows="6"
                                            placeholder="Paste the job description here..."
                                            value={formData.jobDescription} 
                                            onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                                        ></textarea>
                                        <div className="form-text">Paste the complete job description for better matching</div>
                                    </div>

                                    <ResumeInputSection 
                                        value={formData.currentResume} 
                                        onChange={(newText) => setFormData({ ...formData, currentResume: newText })}
                                        apiKey={import.meta.env.VITE_GROQ_API_KEY}
                                    />

                                    <div className="d-grid">
                                        <button 
                                            type="button" 
                                            className="btn btn-primary btn-lg py-3" 
                                            onClick={handleGenerateData}
                                        >
                                            <i className="bi bi-magic me-2"></i>
                                            Generate AI-Powered Resume & Cover Letter
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Response Section */}
                        <div className="response-container">
                            {/* Error Alert */}
                            {errorMessage && (
                                <div className="alert alert-danger shadow-lg border-0 p-4 mb-4" role="alert">
                                    <h4 className="alert-heading fw-bold mb-2">
                                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                        Generation Failed
                                    </h4>
                                    <p className="mb-0">{errorMessage}</p>
                                </div>
                            )}

                            {/* Loading Spinner */}
                            {isLoading && (
                                <div className="text-center my-5 py-5 card shadow-lg border-0 p-4">
                                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <h4 className="fw-semibold text-primary">Generating AI-Powered Results...</h4>
                                    <p className="text-muted mb-0">Customizing your cover letter and auditing your resume against the job description</p>
                                </div>
                            )}

                            {/* Section A: Cover Letter */}
                            {!isLoading && parsedData?.coverLetter && (
                                <div className="card shadow-lg border-0 mb-4">
                                    <div className="card-header bg-primary text-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                        <h3 className="card-title mb-0 fs-4">
                                            <i className="bi bi-envelope-open-fill me-2"></i>
                                            Tailored Cover Letter
                                        </h3>
                                        <button 
                                            type="button" 
                                            className="btn btn-light btn-sm fw-bold px-3 py-2"
                                            onClick={() => downloadCoverLetterPDF(parsedData.coverLetter, formData.companyName, parsedData.role)}
                                        >
                                            <i className="bi bi-file-earmark-pdf-fill text-danger me-1"></i>
                                            Download Cover Letter PDF
                                        </button>
                                    </div>
                                    <div className="card-body bg-white p-4">
                                        <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '1.05rem', lineHeight: '1.6' }}>
                                            {parsedData.coverLetter}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Section B: Resume Analysis */}
                            {!isLoading && parsedData?.atsScore !== undefined && (
                                <div className="card shadow-lg border-0 mb-5">
                                    <div className="card-header bg-success text-white py-3">
                                        <h3 className="card-title mb-0 fs-4">
                                            <i className="bi bi-graph-up-arrow me-2"></i>
                                            Resume Analysis & Improvement Suggestions
                                        </h3>
                                    </div>
                                    <div className="card-body p-4 bg-white">
                                        
                                        {/* ATS Score & Feedback */}
                                        <div className="row g-3 mb-4 align-items-center border-bottom pb-4">
                                            <div className="col-md-3 text-center border-end">
                                                <div className="text-muted text-uppercase small fw-bold">ATS Score</div>
                                                <div className={`display-3 fw-bold text-${getScoreColor(parsedData.atsScore)} my-2`}>
                                                    {parsedData.atsScore}/100
                                                </div>
                                                <div className="progress mx-auto" style={{ height: '8px', maxWidth: '140px' }}>
                                                    <div 
                                                        className={`progress-bar bg-${getScoreColor(parsedData.atsScore)}`} 
                                                        role="progressbar" 
                                                        style={{ width: `${parsedData.atsScore}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="col-md-9 ps-md-4">
                                                <h5 className="fw-bold mb-2">Overall Analysis</h5>
                                                <p className="text-muted mb-0 lead fs-6">{parsedData.atsFeedback}</p>
                                            </div>
                                        </div>

                                        {/* Keywords Analysis */}
                                        <div className="row g-4 mb-4 border-bottom pb-4">
                                            <div className="col-md-6 border-end">
                                                <h6 className="fw-bold text-success mb-3">
                                                    <i className="bi bi-check-circle-fill me-2"></i>Keywords Present in Resume
                                                </h6>
                                                {parsedData.presentKeywords && parsedData.presentKeywords.length > 0 ? (
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {parsedData.presentKeywords.map((kw, i) => (
                                                            <span key={i} className="badge bg-success-subtle text-success border border-success-subtle py-2 px-3 rounded-pill">
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-muted small">No keywords detected from job description.</p>
                                                )}
                                            </div>
                                            
                                            <div className="col-md-6 ps-md-4">
                                                <h6 className="fw-bold text-danger mb-3">
                                                    <i className="bi bi-x-circle-fill me-2"></i>Missing Keywords (Add these!)
                                                </h6>
                                                {parsedData.missingKeywords && parsedData.missingKeywords.length > 0 ? (
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {parsedData.missingKeywords.map((kw, i) => (
                                                            <span key={i} className="badge bg-danger-subtle text-danger border border-danger-subtle py-2 px-3 rounded-pill">
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-muted small">No missing keywords! Excellent match.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Strengths & Areas for Improvement */}
                                        <div className="row g-4 mb-4 border-bottom pb-4">
                                            <div className="col-md-6 border-end">
                                                <h6 className="fw-bold text-primary mb-3">
                                                    <i className="bi bi-hand-thumbs-up-fill me-2"></i>Resume Strengths
                                                </h6>
                                                {parsedData.strengths && parsedData.strengths.length > 0 ? (
                                                    <ul className="list-unstyled">
                                                        {parsedData.strengths.map((str, i) => (
                                                            <li key={i} className="mb-2 d-flex align-items-start">
                                                                <i className="bi bi-patch-check-fill text-success me-2 mt-1"></i>
                                                                <span>{str}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-muted small">No strengths analyzed.</p>
                                                )}
                                            </div>

                                            <div className="col-md-6 ps-md-4">
                                                <h6 className="fw-bold text-warning mb-3">
                                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>Areas for Improvement
                                                </h6>
                                                {parsedData.weaknesses && parsedData.weaknesses.length > 0 ? (
                                                    <ul className="list-unstyled">
                                                        {parsedData.weaknesses.map((weak, i) => (
                                                            <li key={i} className="mb-2 d-flex align-items-start">
                                                                <i className="bi bi-lightbulb-fill text-warning me-2 mt-1"></i>
                                                                <span>{weak}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-muted small">No specific weaknesses identified.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actionable Recommendations */}
                                        <div className="mb-4 border-bottom pb-4">
                                            <h6 className="fw-bold text-dark mb-3">
                                                <i className="bi bi-check2-square me-2 text-primary"></i>Recommended Improvements
                                            </h6>
                                            {parsedData.recommendations && parsedData.recommendations.length > 0 ? (
                                                <div className="row g-2">
                                                    {parsedData.recommendations.map((rec, i) => (
                                                        <div key={i} className="col-md-6">
                                                            <div className="p-3 border rounded bg-light d-flex align-items-center">
                                                                <i className="bi bi-check-lg text-success fs-5 me-3 fw-bold"></i>
                                                                <span className="fw-semibold text-dark">{rec}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-muted small">No recommendations provided.</p>
                                            )}
                                        </div>

                                        {/* Resume Enhancement Tips */}
                                        <div>
                                            <h6 className="fw-bold text-dark mb-3">
                                                <i className="bi bi-magic me-2 text-primary"></i>Resume Enhancement Tips
                                            </h6>
                                            {parsedData.enhancementTips && parsedData.enhancementTips.length > 0 ? (
                                                <ul className="list-unstyled">
                                                    {parsedData.enhancementTips.map((tip, i) => (
                                                        <li key={i} className="mb-2 d-flex align-items-start">
                                                            <i className="bi bi-arrow-right-short text-primary me-2 mt-1"></i>
                                                            <span>{tip}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-muted small">No enhancement tips provided.</p>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default HomePage;