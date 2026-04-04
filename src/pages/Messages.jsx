import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Send, Search, MessageSquare, Loader2,
  Users, Hash, Plus, Crown, X
} from 'lucide-react';

// ── Create Community Modal ──────────────────────────────────────────────────
function CreateCommunityModal({ currentUser, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', domain: '' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      // Create the community
      const { data: comm, error } = await supabase
        .from('communities')
        .insert({ name: form.name.trim(), description: form.description.trim(), domain: form.domain.trim(), creator_id: currentUser.id })
        .select()
        .single();
      if (error) throw error;

      // Auto-add creator as a member
      await supabase.from('community_members').insert({ community_id: comm.id, user_id: currentUser.id });

      onCreated(comm);
    } catch (err) {
      console.error('Error creating community:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }} onClick={onClose}>
      <div className="relative w-full max-w-md rounded-[32px] border border-white/10 bg-zinc-950 shadow-[0_0_60px_rgba(168,85,247,0.15)] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />
        <div className="p-7">
          <button onClick={onClose} className="absolute top-5 right-5 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 transition-all">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Hash className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-black text-white">Create Community</h2>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Community Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. AI Builders Club" required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Domain / Category</label>
              <input value={form.domain} onChange={e => setForm(p => ({ ...p, domain: e.target.value }))} placeholder="e.g. AI, Web3, Design..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What is this community about?" rows={2}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 text-sm resize-none" />
            </div>
            <button type="submit" disabled={creating || !form.name.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2">
              {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Community</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main Messages Component ─────────────────────────────────────────────────
export default function Messages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState('dms');                // 'dms' | 'groups'

  // DM state
  const [connections, setConnections] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);

  // Group state
  const [communities, setCommunities] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});  // { communityId: [profiles] }
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, groupMessages]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setCurrentUser(user);

      await fetchConnections(user);
      await fetchCommunities(user.id);

      const withId = searchParams.get('with');
      setLoading(false);
    };
    init();
  }, []);

  const fetchConnections = async (user) => {
    const { data: conns } = await supabase
      .from('connections')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    if (!conns || conns.length === 0) return;
    const peerIds = conns.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, domain, college')
      .in('id', peerIds);

    const enriched = await Promise.all((profiles || []).map(async (p) => {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at, sender_id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${p.id}),and(sender_id.eq.${p.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { count: unread } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', p.id)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      return { ...p, lastMessage: lastMsg || null, unreadCount: unread || 0 };
    }));

    enriched.sort((a, b) => {
      const tA = a.lastMessage?.created_at || '0';
      const tB = b.lastMessage?.created_at || '0';
      return tB.localeCompare(tA);
    });
    setConnections(enriched);
  };

  const fetchCommunities = async (userId) => {
    // Fetch communities the user is in (as creator or member)
    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId);

    const { data: created } = await supabase
      .from('communities')
      .select('*')
      .eq('creator_id', userId);

    const memberIds = (memberships || []).map(m => m.community_id);
    const createdIds = (created || []).map(c => c.id);
    const allIds = [...new Set([...memberIds, ...createdIds])];

    if (allIds.length === 0) { setCommunities([]); return; }

    const { data: comms } = await supabase
      .from('communities')
      .select('*')
      .in('id', allIds)
      .order('created_at', { ascending: false });

    // Enrich with last message
    const enriched = await Promise.all((comms || []).map(async (c) => {
      const { data: lastMsg } = await supabase
        .from('group_messages')
        .select('content, created_at, sender_id')
        .eq('community_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return { ...c, lastMessage: lastMsg || null };
    }));

    setCommunities(enriched);
  };

  // ── Select DM user ─────────────────────────────────────────────────────────
  const selectUser = async (peer, me = currentUser) => {
    setSelectedUser(peer);
    setSelectedGroup(null);
    setMessages([]);
    if (!me) return;

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${me.id},receiver_id.eq.${peer.id}),and(sender_id.eq.${peer.id},receiver_id.eq.${me.id})`)
      .order('created_at', { ascending: true });

    setMessages(msgs || []);

    await supabase.from('messages').update({ is_read: true })
      .eq('sender_id', peer.id).eq('receiver_id', me.id).eq('is_read', false);

    setConnections(prev => prev.map(c => c.id === peer.id ? { ...c, unreadCount: 0 } : c));
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Select Group ───────────────────────────────────────────────────────────
  const selectGroup = async (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    setGroupMessages([]);

    const { data: msgs } = await supabase
      .from('group_messages')
      .select('*, sender:profiles!group_messages_sender_id_fkey(id, full_name, avatar_url)')
      .eq('community_id', group.id)
      .order('created_at', { ascending: true });

    setGroupMessages(msgs || []);

    // Fetch member list if not cached
    if (!memberProfiles[group.id]) {
      const { data: mems } = await supabase
        .from('community_members')
        .select('user_id, member:profiles!community_members_user_id_fkey(id, full_name, avatar_url)')
        .eq('community_id', group.id);
      setMemberProfiles(prev => ({ ...prev, [group.id]: (mems || []).map(m => m.member).filter(Boolean) }));
    }

    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Real-time: DMs ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase.channel(`dm-${currentUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new;
        const isMe = msg.sender_id === currentUser.id;
        const isForMe = msg.receiver_id === currentUser.id || msg.sender_id === currentUser.id;
        if (!isForMe) return;
        const otherId = isMe ? msg.receiver_id : msg.sender_id;

        if (!isMe && selectedUser && otherId === selectedUser.id) {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
        }

        setConnections(prev => prev.map(c => c.id === otherId ? { ...c, lastMessage: msg } : c));
        if (!isMe && !(selectedUser && otherId === selectedUser.id)) {
          setConnections(prev => prev.map(c => c.id === otherId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c));
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [currentUser, selectedUser]);

  // ── Real-time: Group Messages ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !selectedGroup) return;
    const channel = supabase.channel(`group-${selectedGroup.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages',
        filter: `community_id=eq.${selectedGroup.id}` }, async (payload) => {
        const msg = payload.new;
        if (msg.sender_id === currentUser.id) return; // already added optimistically

        // Fetch the sender profile to display
        const { data: senderProfile } = await supabase
          .from('profiles').select('id, full_name, avatar_url').eq('id', msg.sender_id).single();

        setGroupMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, sender: senderProfile }]);
        setCommunities(prev => prev.map(c => c.id === selectedGroup.id ? { ...c, lastMessage: msg } : c));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [currentUser, selectedGroup]);

  // ── Send DM ────────────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    if (selectedUser) {
      const { data, error } = await supabase.from('messages')
        .insert({ sender_id: currentUser.id, receiver_id: selectedUser.id, content: text, is_read: false })
        .select().single();

      if (error) { setNewMessage(text); }
      else {
        setMessages(prev => [...prev, data]);
        setConnections(prev => prev.map(c => c.id === selectedUser.id ? { ...c, lastMessage: data } : c));
      }
    } else if (selectedGroup) {
      // Optimistic insert for group message
      const optimistic = { id: `temp-${Date.now()}`, community_id: selectedGroup.id, sender_id: currentUser.id, content: text, created_at: new Date().toISOString(), sender: { id: currentUser.id } };
      setGroupMessages(prev => [...prev, optimistic]);

      const { data, error } = await supabase.from('group_messages')
        .insert({ community_id: selectedGroup.id, sender_id: currentUser.id, content: text })
        .select().single();

      if (error) {
        setGroupMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setNewMessage(text);
      } else {
        setGroupMessages(prev => prev.map(m => m.id === optimistic.id ? { ...data, sender: optimistic.sender } : m));
        setCommunities(prev => prev.map(c => c.id === selectedGroup.id ? { ...c, lastMessage: data } : c));
      }
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredConnections = connections.filter(c => c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredGroups = communities.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  }

  const activeConversationName = selectedUser?.full_name || selectedGroup?.name || null;
  const activeConversationSub = selectedUser ? selectedUser.domain : selectedGroup ? `${(memberProfiles[selectedGroup?.id] || []).length} members` : null;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">

      {/* Top Bar */}
      <header className="h-16 border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
        <span className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">Messages</span>
        <div className="w-32" />
      </header>

      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 py-6 gap-4 h-[calc(100vh-4rem)]">

        {/* ── Sidebar ── */}
        <aside className="w-80 flex-shrink-0 flex flex-col bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-zinc-800/60">
            <button
              onClick={() => setTab('dms')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${tab === 'dms' ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/5' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Direct
            </button>
            <button
              onClick={() => setTab('groups')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${tab === 'groups' ? 'text-pink-400 border-b-2 border-pink-500 bg-pink-500/5' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Hash className="w-3.5 h-3.5" /> Groups
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-zinc-800/60">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder={tab === 'dms' ? 'Search messages...' : 'Search groups...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">

            {/* ── DMs ── */}
            {tab === 'dms' && (
              filteredConnections.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 flex flex-col items-center gap-2 mt-4">
                  <MessageSquare className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-medium">No connections yet</p>
                  <Link to="/dashboard" className="mt-2 text-xs text-purple-400 hover:text-purple-300 underline transition-colors">Find connections</Link>
                </div>
              ) : (
                filteredConnections.map(conn => (
                  <button key={conn.id} onClick={() => selectUser(conn)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all relative border-b border-zinc-800/30 last:border-0 text-left ${selectedUser?.id === conn.id ? 'bg-purple-500/10 border-l-2 border-l-purple-500' : 'hover:bg-white/5'}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                        {conn.avatar_url ? <img src={conn.avatar_url} alt={conn.full_name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center font-bold text-zinc-400">{conn.full_name?.charAt(0).toUpperCase()}</div>}
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm text-zinc-100 truncate">{conn.full_name}</span>
                        <span className="text-xs text-zinc-500 ml-2 flex-shrink-0">{formatTime(conn.lastMessage?.created_at)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                        <p className="text-xs text-zinc-400 truncate max-w-[160px]">
                          {conn.lastMessage ? (conn.lastMessage.sender_id === currentUser?.id ? 'You: ' : '') + conn.lastMessage.content : conn.domain || 'Start a conversation'}
                        </p>
                        {conn.unreadCount > 0 && (
                          <span className="ml-2 flex-shrink-0 w-5 h-5 bg-pink-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_rgba(219,39,119,0.6)]">
                            {conn.unreadCount > 9 ? '9+' : conn.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )
            )}

            {/* ── Groups ── */}
            {tab === 'groups' && (
              <div className="flex flex-col h-full">
                {/* Create button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mx-3 my-3 flex items-center justify-center gap-2 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 rounded-xl text-xs font-black text-purple-400 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Community
                </button>

                <div className="flex-1 overflow-y-auto">
                  {filteredGroups.length === 0 ? (
                    <div className="p-6 text-center text-zinc-500 flex flex-col items-center gap-2">
                      <Hash className="w-10 h-10 opacity-20" />
                      <p className="text-sm font-medium">No communities yet</p>
                      <p className="text-xs text-zinc-600">Create or join a community to start group chatting</p>
                    </div>
                  ) : (
                    filteredGroups.map(group => (
                      <button key={group.id} onClick={() => selectGroup(group)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all border-b border-zinc-800/30 last:border-0 text-left ${selectedGroup?.id === group.id ? 'bg-pink-500/10 border-l-2 border-l-pink-500' : 'hover:bg-white/5'}`}
                      >
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                          <Hash className="w-5 h-5 text-pink-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm text-zinc-100 truncate">{group.name}</span>
                            <span className="text-xs text-zinc-500 ml-2 flex-shrink-0">{formatTime(group.lastMessage?.created_at)}</span>
                          </div>
                          <p className="text-xs text-zinc-400 truncate max-w-[170px] mt-0.5">
                            {group.lastMessage ? group.lastMessage.content : group.domain || 'Group chat'}
                          </p>
                        </div>
                        {group.creator_id === currentUser?.id && (
                          <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Chat Window ── */}
        <main className="flex-1 flex flex-col bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden">

          {!activeConversationName ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                <MessageSquare className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-zinc-200">Your Messages</h3>
              <p className="text-zinc-500 text-sm max-w-xs">
                Select a person from <strong className="text-zinc-300">Direct</strong> to chat privately, or join a <strong className="text-zinc-300">Group</strong> community chat.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/60 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 flex-shrink-0">
                  {selectedUser?.avatar_url
                    ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover" />
                    : selectedUser
                    ? <div className="w-full h-full flex items-center justify-center font-bold text-zinc-400">{selectedUser.full_name?.charAt(0)}</div>
                    : <div className="w-full h-full flex items-center justify-center"><Hash className="w-5 h-5 text-pink-400" /></div>
                  }
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-zinc-100">{activeConversationName}</h3>
                  <p className="text-xs text-purple-400">{activeConversationSub}</p>
                </div>
                {selectedGroup && (
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>{(memberProfiles[selectedGroup.id] || []).length} members</span>
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {/* DM messages */}
                {selectedUser && (
                  messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                      <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-2">
                        {selectedUser.avatar_url
                          ? <img src={selectedUser.avatar_url} className="w-full h-full rounded-full object-cover" />
                          : <span className="font-bold text-purple-400">{selectedUser.full_name?.charAt(0)}</span>}
                      </div>
                      <p className="font-semibold text-zinc-300">{selectedUser.full_name}</p>
                      <p className="text-xs text-zinc-500">{selectedUser.college} · {selectedUser.domain}</p>
                      <p className="text-xs text-zinc-600 mt-2">Say hello! This is the beginning of your conversation.</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => {
                        const isMe = msg.sender_id === currentUser?.id;
                        const showDate = idx === 0 || new Date(messages[idx - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString();
                        return (
                          <React.Fragment key={msg.id}>
                            {showDate && (
                              <div className="text-center my-2">
                                <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                                  {new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            )}
                            <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              {!isMe && (
                                <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700">
                                  {selectedUser.avatar_url
                                    ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">{selectedUser.full_name?.charAt(0)}</div>}
                                </div>
                              )}
                              <div className={`group max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md ${isMe ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-br-sm' : 'bg-zinc-800/80 text-zinc-100 rounded-bl-sm border border-zinc-700/50'}`}>
                                  {msg.content}
                                </div>
                                <span className="text-[10px] text-zinc-600 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )
                )}

                {/* Group messages */}
                {selectedGroup && (
                  groupMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mb-2">
                        <Hash className="w-7 h-7 text-pink-400" />
                      </div>
                      <p className="font-semibold text-zinc-300">{selectedGroup.name}</p>
                      <p className="text-xs text-zinc-500">{selectedGroup.description || selectedGroup.domain}</p>
                      <p className="text-xs text-zinc-600 mt-2">Be the first to send a message in this community!</p>
                    </div>
                  ) : (
                    <>
                      {groupMessages.map((msg, idx) => {
                        const isMe = msg.sender_id === currentUser?.id;
                        const sender = msg.sender;
                        const showDate = idx === 0 || new Date(groupMessages[idx - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString();
                        const showSender = !isMe && (idx === 0 || groupMessages[idx - 1].sender_id !== msg.sender_id);
                        return (
                          <React.Fragment key={msg.id}>
                            {showDate && (
                              <div className="text-center my-2">
                                <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                                  {new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            )}
                            <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              {!isMe && (
                                <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700">
                                  {sender?.avatar_url
                                    ? <img src={sender.avatar_url} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">{sender?.full_name?.charAt(0)}</div>}
                                </div>
                              )}
                              <div className={`group max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                {showSender && !isMe && (
                                  <span className="text-[10px] font-bold text-pink-400 mb-1 px-1">{sender?.full_name}</span>
                                )}
                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md ${isMe ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-br-sm' : 'bg-zinc-800/80 text-zinc-100 rounded-bl-sm border border-zinc-700/50'}`}>
                                  {msg.content}
                                </div>
                                <span className="text-[10px] text-zinc-600 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )
                )}
              </div>

              {/* Input */}
              <div className="px-4 py-4 border-t border-zinc-800/60 bg-zinc-900/40">
                <form onSubmit={handleSend} className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={selectedUser ? `Message ${selectedUser.full_name}...` : `Message #${selectedGroup?.name}...`}
                      className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-2xl px-5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                  </div>
                  <button type="submit" disabled={!newMessage.trim() || sending}
                    className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(219,39,119,0.4)] hover:shadow-[0_0_20px_rgba(219,39,119,0.6)] hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
                <p className="text-[10px] text-zinc-600 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Create Community Modal */}
      {showCreateModal && (
        <CreateCommunityModal
          currentUser={currentUser}
          onClose={() => setShowCreateModal(false)}
          onCreated={(comm) => {
            setShowCreateModal(false);
            setCommunities(prev => [{ ...comm, lastMessage: null }, ...prev]);
            setTab('groups');
            selectGroup({ ...comm, lastMessage: null });
          }}
        />
      )}
    </div>
  );
}
