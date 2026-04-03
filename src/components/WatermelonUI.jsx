import React, { useState } from 'react';
import { Loader2, Camera, X } from 'lucide-react';

export const GlowText = ({ children, className = '' }) => (
  <span className={`bg-gradient-to-r from-pink-400 via-purple-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(219,39,119,0.5)] ${className}`}>
    {children}
  </span>
);

export const GradientButton = ({ children, className = '', disabled, loading, icon, type = "button", ...props }) => (
  <button 
    type={type}
    disabled={disabled || loading}
    className={`group flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 shadow-[0_0_20px_rgba(219,39,119,0.4)] hover:shadow-[0_0_40px_rgba(219,39,119,0.7)] hover:scale-105 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none ${className}`}
    {...props}
  >
    {loading && <Loader2 className="w-5 h-5 animate-spin" />}
    {children}
    {icon && !loading && <span className="group-hover:translate-x-1 group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,1)] transition-transform duration-300">{icon}</span>}
  </button>
);

export const GlassCard = ({ children, className = '', ...props }) => (
  <div 
    className={`bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl transition-all duration-300 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const InputField = ({ label, className = '', ...props }) => (
  <div className={`w-full ${className}`}>
    {label && <label className="block text-sm font-medium text-zinc-300 mb-1.5 ml-1">{label}</label>}
    <input 
      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 hover:bg-black/30 transition-all duration-300 shadow-inner"
      {...props}
    />
  </div>
);

export const SelectField = ({ label, children, className = '', ...props }) => (
  <div className={`w-full ${className}`}>
    {label && <label className="block text-sm font-medium text-zinc-300 mb-1.5 ml-1">{label}</label>}
    <select 
      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 hover:bg-black/30 transition-all duration-300 appearance-none shadow-inner"
      {...props}
    >
      {children}
    </select>
  </div>
);

export const TextAreaField = ({ label, className = '', ...props }) => (
  <div className={`w-full ${className}`}>
    {label && <label className="block text-sm font-medium text-zinc-300 mb-1.5 ml-1">{label}</label>}
    <textarea 
      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 hover:bg-black/30 transition-all duration-300 resize-none shadow-inner"
      {...props}
    />
  </div>
);

export const FileUpload = ({ file, onChange }) => (
  <div className="flex flex-col items-center mb-6">
    <div className="relative w-28 h-28 mb-3 rounded-full overflow-hidden border-2 border-dashed border-pink-500/40 bg-black/20 hover:border-pink-500 hover:shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:bg-black/40 transition-all duration-300 group flex items-center justify-center">
      {file ? (
        <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity duration-300" />
      ) : (
        <Camera className="w-8 h-8 text-pink-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(219,39,119,0.8)] transition-all duration-300" />
      )}
      <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
        <span className="text-xs font-bold text-white drop-shadow-md">{file ? 'Change' : 'Upload'}</span>
        <input type="file" accept="image/*" onChange={onChange} className="hidden" />
      </label>
    </div>
  </div>
);

export const TagInput = ({ value, onChange, placeholder, label }) => {
  const [inputValue, setInputValue] = useState('');
  
  // Parse comma separated internal state to array for rendering
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  const addTag = (newTag) => {
    if (!newTag) return;
    if (tags.includes(newTag)) return;
    const newTags = [...tags, newTag];
    onChange(newTags.join(', '));
  };

  const removeTag = (tagToRemove) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    onChange(newTags.join(', '));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-zinc-300 mb-1.5 ml-1">{label}</label>}
      <div className="w-full bg-black/20 border border-white/10 rounded-xl p-2 focus-within:ring-2 focus-within:ring-pink-500/50 focus-within:border-pink-500/50 hover:bg-black/30 transition-all duration-300 shadow-inner flex flex-wrap gap-2 items-center min-h-[52px]">
        {tags.map((tag, i) => (
          <span key={i} className="flex items-center gap-1 bg-gradient-to-r from-pink-500/20 to-purple-600/20 border border-pink-500/30 text-white px-3 py-1 rounded-full text-sm animate-[fadeIn_0.2s_ease-out]">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-pink-300 hover:text-white transition-colors p-0.5 rounded-full hover:bg-white/10">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 bg-transparent min-w-[120px] outline-none text-white px-2 py-1 text-sm placeholder-zinc-500"
        />
      </div>
    </div>
  );
};
