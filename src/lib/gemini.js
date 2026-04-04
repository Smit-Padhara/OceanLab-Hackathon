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
    
    // Attempt to parse JSON from the response text
    // Sometimes Gemini adds ```json ... ``` blocks, we handle that
    const cleanJson = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Return some fallback suggestions if API fails
    return [
      { name: "Global Supply Chain Optimizer", description: "Design a dashboard to track and predict logistics bottlenecks using real-time data.", domain: userDomain, required_skills: ["Data Science", "React", "Python"] },
      { name: "Community Resource Hub", description: "A platform for locals to share and trade tools, skills, and resources within their neighborhood.", domain: userDomain, required_skills: ["Firebase", "Next.js", "Tailwind"] },
      { name: "Smart Healthcare Advisor", description: "An AI-powered triage system that suggests home care or immediate doctor visits based on symptoms.", domain: userDomain, required_skills: ["AI/ML", "Healthcare API", "Security"] },
      { name: "Eco-Track Carbon Footprint", description: "Monitor your daily environmental impact and get actionable suggestions for a greener lifestyle.", domain: userDomain, required_skills: ["FastAPI", "PostgreSQL", "Analytics"] },
      { name: "Remote Learning Collaborator", description: "An interactive white-boarding tool designed for real-time peer teaching across different regions.", domain: userDomain, required_skills: ["WebSockets", "Canvas API", "Redux"] }
    ].slice(0, 5);
  }
};
