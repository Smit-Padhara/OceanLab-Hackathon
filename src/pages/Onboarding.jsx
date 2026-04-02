import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Camera } from 'lucide-react';

const DOMAINS = ['Software Engineering', 'Data Science', 'Design', 'Product Management', 'Cybersecurity', 'Web3', 'AI/ML'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Alumni'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    college: '',
    branch: '',
    year: YEARS[0],
    domain: DOMAINS[0],
    skills: '',
    interests: '',
    github_link: '',
    linkedin_link: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
      } else {
        setUser(user);
        // Pre-fill name if available via OAuth
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile?.is_onboarded) {
          navigate('/dashboard');
        } else if (profile) {
          setFormData(prev => ({ ...prev, full_name: profile.full_name || '' }));
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let avatar_url = null;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatar_url = publicUrlData.publicUrl;
      }

      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);

      const payload = {
        full_name: formData.full_name,
        college: formData.college,
        branch: formData.branch,
        year: formData.year,
        domain: formData.domain,
        skills: skillsArray,
        interests: formData.interests,
        github_link: formData.github_link,
        linkedin_link: formData.linkedin_link,
        is_onboarded: true
      };

      if (avatar_url) payload.avatar_url = avatar_url;

      const { error: updateError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
  </div>;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center py-12 px-6">
      <div className="w-full max-w-2xl bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-8 md:p-12 shadow-xl backdrop-blur-sm">
        
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Complete Your Profile</h1>
          <p className="text-zinc-400">Let others know who you are and what you're building.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center mb-8">
            <div className="relative group w-24 h-24 mb-3">
              <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center">
                {avatarFile ? (
                  <img src={URL.createObjectURL(avatarFile)} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-zinc-500" />
                )}
              </div>
              <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-medium">Upload</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-zinc-300">Full Name *</label>
              <input required name="full_name" value={formData.full_name} onChange={handleChange} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-zinc-300">College *</label>
              <input required name="college" value={formData.college} onChange={handleChange} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-zinc-300">Branch / Major *</label>
              <input required name="branch" value={formData.branch} onChange={handleChange} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-zinc-300">Year *</label>
              <select name="year" value={formData.year} onChange={handleChange} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors appearance-none">
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <hr className="border-zinc-800 my-6"/>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
               <label className="block text-sm font-medium mb-1.5 text-zinc-300">Primary Domain *</label>
               <select name="domain" value={formData.domain} onChange={handleChange} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors appearance-none">
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
               </select>
            </div>
            <div>
               <label className="block text-sm font-medium mb-1.5 text-zinc-300">Skills (Comma-separated) *</label>
               <input required name="skills" value={formData.skills} onChange={handleChange} placeholder="React, Python, Figma" className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors" />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium mb-1.5 text-zinc-300">Bio / Interests (Optional)</label>
             <textarea name="interests" value={formData.interests} onChange={handleChange} rows={3} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors resize-none" placeholder="What are you passionate about?" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-medium mb-1.5 text-zinc-300">GitHub URL (Optional)</label>
                <input name="github_link" type="url" value={formData.github_link} onChange={handleChange} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors" placeholder="https://github.com/you" />
             </div>
             <div>
                <label className="block text-sm font-medium mb-1.5 text-zinc-300">LinkedIn URL (Optional)</label>
                <input name="linkedin_link" type="url" value={formData.linkedin_link} onChange={handleChange} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors" placeholder="https://linkedin.com/in/you" />
             </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
