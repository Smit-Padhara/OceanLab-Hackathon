import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Loader2, Search, MessageSquare, Bell, Users, Code, Calendar, Briefcase, LogOut } from 'lucide-react';

import Connections from './Connections';
const Projects = () => <div className="p-6"><h2 className="text-2xl font-bold mb-4">Projects</h2><p className="text-zinc-400">Discover and join projects.</p></div>;
const Hackathons = () => <div className="p-6"><h2 className="text-2xl font-bold mb-4">Hackathons</h2><p className="text-zinc-400">Find hackathons and teammates.</p></div>;
const Opportunities = () => <div className="p-6"><h2 className="text-2xl font-bold mb-4">Opportunities</h2><p className="text-zinc-400">Internship and job postings.</p></div>;

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [connectionCount, setConnectionCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

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
        fetchNotificationsAndCount(user.id);
      }
      setLoading(false);
    };

    const fetchNotificationsAndCount = async (userId) => {
      try {
        // Fetch connections count
        const { count } = await supabase
          .from('connections')
          .select('*', { count: 'exact', head: true })
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
          
        setConnectionCount(count || 0);

        // Fetch pending requests
        const { data: requests } = await supabase
          .from('connection_requests')
          .select('*')
          .eq('receiver_id', userId)
          .eq('status', 'pending');

        if (requests && requests.length > 0) {
          const senderIds = requests.map(r => r.sender_id);
          const { data: senders } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, domain, college')
            .in('id', senderIds);

          const enriched = requests.map(r => ({
            ...r,
            sender: senders?.find(s => s.id === r.sender_id)
          })).filter(r => r.sender); // ensure sender exists
          
          setConnectionRequests(enriched);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchSession();

    // Real-time listener for connection requests and connections
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'connection_requests',
        filter: `receiver_id=eq.${profile?.id}` 
      }, () => {
        if (profile) fetchNotificationsAndCount(profile.id);
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'connections'
      }, (payload) => {
        if (profile && (payload.new.user1_id === profile.id || payload.new.user2_id === profile.id)) {
          fetchNotificationsAndCount(profile.id);
          // Also trigger the local event in case we're on the connections tab
          window.dispatchEvent(new CustomEvent('connectionAccepted', { 
            detail: payload.new.user1_id === profile.id ? payload.new.user2_id : payload.new.user1_id 
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, profile?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleAcceptRequest = async (request) => {
    try {
      // 1. Update status
      await supabase
        .from('connection_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      // 2. Insert into connections (sort IDs to satisfy the check constraint)
      const ids = [request.sender_id, profile.id].sort();
      await supabase
        .from('connections')
        .insert({
          user1_id: ids[0],
          user2_id: ids[1]
        });

      // 3. Update UI state
      setConnectionRequests(prev => prev.filter(r => r.id !== request.id));
      setConnectionCount(prev => prev + 1);
      
      // Notify the Connections component to update its visible state immediately
      window.dispatchEvent(new CustomEvent('connectionAccepted', { detail: request.sender_id }));
    } catch (err) {
      console.error('Error accepting request:', err);
    }
  };

  const handleRejectRequest = async (requestId, senderId) => {
    try {
      await supabase
        .from('connection_requests')
        .delete()
        .eq('id', requestId);

      setConnectionRequests(prev => prev.filter(r => r.id !== requestId));
      // Notify Connections UI to update locally
      window.dispatchEvent(new CustomEvent('requestRejected', { detail: senderId }));
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
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
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {connectionRequests.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(219,39,119,0.8)] border-2 border-zinc-900"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl animate-[fadeIn_0.2s_ease-out] z-50 overflow-hidden">
                <div className="p-4 border-b border-zinc-800/60 flex justify-between items-center bg-white/5">
                  <h3 className="font-semibold text-zinc-100">Notifications</h3>
                  {connectionRequests.length > 0 && (
                    <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full font-medium">
                      {connectionRequests.length} pending
                    </span>
                  )}
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {connectionRequests.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 flex flex-col items-center gap-2">
                      <Bell className="w-8 h-8 opacity-20" />
                      <p className="text-sm">No new notifications</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {connectionRequests.map(req => (
                        <div key={req.id} className="p-4 border-b border-zinc-800/40 hover:bg-white/5 transition-colors group">
                          <div className="flex gap-3 items-start">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700 group-hover:border-pink-500/50 transition-colors">
                              {req.sender?.avatar_url ? (
                                <img src={req.sender.avatar_url} alt={req.sender.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex justify-center items-center font-bold text-zinc-400 text-sm">
                                  {req.sender?.full_name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-zinc-300">
                                <span className="font-semibold text-white">{req.sender?.full_name}</span> wants to connect.
                              </p>
                              <p className="text-xs text-purple-400 mt-0.5">{req.sender?.domain}</p>
                              
                              <div className="flex gap-2 mt-3">
                                <button 
                                  onClick={() => handleAcceptRequest(req)}
                                  className="flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500/80 to-purple-600/80 text-white hover:from-pink-500 hover:to-purple-600 transition-all shadow-[0_0_10px_rgba(219,39,119,0.3)] hover:shadow-[0_0_15px_rgba(219,39,119,0.5)]"
                                >
                                  Accept
                                </button>
                                <button 
                                  onClick={() => handleRejectRequest(req.id, req.sender_id)}
                                  className="flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all border border-zinc-700/50"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <Link to="/messages" className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
            <MessageSquare className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full pt-6 px-6 gap-8">
        
        {/* Sidebar */}
        <aside className="w-72 hidden md:flex flex-col gap-6 flex-shrink-0">
          
          {/* User Snapshot */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-6 flex flex-col items-center text-center">
            <Link to="/profile" title="View Profile" className="w-20 h-20 rounded-full bg-zinc-800 mb-4 overflow-hidden outline outline-2 outline-offset-2 outline-zinc-800 hover:outline-pink-500 hover:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(219,39,119,0.4)] cursor-pointer block">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-zinc-800 text-zinc-400">
                  {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
                </div>
              )}
            </Link>
            <Link to="/profile" className="font-semibold text-lg text-zinc-100 hover:text-pink-400 transition-colors">
              {profile.full_name}
            </Link>
            <p className="text-zinc-400 text-sm mb-3">{profile.branch} {profile.year && `• ${profile.year}`}</p>
            <div className="bg-purple-500/10 text-purple-400 text-xs font-medium px-3 py-1 rounded-full border border-purple-500/20">
              {profile.domain}
            </div>
            
            <div className="w-full h-px bg-zinc-800/60 my-5"></div>
            
            <div className="w-full flex justify-between text-sm">
              <span className="text-zinc-500">Connections</span>
              <span className="font-semibold text-zinc-300">{connectionCount}</span>
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
