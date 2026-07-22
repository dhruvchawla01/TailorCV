import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Application, Profile } from '../types';
import { 
  Plus, Briefcase, FileText, ChevronRight, Trash2, 
  Search, ShieldAlert, Sparkles, Building,
  Calendar, ExternalLink, Columns, List,
  Filter, AlertTriangle, AlertCircle, RefreshCw, Bookmark,
  TrendingUp, Award
} from 'lucide-react';

interface DashboardProps {
  onSelectApplication: (id: number) => void;
  onNavigateToProfile: () => void;
}

const STATUS_OPTIONS = [
  'Draft',
  'Ready to Apply',
  'Applied',
  'Application Viewed',
  'Assessment Received',
  'Interview Scheduled',
  'Interview Completed',
  'HR Discussion',
  'Technical Interview',
  'Final Interview',
  'Offer Received',
  'Offer Accepted',
  'Offer Declined',
  'Rejected',
  'Withdrawn'
];

const KANBAN_COLUMNS = [
  { id: 'Draft', name: 'Draft', statuses: ['Draft', 'Ready to Apply'], color: 'border-blue-500/30 bg-blue-950/10' },
  { id: 'Applied', name: 'Applied', statuses: ['Applied', 'Application Viewed', 'Assessment Received'], color: 'border-amber-500/30 bg-amber-950/10' },
  { id: 'Interview', name: 'Interview', statuses: ['Interview Scheduled', 'Interview Completed', 'HR Discussion', 'Technical Interview', 'Final Interview'], color: 'border-purple-500/30 bg-purple-950/10' },
  { id: 'Offer', name: 'Offer', statuses: ['Offer Received', 'Offer Accepted', 'Offer Declined'], color: 'border-green-500/30 bg-green-950/10' },
  { id: 'Rejected', name: 'Rejected / Withdrawn', statuses: ['Rejected', 'Withdrawn'], color: 'border-red-500/30 bg-red-950/10' }
];

export default function Dashboard({ onSelectApplication, onNavigateToProfile }: DashboardProps) {
  const queryClient = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced filters state
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCompany, setFilterCompany] = useState('All');
  const [filterJobTitle, setFilterJobTitle] = useState('All');
  const [filterScore, setFilterScore] = useState('All');
  const [filterCoverLetter, setFilterCoverLetter] = useState('All');
  const [filterNotes, setFilterNotes] = useState('All');

  // Wizard state
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [rawJd, setRawJd] = useState('');
  const [jobPostingUrl, setJobPostingUrl] = useState('');
  const [wizardError, setWizardError] = useState<string | null>(null);

  // Duplicate Check Modal State
  const [duplicateMatches, setDuplicateMatches] = useState<Application[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Fetch Applications
  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ['applications'],
    queryFn: api.applications.list,
  });

  // Fetch Master Profile
  const { data: profile } = useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: api.profile.get,
  });

  // Calculate stale applications where master profile updated_at is newer than application's updated_at
  const staleApplications = profile && applications.length
    ? applications.filter(app => {
        if (!app.tailored_resume_data) return false;
        return new Date(profile.updated_at) > new Date(app.updated_at);
      })
    : [];

  // Create Application Mutation
  const createMutation = useMutation({
    mutationFn: () => api.applications.create(jobTitle, company, rawJd),
    onSuccess: async (newApp) => {
      // If a job posting URL was provided, save it via PUT updates
      if (jobPostingUrl) {
        await api.applications.update(newApp.id, { job_posting_url: jobPostingUrl });
      }
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setShowWizard(false);
      resetWizard();
      onSelectApplication(newApp.id);
    },
    onError: (err: any) => {
      setWizardError(err.message || 'Failed to initialize application tracking.');
    }
  });

  // Delete Application Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.applications.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    }
  });

  const resetWizard = () => {
    setJobTitle('');
    setCompany('');
    setRawJd('');
    setJobPostingUrl('');
    setWizardError(null);
  };

  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !company || !rawJd) {
      setWizardError('Please fill in job title, company name, and job description.');
      return;
    }
    
    try {
      setWizardError(null);
      // Query duplicate check
      const dupes = await api.applications.checkDuplicate(company, jobTitle);
      if (dupes && dupes.length > 0) {
        setDuplicateMatches(dupes);
        setShowDuplicateModal(true);
      } else {
        createMutation.mutate();
      }
    } catch (err: any) {
      setWizardError(err.message || 'Error checking for duplicates.');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, appId: number) => {
    e.dataTransfer.setData('text/plain', appId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const appIdStr = e.dataTransfer.getData('text/plain');
    if (!appIdStr) return;
    const appId = parseInt(appIdStr, 10);
    
    // Choose status based on dropped column
    let newStatus = 'Draft';
    if (targetColumnId === 'Applied') newStatus = 'Applied';
    else if (targetColumnId === 'Interview') newStatus = 'Interview Scheduled';
    else if (targetColumnId === 'Offer') newStatus = 'Offer Received';
    else if (targetColumnId === 'Rejected') newStatus = 'Rejected';
    
    try {
      await api.applications.update(appId, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    } catch (err: any) {
      console.error('Failed to drag status drop:', err);
    }
  };

  // Filter application list
  const filteredApps = applications.filter(app => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      app.job_title.toLowerCase().includes(term) ||
      app.company.toLowerCase().includes(term) ||
      (app.notes || '').toLowerCase().includes(term) ||
      app.raw_job_description.toLowerCase().includes(term) ||
      JSON.stringify(app.parsed_job_description || {}).toLowerCase().includes(term) ||
      JSON.stringify(app.tailored_resume_data || {}).toLowerCase().includes(term)
    );

    const matchesStatus = filterStatus === 'All' || app.status === filterStatus;
    const matchesCompany = filterCompany === 'All' || app.company === filterCompany;
    const matchesJobTitle = filterJobTitle === 'All' || app.job_title === filterJobTitle;
    
    let matchesScore = true;
    const score = app.ats_score_data?.overall_score || 0;
    if (filterScore === '80+') matchesScore = score >= 80;
    else if (filterScore === '70+') matchesScore = score >= 70;
    else if (filterScore === '60-') matchesScore = score > 0 && score < 70;
    else if (filterScore === 'None') matchesScore = !app.ats_score_data;

    const matchesCoverLetter = filterCoverLetter === 'All' || 
      (filterCoverLetter === 'Yes' ? !!app.cover_letter : !app.cover_letter);

    const matchesNotes = filterNotes === 'All' || 
      (filterNotes === 'Yes' ? !!app.notes : !app.notes);

    return matchesSearch && matchesStatus && matchesCompany && matchesJobTitle && matchesScore && matchesCoverLetter && matchesNotes;
  });

  // Dynamic filter values
  const uniqueCompanies = Array.from(new Set(applications.map(a => a.company)));
  const uniqueJobTitles = Array.from(new Set(applications.map(a => a.job_title)));

  // Statistics calculation
  const totalApps = applications.length;
  const submittedApps = applications.filter(a => !['Draft', 'Ready to Apply'].includes(a.status)).length;
  const interviewsApps = applications.filter(a => a.status.toLowerCase().includes('interview')).length;
  const offersApps = applications.filter(a => a.status.toLowerCase().includes('offer')).length;
  const offersAccepted = applications.filter(a => a.status === 'Offer Accepted').length;
  const rejectionsApps = applications.filter(a => a.status === 'Rejected').length;
  const pendingApps = applications.filter(a => ['Applied', 'Application Viewed', 'Assessment Received'].includes(a.status)).length;
  
  const avgAts = applications.length 
    ? Math.round(applications.reduce((acc, app) => acc + (app.ats_score_data?.overall_score || 0), 0) / applications.length)
    : 0;

  const successRate = submittedApps > 0 
    ? Math.round((offersApps / submittedApps) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-fade-in text-slate-100">
      {/* Profile Sync Notification Banner */}
      {staleApplications.length > 0 && (
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-655/10 border border-amber-500/30 rounded-2xl p-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse">
          <div className="flex gap-3 items-start">
            <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
            <div>
              <strong className="text-white text-sm font-bold block">Your master profile has changed</strong>
              <p className="text-slate-350 text-xs mt-0.5">
                {staleApplications.length} existing job application{staleApplications.length > 1 ? 's' : ''} can be regenerated with your latest project details, education, or skills.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                for (const app of staleApplications) {
                  await api.applications.tailor(app.id);
                }
                queryClient.invalidateQueries({ queryKey: ['applications'] });
                alert('Successfully synced and recalculated all stale applications!');
              } catch (err: any) {
                alert(`Sync failed: ${err.message}`);
              }
            }}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl shrink-0 cursor-pointer"
          >
            Regenerate Stale Resumes
          </button>
        </div>
      )}

      {/* Dynamic Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 shadow-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Applications</p>
            <h3 className="text-2xl font-black text-white mt-1">{totalApps}</h3>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">{pendingApps} pending response</span>
          </div>
          <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center">
            <Briefcase size={18} />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 shadow-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Interviews</p>
            <h3 className="text-2xl font-black text-purple-400 mt-1">{interviewsApps}</h3>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Submissions: {submittedApps}</span>
          </div>
          <div className="w-10 h-10 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl flex items-center justify-center">
            <Calendar size={18} />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 shadow-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Offers (Rate)</p>
            <h3 className="text-2xl font-black text-green-400 mt-1">
              {offersApps} <span className="text-xs font-medium text-slate-400">({successRate}%)</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">{offersAccepted} accepted</span>
          </div>
          <div className="w-10 h-10 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl flex items-center justify-center">
            <Award size={18} />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 shadow-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Avg ATS Match</p>
            <h3 className="text-2xl font-black text-brand-400 mt-1">{avgAts}%</h3>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">{rejectionsApps} rejections</span>
          </div>
          <div className="w-10 h-10 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-1 items-center gap-3 bg-slate-950/80 rounded-xl px-3 py-1.5 border border-slate-850">
          <Search size={16} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search role, company, skills, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none text-white outline-none text-sm placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filters toggler */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${showFilters ? 'bg-brand-600/20 text-brand-400 border-brand-500/30' : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'}`}
          >
            <Filter size={14} />
            <span>Filters</span>
          </button>

          {/* Toggle Views */}
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              title="List View"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'kanban' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              title="Kanban Board"
            >
              <Columns size={14} />
            </button>
          </div>

          <button
            onClick={onNavigateToProfile}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-350 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            Edit Master Profile
          </button>

          <button
            onClick={() => setShowWizard(true)}
            className="bg-brand-500 hover:bg-brand-600 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-brand-500/10 cursor-pointer"
          >
            <Plus size={14} />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Block */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-5 glass rounded-2xl border border-slate-800 bg-slate-950/30 animate-slide-down">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 outline-none focus:border-brand-500"
            >
              <option value="All">All Statuses</option>
              {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Company</label>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 outline-none focus:border-brand-500"
            >
              <option value="All">All Companies</option>
              {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Job Title</label>
            <select
              value={filterJobTitle}
              onChange={(e) => setFilterJobTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 outline-none focus:border-brand-500"
            >
              <option value="All">All Job Titles</option>
              {uniqueJobTitles.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">ATS Match</label>
            <select
              value={filterScore}
              onChange={(e) => setFilterScore(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 outline-none focus:border-brand-500"
            >
              <option value="All">All Scores</option>
              <option value="80+">High (&gt;=80%)</option>
              <option value="70+">Medium (&gt;=70%)</option>
              <option value="60-">Low (&lt;70%)</option>
              <option value="None">No Report (Pending)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Has Cover Letter</label>
            <select
              value={filterCoverLetter}
              onChange={(e) => setFilterCoverLetter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 outline-none focus:border-brand-500"
            >
              <option value="All">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Has Notes</label>
            <select
              value={filterNotes}
              onChange={(e) => setFilterNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 outline-none focus:border-brand-500"
            >
              <option value="All">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Grid View modes */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-500 gap-3">
          <RefreshCw className="animate-spin text-brand-400" size={32} />
          <span className="text-sm font-medium">Fetching job applications database...</span>
        </div>
      ) : applications.length === 0 ? (
        <div className="glass rounded-3xl p-16 border border-slate-800 text-center space-y-4 max-w-lg mx-auto mt-6">
          <Building size={48} className="text-slate-600 mx-auto" />
          <h4 className="text-lg font-bold text-white">Start Your Application Tracking</h4>
          <p className="text-slate-400 text-xs leading-relaxed">
            Create your first application tracking card! Submit a job description, tailor a matching resume, and track interviews, offers, and deadlines.
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="bg-brand-500 hover:bg-brand-600 text-slate-950 text-xs font-bold px-4.5 py-2.5 rounded-xl cursor-pointer shadow-lg"
          >
            Create Your First Application
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="glass rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/40 border-b border-slate-850 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">UID</th>
                  <th className="px-6 py-4">Role & Company</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">ATS Score</th>
                  <th className="px-6 py-4">Links & Materials</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/80">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-900/20 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="bg-slate-800 text-slate-300 font-mono font-bold text-xs px-2.5 py-1 rounded-md border border-slate-700/40">
                        {app.uid || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm group-hover:text-brand-400 transition-colors">
                          {app.job_title}
                        </span>
                        {staleApplications.some(sa => sa.id === app.id) && (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-1.5 py-0.5 rounded animate-pulse" title="Master Profile has changed. Re-tailor to update.">
                            Needs Sync
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{app.company}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                        app.status === 'Applied' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        app.status.includes('Interview') ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        app.status.includes('Offer') ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        app.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-slate-800/60 text-slate-400 border-slate-700/60'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {app.ats_score_data ? (
                        <span className={`font-bold text-sm ${app.ats_score_data.overall_score >= 80 ? 'text-green-400' : app.ats_score_data.overall_score >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                          {app.ats_score_data.overall_score}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {app.job_posting_url && (
                          <a
                            href={app.job_posting_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-white transition-colors"
                            title="Open Job Posting"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        {app.cover_letter && (
                          <span title="Cover Letter Available">
                            <FileText size={14} className="text-brand-400" />
                          </span>
                        )}
                        {app.notes && (
                          <span title="Contains Notes">
                            <Bookmark size={14} className="text-amber-400" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => onSelectApplication(app.id)}
                          className="bg-slate-800 hover:bg-slate-750 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors border border-slate-700/50"
                        >
                          <span>Workspace</span>
                          <ChevronRight size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete application for ${app.job_title} at ${app.company}?`)) {
                              deleteMutation.mutate(app.id);
                            }
                          }}
                          className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 min-h-[500px]">
          {KANBAN_COLUMNS.map((column) => {
            const columnApps = filteredApps.filter(app => column.statuses.includes(app.status));
            return (
              <div
                key={column.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`rounded-2xl border p-4 flex flex-col gap-4 shadow-inner ${column.color}`}
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                    <span>{column.name}</span>
                  </h4>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                    {columnApps.length}
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[600px] scrollbar-thin">
                  {columnApps.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-600 text-[10px] border border-dashed border-slate-800 rounded-xl">
                      Drag here to update status
                    </div>
                  ) : (
                    columnApps.map((app) => (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        onClick={() => onSelectApplication(app.id)}
                        className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl hover:border-brand-500/50 hover:shadow-lg cursor-grab active:cursor-grabbing transition-all space-y-3 group"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[9px] bg-slate-950 text-slate-400 font-mono font-semibold px-1.5 py-0.5 rounded border border-slate-850">
                            {app.uid}
                          </span>
                          {app.ats_score_data && (
                            <span className="text-[10px] font-bold text-brand-400 bg-brand-500/5 px-2 py-0.5 rounded-full">
                              {app.ats_score_data.overall_score}% Match
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="font-semibold text-white text-xs group-hover:text-brand-400 transition-colors line-clamp-1">
                              {app.job_title}
                            </h5>
                            {staleApplications.some(sa => sa.id === app.id) && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Master Profile has changed. Needs sync." />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{app.company}</p>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-850 text-[10px] text-slate-500">
                          <span>Updated {new Date(app.updated_at).toLocaleDateString()}</span>
                          <ChevronRight size={12} className="text-slate-600 group-hover:text-brand-400 transition-colors" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Duplicate Warning Dialog Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle size={28} />
              <h3 className="text-lg font-bold text-white">Duplicate Application Found</h3>
            </div>
            
            <p className="text-slate-300 text-xs leading-relaxed">
              We detected an existing application matching **{company}** for the role **{jobTitle}**. What would you like to do?
            </p>

            <div className="space-y-3">
              {duplicateMatches.map(dup => (
                <div key={dup.id} className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{dup.job_title}</span>
                    <span className="text-slate-400">{dup.company} (UID: {dup.uid})</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowDuplicateModal(false);
                      setShowWizard(false);
                      resetWizard();
                      onSelectApplication(dup.id);
                    }}
                    className="text-brand-400 hover:text-brand-300 font-semibold cursor-pointer"
                  >
                    Open Workspace
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  createMutation.mutate();
                }}
                className="bg-brand-500 hover:bg-brand-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-lg shadow-brand-500/10"
              >
                Create New Copy Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Application Creation Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-brand-400" />
                <span>Initialize Job Application</span>
              </h3>
              <button
                onClick={() => { setShowWizard(false); resetWizard(); }}
                className="text-slate-400 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWizardSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Google"
                    className="w-full bg-slate-950/80 border border-slate-850 text-white rounded-xl py-2 px-3 outline-none focus:border-brand-500 text-sm placeholder-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full bg-slate-950/80 border border-slate-850 text-white rounded-xl py-2 px-3 outline-none focus:border-brand-500 text-sm placeholder-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Job Posting URL (Optional)</label>
                <input
                  type="url"
                  value={jobPostingUrl}
                  onChange={(e) => setJobPostingUrl(e.target.value)}
                  placeholder="e.g. https://www.linkedin.com/jobs/view/..."
                  className="w-full bg-slate-950/80 border border-slate-850 text-white rounded-xl py-2 px-3 outline-none focus:border-brand-500 text-sm placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Job Description *</label>
                <textarea
                  required
                  rows={6}
                  value={rawJd}
                  onChange={(e) => setRawJd(e.target.value)}
                  placeholder="Paste the raw text of the job description here..."
                  className="w-full bg-slate-950/80 border border-slate-850 text-white rounded-xl py-2 px-3 outline-none focus:border-brand-500 text-sm placeholder-slate-600 resize-none font-sans"
                />
              </div>

              {wizardError && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                  <ShieldAlert size={14} />
                  <span>{wizardError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowWizard(false); resetWizard(); }}
                  className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-brand-500 hover:bg-brand-600 text-slate-950 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 disabled:opacity-55"
                >
                  {createMutation.isPending ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Parsing with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Start Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
