import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Code, Calendar, Briefcase } from 'lucide-react';

// Reusable Components
const GlowText = ({ children, className = '' }) => (
  <span className={`bg-gradient-to-r from-pink-400 via-purple-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(219,39,119,0.5)] ${className}`}>
    {children}
  </span>
);

const GradientButton = ({ children, to, className = '', icon }) => (
  <Link 
    to={to} 
    className={`group flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 shadow-[0_0_20px_rgba(219,39,119,0.4)] hover:shadow-[0_0_40px_rgba(219,39,119,0.7)] hover:scale-105 transition-all duration-300 ${className}`}
  >
    {children}
    {icon && <span className="group-hover:translate-x-1 group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,1)] transition-transform duration-300">{icon}</span>}
  </Link>
);

const GlassCard = ({ icon, title, desc, delay = '0ms' }) => (
  <div 
    className="p-6 rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20 hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(168,85,247,0.4)] hover:bg-white/15 transition-all duration-300 group opacity-0 animate-[fadeInUp_1s_ease-out_forwards]"
    style={{ animationDelay: delay }}
  >
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(219,39,119,0.6)] transition-all duration-300">
      {icon}
    </div>
    <h3 className="font-bold text-xl mb-3 text-white drop-shadow-md">{title}</h3>
    <p className="text-zinc-300 text-sm leading-relaxed font-light">{desc}</p>
  </div>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col relative overflow-hidden text-zinc-100 font-sans">
      {/* Animated Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-pink-600/20 blur-[150px] rounded-full pointer-events-none animate-[float_10s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none animate-[float_12s_ease-in-out_infinite_reverse]" style={{ animationDelay: '1s'}} />
      <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none animate-[float_14s_ease-in-out_infinite]" style={{ animationDelay: '2s'}} />

      {/* Glassmorphism Navbar */}
      <div className="fixed top-0 left-0 w-full z-50 px-6 py-4 animate-[fadeInDown_0.8s_ease-out_forwards]">
        <nav className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between bg-zinc-950/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <div className="text-2xl font-black tracking-tighter">
            <GlowText>TalentMash</GlowText>
          </div>
          <div className="flex gap-4 items-center">
            <Link to="/auth" className="px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors duration-200">
              Sign In
            </Link>
            <Link to="/auth?tab=register" className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-full shadow-[0_0_15px_rgba(219,39,119,0.5)] hover:shadow-[0_0_30px_rgba(219,39,119,0.8)] hover:scale-105 transition-all duration-300">
              Get Started
            </Link>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 z-10 mt-36 mb-24 opacity-0 animate-[fadeInUp_1s_ease-out_forwards]">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 max-w-5xl leading-[1.1] drop-shadow-2xl">
          Connect, Build, and <br/>
          <span className="inline-block pb-4">
            <GlowText>Accelerate Your Tech Journey</GlowText>
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mb-12 leading-relaxed font-light drop-shadow-sm">
          The ultimate professional network for college students. Find projects, team up for hackathons, and land your dream role all in one place.
        </p>
        <GradientButton to="/auth" icon={<ArrowRight className="w-6 h-6" />} className="px-10 py-5 text-xl">
          Join the Network
        </GradientButton>
      </main>

      {/* Section Divider */}
      <div className="w-full max-w-7xl mx-auto px-6 z-10 mb-12 opacity-0 animate-[fadeIn_1.5s_ease-out_forwards]" style={{ animationDelay: '0.5s' }}>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_15px_rgba(168,85,247,0.6)]"></div>
      </div>

      {/* Features Showcase */}
      <section className="w-full max-w-7xl mx-auto px-6 pb-24 z-10 hidden md:block">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <GlassCard 
            icon={<Users className="w-7 h-7 text-pink-400 drop-shadow-[0_0_10px_rgba(219,39,119,0.8)]" />}
            title="Smart Matchmaking"
            desc="Connect with talented peers in your domain."
            delay="0.2s"
          />
          <GlassCard 
            icon={<Code className="w-7 h-7 text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />}
            title="Project Collab"
            desc="Join forces to build resume-worthy side projects."
            delay="0.4s"
          />
          <GlassCard 
            icon={<Calendar className="w-7 h-7 text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />}
            title="Hackathons"
            desc="Find the perfect team based on complementary skills."
            delay="0.6s"
          />
          <GlassCard 
            icon={<Briefcase className="w-7 h-7 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />}
            title="Opportunities"
            desc="Get targeted internship and job recommendations."
            delay="0.8s"
          />
        </div>
      </section>
      
      {/* Inline styles for custom animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}
