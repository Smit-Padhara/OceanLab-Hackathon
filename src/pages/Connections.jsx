import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Users, Plus, X, Loader2, Check, Clock, MessageSquare } from 'lucide-react';
import { GlassCard, GradientButton, InputField } from '../components/WatermelonUI';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <GlassCard className="w-full max-w-md p-6 rounded-3xl relative animate-[scaleIn_0.2s_ease-out] shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500 mb-6">{title}</h3>
        {children}
      </GlassCard>
    </div>
  );
};

export default function Connections() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('people');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  
  // Data State
  const [users, setUsers] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [myDomain, setMyDomain] = useState('');
  const [mySkills, setMySkills] = useState([]);
  const [requestedUsers, setRequestedUsers] = useState(new Set());
  const [pendingReceived, setPendingReceived] = useState(new Set());
  const [establishedConnections, setEstablishedConnections] = useState(new Set());
  const [joinedCommunities, setJoinedCommunities] = useState(new Set());
  
  // Create Community State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCommunity, setNewCommunity] = useState({ name: '', domain: '' });
  const [creating, setCreating] = useState(false);
  
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetchData();
  }, []);

  // Separate effect: subscribe to realtime after currentUser is set from fetchData
  useEffect(() => {
    if (!currentUser) return;

    // Realtime: when a new connection is created that involves current user
    const channel = supabase.channel(`connections-for-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'connections'
      }, (payload) => {
        const { user1_id, user2_id } = payload.new;
        // Only react if this connection involves me
        if (user1_id === currentUser.id || user2_id === currentUser.id) {
          const otherUserId = user1_id === currentUser.id ? user2_id : user1_id;
          // Add to established connections — causes "Message" button to show for both users
          setEstablishedConnections(prev => new Set([...prev, otherUserId]));
          // Remove from pending states
          setRequestedUsers(prev => { const s = new Set(prev); s.delete(otherUserId); return s; });
          setPendingReceived(prev => { const s = new Set(prev); s.delete(otherUserId); return s; });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);



  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      // Fetch current user's own profile to get domain + skills
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('domain, skills')
        .eq('id', user.id)
        .single();

      const myDomain = myProfile?.domain || '';
      const mySkills = myProfile?.skills || [];
      setMyDomain(myDomain);
      setMySkills(mySkills);

      // Fetch ALL users (domain filtering happens on frontend)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id);

      // Compute common skills for all users
      const enriched = (profilesData || []).map(p => {
        const theirSkills = p.skills || [];
        const commonCount = theirSkills.filter(s =>
          mySkills.some(ms => ms.toLowerCase() === s.toLowerCase())
        ).length;
        return { ...p, _commonSkills: commonCount };
      });

      setUsers(enriched);

      // Fetch user's pending sent requests
      const { data: sentRequests } = await supabase
        .from('connection_requests')
        .select('receiver_id')
        .eq('sender_id', user.id)
        .eq('status', 'pending');
      setRequestedUsers(new Set(sentRequests?.map(r => r.receiver_id) || []));

      // Fetch user's pending received requests
      const { data: receivedRequests } = await supabase
        .from('connection_requests')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
      setPendingReceived(new Set(receivedRequests?.map(r => r.sender_id) || []));

      // Fetch established connections
      const { data: connectionsData } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      const connSet = new Set();
      connectionsData?.forEach(c => {
        connSet.add(c.user1_id === user.id ? c.user2_id : c.user1_id);
      });
      setEstablishedConnections(connSet);

      // Fetch Communities
      const { data: communitiesData } = await supabase
        .from('communities')
        .select('*');

      // Fetch joined communities
      const { data: membersData } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id);
        
      const joinedIds = new Set(membersData?.map(m => m.community_id) || []);
      setJoinedCommunities(joinedIds);

      setCommunities(communitiesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (receiverId) => {
    if (!currentUser) return;
    if (requestedUsers.has(receiverId) || establishedConnections.has(receiverId) || pendingReceived.has(receiverId)) return;

    try {
      const { error } = await supabase
        .from('connection_requests')
        .insert({ sender_id: currentUser.id, receiver_id: receiverId, status: 'pending' });
        
      if (!error) {
        setRequestedUsers(prev => new Set([...prev, receiverId]));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    if (!currentUser || !newCommunity.name || !newCommunity.domain) return;
    
    setCreating(true);
    try {
      // 1. Insert Community
      const { data: commData, error: commError } = await supabase
        .from('communities')
        .insert({
          name: newCommunity.name,
          domain: newCommunity.domain,
          creator_id: currentUser.id
        })
        .select()
        .single();

      if (commError) throw commError;

      // 2. Add creator as member
      await supabase
        .from('community_members')
        .insert({ user_id: currentUser.id, community_id: commData.id });

      // Update UI
      setCommunities(prev => [commData, ...prev]);
      setJoinedCommunities(prev => new Set([...prev, commData.id]));
      setIsModalOpen(false);
      setNewCommunity({ name: '', domain: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinCommunity = async (communityId) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from('community_members')
        .insert({ user_id: currentUser.id, community_id: communityId });
        
      if (!error) {
        setJoinedCommunities(prev => new Set([...prev, communityId]));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // When no search: show same domain only, sorted by common skills
  // When searching: show ALL users matching the query across any domain
  const filteredUsers = searchQuery.trim() === ''
    ? users
        .filter(u => u.domain?.toLowerCase() === myDomain.toLowerCase())
        .sort((a, b) => b._commonSkills - a._commonSkills)
    : users.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.college?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  const filteredCommunities = communities.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.domain?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="h-full flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  }

  return (
    <div className="p-2 md:p-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div className="relative w-full md:w-96 group">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-pink-400 transition-colors z-10" />
          <input 
            type="text" 
            placeholder="Search connections or communities..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 hover:bg-white/10 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)] focus:shadow-[0_0_20px_rgba(219,39,119,0.3)] backdrop-blur-sm"
          />
        </div>
        <GradientButton onClick={() => setIsModalOpen(true)} className="w-full md:w-auto px-6 py-3" icon={<Plus className="w-4 h-4"/>}>
          Create Community
        </GradientButton>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-zinc-800/60 pb-1">
        <button 
          onClick={() => setActiveTab('people')}
          className={`flex items-center gap-2 pb-3 px-2 font-semibold transition-all relative ${activeTab === 'people' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Users className="w-5 h-5" />
          Suggested People
          {activeTab === 'people' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_10px_rgba(219,39,119,0.8)]" />}
        </button>
        <button 
          onClick={() => setActiveTab('communities')}
          className={`flex items-center gap-2 pb-3 px-2 font-semibold transition-all relative ${activeTab === 'communities' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Users className="w-5 h-5" />
          Communities
          {activeTab === 'communities' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-pink-400 to-blue-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'people' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.length > 0 ? filteredUsers.map(user => (
              <GlassCard key={user.id} className="p-6 rounded-2xl flex flex-col group hover:-translate-y-1 transition-transform duration-300 hover:shadow-[0_0_25px_rgba(219,39,119,0.15)]">
                <div className="flex gap-4 items-center mb-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 border-2 border-transparent group-hover:border-pink-500/50 transition-colors">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold text-zinc-500">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-zinc-100">{user.full_name}</h4>
                    <p className="text-zinc-400 text-sm truncate">{user.college}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-semibold text-purple-400">{user.domain}</span>
                      {user._commonSkills > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-400 font-semibold">
                          {user._commonSkills} common skill{user._commonSkills > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mb-6 flex-1">
                  <div className="flex flex-wrap gap-2">
                    {user.skills?.slice(0, 4).map((skill, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-zinc-300">
                        {skill}
                      </span>
                    ))}
                    {user.skills?.length > 4 && <span className="px-2.5 py-1 text-xs text-zinc-500">+{user.skills.length - 4}</span>}
                  </div>
                </div>

                {establishedConnections.has(user.id) ? (
                  <button 
                    onClick={() => navigate(`/messages?with=${user.id}`)}
                    className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 hover:scale-[1.02] active:scale-95">
                    <MessageSquare className="w-4 h-4" /> Message
                  </button>
                ) : pendingReceived.has(user.id) ? (
                  <button 
                    disabled
                    className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 bg-pink-500/10 text-pink-400 border border-pink-500/30"
                  >
                    <Check className="w-4 h-4" /> Requested You
                  </button>
                ) : (
                  <button 
                    onClick={() => handleConnect(user.id)}
                    disabled={requestedUsers.has(user.id)}
                    className={`w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
                      requestedUsers.has(user.id) 
                        ? 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 cursor-not-allowed'
                        : 'bg-white/10 text-white border border-white/20 hover:bg-gradient-to-r hover:from-pink-500/80 hover:to-purple-600/80 hover:border-transparent hover:shadow-[0_0_15px_rgba(219,39,119,0.4)] hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    {requestedUsers.has(user.id) ? (
                      <><Clock className="w-4 h-4" /> Pending</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Connect</>
                    )}
                  </button>
                )}
              </GlassCard>
            )) : (
              <div className="col-span-full py-16 text-center flex flex-col items-center gap-3">
                <Users className="w-12 h-12 text-zinc-700" />
                <p className="text-zinc-400 font-semibold">No people in your domain yet</p>
                <p className="text-zinc-600 text-sm">More people will appear here as they join TalentMash with the same domain as you.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'communities' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCommunities.length > 0 ? filteredCommunities.map(comm => (
              <GlassCard key={comm.id} className="p-6 rounded-2xl flex flex-col group hover:-translate-y-1 transition-transform duration-300 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-[40px] rounded-full"></div>
                <div className="mb-4 relative z-10">
                  <h4 className="font-bold text-xl text-zinc-100 mb-1">{comm.name}</h4>
                  <p className="text-sm font-medium text-pink-400 uppercase tracking-wider">{comm.domain}</p>
                </div>
                
                <div className="flex-1 text-sm text-zinc-400 mb-6 relative z-10">
                  A dedicated community for {comm.domain} enthusiasts to collaborate and share knowledge.
                </div>

                <button 
                  onClick={() => handleJoinCommunity(comm.id)}
                  disabled={joinedCommunities.has(comm.id)}
                  className={`w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 relative z-10 ${
                    joinedCommunities.has(comm.id) 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-not-allowed'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-gradient-to-r hover:from-purple-500/80 hover:to-blue-600/80 hover:border-transparent hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:scale-[1.02] active:scale-95'
                  }`}
                >
                  {joinedCommunities.has(comm.id) ? (
                    <><Check className="w-4 h-4" /> Joined</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Join Community</>
                  )}
                </button>
              </GlassCard>
            )) : (
              <div className="col-span-full py-12 text-center text-zinc-500">No communities found. Create one to get started!</div>
            )}
          </div>
        )}
      </div>

      {/* Create Community Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create a Community">
        <form onSubmit={handleCreateCommunity} className="space-y-5">
          <InputField 
            label="Community Name" 
            placeholder="e.g. AI Innovators" 
            value={newCommunity.name} 
            onChange={e => setNewCommunity({...newCommunity, name: e.target.value})} 
            required 
          />
          <InputField 
            label="Domain Area" 
            placeholder="e.g. Artificial Intelligence" 
            value={newCommunity.domain} 
            onChange={e => setNewCommunity({...newCommunity, domain: e.target.value})} 
            required 
          />
          <div className="pt-2">
            <GradientButton type="submit" loading={creating} className="w-full">
              Launch Community
            </GradientButton>
          </div>
        </form>
      </Modal>

    </div>
  );
}
