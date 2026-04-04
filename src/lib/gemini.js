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

