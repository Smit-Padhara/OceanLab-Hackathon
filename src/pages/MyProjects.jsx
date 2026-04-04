import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import {
  Loader2, ArrowLeft, Code, Briefcase, ExternalLink, User,
  Folder, Layout, CheckCircle2, Clock, Users, X, Crown
} from 'lucide-react';
import { GlassCard, GlowText } from '../components/WatermelonUI';

// ── Member List Modal ──────────────────────────────────────────────────────
function MemberListModal({ project, onClose }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        // Fetch all accepted requests for this project where the user is NOT the creator
        const { data, error } = await supabase
          .from('project_requests')
          .select(`
            user_id,
            created_at,
            member:profiles!project_requests_user_id_fkey(
              id, full_name, avatar_url, domain, skills, college
            )
          `)
          .eq('project_id', project.id)
          .eq('status', 'accepted')
          .neq('user_id', project.creator_id);

        if (error) throw error;
        setMembers(data || []);
      } catch (err) {
        console.error('Error fetching members:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [project.id, project.creator_id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-[40px] border border-white/10 bg-[#0f0f13] shadow-[0_0_80px_rgba(168,85,247,0.15)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 flex-shrink-0" />

        {/* Header */}
        <div className="px-8 pt-7 pb-5 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-purple-500/10 rounded-2xl border border-purple-500/20">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-black text-white">Team Members</h2>
          </div>
          <p className="text-sm text-zinc-500 font-medium">
            <span className="text-purple-400 font-bold">{project.name}</span>
            {' '}· {members.length} member{members.length !== 1 ? 's' : ''} joined
          </p>
        </div>

        {/* Scrollable member list */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
              <p className="text-sm text-zinc-500">Loading members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center">
                <Users className="w-8 h-8 text-zinc-700" />
              </div>
              <p className="text-zinc-400 font-bold">No members yet</p>
              <p className="text-xs text-zinc-600 text-center max-w-[200px]">
                Accept join requests or invite people from the Projects tab
              </p>
            </div>
          ) : (
            members.map((m, i) => {
              const p = m.member;
              if (!p) return null;
              return (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 bg-white/3 border border-white/5 hover:border-purple-500/20 rounded-2xl transition-all group"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-800 flex-shrink-0 ring-2 ring-white/5 group-hover:ring-purple-500/20 transition-all">
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg font-black text-zinc-500">
                          {p.full_name?.charAt(0)}
                        </div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-zinc-100 text-sm truncate">{p.full_name}</p>
                    <p className="text-xs text-purple-400 font-semibold truncate">{p.domain}</p>
                    {p.college && <p className="text-[10px] text-zinc-600 truncate">{p.college}</p>}
                  </div>

                  {/* Skills */}
                  {p.skills?.length > 0 && (
                    <div className="hidden sm:flex flex-shrink-0 flex-wrap gap-1 max-w-[130px] justify-end">
                      {p.skills.slice(0, 2).map((sk, si) => (
                        <span key={si} className="px-2 py-1 bg-blue-500/10 border border-blue-500/15 rounded-lg text-[10px] font-bold text-blue-400">
                          {sk}
                        </span>
                      ))}
                      {p.skills.length > 2 && (
                        <span className="text-[10px] text-zinc-600 font-bold self-center">+{p.skills.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function MyProjects() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('created');
  const [createdProjects, setCreatedProjects] = useState([]);
  const [joinedProjects, setJoinedProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Member modal state
  const [viewMembersProject, setViewMembersProject] = useState(null);

  useEffect(() => {
    const checkUserAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setCurrentUser(user);
      await fetchProjects(user.id);
      setLoading(false);
    };
    checkUserAndFetch();

    const handleUpdate = () => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) fetchProjects(user.id);
      });
    };

    window.addEventListener('projectRequestUpdated', handleUpdate);
    return () => window.removeEventListener('projectRequestUpdated', handleUpdate);
  }, [navigate]);

  const fetchProjects = async (userId) => {
    try {
      const { data: created, error: createdError } = await supabase
        .from('projects')
        .select('*')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (createdError) throw createdError;
      setCreatedProjects(created || []);

      const { data: requests, error: requestsError } = await supabase
        .from('project_requests')
        .select(`status, project:projects(*)`)
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (requestsError) throw requestsError;

      const joined = (requests || [])
        .map(r => r.project)
        .filter(p => p && p.creator_id !== userId);

      setJoinedProjects(joined);
    } catch (err) {
      console.error('Error fetching my projects:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const projectsToShow = activeTab === 'created' ? createdProjects : joinedProjects;

  return (
    <div className="min-h-screen bg-zinc-950 font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-purple-600/10 blur-[180px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[40%] h-[40%] bg-pink-600/10 blur-[180px] rounded-full pointer-events-none" />

      {/* Top Navbar */}
      <header className="h-16 border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur-md px-6 flex items-center sticky top-0 z-40">
        <Link to="/profile" className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Profile
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-black mb-2 tracking-tight"><GlowText>My Projects</GlowText></h2>
            <p className="text-zinc-500 font-medium tracking-wide">Manage the labs you built and the missions you joined.</p>
          </div>

          <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-sm self-start">
            <button
              onClick={() => setActiveTab('created')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'created' ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Briefcase className="w-4 h-4" />
              CREATED ({createdProjects.length})
            </button>
            <button
              onClick={() => setActiveTab('joined')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'joined' ? 'bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Layout className="w-4 h-4" />
              JOINED ({joinedProjects.length})
            </button>
          </div>
        </div>

        {projectsToShow.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-[fadeInUp_0.5s_ease-out]">
            {projectsToShow.map((p) => (
              <GlassCard key={p.id} className="p-8 rounded-[40px] flex flex-col group border-white/5 hover:border-purple-500/20 hover:shadow-[0_0_50px_rgba(168,85,247,0.12)] relative overflow-hidden h-full">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/5 blur-[70px] rounded-full group-hover:bg-purple-500/10" />

                <div className="mb-6 flex justify-between items-start">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-purple-500/10 transition-all">
                    {activeTab === 'created' ? <Code className="w-6 h-6 text-purple-400" /> : <Layout className="w-6 h-6 text-pink-400" />}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${activeTab === 'created' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-pink-400 bg-pink-500/10 border-pink-500/20'}`}>
                    {p.domain}
                  </span>
                </div>

                <h4 className={`font-black text-2xl text-zinc-100 mb-3 transition-colors ${activeTab === 'created' ? 'group-hover:text-purple-400' : 'group-hover:text-pink-400'}`}>
                  {p.name}
                </h4>
                <p className="text-zinc-500 text-sm mb-6 line-clamp-3 leading-relaxed flex-grow">
                  {p.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {p.required_skills?.slice(0, 3).map((s, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[11px] text-zinc-400">
                      {s}
                    </span>
                  ))}
                  {p.required_skills?.length > 3 && (
                    <span className="px-3 py-1.5 text-[11px] text-zinc-600 font-bold">
                      +{p.required_skills.length - 3} MORE
                    </span>
                  )}
                </div>

                {/* View Members button — only on Created tab */}
                {activeTab === 'created' && (
                  <button
                    onClick={() => setViewMembersProject(p)}
                    className="w-full mb-4 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 rounded-2xl text-sm font-bold text-zinc-400 hover:text-purple-300 transition-all group/btn"
                  >
                    <Users className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    View Member List
                  </button>
                )}

                <div className="pt-4 border-t border-zinc-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">
                      {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/10">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-tight">ACTIVE</span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="py-24 text-center rounded-[40px] border-dashed border-zinc-800/50">
            <div className="max-w-xs mx-auto">
              <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5">
                <Folder className="w-10 h-10 text-zinc-700" />
              </div>
              <h3 className="text-xl font-bold text-zinc-300 mb-2">No projects found</h3>
              <p className="text-zinc-500 text-sm mb-8">You haven't {activeTab} any projects yet. Start your journey from the Dashboard!</p>
              <Link to="/dashboard/projects" className="px-8 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 rounded-2xl text-xs font-black transition-all">
                GO TO PROJECTS
              </Link>
            </div>
          </GlassCard>
        )}
      </main>

      {/* Member List Modal */}
      {viewMembersProject && (
        <MemberListModal
          project={viewMembersProject}
          onClose={() => setViewMembersProject(null)}
        />
      )}
    </div>
  );
}
