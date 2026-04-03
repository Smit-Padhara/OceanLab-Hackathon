import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Search, MessageSquare, Loader2 } from 'lucide-react';

export default function Messages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [connections, setConnections] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Init: fetch current user + connections
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setCurrentUser(user);

      // Fetch connections (user1_id < user2_id always)
      const { data: conns } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!conns || conns.length === 0) { setLoading(false); return; }

      const peerIds = conns.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, domain, college')
        .in('id', peerIds);

      // Get last message per connection for preview
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

      // Sort by most recent message
      enriched.sort((a, b) => {
        const timeA = a.lastMessage?.created_at || '0';
        const timeB = b.lastMessage?.created_at || '0';
        return timeB.localeCompare(timeA);
      });

      setConnections(enriched);

      // Auto-open conversation if ?with=userId in URL
      const withId = searchParams.get('with');
      if (withId) {
        const peer = enriched.find(c => c.id === withId);
        if (peer) selectUser(peer, user);
      }

      setLoading(false);
    };
    init();
  }, []);

  const selectUser = async (peer, me = currentUser) => {
    setSelectedUser(peer);
    setMessages([]);
    if (!me) return;

    // Fetch conversation history
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${me.id},receiver_id.eq.${peer.id}),and(sender_id.eq.${peer.id},receiver_id.eq.${me.id})`)
      .order('created_at', { ascending: true });

    setMessages(msgs || []);

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', peer.id)
      .eq('receiver_id', me.id)
      .eq('is_read', false);

    // Clear unread count locally
    setConnections(prev => prev.map(c => c.id === peer.id ? { ...c, unreadCount: 0 } : c));

    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Real-time message listener
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel(`messages-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, async (payload) => {
        const msg = payload.new;
        const isMyMessage = msg.sender_id === currentUser.id;
        const isForMe = msg.receiver_id === currentUser.id || msg.sender_id === currentUser.id;
        if (!isForMe) return;

        const otherId = isMyMessage ? msg.receiver_id : msg.sender_id;

        // Only append to chat if the message is from the OTHER person
        // (our own messages are already added in handleSend — skip to avoid duplicates)
        if (!isMyMessage && selectedUser && otherId === selectedUser.id) {
          setMessages(prev => {
            // Extra safety: deduplicate by id
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Mark as read immediately since chat is open
          supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
        }

        // Update last message preview in sidebar for both directions
        setConnections(prev => prev.map(c =>
          c.id === otherId ? { ...c, lastMessage: msg } : c
        ));

        // Increment unread count only for messages from others in a DIFFERENT conversation
        if (!isMyMessage && !(selectedUser && otherId === selectedUser.id)) {
          setConnections(prev => prev.map(c =>
            c.id === otherId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
          ));
        }

      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentUser, selectedUser]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedUser || !currentUser || sending) return;

    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    const { data, error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: text,
      is_read: false
    }).select().single();

    if (error) {
      console.error(error);
      setNewMessage(text);
    } else {
      setMessages(prev => [...prev, data]);
      setConnections(prev => prev.map(c =>
        c.id === selectedUser.id ? { ...c, lastMessage: data } : c
      ));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  const filteredConnections = connections.filter(c =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top Bar */}
      <header className="h-16 border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
        <span className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
          Messages
        </span>
        <div className="w-32" />
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 py-6 gap-4 h-[calc(100vh-4rem)]">

        {/* Sidebar: Connections List */}
        <aside className="w-80 flex-shrink-0 flex flex-col bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-zinc-800/60">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Connection List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConnections.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 flex flex-col items-center gap-2 mt-4">
                <MessageSquare className="w-10 h-10 opacity-20" />
                <p className="text-sm font-medium">No connections yet</p>
                <p className="text-xs text-zinc-600">Connect with people to start messaging</p>
                <Link to="/dashboard" className="mt-2 text-xs text-purple-400 hover:text-purple-300 underline transition-colors">
                  Find connections
                </Link>
              </div>
            ) : (
              filteredConnections.map(conn => (
                <button
                  key={conn.id}
                  onClick={() => selectUser(conn)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all relative border-b border-zinc-800/30 last:border-0 text-left ${
                    selectedUser?.id === conn.id
                      ? 'bg-purple-500/10 border-l-2 border-l-purple-500'
                      : 'hover:bg-white/5'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                      {conn.avatar_url ? (
                        <img src={conn.avatar_url} alt={conn.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-zinc-400">
                          {conn.full_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Online indicator placeholder */}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm text-zinc-100 truncate">{conn.full_name}</span>
                      <span className="text-xs text-zinc-500 ml-2 flex-shrink-0">
                        {formatTime(conn.lastMessage?.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-xs text-zinc-400 truncate max-w-[160px]">
                        {conn.lastMessage
                          ? (conn.lastMessage.sender_id === currentUser?.id ? 'You: ' : '') + conn.lastMessage.content
                          : conn.domain || 'Start a conversation'}
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
            )}
          </div>
        </aside>

        {/* Chat Window */}
        <main className="flex-1 flex flex-col bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden">
          {!selectedUser ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                <MessageSquare className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-zinc-200">Your Messages</h3>
              <p className="text-zinc-500 text-sm max-w-xs">
                Select a connection from the left to start chatting. Messages are only available between connected users.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/60 flex items-center gap-4">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 border-2 border-purple-500/30">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt={selectedUser.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-zinc-400">
                        {selectedUser.full_name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100">{selectedUser.full_name}</h3>
                  <p className="text-xs text-purple-400">{selectedUser.domain}</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-2">
                      {selectedUser.avatar_url ? (
                        <img src={selectedUser.avatar_url} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="font-bold text-purple-400">{selectedUser.full_name?.charAt(0)}</span>
                      )}
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
                            {/* Avatar for others */}
                            {!isMe && (
                              <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700">
                                {selectedUser.avatar_url ? (
                                  <img src={selectedUser.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                                    {selectedUser.full_name?.charAt(0)}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className={`group max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md ${
                                isMe
                                  ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-br-sm shadow-[0_0_15px_rgba(219,39,119,0.2)]'
                                  : 'bg-zinc-800/80 text-zinc-100 rounded-bl-sm border border-zinc-700/50'
                              }`}>
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
                )}
              </div>

              {/* Message Input */}
              <div className="px-4 py-4 border-t border-zinc-800/60 bg-zinc-900/40">
                <form onSubmit={handleSend} className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${selectedUser.full_name}...`}
                      className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-2xl px-5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(219,39,119,0.4)] hover:shadow-[0_0_20px_rgba(219,39,119,0.6)] hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
                <p className="text-[10px] text-zinc-600 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
