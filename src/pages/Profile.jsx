import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Code, Briefcase, ExternalLink, Edit2, Save, X, Check } from 'lucide-react';
import { GlassCard, GradientButton, InputField, TagInput, AvatarUpload, GlowText } from '../components/WatermelonUI';

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    college: '',
    branch: '',
    year: '',
    domain: '',
    skills: '',
    interests: '',
    github_link: '',
    linkedin_link: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          college: data.college || '',
          branch: data.branch || '',
          year: data.year || '',
          domain: data.domain || '',
          skills: data.skills ? data.skills.join(', ') : '',
          interests: data.interests || '',
          github_link: data.github_link || '',
          linkedin_link: data.linkedin_link || ''
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return profile.avatar_url;

    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newAvatarUrl = await uploadAvatar();
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);

      const updates = {
        full_name: formData.full_name,
        college: formData.college,
        branch: formData.branch,
        year: formData.year,
        domain: formData.domain,
        skills: skillsArray,
        interests: formData.interests,
        github_link: formData.github_link,
        linkedin_link: formData.linkedin_link,
        avatar_url: newAvatarUrl,
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, ...updates });
      setIsEditing(false);
      showToast('Profile updated successfully!');
      setAvatarFile(null);
    } catch (error) {
      console.error(error);
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // View Mode
  const renderViewMode = () => (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-3xl font-bold"><GlowText>Profile</GlowText></h2>
        <button 
          onClick={() => setIsEditing(true)}
          className="group flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-white bg-gradient-to-r from-pink-500/20 to-purple-600/20 border border-pink-500/50 hover:from-pink-500 hover:to-purple-600 transition-all duration-300 shadow-[0_0_15px_rgba(219,39,119,0.3)] hover:shadow-[0_0_25px_rgba(219,39,119,0.5)] hover:scale-105"
        >
          <Edit2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          Edit Profile
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-pink-500/50 shadow-[0_0_30px_rgba(219,39,119,0.3)] mb-4 bg-zinc-800">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-500">
                {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </div>
          <div className="bg-purple-500/10 text-purple-400 text-sm font-semibold px-4 py-1.5 rounded-full border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            {profile.domain}
          </div>
        </div>

        <div className="flex-1 w-full space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-zinc-100 mb-1">{profile.full_name}</h3>
            <p className="text-zinc-400 text-lg">{profile.college}</p>
            <p className="text-zinc-500">{profile.branch} {profile.year && `• Year ${profile.year}`}</p>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Skills</h4>
            <div className="flex flex-wrap gap-2">
              {profile.skills?.length > 0 ? profile.skills.map((skill, i) => (
                <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-zinc-200">
                  {skill}
                </span>
              )) : <span className="text-zinc-600 italic text-sm">No skills added yet</span>}
            </div>
          </div>

          {profile.interests && (
            <div>
              <h4 className="text-sm font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Interests</h4>
              <p className="text-zinc-300 leading-relaxed max-w-2xl">{profile.interests}</p>
            </div>
          )}

          <div className="flex gap-4 pt-2">
            {profile.github_link && (
              <a href={profile.github_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all">
                <Code className="w-5 h-5" />
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
              </a>
            )}
            {profile.linkedin_link && (
              <a href={profile.linkedin_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#0077b5]/10 border border-[#0077b5]/30 rounded-xl text-[#0077b5] hover:bg-[#0077b5]/20 transition-all">
                <Briefcase className="w-5 h-5" />
                <span>LinkedIn</span>
                <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Edit Mode
  const renderEditMode = () => (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold"><GlowText>Edit Profile</GlowText></h2>
        <button 
          onClick={() => {
            setIsEditing(false);
            setAvatarFile(null);
          }}
          className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-6">
        <AvatarUpload 
          url={profile.avatar_url} 
          file={avatarFile} 
          onChange={handleAvatarChange} 
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputField label="Full Name" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required/>
          <InputField label="Domain/Role" value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} required placeholder="e.g. AI Engineer"/>
          <InputField label="College" value={formData.college} onChange={e => setFormData({...formData, college: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Branch" value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} placeholder="e.g. CSE"/>
            <InputField label="Year" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} placeholder="e.g. 3rd"/>
          </div>
        </div>

        <TagInput 
          label="Skills (press Enter or comma after each)" 
          value={formData.skills} 
          onChange={val => setFormData({...formData, skills: val})} 
          placeholder="e.g. React, Node.js, Python"
        />

        <div className="space-y-1.5 ml-1 w-full">
          <label className="block text-sm font-medium text-zinc-300">Interests & About</label>
          <textarea 
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 hover:bg-black/30 transition-all duration-300 min-h-[100px] resize-y shadow-inner"
            value={formData.interests}
            onChange={e => setFormData({...formData, interests: e.target.value})}
            placeholder="Tell us about your interests, projects you're looking for..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="relative">
            <Code className="w-5 h-5 absolute left-3 top-[38px] text-zinc-500" />
            <InputField label="GitHub Profile URL" type="url" value={formData.github_link} onChange={e => setFormData({...formData, github_link: e.target.value})} style={{ paddingLeft: '2.75rem' }} placeholder="https://github.com/yourusername"/>
          </div>
          <div className="relative">
            <Briefcase className="w-5 h-5 absolute left-3 top-[38px] text-zinc-500" />
            <InputField label="LinkedIn Profile URL" type="url" value={formData.linkedin_link} onChange={e => setFormData({...formData, linkedin_link: e.target.value})} style={{ paddingLeft: '2.75rem' }} placeholder="https://linkedin.com/in/yourusername"/>
          </div>
        </div>

        <div className="flex gap-4 pt-4 justify-end border-t border-white/10 mt-6 pt-6">
          <button 
            type="button" 
            onClick={() => setIsEditing(false)}
            className="px-6 py-2.5 rounded-full font-medium text-zinc-300 hover:text-white border border-zinc-700 hover:bg-zinc-800 transition-all shadow-inner"
          >
            Cancel
          </button>
          <GradientButton onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />} className="py-2.5 px-6">
            Save Changes
          </GradientButton>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[20%] left-[10%] w-[30%] h-[30%] bg-pink-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[30%] h-[30%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
      
      {/* Top Navbar Simple */}
      <header className="h-16 border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur-md px-6 flex items-center sticky top-0 z-40">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 relative z-10 w-full">
        {toast && (
          <div className={`fixed top-20 right-6 px-4 py-3 rounded-xl flex items-center gap-3 shadow-2xl z-50 animate-[fadeInUp_0.3s_ease-out] ${
            toast.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          }`}>
            <Check className="w-5 h-5" />
            <p className="font-medium text-sm">{toast.message}</p>
          </div>
        )}

        <GlassCard className="p-8 md:p-10 rounded-3xl">
          {isEditing ? renderEditMode() : renderViewMode()}
        </GlassCard>
      </main>
    </div>
  );
}
