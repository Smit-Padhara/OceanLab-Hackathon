import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MessageSquare, Users, Loader2 } from 'lucide-react';

export default function MyConnections() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchConnections = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }

      // Fetch all connection pairs involving current user
      const { data: conns } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!conns || conns.length === 0) { setLoading(false); return; }

      const peerIds = conns.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, domain, college, branch, year, skills')
        .in('id', peerIds);

      setConnections(profiles || []);
      setLoading(false);
    };

    fetchConnections();
  }, []);

  const filtered = connections.filter(c =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.college?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[10%] left-[5%] w-[35%] h-[35%] bg-pink-600/8 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[35%] h-[35%] bg-blue-600/8 blur-[160px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="h-16 border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <Link to="/profile" className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Profile
        </Link>
        <span className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
          My Connections
        </span>
        <div className="w-32" />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 relative z-10">
        {/* Count + Search Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">
                Connections
              </span>
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              {connections.length} {connections.length === 1 ? 'person' : 'people'} in your network
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72 group">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-pink-400 transition-colors" />
            <input
              type="text"
              placeholder="Search connections..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500/40 hover:bg-white/8 transition-all"
            />
          </div>
        </div>

        {/* Empty State */}
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center">
              <Users className="w-10 h-10 text-purple-400 opacity-60" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-300">No connections yet</h3>
            <p className="text-zinc-500 text-sm max-w-xs">
              Start connecting with people in your domain to grow your network.
            </p>
            <Link
              to="/dashboard"
              className="mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-pink-500/80 to-purple-600/80 text-white text-sm font-semibold hover:from-pink-500 hover:to-purple-600 transition-all shadow-[0_0_20px_rgba(219,39,119,0.3)]"
            >
              Discover People
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            No connections match "<span className="text-zinc-300">{searchQuery}</span>"
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(conn => (
              <div
                key={conn.id}
                className="group flex gap-4 items-start p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/8 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)]"
              >
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-800 border-2 border-transparent group-hover:border-purple-500/40 transition-colors flex-shrink-0">
                  {conn.avatar_url ? (
                    <img src={conn.avatar_url} alt={conn.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-zinc-400">
                      {conn.full_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-zinc-100 truncate">{conn.full_name}</h3>
                  <p className="text-xs text-zinc-400 truncate">{conn.college}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-purple-400">{conn.domain}</span>
                    {conn.branch && (
                      <span className="text-xs text-zinc-500">{conn.branch} {conn.year && `· ${conn.year}`}</span>
                    )}
                  </div>

                  {/* Skills */}
                  {conn.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {conn.skills.slice(0, 3).map((sk, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[11px] text-zinc-300">
                          {sk}
                        </span>
                      ))}
                      {conn.skills.length > 3 && (
                        <span className="text-[11px] text-zinc-500">+{conn.skills.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Message Button */}
                <button
                  onClick={() => navigate(`/messages?with=${conn.id}`)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Message
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
