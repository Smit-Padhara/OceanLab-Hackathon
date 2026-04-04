import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Briefcase, Search, MapPin, Building2, Globe2, Loader2,
  ExternalLink, Sparkles, Filter, CheckCircle2, Zap,
  TrendingUp, Star, Compass, ArrowRight, X
} from 'lucide-react';
import { GlassCard, GlowText, GradientButton, InputField } from '../components/WatermelonUI';
import { getOpportunitySuggestions, getMarketTrends, getFullMarketReport } from '../lib/gemini';

export default function Opportunities() {
  const [activeTab, setActiveTab] = useState('search');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [opportunities, setOpportunities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [marketTrends, setMarketTrends] = useState([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [fullReport, setFullReport] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  // Filters State
  const [filters, setFilters] = useState({
    jobType: 'Internship',
    location: '',
    companyType: 'Startup',
    workMode: 'Remote'
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
      setFetchingProfile(false);
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'trending' && marketTrends.length === 0 && profile) {
      fetchTrends();
    }
  }, [activeTab, profile]);

  const fetchTrends = async () => {
    setLoadingTrends(true);
    try {
      const trends = await getMarketTrends(profile.domain);
      setMarketTrends(trends);
    } catch (err) {
      console.error('Error fetching trends:', err);
    } finally {
      setLoadingTrends(false);
    }
  };

  const handleGetFullReport = async () => {
    if (!profile) return;
    setShowReportModal(true);
    if (fullReport) return; // Don't refetch if already there

    setReportLoading(true);
    try {
      const report = await getFullMarketReport(profile.domain);
      setFullReport(report);
    } catch (err) {
      console.error('Error getting full report:', err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleFindOpportunities = async (e) => {
    if (e) e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setOpportunities([]);
    try {
      const suggestions = await getOpportunitySuggestions(
        profile.domain,
        profile.skills,
        filters
      );
      setOpportunities(suggestions);
    } catch (err) {
      console.error('Error getting opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'search', label: 'Smart Search', icon: <Search className="w-4 h-4" />, color: 'from-purple-500 to-blue-500' },
    { id: 'trending', label: 'Trending Roles', icon: <TrendingUp className="w-4 h-4" />, color: 'from-orange-500 to-pink-500' }
  ];

  if (fetchingProfile) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const filteredOpportunities = opportunities.filter(opt =>
    opt.role_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-2 md:p-6 animate-[fadeIn_0.4s_ease-out]">

      {/* Header section with Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide pb-2">
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
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-[10px] font-black uppercase tracking-widest">
          <Zap className="w-3.5 h-3.5" />
          Powered by Gemini AI
        </div>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'search' && (
          <div className="flex flex-col gap-10 animate-[fadeIn_0.3s_ease-out]">
            
            {/* Vertical Preferences Card */}
            <div className="flex justify-center w-full">
              <GlassCard className="p-8 rounded-[40px] border-white/5 relative overflow-hidden max-w-lg w-full border-purple-500/10 shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-purple-500/10 rounded-[25px] border border-purple-500/20 shadow-inner">
                    <Filter className="w-7 h-7 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-zinc-100 tracking-tight">Preferences</h3>
                    <p className="text-xs text-zinc-500 uppercase font-black tracking-widest mt-0.5">Define your ideal role</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Job Type */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Engagement Type</label>
                    <select 
                      value={filters.jobType}
                      onChange={(e) => setFilters({...filters, jobType: e.target.value})}
                      className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-[20px] px-6 py-4 text-xs font-black text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all hover:bg-zinc-900 shadow-xl"
                    >
                      <option value="Internship">Internship</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Freelance">Freelance</option>
                      <option value="Part-time">Part-time</option>
                    </select>
                  </div>

                  {/* Company Type */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Company Tier</label>
                    <select 
                      value={filters.companyType}
                      onChange={(e) => setFilters({...filters, companyType: e.target.value})}
                      className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-[20px] px-6 py-4 text-xs font-black text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all hover:bg-zinc-900 shadow-xl"
                    >
                      <option value="Startup">Startup</option>
                      <option value="MNC">MNC</option>
                      <option value="Remote-first">Remote-first</option>
                    </select>
                  </div>

                  {/* Work Mode */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Environment</label>
                    <select 
                      value={filters.workMode}
                      onChange={(e) => setFilters({...filters, workMode: e.target.value})}
                      className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-[20px] px-6 py-4 text-xs font-black text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all hover:bg-zinc-900 shadow-xl"
                    >
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>

                  <GradientButton 
                    onClick={handleFindOpportunities} 
                    loading={loading}
                    className="w-full py-5 rounded-[20px] shadow-[0_15px_30px_rgba(168,85,247,0.2)] mt-4"
                    icon={<Sparkles className="w-5 h-5" />}
                  >
                    FIND OPPORTUNITIES
                  </GradientButton>
                </div>
              </GlassCard>
            </div>

            {/* Results Section Below */}
            <div className="w-full max-w-7xl mx-auto space-y-8">
              {/* Internal Search Bar */}
              {opportunities.length > 0 && (
                <div className="relative group mb-8">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Quick filter results by company or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 hover:bg-white/10 transition-all font-medium backdrop-blur-md"
                  />
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                  {[1, 2, 3, 4].map(i => (
                    <GlassCard key={i} className="p-8 h-64 rounded-[40px] flex items-center justify-center border-white/5 animate-pulse">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
                        <span className="text-[10px] text-zinc-700 font-black uppercase">Thinking...</span>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              ) : filteredOpportunities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeInUp_0.4s_ease-out]">
                  {filteredOpportunities.map((opt, i) => (
                    <GlassCard key={i} className="p-7 rounded-[35px] border-white/3 hover:border-purple-500/20 group transition-all h-full flex flex-col hover:shadow-[0_0_40px_rgba(168,85,247,0.08)]">
                      <div className="mb-5 flex justify-between items-start">
                        <div className="p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-purple-500/10 transition-colors">
                          <Building2 className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                            {opt.job_type}
                          </span>
                          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-tight">
                            <MapPin className="w-3 h-3 text-zinc-600" />
                            {opt.location}
                          </div>
                        </div>
                      </div>

                      <h3 className="text-xl font-black text-zinc-100 mb-1 group-hover:text-purple-400 transition-colors break-words">{opt.role_title}</h3>
                      <p className="text-xs font-bold text-zinc-500 mb-4">{opt.company_name}</p>

                      <p className="text-zinc-500 text-xs leading-relaxed mb-6 line-clamp-3">
                        {opt.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-8">
                        {opt.primary_skills?.map((sk, idx) => (
                          <span key={idx} className="px-2.5 py-1.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500 group-hover:border-zinc-700 transition-colors">
                            {sk}
                          </span>
                        ))}
                      </div>

                      <div className="mt-auto pt-5 border-t border-zinc-900/50 flex items-center justify-between">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/5 rounded-xl border border-blue-500/10">
                          <Globe2 className="w-3 h-3 text-blue-400" />
                          <span className="text-[9px] font-black text-blue-400 uppercase">{opt.domain}</span>
                        </div>
                        <a
                          href={opt.application_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-purple-900/10 hover:shadow-purple-500/30 transition-all hover:scale-105 active:scale-95"
                        >
                          APPLY NOW
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              ) : (
                <div className="py-32 text-center rounded-[50px] border border-dashed border-zinc-800/60 bg-white/[0.01]">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 bg-zinc-950 rounded-[30px] border border-white/5 flex items-center justify-center mx-auto transition-transform hover:scale-110">
                      <Briefcase className="w-10 h-10 text-zinc-800" />
                    </div>
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
                  </div>
                  <h3 className="text-xl font-black text-zinc-300 mb-2">Find Your Next Gig</h3>
                  <p className="text-zinc-600 text-sm max-w-xs mx-auto font-medium">Use the filters on the left and let AI discover premium opportunities tailored for you.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trending Tab with Chart */}
        {activeTab === 'trending' && (
          <div className="w-full max-w-5xl mx-auto py-8 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Chart Section */}
              <div className="flex-1">
                <GlassCard className="p-8 rounded-[40px] border-white/5 h-full">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h3 className="text-2xl font-black text-zinc-100 italic tracking-tighter">MARKET ANALYTICS</h3>
                      <p className="text-[10px] text-orange-400 font-black uppercase tracking-[0.2em] mt-1">Trending Roles In {profile?.domain}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-500/40" />
                  </div>

                  {loadingTrends ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 blur-lg bg-orange-500/20 animate-pulse" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Analyzing Market...</span>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {marketTrends.map((trend, i) => (
                        <div key={i} className="group">
                          <div className="flex justify-between items-end mb-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-zinc-200 group-hover:text-orange-400 transition-colors uppercase tracking-tight">{trend.role_name}</span>
                              <span className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">{trend.growth_reason}</span>
                            </div>
                            <span className="text-lg font-black text-zinc-400 group-hover:text-orange-500 transition-all">{trend.demand_score}%</span>
                          </div>
                          
                          {/* Custom Bar Chart Component */}
                          <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden border border-white/5 p-0.5 relative">
                            <div 
                              className="h-full rounded-full transition-all duration-1000 ease-out relative group-hover:shadow-[0_0_15px_rgba(249,115,22,0.3)]" 
                              style={{ 
                                width: `${trend.demand_score}%`,
                                background: `linear-gradient(90deg, #f97316 0%, #fb923c 100%)`
                              }}
                            >
                              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-3">
                             {trend.skills?.map((skill, idx) => (
                               <span key={idx} className="text-[8px] font-black uppercase px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-zinc-500 group-hover:border-orange-500/20 group-hover:text-zinc-300 transition-all">
                                 {skill}
                               </span>
                             ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </div>

              {/* Insights Sidebar */}
              <div className="w-full md:w-80">
                <GlassCard className="p-8 rounded-[40px] border-white/5 bg-gradient-to-br from-orange-500/5 to-transparent flex flex-col h-full">
                  <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 w-fit mb-6">
                    <Zap className="w-6 h-6 text-orange-400" />
                  </div>
                  <h4 className="text-lg font-black text-zinc-100 mb-4 leading-tight">Insight Generator</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed font-bold mb-8 italic">
                    "The {profile?.domain} market is shifting towards specialized AI implementation. Those with interdisciplinary skills are seeing a 40% higher remote-first acquisition rate."
                  </p>
                  
                  <div className="mt-auto pt-8 border-t border-white/5">
                    <button 
                      onClick={handleGetFullReport}
                      className="flex items-center gap-3 text-orange-500 group cursor-pointer hover:translate-x-1 transition-transform bg-transparent border-none"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">Get Full Report</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            onClick={() => setShowReportModal(false)}
          />
          <GlassCard className="relative z-10 w-full max-w-2xl p-8 md:p-12 rounded-[50px] border-white/5 overflow-hidden">
            <div className="absolute top-8 right-8 cursor-pointer p-2 hover:bg-white/5 rounded-full transition-colors" onClick={() => setShowReportModal(false)}>
              <X className="w-6 h-6 text-zinc-500" />
            </div>

            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                <TrendingUp className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white italic">STRATEGIC REPORT</h2>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">2026 Market Analysis: {profile?.domain}</p>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-4 scrollbar-hide">
              {reportLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                  <span className="text-xs font-black uppercase text-zinc-500 tracking-widest">Generating Insight...</span>
                </div>
              ) : (
                <div className="space-y-6 text-zinc-400 text-sm leading-relaxed font-bold">
                  {fullReport.split('\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-10 flex gap-4">
              <GradientButton 
                onClick={() => setShowReportModal(false)}
                className="w-full py-4 rounded-2xl"
              >
                DISMISS ANALYSIS
              </GradientButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
