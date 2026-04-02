import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Loader2, Search, MessageSquare, Bell, Users, Code, Calendar, Briefcase, LogOut } from 'lucide-react';

const Connections = () => <div className="p-6"><h2 className="text-2xl font-bold mb-4">Connections</h2><p className="text-zinc-400">Matchmaking and networking area.</p></div>;
const Projects = () => <div className="p-6"><h2 className="text-2xl font-bold mb-4">Projects</h2><p className="text-zinc-400">Discover and join projects.</p></div>;
const Hackathons = () => <div className="p-6"><h2 className="text-2xl font-bold mb-4">Hackathons</h2><p className="text-zinc-400">Find hackathons and teammates.</p></div>;
const Opportunities = () => <div className="p-6"><h2 className="text-2xl font-bold mb-4">Opportunities</h2><p className="text-zinc-400">Internship and job postings.</p></div>;

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      if (error || !data) {
        navigate('/auth'); // In case of missing row
      } else if (!data.is_onboarded) {
        navigate('/onboarding');
      } else {
        setProfile(data);
      }
      setLoading(false);
    };
    fetchSession();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  if (!profile) return null;

  const navItems = [
    { name: 'Connections', path: '/dashboard', icon: <Users className="w-5 h-5" /> },
    { name: 'Projects', path: '/dashboard/projects', icon: <Code className="w-5 h-5" /> },
    { name: 'Hackathons', path: '/dashboard/hackathons', icon: <Calendar className="w-5 h-5" /> },
    { name: 'Opportunities', path: '/dashboard/opportunities', icon: <Briefcase className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
            TalentMash
          </Link>
          <div className="hidden md:flex relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search peers, skills..." 
              className="pl-10 pr-4 py-2 bg-zinc-950/50 border border-zinc-800 rounded-full text-sm outline-none w-64 focus:border-purple-500/50 focus:w-80 transition-all text-white placeholder-zinc-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full"></span>
          </button>
          <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full pt-6 px-6 gap-8">
        
        {/* Sidebar */}
        <aside className="w-72 hidden md:flex flex-col gap-6 flex-shrink-0">
          
          {/* User Snapshot */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-800 mb-4 overflow-hidden outline outline-2 outline-offset-2 outline-zinc-800">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-zinc-800 text-zinc-400">
                  {profile.full_name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <h2 className="font-semibold text-lg text-zinc-100">{profile.full_name}</h2>
            <p className="text-zinc-400 text-sm mb-3">{profile.branch} • {profile.year}</p>
            <div className="bg-purple-500/10 text-purple-400 text-xs font-medium px-3 py-1 rounded-full border border-purple-500/20">
              {profile.domain}
            </div>
            
            <div className="w-full h-px bg-zinc-800/60 my-5"></div>
            
            <div className="w-full flex justify-between text-sm">
              <span className="text-zinc-500">Connections</span>
              <span className="font-semibold text-zinc-300">0</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {navItems.map(item => {
              const isActive = item.path === '/dashboard' 
                ? location.pathname === '/dashboard' 
                : location.pathname.startsWith(item.path);
              
              return (
                <Link 
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-zinc-800/80 text-white shadow-sm' 
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              )
            })}
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/10 mt-4 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-zinc-900/30 border border-zinc-800/40 rounded-3xl min-h-[500px] overflow-hidden mb-6">
          <Routes>
            <Route path="/" element={<Connections />} />
            <Route path="projects" element={<Projects />} />
            <Route path="hackathons" element={<Hackathons />} />
            <Route path="opportunities" element={<Opportunities />} />
          </Routes>
        </main>

      </div>
    </div>
  );
}
