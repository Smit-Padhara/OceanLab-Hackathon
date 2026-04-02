import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Code, Calendar, Briefcase } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="text-2xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
          TalentMash
        </div>
        <div className="flex gap-4">
          <Link to="/auth" className="px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors duration-200">
            Sign In
          </Link>
          <Link to="/auth?tab=register" className="px-5 py-2.5 text-sm font-medium bg-white text-zinc-950 rounded-full hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-200">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 z-10 mt-12 mb-24">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 max-w-5xl leading-[1.1]">
          Connect, Build, and <br/>
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-500 bg-clip-text text-transparent inline-block pb-2">
            Accelerate Your Tech Journey
          </span>
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed font-light">
          The ultimate professional network for college students. Find projects, team up for hackathons, and land your dream role all in one place.
        </p>
        <Link 
          to="/auth" 
          className="group flex items-center gap-2 px-8 py-4 bg-white text-zinc-950 rounded-full font-semibold text-lg hover:bg-zinc-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          Join the Network
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </main>

      {/* Features Showcase */}
      <section className="w-full max-w-7xl mx-auto px-6 py-24 border-t border-zinc-800/50 z-10 hidden md:block">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <FeatureCard 
            icon={<Users className="w-6 h-6 text-purple-400" />}
            title="Smart Matchmaking"
            desc="Connect with talented peers in your domain."
          />
          <FeatureCard 
            icon={<Code className="w-6 h-6 text-blue-400" />}
            title="Project Collab"
            desc="Join forces to build resume-worthy side projects."
          />
          <FeatureCard 
            icon={<Calendar className="w-6 h-6 text-pink-400" />}
            title="Hackathons"
            desc="Find the perfect team based on complementary skills."
          />
          <FeatureCard 
            icon={<Briefcase className="w-6 h-6 text-emerald-400" />}
            title="Opportunities"
            desc="Get targeted internship and job recommendations."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-xl hover:bg-zinc-800/50 transition-colors duration-200">
      <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2 text-zinc-100">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}
