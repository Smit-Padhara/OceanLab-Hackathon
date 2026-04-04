import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getHackathonSuggestions } from '../lib/gemini';

import {
  Loader2, Zap, Users, Trophy, Calendar, Globe, ExternalLink,
  X, Sparkles, ArrowRight, AlertCircle, CheckCircle2
} from 'lucide-react';
import { GlassCard } from '../components/WatermelonUI';

// ── Hackathon Detail Modal ─────────────────────────────────────────────────
function HackathonDetailModal({ hackathon, onClose }) {
  if (!hackathon) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[40px] border border-white/10 bg-[#0f0f13] shadow-[0_0_80px_rgba(168,85,247,0.15)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-2 w-full rounded-t-[40px] bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />
        <div className="p-8 md:p-10">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 flex-shrink-0">
              <Trophy className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white mb-1">{hackathon.name}</h2>
              <p className="text-sm text-purple-400 font-semibold">by {hackathon.organizer}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { icon: Globe, label: 'Mode', value: hackathon.mode },
              { icon: Trophy, label: 'Prize Pool', value: hackathon.prize_pool },
              { icon: Calendar, label: 'Deadline', value: hackathon.deadline },
              { icon: Users, label: 'Eligibility', value: hackathon.eligibility },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/5 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5 text-purple-400" />
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</p>
                </div>
                <p className="text-sm font-bold text-zinc-200">{value}</p>
              </div>
            ))}
          </div>

          <div className="mb-7">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">About this Hackathon</h3>
            <p className="text-zinc-300 leading-relaxed text-sm">{hackathon.description}</p>
          </div>

          {hackathon.domain_tags?.length > 0 && (
            <div className="mb-7">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Themes</h3>
              <div className="flex flex-wrap gap-2">
                {hackathon.domain_tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1.5 bg-pink-500/10 border border-pink-500/20 rounded-xl text-xs font-bold text-pink-400">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {hackathon.required_skills?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Skills You'll Use</h3>
              <div className="flex flex-wrap gap-2">
                {hackathon.required_skills.map((sk, i) => (
                  <span key={i} className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs font-bold text-blue-400">{sk}</span>
                ))}
              </div>
            </div>
          )}

          <a
            href={hackathon.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black rounded-2xl transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] hover:scale-[1.02]"
          >
            <ExternalLink className="w-4 h-4" />
            Visit Official Website
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Hackathons() {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [profile, setProfile] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hackathon suggestions state
  const [hackathons, setHackathons] = useState([]);
  const [loadingHackathons, setLoadingHackathons] = useState(false);
  const [selectedHackathon, setSelectedHackathon] = useState(null);

  // Team finder state
  const [teamForm, setTeamForm] = useState({ name: '', problem_statement: '', description: '' });
  const [skillTags, setSkillTags] = useState([]);   // array of added skill strings
  const [skillInput, setSkillInput] = useState(''); // current typing value
  const [teamResults, setTeamResults] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamSearched, setTeamSearched] = useState(false);

  const addSkillTag = (raw) => {
    const tag = raw.trim();
    if (tag && !skillTags.includes(tag)) {
      setSkillTags(prev => [...prev, tag]);
    }
    setSkillInput('');
  };

  const removeSkillTag = (tag) => {
    setSkillTags(prev => prev.filter(s => s !== tag));
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();          // don't submit the form
      addSkillTag(skillInput);
    } else if (e.key === ',') {
      e.preventDefault();
      addSkillTag(skillInput);
    } else if (e.key === 'Backspace' && skillInput === '' && skillTags.length > 0) {
      // Remove last tag with Backspace when input is empty
      setSkillTags(prev => prev.slice(0, -1));
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      const { data: conns } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const connIds = (conns || []).map(c => c.user1_id === user.id ? c.user2_id : c.user1_id);
      if (connIds.length > 0) {
        const { data: connProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, domain, skills, college')
          .in('id', connIds);
        setConnections(connProfiles || []);
      }

      setLoading(false);

      // Auto-fetch hackathon suggestions on load
      setLoadingHackathons(true);
      try {
        const suggestions = await getHackathonSuggestions(prof?.domain || 'Technology', prof?.skills || []);
        setHackathons(suggestions);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHackathons(false);
      }
    };
    init();
  }, []);

  const handleFindTeam = (e) => {
    e.preventDefault();
    if (!teamForm.name || skillTags.length === 0) return;

    setLoadingTeam(true);
    setTeamSearched(false);
    setTeamResults([]);

    // Parse required skills from the form input (comma separated)
    const requiredSkills = skillTags.map(s => s.toLowerCase());

    // For each connection, find how many of their skills match the required skills
    const matched = connections
      .map(conn => {
        const connSkills = (conn.skills || []).map(s => s.toLowerCase());

        // Find exact or partial matches
        const matchedSkills = requiredSkills.filter(req =>
          connSkills.some(cs => cs.includes(req) || req.includes(cs))
        );

        // Get the actual skill names from connection's profile (preserve original casing)
        const matchedSkillsDisplay = (conn.skills || []).filter(cs =>
          requiredSkills.some(req => cs.toLowerCase().includes(req) || req.includes(cs.toLowerCase()))
        );

        const matchScore = requiredSkills.length > 0
          ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
          : 0;

        // Infer a role based on the matched skills
        const roleHints = {
          'frontend': 'Frontend Developer', 'react': 'Frontend Developer', 'vue': 'Frontend Developer',
          'angular': 'Frontend Developer', 'html': 'Frontend Developer', 'css': 'Frontend Developer',
          'backend': 'Backend Developer', 'node': 'Backend Developer', 'python': 'Backend Developer',
          'django': 'Backend Developer', 'flask': 'Backend Developer', 'express': 'Backend Developer',
          'ml': 'ML Engineer', 'machine learning': 'ML Engineer', 'ai': 'ML Engineer',
          'tensorflow': 'ML Engineer', 'pytorch': 'ML Engineer', 'deep learning': 'ML Engineer',
          'ui': 'UI/UX Designer', 'ux': 'UI/UX Designer', 'figma': 'UI/UX Designer',
          'design': 'UI/UX Designer', 'mobile': 'Mobile Developer', 'flutter': 'Mobile Developer',
          'react native': 'Mobile Developer', 'android': 'Mobile Developer', 'ios': 'Mobile Developer',
          'blockchain': 'Blockchain Developer', 'web3': 'Blockchain Developer', 'solidity': 'Blockchain Developer',
          'data': 'Data Scientist', 'sql': 'Database Engineer', 'postgres': 'Database Engineer',
          'cloud': 'Cloud Engineer', 'aws': 'Cloud Engineer', 'gcp': 'Cloud Engineer', 'azure': 'Cloud Engineer',
          'devops': 'DevOps Engineer', 'docker': 'DevOps Engineer', 'kubernetes': 'DevOps Engineer',
        };

        let roleSuggestion = conn.domain ? `${conn.domain} Developer` : 'Team Member';
        for (const skill of matchedSkills) {
          for (const [key, role] of Object.entries(roleHints)) {
            if (skill.includes(key)) { roleSuggestion = role; break; }
          }
          if (roleSuggestion !== (conn.domain ? `${conn.domain} Developer` : 'Team Member')) break;
        }

        return {
          profile: conn,
          match_score: matchScore,
          matched_skills: matchedSkillsDisplay,
          role_suggestion: roleSuggestion,
          reason: matchedSkills.length > 0
            ? `${conn.full_name} has ${matchedSkills.length} matching skill${matchedSkills.length > 1 ? 's' : ''} (${matchedSkillsDisplay.slice(0, 3).join(', ')}) that align well with your hackathon requirements.`
            : `${conn.full_name} is in the ${conn.domain || 'tech'} domain and may bring complementary expertise.`
        };
      })
      .filter(r => r.match_score > 0)    // only show connections with at least one match
      .sort((a, b) => b.match_score - a.match_score); // sort by highest match first

    setTeamResults(matched);
    setLoadingTeam(false);
    setTeamSearched(true);
  };

  if (loading) {
    return <div className="h-full flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  }

  const tabs = [
    { id: 'suggestions', label: 'Hackathon Suggestions', icon: <Trophy className="w-4 h-4" />, color: 'from-purple-500 to-pink-500' },
    { id: 'team', label: 'Team Members Suggestion', icon: <Users className="w-4 h-4" />, color: 'from-blue-500 to-emerald-500' },
  ];

  return (
    <div className="p-2 md:p-6 animate-[fadeIn_0.4s_ease-out]">

      {/* ── Tab Bar ── */}
      <div className="flex gap-2 mb-10 overflow-x-auto whitespace-nowrap scrollbar-hide pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 relative overflow-hidden group ${
              activeTab === tab.id
                ? `bg-gradient-to-r ${tab.color} text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]`
                : 'text-zinc-500 hover:text-zinc-200 bg-white/5 border border-white/5 hover:border-white/10'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">

        {/* ── TAB 1: Hackathon Suggestions ── */}
        {activeTab === 'suggestions' && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                <Trophy className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white">Hackathon Suggestions</h2>
                <p className="text-sm text-zinc-500">
                  AI-curated real hackathons for your domain:{' '}
                  <span className="text-purple-400 font-bold">{profile?.domain}</span>
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-full border border-purple-500/20">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-black text-purple-400">Powered by Gemini</span>
              </div>
            </div>

            {/* Cards */}
            {loadingHackathons ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <GlassCard key={i} className="h-64 rounded-[32px] border-white/5 animate-pulse flex flex-col gap-4 p-6">
                    <div className="h-4 bg-white/5 rounded-full w-3/4" />
                    <div className="h-3 bg-white/5 rounded-full w-1/2" />
                    <div className="flex-1 bg-white/3 rounded-2xl" />
                  </GlassCard>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hackathons.map((h, i) => (
                  <GlassCard
                    key={i}
                    className="p-6 rounded-[32px] flex flex-col group border-white/5 hover:border-purple-500/25 hover:shadow-[0_0_50px_rgba(168,85,247,0.12)] relative overflow-hidden transition-all duration-300"
                  >
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/5 blur-[60px] rounded-full group-hover:bg-purple-500/10 transition-all" />

                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                        h.mode === 'Online' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : h.mode === 'In-person' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>{h.mode}</span>
                      <div className="flex items-center gap-1 text-amber-400">
                        <Trophy className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold truncate max-w-[100px]">{h.prize_pool}</span>
                      </div>
                    </div>

                    <h3 className="font-black text-xl text-zinc-100 mb-1 group-hover:text-purple-300 transition-colors line-clamp-2">{h.name}</h3>
                    <p className="text-xs font-semibold text-purple-400/80 mb-3">by {h.organizer}</p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {h.domain_tags?.slice(0, 3).map((tag, ti) => (
                        <span key={ti} className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] text-zinc-400 font-bold">{tag}</span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 mb-5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-xs text-zinc-500 font-medium">{h.deadline}</span>
                    </div>

                    <button
                      onClick={() => setSelectedHackathon(h)}
                      className="mt-auto w-full py-3 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 text-white font-black rounded-2xl text-sm transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                    >
                      View Details
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: Team Members Suggestion ── */}
        {activeTab === 'team' && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 rounded-3xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                <Users className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white">Team Members Suggestion</h2>
                <p className="text-sm text-zinc-500">Find the perfect teammates from your connections using AI skill matching</p>
              </div>
              <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black text-blue-400">AI Matched</span>
              </div>
            </div>

            <div className="grid lg:grid-cols-[420px_1fr] gap-8 items-start">
              {/* Form Card */}
              <GlassCard className="p-7 rounded-[40px] border-white/5 sticky top-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500" />
                <h3 className="text-lg font-black text-zinc-100 mb-1">Your Hackathon Details</h3>
                <p className="text-xs text-zinc-500 mb-6">Fill in details and AI will match connections with the best fitting skills</p>

                <form onSubmit={handleFindTeam} className="space-y-5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Hackathon Name *</label>
                    <input
                      value={teamForm.name}
                      onChange={e => setTeamForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Smart India Hackathon 2025"
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Problem Statement</label>
                    <textarea
                      value={teamForm.problem_statement}
                      onChange={e => setTeamForm(p => ({ ...p, problem_statement: e.target.value }))}
                      placeholder="What problem are you solving?"
                      rows={2}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 text-sm resize-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Brief Description</label>
                    <textarea
                      value={teamForm.description}
                      onChange={e => setTeamForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Describe what you plan to build..."
                      rows={3}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 text-sm resize-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Required Skills *</label>
                    <div
                      className="flex flex-wrap gap-2 min-h-[48px] px-3 py-2 bg-white/5 border border-white/10 rounded-2xl focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all cursor-text"
                      onClick={() => document.getElementById('skill-tag-input').focus()}
                    >
                      {skillTags.map((tag, i) => (
                        <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 border border-blue-500/30 rounded-xl text-xs font-bold text-blue-300">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeSkillTag(tag)}
                            className="text-blue-400 hover:text-white transition-colors leading-none"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        id="skill-tag-input"
                        type="text"
                        value={skillInput}
                        onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={handleSkillKeyDown}
                        onBlur={() => { if (skillInput.trim()) addSkillTag(skillInput); }}
                        placeholder={skillTags.length === 0 ? 'Type a skill and press Enter...' : 'Add more...'}
                        className="flex-1 min-w-[120px] bg-transparent text-white placeholder-zinc-600 text-sm focus:outline-none py-1"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-1.5">Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">,</kbd> after each skill</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingTeam || connections.length === 0 || skillTags.length === 0}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                  >
                    {loadingTeam
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing connections...</>
                      : <><Sparkles className="w-4 h-4" /> Find Best Teammates</>
                    }
                  </button>

                  {connections.length === 0 && (
                    <p className="text-xs text-amber-400/80 text-center bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                      You need connections to use this feature. Connect with people first!
                    </p>
                  )}
                </form>
              </GlassCard>

              {/* Results Panel */}
              <div className="space-y-4">
                {loadingTeam && (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                      <Zap className="absolute inset-0 m-auto w-6 h-6 text-blue-400" />
                    </div>
                    <p className="text-zinc-400 text-sm font-medium">Gemini AI is analyzing your connections...</p>
                    <p className="text-zinc-600 text-xs">Matching skills to roles</p>
                  </div>
                )}

                {!loadingTeam && !teamSearched && (
                  <div className="py-24 text-center rounded-[40px] border border-dashed border-zinc-800">
                    <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-zinc-700" />
                    </div>
                    <p className="text-zinc-400 font-bold text-lg">Ready to build your dream team?</p>
                    <p className="text-xs text-zinc-600 mt-2 max-w-xs mx-auto">Fill in your hackathon details on the left and AI will match your connections to the perfect roles</p>
                  </div>
                )}

                {!loadingTeam && teamSearched && teamResults.length === 0 && (
                  <div className="py-24 text-center rounded-[40px] border border-dashed border-zinc-800">
                    <AlertCircle className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-400 font-bold">No strong matches found</p>
                    <p className="text-xs text-zinc-600 mt-2">Try different skills or expand your connections network</p>
                  </div>
                )}

                {!loadingTeam && teamResults.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <p className="text-sm font-bold text-emerald-400">
                        {teamResults.length} teammate{teamResults.length > 1 ? 's' : ''} matched for <span className="text-white">{teamForm.name}</span>
                      </p>
                    </div>

                    {teamResults.map((result, i) => {
                      const p = result.profile;
                      const scoreColor =
                        result.match_score >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : result.match_score >= 60 ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

                      return (
                        <GlassCard key={i} className="p-5 rounded-[28px] border-white/5 hover:border-blue-500/20 transition-all group">
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-800 flex-shrink-0 ring-2 ring-white/5 group-hover:ring-blue-500/20 transition-all">
                              {p?.avatar_url
                                ? <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-xl font-black text-zinc-500">{p?.full_name?.charAt(0)}</div>
                              }
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap mb-0.5">
                                <h4 className="font-black text-lg text-zinc-100">{p?.full_name}</h4>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${scoreColor}`}>
                                  {result.match_score}% match
                                </span>
                              </div>
                              <p className="text-xs text-purple-400 font-bold mb-1">{result.role_suggestion}</p>
                              <p className="text-xs text-zinc-500 mb-3">{p?.domain}{p?.college ? ` · ${p.college}` : ''}</p>

                              {result.matched_skills?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {result.matched_skills.map((sk, si) => (
                                    <span key={si} className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-bold text-blue-400">
                                      ✓ {sk}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <p className="text-xs text-zinc-400 leading-relaxed italic">{result.reason}</p>
                            </div>

                            <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center border font-black text-lg ${scoreColor}`}>
                              {result.match_score}
                            </div>
                          </div>
                        </GlassCard>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedHackathon && (
        <HackathonDetailModal hackathon={selectedHackathon} onClose={() => setSelectedHackathon(null)} />
      )}
    </div>
  );
}
