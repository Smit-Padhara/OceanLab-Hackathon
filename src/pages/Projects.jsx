import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, X, Loader2, Check, Clock, Users, Code, MessageSquare, ExternalLink, Briefcase, UserPlus, Send, Filter, Sparkles, FolderPlus, Inbox, ChevronDown, UserCheck, Zap } from 'lucide-react';
import { GlassCard, GradientButton, InputField, TextAreaField, TagInput } from '../components/WatermelonUI';
import { getGeminiSuggestions } from '../lib/gemini';

export default function Projects() {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data State
  const [projects, setProjects] = useState([]);
  const [myRequests, setMyRequests] = useState([]); // Requests I sent
  const [requestsForMe, setRequestsForMe] = useState([]); // Requests for my projects
  const [myIncomingInvitations, setMyIncomingInvitations] = useState([]); // Invitations sent to me
  const [myConnections, setMyConnections] = useState([]);

  // Selection for Invitation
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [invitingState, setInvitingState] = useState({}); // { [userId]: boolean }
  const [geminiSuggestions, setGeminiSuggestions] = useState([]);
  const [loadingGemini, setLoadingGemini] = useState(false);

  // Create Project Form State
  const [newProject, setNewProject] = useState({ name: '', domain: '', description: '', required_skills: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();

    // Listen for updates from Dashboard notifications
    const handleUpdate = () => fetchData();
    window.addEventListener('projectRequestUpdated', handleUpdate);
    return () => window.removeEventListener('projectRequestUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    if (activeTab === 'suggestions' && profile && geminiSuggestions.length === 0) {
      fetchGeminiSuggestions();
    }
  }, [activeTab, profile]);

  const fetchGeminiSuggestions = async () => {
    if (!profile) return;
    setLoadingGemini(true);
    try {
      const suggestions = await getGeminiSuggestions(profile.domain, profile.skills || []);
      setGeminiSuggestions(suggestions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGemini(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setCurrentUser(authUser);

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      setProfile(prof);

      // Fetch all projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, creator:profiles(full_name, avatar_url, domain)')
        .order('created_at', { ascending: false });

      setProjects(projectsData || []);

      // Set default selected project for invitation (the first one I created)
      const myProjs = projectsData?.filter(p => p.creator_id === authUser.id) || [];
      if (myProjs.length > 0) setSelectedProjectId(myProjs[0].id);

      // Fetch my requests (Join requests sent by me OR invitations sent TO me)
      const { data: sentReqs } = await supabase
        .from('project_requests')
        .select('*, project:projects(name, creator_id)')
        .eq('user_id', authUser.id);
      setMyRequests(sentReqs || []);

      // Fetch requests for my projects (Join requests sent TO me OR invitations sent BY me)
      const myProjectIds = myProjs.map(p => p.id);
      if (myProjectIds.length > 0) {
        const { data: recReqs } = await supabase
          .from('project_requests')
          .select('*, user:profiles(full_name, avatar_url, domain, skills), project:projects(name, creator_id)')
          .in('project_id', myProjectIds);
        setRequestsForMe(recReqs || []);
      }

      // Fetch invitations sent TO me (where user_id is me but sender_id is not me)
      const { data: incomingInvites } = await supabase
        .from('project_requests')
        .select(`
          *,
          sender:profiles!sender_id(full_name, avatar_url, domain),
          project:projects(name, creator_id)
        `)
        .eq('user_id', authUser.id)
        .neq('sender_id', authUser.id);
      
      setMyIncomingInvitations(incomingInvites || []);

      // Fetch Connections
      const { data: connectionsData } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${authUser.id},user2_id.eq.${authUser.id}`);

      const connIds = connectionsData?.map(c => c.user1_id === authUser.id ? c.user2_id : c.user1_id) || [];
      if (connIds.length > 0) {
        const { data: connProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', connIds);
        setMyConnections(connProfiles || []);
      }

    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!currentUser || !newProject.name || !newProject.domain) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: newProject.name,
          domain: newProject.domain,
          description: newProject.description,
          required_skills: newProject.required_skills ? newProject.required_skills.split(',').map(s => s.trim()).filter(Boolean) : [],
          creator_id: currentUser.id
        })
        .select('*, creator:profiles(full_name, avatar_url, domain)')
        .single();

      if (error) throw error;

      setProjects(prev => [data, ...prev]);
      if (!selectedProjectId) setSelectedProjectId(data.id);
      setNewProject({ name: '', domain: '', description: '', required_skills: '' });
      setActiveTab('suggestions');
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRequest = async (projectId) => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from('project_requests')
        .insert({
          project_id: projectId,
          user_id: currentUser.id,
          sender_id: currentUser.id, // I am sending the request
          status: 'pending'
        })
        .select('*, project:projects(name, creator_id)')
        .single();

      if (error) throw error;
      setMyRequests(prev => [...prev, data]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInviteUser = async (userId) => {
    if (!currentUser || !selectedProjectId) return;
    setInvitingState(prev => ({ ...prev, [userId]: true }));
    try {
      console.log("Sending invitation to:", userId, "for project:", selectedProjectId);
      const { error } = await supabase
        .from('project_requests')
        .insert({
          project_id: selectedProjectId,
          user_id: userId,
          sender_id: currentUser.id,
          status: 'pending'
        });

      if (error) {
        console.error("Supabase error during invitation:", error);
        alert(`Failed to send invitation: ${error.message}`);
        throw error;
      }

      // Optimistically update local state for immediate feedback
      const optimisticRes = {
        project_id: selectedProjectId,
        user_id: userId,
        status: 'pending',
        sender_id: currentUser.id
      };
      setRequestsForMe(prev => [...prev, optimisticRes]);
      setMyRequests(prev => [...prev, optimisticRes]);

      // Refresh data in background
      fetchData();
    } catch (err) {
      console.error("Catch error during invitation:", err);
    } finally {
      setInvitingState(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleAcceptRequest = async (request) => {
    try {
      const { error } = await supabase
        .from('project_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (!error) {
        // Remove from current UI view immediately
        setRequestsForMe(prev => prev.filter(r => r.id !== request.id));
        setMyIncomingInvitations(prev => prev.filter(r => r.id !== request.id));
        
        // Dispatch event for other components (like Sidebar or MyProjects if open in another tab)
        window.dispatchEvent(new Event('projectRequestUpdated'));
        
        // Refresh local data to ensure Joinable Projects list and counting are updated
        fetchData();
      }
    } catch (err) {
      console.error("Error accepting request:", err);
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      const { error } = await supabase
        .from('project_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id);

      if (!error) {
        setRequestsForMe(prev => prev.filter(r => r.id !== request.id));
        setMyIncomingInvitations(prev => prev.filter(r => r.id !== request.id));
        
        window.dispatchEvent(new Event('projectRequestUpdated'));
        fetchData();
      }
    } catch (err) {
      console.error("Error rejecting request:", err);
    }
  };

  // Logic for the 4 sections
  const myProjs = projects.filter(p => p.creator_id === currentUser?.id);

  // Logic for Joinable Projects (exclude my projects)
  // ONLY show projects created by my connections that match my skills
  const joinableProjects = projects.filter(p => {
    if (p.creator_id === currentUser?.id) return false;

    // 1. Must be created by a connection
    const isByConnection = myConnections.some(c => c.id === p.creator_id);
    if (!isByConnection) return false;

    // 2. Must match at least one of my skills
    const skillMatch = p.required_skills?.some(s =>
      profile?.skills?.some(ms => ms.toLowerCase() === s.toLowerCase())
    );

    return skillMatch;
  });

  const suggestedProjects = joinableProjects.filter(p => {
    const domainMatch = p.domain?.toLowerCase() === profile?.domain?.toLowerCase();
    const skillMatch = p.required_skills?.some(s =>
      profile?.skills?.some(ps => ps.toLowerCase() === s.toLowerCase())
    );
    return domainMatch || skillMatch;
  });

  const getRequestStatus = (projectId) => {
    // Only return status if I am the one who sent it or received it
    return myRequests.find(r => r.project_id === projectId)?.status;
  };

  // Logic for Suggested Connections to invite
  const selectedProject = myProjs.find(p => p.id === selectedProjectId);
  const suggestedConnections = myConnections.filter(conn => {
    if (!selectedProject) return false;

    // Check if skills match
    const skillMatch = selectedProject.required_skills?.some(s =>
      conn.skills?.some(cs => cs.toLowerCase() === s.toLowerCase())
    );

    if (!skillMatch) return false;

    // Show them if they:
    // 1. Have no request for this project
    // 2. OR have a pending invitation
    // 3. OR have an accepted invitation (to show 'Joined')
    // Basically, only hide if they were REJECTED or don't match skills (already checked)
    const existingReq = requestsForMe.find(r => r.project_id === selectedProjectId && r.user_id === conn.id);
    if (existingReq && existingReq.status === 'rejected') return false;

    return true;
  });

  // Filter requestsForMe to show only those sent BY others TO me that are still PENDING
  const incomingJoinRequests = requestsForMe.filter(r => r.sender_id !== currentUser?.id && r.status === 'pending');
  
  // Filter myIncomingInvitations to only show pending ones (redundant but safe)
  const pendingInvitations = myIncomingInvitations.filter(i => i.status === 'pending');

  const filterBySearch = (list) => {
    if (!searchQuery.trim()) return list;
    return list.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (loading) {
    return <div className="h-full flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  }

  const tabs = [
    { id: 'create', label: 'Create Project', icon: <FolderPlus className="w-4 h-4" />, color: 'from-pink-500 to-purple-500' },
    { id: 'join', label: 'Join Project', icon: <UserPlus className="w-4 h-4" />, color: 'from-purple-500 to-blue-500' },
    { id: 'suggestions', label: 'Project Suggestions', icon: <Sparkles className="w-4 h-4" />, color: 'from-blue-500 to-emerald-500' },
    { id: 'invitations', label: `Invitations ${(incomingJoinRequests.length + pendingInvitations.length) > 0 ? `(${incomingJoinRequests.length + pendingInvitations.length})` : ''}`, icon: <Inbox className="w-4 h-4" />, color: 'from-orange-500 to-pink-500' }
  ];

  return (
    <div className="p-2 md:p-6 animate-[fadeIn_0.4s_ease-out]">

      {/* Search Header */}
      {(activeTab === 'join' || activeTab === 'suggestions') && (
        <div className="flex justify-between items-center mb-8 gap-4">
          <div className="relative flex-1 max-w-2xl group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-400 transition-colors z-10" />
            <input
              type="text"
              placeholder="Search by tech stack, domain, or project name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 hover:bg-white/10 transition-all duration-300 shadow-2xl backdrop-blur-md"
            />
          </div>
        </div>
      )}

      {/* Modern Tabs */}
      <div className="flex gap-2 mb-10 overflow-x-auto whitespace-nowrap scrollbar-hide pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 relative overflow-hidden group ${activeTab === tab.id
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

        {/* CREATE SECTION */}
        {activeTab === 'create' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-[scaleIn_0.3s_ease-out]">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-3xl font-black text-white">Start Your Journey</h2>
              <p className="text-zinc-400">Assemble the dream team and build something incredible together.</p>
            </div>
            <GlassCard className="p-8 rounded-[40px] border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" />
              <form onSubmit={handleCreateProject} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField label="Project Name" placeholder="e.g. TalentMash 2.0" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} required />
                  <InputField label="Primary Domain" placeholder="e.g. AI / Web3" value={newProject.domain} onChange={e => setNewProject({ ...newProject, domain: e.target.value })} required />
                </div>
                <TextAreaField label="Mission & Vision" placeholder="Project goals..." rows={5} value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} required />
                <TagInput label="Required Expertise" placeholder="React, Python..." value={newProject.required_skills} onChange={val => setNewProject({ ...newProject, required_skills: val })} />
                <GradientButton type="submit" loading={creating} className="w-full h-16 text-xl rounded-2xl" icon={<Send className="w-5 h-5" />}>Launch Project</GradientButton>
              </form>
            </GlassCard>
          </div>
        )}

        {/* INVITATIONS SECTION */}
        {activeTab === 'invitations' && (
          <div className="space-y-12 max-w-5xl mx-auto animate-[fadeIn_0.3s_ease-out]">

            {/* 1. Project Selection & Suggestions */}
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                    <UserPlus className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-100">Invite Connections</h3>
                    <p className="text-sm text-zinc-500">Find the best match from your network.</p>
                  </div>
                </div>

                {myProjs.length > 0 && (
                  <div className="relative group min-w-[240px]">
                    <select
                      value={selectedProjectId || ''}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer pr-10 font-bold"
                    >
                      {myProjs.map(p => <option key={p.id} value={p.id} className="bg-zinc-900">{p.name}</option>)}
                    </select>
                    <ChevronDown className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none group-hover:text-purple-400 transition-colors" />
                  </div>
                )}
              </div>

              {selectedProjectId ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestedConnections.length > 0 ? suggestedConnections.map(conn => (
                    <GlassCard key={conn.id} className="p-4 rounded-3xl border-white/5 hover:border-purple-500/30 transition-all group">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700 group-hover:border-purple-500/40 transition-colors">
                          {conn.avatar_url ? <img src={conn.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg font-bold text-zinc-500">{conn.full_name?.charAt(0)}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white truncate">{conn.full_name}</h4>
                          <p className="text-xs text-zinc-500 truncate">{conn.domain}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-4 max-h-[60px] overflow-hidden">
                        {conn.skills?.map((s, i) => (
                          <span key={i} className={`text-[10px] px-2 py-0.5 rounded-lg border ${selectedProject?.required_skills?.some(rs => rs.toLowerCase() === s.toLowerCase()) ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/10 text-zinc-500'}`}>
                            {s}
                          </span>
                        ))}
                      </div>
                      {(() => {
                        const existingRequest = requestsForMe.find(r => r.project_id === selectedProjectId && r.user_id === conn.id);
                        if (!existingRequest) {
                          return (
                            <button
                              onClick={() => handleInviteUser(conn.id)}
                              disabled={invitingState[conn.id]}
                              className="w-full py-2 bg-purple-500 text-white hover:bg-purple-600 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {invitingState[conn.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                              {invitingState[conn.id] ? 'Inviting...' : 'Invite to Project'}
                            </button>
                          );
                        }
                        if (existingRequest.status === 'pending') {
                          return (
                            <div className="w-full py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-[10px] font-black text-center animate-pulse">
                              REQUESTED
                            </div>
                          );
                        }
                        if (existingRequest.status === 'accepted') {
                          return (
                            <div className="w-full py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black text-center flex items-center justify-center gap-1.5">
                              <UserCheck className="w-3 h-3" />
                              JOINED IN {selectedProject?.name?.toUpperCase()}
                            </div>
                          );
                        }
                        return (
                          <button onClick={() => handleInviteUser(conn.id)} className="w-full py-2 bg-zinc-800 text-zinc-400 hover:bg-purple-500 hover:text-white rounded-xl text-xs font-black transition-all">Invite to Project</button>
                        );
                      })()}
                    </GlassCard>
                  )) : (
                    <div className="col-span-full py-8 text-center bg-white/2 rounded-3xl border border-dashed border-zinc-800/50">
                      <Users className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">No new suggested connections for this project.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-[40px]">
                  Create a project first to invite your connections!
                </div>
              )}
            </section>

            {/* 2. Approval Requests (Others asking to join your projects) */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                  <Inbox className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-100">Approval Requests</h3>
                  <p className="text-sm text-zinc-500">People asking to join your projects.</p>
                </div>
              </div>

              {incomingJoinRequests.length > 0 ? (
                <div className="grid gap-4">
                  {incomingJoinRequests.map(req => (
                    <GlassCard key={req.id} className="p-5 rounded-[28px] border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-5 w-full md:w-auto">
                        <div className="w-16 h-16 rounded-3xl overflow-hidden bg-zinc-800 flex-shrink-0">
                          {req.user?.avatar_url ? <img src={req.user.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-zinc-500">{req.user?.full_name?.charAt(0)}</div>}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-white">{req.user?.full_name}</h4>
                          <p className="text-xs text-zinc-500">wants to join <span className="text-pink-400 font-bold">{req.project?.name}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={() => handleAcceptRequest(req)} className="flex-1 md:flex-none px-8 py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl text-sm font-black hover:bg-emerald-500 hover:text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]">Approve</button>
                        <button onClick={() => handleRejectRequest(req)} className="flex-1 md:flex-none px-8 py-3 bg-white/5 text-zinc-400 border border-white/5 rounded-2xl text-sm font-bold hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all">Decline</button>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center rounded-[40px] border border-dashed border-zinc-800 bg-white/2">
                  <p className="text-zinc-500 text-sm">No pending approval requests.</p>
                </div>
              )}
            </section>

            {/* 3. Project Invitations (Sent to me by others) */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <Send className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-100">Project Invitations</h3>
                  <p className="text-sm text-zinc-500">Invitations sent to you by project founders.</p>
                </div>
              </div>

              {pendingInvitations.length > 0 ? (
                <div className="grid gap-4">
                  {pendingInvitations.map(inv => (
                    <GlassCard key={inv.id} className="p-5 rounded-[28px] border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-5 w-full md:w-auto">
                        <div className="w-16 h-16 rounded-3xl overflow-hidden bg-zinc-800 flex-shrink-0">
                          {inv.sender?.avatar_url ? <img src={inv.sender.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-zinc-500">{inv.sender?.full_name?.charAt(0)}</div>}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-white">{inv.sender?.full_name}</h4>
                          <p className="text-xs text-zinc-500 italic">invited you to join <span className="text-purple-400 font-bold">{inv.project?.name}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={() => handleAcceptRequest(inv)} className="flex-1 md:flex-none px-8 py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl text-sm font-black hover:bg-emerald-500 hover:text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]">Accept</button>
                        <button onClick={() => handleRejectRequest(inv)} className="flex-1 md:flex-none px-8 py-3 bg-white/5 text-zinc-400 border border-white/5 rounded-2xl text-sm font-bold hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all">Reject</button>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center rounded-[40px] border border-dashed border-zinc-800 bg-white/2">
                  <p className="text-zinc-500 text-sm">No project invitations received yet.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* BROWSE / SUGGESTIONS */}
        {activeTab === 'join' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-[fadeIn_0.5s_ease-out]">
            {filterBySearch(joinableProjects).map(p => {
              const status = getRequestStatus(p.id);
              return (
                <GlassCard key={p.id} className="p-8 rounded-[40px] flex flex-col group border-white/5 hover:border-purple-500/20 hover:shadow-[0_0_50px_rgba(168,85,247,0.12)] relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/5 blur-[70px] rounded-full group-hover:bg-purple-500/10" />
                  <div className="mb-6 flex justify-between items-start">
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-purple-500/10 transition-all"><Code className="w-6 h-6 text-purple-400" /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">{p.domain}</span>
                  </div>
                  <h4 className="font-black text-2xl text-zinc-100 mb-3 group-hover:text-purple-400 transition-colors">{p.name}</h4>
                  <p className="text-zinc-500 text-sm mb-8 line-clamp-4 leading-relaxed">{p.description}</p>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {p.required_skills?.slice(0, 5).map((s, i) => <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[11px] text-zinc-400">{s}</span>)}
                  </div>
                  <div className="mt-auto pt-6 border-t border-zinc-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl overflow-hidden bg-zinc-800">{p.creator?.avatar_url ? <img src={p.creator.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-black text-zinc-500 bg-zinc-900">{p.creator?.full_name?.charAt(0)}</div>}</div>
                      <div><p className="text-[10px] font-bold text-zinc-600 uppercase">Founder</p><p className="text-xs text-zinc-400 font-bold group-hover:text-zinc-200">{p.creator?.full_name}</p></div>
                    </div>
                    {status === 'pending' ? <div className="px-4 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500 text-xs font-black animate-pulse">SENT</div> : status === 'accepted' ? <div className="px-4 py-2 bg-emerald-500/10 text-emerald-500 text-xs font-black">JOINED</div> : <button onClick={() => handleJoinRequest(p.id)} className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 hover:scale-105 active:scale-95 text-white rounded-2xl text-xs font-black transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]">JOIN</button>}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* GEMINI SUGGESTIONS TAB */}
        {activeTab === 'suggestions' && (
          <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-100">AI Project Discovery</h3>
                  <p className="text-sm text-zinc-500 italic">Personalized projects generated by Gemini AI for your domain: <span className="text-purple-400 font-bold">{profile?.domain}</span></p>
                </div>
              </div>
            </div>

            {loadingGemini ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => (
                  <GlassCard key={i} className="p-8 h-80 rounded-[40px] flex items-center justify-center border-white/5 animate-pulse">
                    <Loader2 className="w-10 h-10 animate-spin text-zinc-800" />
                  </GlassCard>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {geminiSuggestions.map((p, i) => (
                  <GlassCard key={i} className="p-8 rounded-[40px] flex flex-col group border-white/5 hover:border-purple-500/20 hover:shadow-[0_0_50px_rgba(168,85,247,0.12)] relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/5 blur-[70px] rounded-full group-hover:bg-purple-500/10" />
                    <div className="mb-6 flex justify-between items-start">
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-purple-500/10 transition-all">
                        <Sparkles className="w-6 h-6 text-purple-400 group-hover:animate-pulse" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">{p.domain}</span>
                    </div>
                    <h4 className="font-black text-2xl text-zinc-100 mb-3 group-hover:text-purple-400 transition-colors">{p.name}</h4>
                    <p className="text-zinc-500 text-sm mb-8 line-clamp-4 leading-relaxed">{p.description}</p>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {p.required_skills?.map((s, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[11px] text-zinc-400">
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto pt-6 border-t border-zinc-800/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-purple-500/5 border border-purple-500/10">
                          <Zap className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-600 uppercase">AI Suggestion</p>
                          <p className="text-xs text-zinc-400 font-bold">Concept</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setNewProject({ name: p.name, domain: p.domain, description: p.description, required_skills: p.required_skills.join(', ') });
                          setActiveTab('create');
                        }}
                        className="px-6 py-2.5 bg-white/5 hover:bg-purple-500 text-zinc-300 hover:text-white rounded-2xl text-xs font-black transition-all border border-white/5"
                      >
                        USE THIS IDEA
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
