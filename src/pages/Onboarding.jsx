import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { GlassCard, GradientButton, InputField, SelectField, TextAreaField, FileUpload, TagInput, GlowText } from '../components/WatermelonUI';

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
    skills: '', // stored as comma separated string
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

  const handleTagsChange = (newTagsString) => {
    setFormData({ ...formData, skills: newTagsString });
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
        const { error: uploadError } = await supabase.storage
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

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-sans">
      <Loader2 className="w-12 h-12 animate-spin text-pink-500 drop-shadow-[0_0_15px_rgba(219,39,119,0.8)]" />
      <p className="mt-4 text-zinc-400 font-medium animate-pulse">Loading setup...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center py-12 px-6 relative overflow-x-hidden font-sans">
      {/* Background Blobs (Watermelon UI style) */}
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-600/20 blur-[150px] rounded-full pointer-events-none animate-[float_10s_ease-in-out_infinite]" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none animate-[float_12s_ease-in-out_infinite_reverse]" style={{ animationDelay: '1s'}} />

      <GlassCard className="w-full max-w-2xl p-8 md:p-12 z-10 opacity-0 animate-[fadeInUp_0.8s_ease-out_forwards]">
        
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            <GlowText>Complete Your Profile</GlowText>
          </h1>
          <p className="text-zinc-400 font-light">Let others know who you are and what you're building.</p>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-[fadeIn_0.3s_ease-out]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-7">
          
          <FileUpload file={avatarFile} onChange={handleFileChange} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              label="Full Name *" 
              required 
              name="full_name" 
              value={formData.full_name} 
              onChange={handleChange} 
              placeholder="Elon Musk" 
            />
            <InputField 
              label="College *" 
              required 
              name="college" 
              value={formData.college} 
              onChange={handleChange} 
              placeholder="University of Examples" 
            />
            <InputField 
              label="Branch / Major *" 
              required 
              name="branch" 
              value={formData.branch} 
              onChange={handleChange} 
              placeholder="Computer Science" 
            />
            <SelectField 
              label="Year *" 
              name="year" 
              value={formData.year} 
              onChange={handleChange}
            >
              {YEARS.map(y => <option key={y} value={y} className="bg-zinc-900 text-white">{y}</option>)}
            </SelectField>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectField 
              label="Primary Domain *" 
              name="domain" 
              value={formData.domain} 
              onChange={handleChange}
            >
              {DOMAINS.map(d => <option key={d} value={d} className="bg-zinc-900 text-white">{d}</option>)}
            </SelectField>
            
            <TagInput 
              label="Skills *" 
              value={formData.skills} 
              onChange={handleTagsChange} 
              placeholder="Type & press Enter (e.g. React)"
            />
          </div>

          <TextAreaField 
            label="Bio / Interests (Optional)" 
            name="interests" 
            value={formData.interests} 
            onChange={handleChange} 
            rows={3} 
            placeholder="What are you passionate about? I love building scalable web apps..." 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              label="GitHub URL (Optional)" 
              name="github_link" 
              type="url" 
              value={formData.github_link} 
              onChange={handleChange} 
              placeholder="https://github.com/you" 
            />
            <InputField 
              label="LinkedIn URL (Optional)" 
              name="linkedin_link" 
              type="url" 
              value={formData.linkedin_link} 
              onChange={handleChange} 
              placeholder="https://linkedin.com/in/you" 
            />
          </div>

          <div className="pt-8">
            <GradientButton 
              type="submit" 
              loading={saving}
              className="w-full"
            >
              Complete Setup
            </GradientButton>
          </div>
        </form>
      </GlassCard>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}
