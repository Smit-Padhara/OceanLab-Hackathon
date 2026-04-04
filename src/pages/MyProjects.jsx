import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Code, Briefcase, ExternalLink, User, Folder, Layout, CheckCircle2, Clock } from 'lucide-react';
import { GlassCard, GlowText } from '../components/WatermelonUI';

export default function MyProjects() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('created');
  const [createdProjects, setCreatedProjects] = useState([]);
  const [joinedProjects, setJoinedProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

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
      // 1. Fetch Created Projects (where I am the creator)
      const { data: created, error: createdError } = await supabase
        .from('projects')
        .select('*')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (createdError) throw createdError;
      setCreatedProjects(created || []);

      // 2. Fetch Joined Projects
      // We look for project_requests where user_id is the current user and status is 'accepted'
      const { data: requests, error: requestsError } = await supabase
        .from('project_requests')
        .select(`
          status,
          project:projects(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (requestsError) throw requestsError;
      
      // Map to project objects and filter out any where the user is ALSO the creator (just in case)
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
            {projectsToShow.map((p, i) => (
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
                <p className="text-zinc-500 text-sm mb-8 line-clamp-4 leading-relaxed flex-grow">
                  {p.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-8">
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

                <div className="pt-6 border-t border-zinc-800/40 flex items-center justify-between">
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
    </div>
  );
}
