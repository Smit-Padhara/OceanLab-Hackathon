import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(API_KEY);

export const getGeminiSuggestions = async (userDomain, userSkills) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      As an expert career and project consultant, suggest 5 realistic, innovative, and impactful project titles and brief descriptions specifically for a user in the "${userDomain}" domain.
      The user has skills in: ${userSkills.join(", ")}.
      
      Focus on projects that:
      1. Are relevant to their domain (${userDomain}).
      2. Utilize at least some of their listed skills.
      3. Are modern (e.g., using AI, Web3, or current industry trends).
      
      Format the output as a valid JSON array of objects with exactly these keys: 
      "name" (the project title), 
      "description" (2-3 sentences max), 
      "domain" (keep it as "${userDomain}"), 
      "required_skills" (a list of 3-4 string skills needed for the project).
      
      Return ONLY the JSON array without any markdown formatting or extra text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const cleanJson = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [
      { name: "Global Supply Chain Optimizer", description: "Design a dashboard to track and predict logistics bottlenecks using real-time data.", domain: userDomain, required_skills: ["Data Science", "React", "Python"] },
      { name: "Community Resource Hub", description: "A platform for locals to share and trade tools, skills, and resources within their neighborhood.", domain: userDomain, required_skills: ["Firebase", "Next.js", "Tailwind"] },
      { name: "Smart Healthcare Advisor", description: "An AI-powered triage system that suggests home care or immediate doctor visits based on symptoms.", domain: userDomain, required_skills: ["AI/ML", "Healthcare API", "Security"] },
      { name: "Eco-Track Carbon Footprint", description: "Monitor your daily environmental impact and get actionable suggestions for a greener lifestyle.", domain: userDomain, required_skills: ["FastAPI", "PostgreSQL", "Analytics"] },
      { name: "Remote Learning Collaborator", description: "An interactive white-boarding tool designed for real-time peer teaching across different regions.", domain: userDomain, required_skills: ["WebSockets", "Canvas API", "Redux"] }
    ].slice(0, 5);
  }
};

// ── Hackathon Suggestions ──────────────────────────────────────────────
export const getHackathonSuggestions = async (userDomain, userSkills) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert in the global hackathon ecosystem. List 6 real, well-known hackathons that are either currently running, upcoming, or are prestigious annual events that a student/developer in the "${userDomain}" domain should participate in.

      For each hackathon, provide ACCURATE and REAL information. Include major hackathons like:
      - MLH (Major League Hacking) events
      - Google, Meta, Microsoft, or other tech company hackathons
      - Domain-specific hackathons (health, finance, sustainability, AI, etc.)
      - Global online hackathons from platforms like Devpost, Devfolio, HackerEarth

      Format the output as a valid JSON array with exactly these keys:
      "name" (exact hackathon name),
      "organizer" (organization hosting it),
      "mode" (Online / In-person / Hybrid),
      "prize_pool" (approximate prize pool if known, or "TBD"),
      "deadline" (registration deadline or event date - use a realistic upcoming date),
      "domain_tags" (array of 2-4 relevant domain tags like ["AI", "Healthcare"]),
      "required_skills" (array of 3-5 technical skills relevant to this hackathon),
      "eligibility" (who can participate - e.g., "Open to all", "Students only", "18+ globally"),
      "description" (3-4 sentences: what the hackathon is about, its theme, what participants build, and why it's prestigious/noteworthy. Be factual and accurate.),
      "website" (official website URL - use real URLs like devpost.com, mlh.io, etc.)

      Return ONLY the JSON array without any markdown formatting or extra text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanJson = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini Hackathon API Error:", error);
    return [
      {
        name: "Google Solution Challenge",
        organizer: "Google Developer Student Clubs",
        mode: "Online",
        prize_pool: "$3,000 + Google mentorship",
        deadline: "March 2025",
        domain_tags: ["AI", "Social Impact", "Mobile"],
        required_skills: ["Flutter", "Firebase", "TensorFlow", "Google Cloud"],
        eligibility: "University students only",
        description: "The Google Solution Challenge is an annual competition for GDSC members to build solutions that address one of the United Nations' 17 Sustainable Development Goals. Teams of 1-4 students create apps using Google technologies. It's one of the most prestigious student hackathons globally with mentorship from Google engineers.",
        website: "https://developers.google.com/community/gdsc-solution-challenge"
      },
      {
        name: "MLH Global Hack Week",
        organizer: "Major League Hacking (MLH)",
        mode: "Online",
        prize_pool: "Swag + MLH Fellowship opportunities",
        deadline: "Recurring monthly",
        domain_tags: ["Web Dev", "Open Source", "AI"],
        required_skills: ["JavaScript", "Python", "Git", "APIs"],
        eligibility: "Open to all developers and students",
        description: "MLH Global Hack Week is a week-long series of themed mini-hackathon events and workshops organized by Major League Hacking. Each day has a different activity focused on specific technologies and skills. It's a great entry point for beginners and a community-building event for experienced developers.",
        website: "https://ghw.mlh.io"
      }
    ];
  }
};

// ── Team Member Matching ──────────────────────────────────────────────────
export const getHackathonTeamSuggestions = async (hackathonDetails, connections) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const connectionsSummary = connections.map(c => ({
      id: c.id,
      name: c.full_name,
      domain: c.domain,
      skills: c.skills || []
    }));

    const prompt = `
      I am building a team for a hackathon and need help finding the best team members from my connections list.
      
      Hackathon Details:
      - Name: ${hackathonDetails.name}
      - Problem Statement: ${hackathonDetails.problem_statement}
      - Description: ${hackathonDetails.description}
      - Required Skills: ${hackathonDetails.required_skills}

      My Connections (potential team members):
      ${JSON.stringify(connectionsSummary, null, 2)}

      Analyze each connection's skills and domain against the hackathon's requirements.
      Return a ranked list of the best matching connections with a match score and reason.

      Format as a valid JSON array with exactly these keys:
      "id" (the connection's id, must match exactly from the input),
      "match_score" (integer 0-100),
      "matched_skills" (array of skills that matched the requirements),
      "role_suggestion" (a suggested role for this person e.g., "Frontend Developer", "ML Engineer"),
      "reason" (1-2 sentence explanation of why this person is a good fit)

      Only include connections with a match_score above 30. Sort by match_score descending.
      Return ONLY the JSON array without any markdown formatting or extra text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanJson = text.replace(/```json|```/gi, "").trim();
    const ranked = JSON.parse(cleanJson);
    
    // Merge back the full connection profile data
    return ranked.map(r => ({
      ...r,
      profile: connections.find(c => c.id === r.id)
    })).filter(r => r.profile);
  } catch (error) {
    console.error("Gemini Team Matching Error:", error);
    return [];
  }
};

// ── Opportunity Suggestions ──────────────────────────────────────────────
export const getOpportunitySuggestions = async (userDomain, userSkills, filters) => {
  const { jobType, location, companyType, workMode } = filters;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an ELITE career strategist and recruitment specialist.
      
      TASK: Suggest 8 VALID, RECENT, and HIGHLY-RELEVANT job or internship opportunities.
      
      STRICT CATEGORIZATION RULE:
      1. If Company Category is "MNC": ONLY suggest globally recognized tech giants (e.g., Meta, Amazon, Google, NVIDIA, Microsoft, Apple, Tesla, Netflix, Spotify).
      2. If Company Category is "Startup": Suggest high-growth mid-sized companies and startups specifically relevant to the user's domain ("${userDomain}"). Examples like Zomato, Razorpay, Postman, Notion, Vercel, or domain-specific ventures.
      
      FILTERS:
      - Job Type: ${jobType} (e.g., Internship, Full-time)
      - Preferred City: ${location || "Global/Remote"}
      - Company Category: ${companyType} (MNC or Startup)
      - Work Mode: ${workMode} (Remote, Hybrid, On-site)
      - User Domain: ${userDomain}
      - Skills: ${userSkills?.join(", ") || "various technical skills"}
      
      OUTPUT REQUIREMENTS:
      - Role titles must be professional (e.g., "Software Engineer - ${userDomain}", "Associate Designer").
      - Adherence to the MNC vs Startup distinction is MANDATORY.
      - Return ONLY a valid JSON array of objects with keys: "company_name", "role_title", "job_type", "location", "description", "primary_skills", "domain", "application_link".
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Invalid AI Response Format");
    
    return JSON.parse(jsonMatch[0].trim());
  } catch (error) {
    if (API_KEY === "YOUR_GEMINI_API_KEY_HERE" || API_KEY.includes("YOUR")) {
      console.warn("TalentMash: Simulation Mode (No Gemini Key). Use .env for live results.");
    }
    
    // Categorized Fallback Database
    const mncFallbacks = [
      { company_name: "Google", role_title: `Software Engineer - ${userDomain}`, job_type: jobType, location: "Mountain View / Hybrid", description: "Work on world-scale projects at Google. Build the next generation of computing.", primary_skills: ["System Design", "Scalability", "Go"], domain: userDomain, application_link: "https://google.com/about/careers" },
      { company_name: "Meta", role_title: `${userDomain} Specialist`, job_type: jobType, location: "Menlo Park / Remote", description: "Build the future of connection in the Metaverse and beyond with social-tech leadership.", primary_skills: ["React", "AI/ML", "Architecture"], domain: userDomain, application_link: "https://metacareers.com" },
      { company_name: "Amazon", role_title: `SDE - ${userDomain} Team`, job_type: jobType, location: "Seattle / Hybrid", description: "Customer-obsessed engineering at massive scale. Build the infrastructure for global commerce.", primary_skills: ["AWS", "Java", "Backend"], domain: userDomain, application_link: "https://amazon.jobs" },
      { company_name: "NVIDIA", role_title: `${userDomain} Performance Engineer`, job_type: jobType, location: "Santa Clara / Remote", description: "Revolutionize AI and Graphics computing. Build the hardware and software of tomorrow.", primary_skills: ["C++", "CUDA", "Optimization"], domain: userDomain, application_link: "https://nvidia.com/careers" },
      { company_name: "Spotify", role_title: `Backend Engineer (${userDomain})`, job_type: jobType, location: "Stockholm / Remote", description: "Join the band. Build features that define the future of audio streaming.", primary_skills: ["Cloud", "Streaming", "API"], domain: userDomain, application_link: "https://lifeatspotify.com" }
    ];

    const startupFallbacks = [
      { company_name: "Zomato", role_title: `${userDomain} Associate`, job_type: jobType, location: "Gurgaon / Hybrid", description: "Join India's leading food-tech startup. Build solutions for millions of daily users.", primary_skills: ["Node.js", "Analytics", "Scaling"], domain: userDomain, application_link: "https://zomato.com/careers" },
      { company_name: "Razorpay", role_title: `FinTech Solutions (${userDomain})`, job_type: jobType, location: "Bangalore", description: "Build the payment backbone of India. Join a fast-paced fintech scale-up.", primary_skills: ["Finance API", "Security", "PHP"], domain: userDomain, application_link: "https://razorpay.com/jobs" },
      { company_name: "Postman", role_title: `API Support - ${userDomain}`, job_type: jobType, location: "Remote / Hybrid", description: "Empower the world's APIs. Help millions of developers build and test better software.", primary_skills: ["API Testing", "JavaScript", "DevOps"], domain: userDomain, application_link: "https://postman.com/careers" },
      { company_name: "Notion", role_title: `${userDomain} Product Specialist`, job_type: jobType, location: "San Francisco / Remote", description: "Design the all-in-one workspace. Build tools for thought and collaboration.", primary_skills: ["Next.js", "Product Strategy", "UX"], domain: userDomain, application_link: "https://notion.so/careers" },
      { company_name: "Vercel", role_title: `Frontend Engineer (${userDomain})`, job_type: jobType, location: "Remote", description: "Develop the best platform for frontend developers. Shape the future of the web.", primary_skills: ["React", "Edge Computing", "Performance"], domain: userDomain, application_link: "https://vercel.com/careers" }
    ];

    const remoteFirstFallbacks = [
      { company_name: "GitLab", role_title: `${userDomain} Remote Engineer`, job_type: jobType, location: "Remote Global", description: "Join the largest all-remote company. Scale DevOps for millions of teams worldwide.", primary_skills: ["Ruby", "Go", "Git"], domain: userDomain, application_link: "https://about.gitlab.com/jobs" },
      { company_name: "Automattic", role_title: `Experience Designer (${userDomain})`, job_type: jobType, location: "Remote Global", description: "The people behind WordPress. Work from anywhere and build the open web.", primary_skills: ["PHP", "JavaScript", "Design Systems"], domain: userDomain, application_link: "https://automattic.com/work-with-us" },
      { company_name: "Doist", role_title: `${userDomain} Developer`, job_type: jobType, location: "Remote Global", description: "Making the future of work more efficient. Home of Todoist and Twist.", primary_skills: ["Python", "React Native", "Collaboration Tools"], domain: userDomain, application_link: "https://doist.com/jobs" }
    ];

    let chosenCollection = mncFallbacks;
    if (companyType === 'Startup') chosenCollection = startupFallbacks;
    if (companyType === 'Remote-first') chosenCollection = remoteFirstFallbacks;

    return chosenCollection.sort(() => 0.5 - Math.random()).slice(0, 6);
  }
};

// ── Market Trends Analysis ──────────────────────────────────────────────────
export const getMarketTrends = async (userDomain) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      As a leading industry analyst, provide a data-driven report on the top 5 trending roles within the "${userDomain}" domain as of 2026.
      
      For each role, provide:
      1. Role Name
      2. Market Demand Score (Percentage 0-100)
      3. Key Reason for Growth (1 brief sentence)
      4. Required Core Skills (array of 3-4 skills)
      
      Format the output as a valid JSON array of objects with exactly these keys:
      "role_name", "demand_score", "growth_reason", "skills".
      
      Return ONLY the JSON array without any markdown formatting or extra text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanJson = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini Market Trends Error:", error);
    // Generic high-tier fallbacks for domain
    return [
      { role_name: "AI Solutions Architect", demand_score: 95, growth_reason: "Exponential rise in enterprise AI deployments and the need for scalable LLM infrastructure.", skills: ["Python", "TensorFlow", "Kubernetes"] },
      { role_name: "Full-Stack Security Developer", demand_score: 88, growth_reason: "Critical demand for shift-left security practices in the modern SDLC.", skills: ["Go", "Next.js", "OIDC/Auth"] },
      { role_name: "Cloud Platform Engineer", demand_score: 82, growth_reason: "Global migration to multi-cloud and hybrid environments requiring robust DevOps automation.", skills: ["Terraform", "AWS/Azure", "Docker"] },
      { role_name: "Product Design Lead", demand_score: 75, growth_reason: "Emphasis on premium user experiences (UX) across interconnected digital ecosystems.", skills: ["Figma", "Interaction Design", "Prototyping"] },
      { role_name: "Data Platform Engineer", demand_score: 70, growth_reason: "Need for sophisticated data pipelines to feed real-time analytics engines.", skills: ["Spark", "PostgreSQL", "Kafka"] }
    ];
  }
};

// ── Full Detailed Market Report ─────────────────────────────────────────────
export const getFullMarketReport = async (userDomain) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      As a senior industry strategist, write a 3-paragraph (max 300 words) detailed market report for the "${userDomain}" domain in 2026.
      
      Structure:
      - Paragraph 1: Current State and Macro Shifts.
      - Paragraph 2: High-Demand Specialized Skills and why they are valuable.
      - Paragraph 3: Actionable Career Advice for a professional looking to dominate this field.
      
      Maintain a professional, forward-thinking, and strategic tone. No markdown headers.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Market Report Error:", error);
    return `The ${userDomain} industry is currently undergoing a massive transformation driven by decentralized systems and high-end automation. Companies are no longer looking for generalists; they seek individuals who can bridge the gap between technical execution and business strategy. Focus on mastering adaptive architectures and cross-platform integrations. The next 12 months will see a 40% uptick in specialized hiring across global markets.`;
  }
};

