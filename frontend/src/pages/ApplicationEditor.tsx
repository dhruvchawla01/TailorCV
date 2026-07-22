import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { 
  Application, Resume, Experience, Project, Education, Skill, 
  Certification, Achievement, RewriteSuggestion 
} from '../types';
import TipTapEditor from '../components/TipTapEditor';
import { 
  ArrowLeft, Sparkles, Save, ShieldCheck, FileText, Download, 
  RefreshCw, CheckCircle, Loader2, MessageSquare, 
  ChevronRight, ChevronDown, ExternalLink, Bookmark, 
  Clock, Plus, Trash2, List, Building
} from 'lucide-react';

interface ApplicationEditorProps {
  applicationId: number;
  onBackToDashboard: () => void;
}

type WorkspaceTab = 'overview' | 'resume' | 'ats' | 'coverletter' | 'jd' | 'notes' | 'timeline';

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

export default function ApplicationEditor({ applicationId, onBackToDashboard }: ApplicationEditorProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // States for ATS collapsible panels
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    scores: false,
    insights: false,
    compliance: true,
    keywords: false,
    sections: true,
    rewrites: false,
    redundancies: true,
  });

  // State for rephrase suggestion highlight pulse
  const [highlightedBullet, setHighlightedBullet] = useState<{
    sectionType: string;
    itemIndex: number;
    bulletIndex?: number;
  } | null>(null);

  const toggleSection = (sec: string) => {
    setCollapsedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // State for refinement Sparkles modal
  const [activeBulletRegen, setActiveBulletRegen] = useState<{ expIdx: number; projIdx?: number; bulletIdx: number } | null>(null);
  const [regenInstructions, setRegenInstructions] = useState('');
  const [regenOptions, setRegenOptions] = useState<string[]>([]);
  const [isRegening, setIsRegening] = useState(false);

  // local states for resume fields
  const [summary, setSummary] = useState('');
  const [contactInfo, setContactInfo] = useState<any>({});
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Overview, Link, and Reminders local states
  const [jobPostingUrl, setJobPostingUrl] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');
  const [reminderStatus, setReminderStatus] = useState('Pending');
  const [appNotes, setAppNotes] = useState('');

  // Fetch application details
  const { data: application, isLoading } = useQuery<Application>({
    queryKey: ['application', applicationId],
    queryFn: () => api.applications.get(applicationId),
  });

  // Sync tailored resume states on load
  useEffect(() => {
    if (application) {
      setAppNotes(application.notes || '');
      setJobPostingUrl(application.job_posting_url || '');
      setReminderDate(application.reminder_date ? new Date(application.reminder_date).toISOString().substring(0, 16) : '');
      setReminderNotes(application.reminder_notes || '');
      setReminderStatus(application.reminder_status || 'Pending');

      if (application.tailored_resume_data) {
        const resume = application.tailored_resume_data;
        setSummary(resume.summary || '');
        setContactInfo(resume.contact_info || {});
        setExperiences(resume.experiences || []);
        setProjects(resume.projects || []);
        setEducation(resume.education || []);
        setSkills(resume.skills || []);
        setCertifications(resume.certifications || []);
        setAchievements(resume.achievements || []);
      }
    }
  }, [application]);

  // Load PDF Blob URL for preview if resume tab is active
  const fetchPdfPreview = async () => {
    try {
      const blob = await api.applications.getPdfBlob(applicationId);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (e) {
      console.error("Failed to load PDF preview:", e);
    }
  };

  useEffect(() => {
    if (activeTab === 'resume' && application?.tailored_resume_data) {
      fetchPdfPreview();
    }
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [activeTab, application]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (resumeData: Resume) => api.applications.updateResume(applicationId, resumeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  });

  const tailorMutation = useMutation({
    mutationFn: () => api.applications.tailor(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      alert('Resume tailored successfully!');
    },
    onError: (err: any) => {
      alert(`Tailoring failed: ${err.message}`);
    }
  });

  const evaluateAtsMutation = useMutation({
    mutationFn: () => api.applications.evaluateAts(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      alert('ATS Evaluation updated successfully!');
    }
  });

  const generateCoverLetterMutation = useMutation({
    mutationFn: () => api.applications.generateCoverLetter(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      alert('Cover Letter generated successfully!');
    }
  });

  const updateApplicationMutation = useMutation({
    mutationFn: (data: Partial<Application>) => api.applications.update(applicationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    }
  });

  // Local Save Handlers
  const handleSaveResume = () => {
    saveMutation.mutate({
      contact_info: contactInfo,
      summary,
      experiences,
      projects,
      education,
      skills,
      certifications,
      achievements
    });
  };

  const handleUpdateStatus = (status: string) => {
    updateApplicationMutation.mutate({ status });
  };

  const handleSaveOverviewMetadata = () => {
    updateApplicationMutation.mutate({
      job_posting_url: jobPostingUrl,
      reminder_date: reminderDate ? new Date(reminderDate).toISOString() : undefined,
      reminder_notes: reminderNotes,
      reminder_status: reminderStatus
    });
    alert('Overview settings updated successfully!');
  };

  const handleSaveNotes = () => {
    updateApplicationMutation.mutate({ notes: appNotes });
    alert('Notes saved successfully!');
  };

  // One-Click apply suggestions
  const handleApplyRewrite = async (suggestion: RewriteSuggestion) => {
    let updatedExp = [...experiences];
    let updatedProj = [...projects];
    let updatedSummary = summary;

    if (suggestion.section_type === 'summary') {
      updatedSummary = suggestion.suggested_text;
      setSummary(updatedSummary);
    } else if (suggestion.section_type === 'experience') {
      const idx = suggestion.item_index;
      const bIdx = suggestion.bullet_index ?? 0;
      if (updatedExp[idx] && updatedExp[idx].description_bullets) {
        updatedExp[idx].description_bullets[bIdx] = suggestion.suggested_text;
        setExperiences(updatedExp);
      }
    } else if (suggestion.section_type === 'project') {
      const idx = suggestion.item_index;
      const bIdx = suggestion.bullet_index ?? 0;
      if (updatedProj[idx] && updatedProj[idx].description_bullets) {
        updatedProj[idx].description_bullets[bIdx] = suggestion.suggested_text;
        setProjects(updatedProj);
      }
    }

    // Save and re-run ATS in one unified flow
    try {
      await api.applications.updateResume(applicationId, {
        contact_info: contactInfo,
        summary: updatedSummary,
        experiences: updatedExp,
        projects: updatedProj,
        education,
        skills,
        certifications,
        achievements
      });

      // Highlight the rephrased bullet point in red/gold pulse
      setHighlightedBullet({
        sectionType: suggestion.section_type,
        itemIndex: suggestion.item_index,
        bulletIndex: suggestion.bullet_index
      });

      // Recalculate ATS scores
      await api.applications.evaluateAts(applicationId);
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });

      // Automatically collapse suggestions accordion and reveal highlight bullet
      setActiveTab('resume');

      // Scroll editor view into viewpoint and clear highlight style after 3 seconds
      setTimeout(() => {
        setHighlightedBullet(null);
      }, 3000);

    } catch (err: any) {
      alert(`Failed to apply suggestion: ${err.message}`);
    }
  };

  // Refine single bullet point modals
  const triggerRegenBullet = async (itemIdx: number, bulletIdx: number, bulletText: string, isProj = false) => {
    setActiveBulletRegen({ expIdx: isProj ? -1 : itemIdx, projIdx: isProj ? itemIdx : undefined, bulletIdx });
    setRegenInstructions('');
    setRegenOptions([]);
    setIsRegening(true);

    try {
      const res = await api.applications.regenerateBullet(bulletText, application?.raw_job_description || '');
      setRegenOptions(res.options || []);
    } catch (err: any) {
      alert(`Failed to get rewrite variations: ${err.message}`);
    } finally {
      setIsRegening(false);
    }
  };

  const handleApplyRegenOption = (text: string) => {
    if (!activeBulletRegen) return;
    const { expIdx, projIdx, bulletIdx } = activeBulletRegen;

    if (expIdx !== -1) {
      const updated = [...experiences];
      updated[expIdx].description_bullets[bulletIdx] = text;
      setExperiences(updated);
    } else if (projIdx !== undefined) {
      const updated = [...projects];
      updated[projIdx].description_bullets[bulletIdx] = text;
      setProjects(updated);
    }

    setActiveBulletRegen(null);
  };

  // Custom Instructions Bullet Regeneration
  const handleRegenWithInstructions = async () => {
    if (!activeBulletRegen || !application) return;
    const { expIdx, projIdx, bulletIdx } = activeBulletRegen;
    
    let bulletText = '';
    if (expIdx !== -1) {
      bulletText = experiences[expIdx].description_bullets[bulletIdx];
    } else if (projIdx !== undefined) {
      bulletText = projects[projIdx].description_bullets[bulletIdx];
    }

    setIsRegening(true);
    try {
      const res = await api.applications.regenerateBullet(
        bulletText, 
        application.raw_job_description, 
        regenInstructions
      );
      setRegenOptions(res.options || []);
    } catch (err: any) {
      alert(`Failed to refine: ${err.message}`);
    } finally {
      setIsRegening(false);
    }
  };

  // File downloads
  const handleDownloadCoverLetter = async (format: 'txt' | 'pdf') => {
    if (!application) return;
    try {
      let blob: Blob;
      let extension = 'txt';
      if (format === 'pdf') {
        blob = await api.applications.getCoverLetterPdfBlob(applicationId);
        extension = 'pdf';
      } else {
        blob = await api.applications.getCoverLetterTxtBlob(applicationId);
      }

      // Convert applicant name to underscores
      const name = contactInfo.name ? contactInfo.name.trim().replace(/\s+/g, '_') : 'Applicant';
      const filename = `Cover_Letter_${name}_${application.uid}.${extension}`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleDownloadResume = async () => {
    if (!application) return;
    try {
      const blob = await api.applications.getPdfBlob(applicationId);
      const name = contactInfo.name ? contactInfo.name.trim().replace(/\s+/g, '_') : 'Applicant';
      const filename = `Resume_${name}_${application.uid}.pdf`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  // Add / Edit Education helpers
  const addEducation = () => {
    const newEdu: Education = {
      school: 'University Name',
      degree: 'Bachelor of Science',
      field_of_study: 'Computer Science',
      start_date: '2020-09',
      end_date: '2024-05',
      gpa: ''
    };
    setEducation([newEdu, ...education]);
  };

  const removeEducation = (idx: number) => {
    setEducation(education.filter((_, i) => i !== idx));
  };

  const updateEducation = (idx: number, field: keyof Education, val: any) => {
    const updated = [...education];
    updated[idx] = { ...updated[idx], [field]: val };
    setEducation(updated);
  };

  if (isLoading || !application) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500 gap-3">
        <Loader2 className="animate-spin text-brand-400" size={36} />
        <span className="text-sm font-semibold">Opening application workspace...</span>
      </div>
    );
  }

  const ats = application.ats_score_data;

  return (
    <div className="space-y-6 text-slate-100 animate-fade-in pb-16">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2.5 text-slate-400 hover:text-white bg-slate-950/60 border border-slate-850 rounded-2xl transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">{application.job_title}</h2>
              <span className="bg-slate-850 text-slate-300 font-mono font-bold text-[10px] px-2 py-0.5 rounded border border-slate-750">
                UID: {application.uid}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">{application.company} • Application Workspace</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector directly in headers */}
          <select
            value={application.status}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-brand-400 text-xs font-bold uppercase rounded-xl py-2 px-3 outline-none focus:border-brand-500 cursor-pointer"
          >
            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>

          <button
            onClick={() => tailorMutation.mutate()}
            disabled={tailorMutation.isPending}
            className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {tailorMutation.isPending ? <RefreshCw className="animate-spin text-brand-500" size={13} /> : <Sparkles className="text-brand-500" size={13} />}
            <span>Run AI Tailor</span>
          </button>

          {application.tailored_resume_data && (
            <button
              onClick={handleSaveResume}
              disabled={saveMutation.isPending}
              className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md shadow-brand-500/10"
            >
              {saveMutation.isPending ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
              <span>Save Resume</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-teal-950/40 border border-teal-500/30 text-teal-200 p-3.5 rounded-xl flex items-center gap-2.5 animate-fade-in text-xs font-semibold">
          <CheckCircle className="text-teal-400" size={16} />
          <span>Tailored changes saved successfully!</span>
        </div>
      )}

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-thin">
        {[
          { id: 'overview', name: 'Overview', icon: List },
          { id: 'resume', name: 'Resume Tailor', icon: FileText },
          { id: 'ats', name: 'ATS Audit', icon: ShieldCheck },
          { id: 'coverletter', name: 'Cover Letter', icon: MessageSquare },
          { id: 'jd', name: 'Job Details', icon: Building },
          { id: 'notes', name: 'Notes', icon: Bookmark },
          { id: 'timeline', name: 'Timeline', icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as WorkspaceTab)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer ${isActive ? 'border-brand-500 text-brand-400 bg-slate-900/10' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <Icon size={14} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* WORKSPACE CONTENT AREA */}
      <div className="glass rounded-3xl p-6 min-h-[500px] border border-slate-800/80 shadow-2xl">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white pb-3 border-b border-slate-800">Application Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left col: Status & Posting URL */}
              <div className="space-y-6">
                <div>
                  <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Job Posting URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Paste posting URL (LinkedIn, Greenhouse, Lever, etc.)"
                      value={jobPostingUrl}
                      onChange={(e) => setJobPostingUrl(e.target.value)}
                      className="flex-1 bg-slate-950/80 border border-slate-850 text-white rounded-xl py-2 px-3 outline-none focus:border-brand-500 text-xs"
                    />
                    {application.job_posting_url && (
                      <a
                        href={application.job_posting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-slate-900 hover:bg-slate-850 text-white p-2.5 rounded-xl border border-slate-800 flex items-center justify-center cursor-pointer"
                        title="Open Posting Link"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Created At</label>
                    <span className="block text-slate-200 text-xs bg-slate-950/40 border border-slate-850 rounded-xl py-2 px-3">
                      {new Date(application.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Last Updated</label>
                    <span className="block text-slate-200 text-xs bg-slate-950/40 border border-slate-850 rounded-xl py-2 px-3">
                      {new Date(application.updated_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSaveOverviewMetadata}
                  disabled={updateApplicationMutation.isPending}
                  className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <Save size={14} />
                  <span>Save URL & Reminders</span>
                </button>
              </div>

              {/* Right col: Follow-up Reminders */}
              <div className="bg-slate-950/20 border border-slate-850 p-5 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock className="text-brand-500" size={14} />
                  <span>Set Follow-up Reminder</span>
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Reminder Date & Time</label>
                    <input
                      type="datetime-local"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-white rounded-lg p-2 text-xs outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Reminder Status</label>
                    <select
                      value={reminderStatus}
                      onChange={(e) => setReminderStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-white text-xs rounded-lg p-2 outline-none focus:border-brand-500"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Reminder Notes</label>
                    <textarea
                      rows={3}
                      value={reminderNotes}
                      onChange={(e) => setReminderNotes(e.target.value)}
                      placeholder="e.g. Follow up with recruiter in 3 days if no response..."
                      className="w-full bg-slate-950 border border-slate-850 text-white rounded-lg p-2 text-xs outline-none focus:border-brand-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESUME TAILOR */}
        {activeTab === 'resume' && (
          <div className="space-y-6">
            {!application.tailored_resume_data ? (
              <div className="text-center p-12 space-y-4">
                <Sparkles className="mx-auto text-brand-500 animate-bounce" size={40} />
                <h3 className="font-bold text-white text-lg">Generate Tailored Copy First</h3>
                <p className="text-xs max-w-sm mx-auto text-slate-400">
                  We'll optimize bullet points, summaries, and skills directly for the role specifications.
                </p>
                <button
                  onClick={() => tailorMutation.mutate()}
                  className="bg-brand-650 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg cursor-pointer"
                >
                  Tailor Resume Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor Fields Pane */}
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
                  {/* Summary */}
                  <div className="space-y-3 bg-slate-950/20 p-4 rounded-2xl border border-slate-850">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Professional Summary</h4>
                    <TipTapEditor value={summary} onChange={setSummary} />
                  </div>

                  {/* Experience */}
                  <div className="space-y-3 bg-slate-950/20 p-4 rounded-2xl border border-slate-850">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Work Experience</h4>
                    {experiences.map((exp, expIdx) => (
                      <div key={expIdx} className="bg-slate-950 border border-slate-850/80 p-3.5 rounded-xl space-y-3">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-xs text-brand-400">{exp.company}</span>
                          <span className="text-[10px] text-slate-500 font-semibold">{exp.position}</span>
                        </div>
                        <div className="space-y-2">
                          {exp.description_bullets.map((bullet, bIdx) => {
                            const isHighlighted = highlightedBullet && 
                              highlightedBullet.sectionType === 'experience' && 
                              highlightedBullet.itemIndex === expIdx && 
                              highlightedBullet.bulletIndex === bIdx;
                            return (
                              <div key={bIdx} className={`p-2 rounded-lg border transition-all duration-500 ${isHighlighted ? 'bg-brand-500/10 border-brand-500 ring-1 ring-brand-500/20 scale-[1.01]' : 'bg-slate-900/60 border-slate-850'}`}>
                                <div className="flex items-start gap-1.5">
                                  <span className="text-slate-500 font-bold text-[10px] mt-1.5 w-4 shrink-0">{bIdx + 1}.</span>
                                  <textarea
                                    value={bullet}
                                    onChange={(e) => {
                                      const updated = [...experiences];
                                      updated[expIdx].description_bullets[bIdx] = e.target.value;
                                      setExperiences(updated);
                                    }}
                                    className="flex-1 bg-transparent text-slate-200 text-xs outline-none border-none resize-none h-12 py-0.5"
                                  />
                                  <button
                                    onClick={() => triggerRegenBullet(expIdx, bIdx, bullet)}
                                    className="text-brand-500 hover:text-brand-400 hover:bg-brand-500/10 p-1 rounded transition-colors cursor-pointer"
                                    title="Refine Bullet"
                                  >
                                    <Sparkles size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Projects */}
                  <div className="space-y-3 bg-slate-950/20 p-4 rounded-2xl border border-slate-850">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Project Accomplishments</h4>
                    {projects.map((proj, projIdx) => (
                      <div key={projIdx} className="bg-slate-950 border border-slate-850/80 p-3.5 rounded-xl space-y-3">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-xs text-brand-400">{proj.title}</span>
                          <span className="text-[10px] text-slate-500 font-semibold">{proj.role}</span>
                        </div>
                        <div className="space-y-2">
                          {proj.description_bullets.map((bullet, bIdx) => {
                            const isHighlighted = highlightedBullet && 
                              highlightedBullet.sectionType === 'project' && 
                              highlightedBullet.itemIndex === projIdx && 
                              highlightedBullet.bulletIndex === bIdx;
                            return (
                              <div key={bIdx} className={`p-2 rounded-lg border transition-all duration-500 ${isHighlighted ? 'bg-brand-500/10 border-brand-500 ring-1 ring-brand-500/20 scale-[1.01]' : 'bg-slate-900/60 border-slate-850'}`}>
                                <div className="flex items-start gap-1.5">
                                  <span className="text-slate-500 font-bold text-[10px] mt-1.5 w-4 shrink-0">{bIdx + 1}.</span>
                                  <textarea
                                    value={bullet}
                                    onChange={(e) => {
                                      const updated = [...projects];
                                      updated[projIdx].description_bullets[bIdx] = e.target.value;
                                      setProjects(updated);
                                    }}
                                    className="flex-1 bg-transparent text-slate-200 text-xs outline-none border-none resize-none h-12 py-0.5"
                                  />
                                  <button
                                    onClick={() => triggerRegenBullet(projIdx, bIdx, bullet, true)}
                                    className="text-brand-500 hover:text-brand-400 hover:bg-brand-500/10 p-1 rounded transition-colors cursor-pointer"
                                    title="Refine Bullet"
                                  >
                                    <Sparkles size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Education Form Panel */}
                  <div className="space-y-3 bg-slate-950/20 p-4 rounded-2xl border border-slate-850">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Education</h4>
                      <button
                        onClick={addEducation}
                        className="text-brand-400 hover:text-brand-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Add School</span>
                      </button>
                    </div>

                    {education.length === 0 ? (
                      <div className="text-slate-500 text-xs text-center py-4 bg-slate-950/40 rounded-xl">
                        No education entries.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {education.map((edu, idx) => (
                          <div key={idx} className="bg-slate-950 border border-slate-850/80 p-3 rounded-xl space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input
                                type="text"
                                placeholder="School"
                                value={edu.school}
                                onChange={(e) => updateEducation(idx, 'school', e.target.value)}
                                className="bg-slate-900 border border-slate-800 text-white rounded-lg p-2 text-xs outline-none focus:border-brand-500"
                              />
                              <input
                                type="text"
                                placeholder="Degree"
                                value={edu.degree}
                                onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                                className="bg-slate-900 border border-slate-800 text-white rounded-lg p-2 text-xs outline-none focus:border-brand-500"
                              />
                              <input
                                type="text"
                                placeholder="Field of Study"
                                value={edu.field_of_study || ''}
                                onChange={(e) => updateEducation(idx, 'field_of_study', e.target.value)}
                                className="bg-slate-900 border border-slate-800 text-white rounded-lg p-2 text-xs outline-none focus:border-brand-500"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Start Date"
                                  value={edu.start_date}
                                  onChange={(e) => updateEducation(idx, 'start_date', e.target.value)}
                                  className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-lg p-2 text-xs outline-none"
                                />
                                <input
                                  type="text"
                                  placeholder="End Date"
                                  value={edu.end_date || ''}
                                  onChange={(e) => updateEducation(idx, 'end_date', e.target.value)}
                                  className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-lg p-2 text-xs outline-none"
                                />
                              </div>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-900">
                              <input
                                type="text"
                                placeholder="GPA (Optional)"
                                value={edu.gpa || ''}
                                onChange={(e) => updateEducation(idx, 'gpa', e.target.value)}
                                className="w-32 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg p-1.5 text-xs outline-none"
                              />
                              <button
                                onClick={() => removeEducation(idx)}
                                className="text-slate-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* PDF Live Preview Pane */}
                <div className="bg-slate-950/20 border border-slate-850 rounded-2xl overflow-hidden flex flex-col min-h-[500px]">
                  <div className="bg-slate-950/60 p-4 border-b border-slate-850 flex justify-between items-center">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={14} className="text-brand-400" />
                      <span>PDF Document Preview</span>
                    </span>
                    <button
                      onClick={handleDownloadResume}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer font-bold"
                    >
                      <Download size={13} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                  
                  <div className="flex-1 bg-slate-950">
                    {pdfUrl ? (
                      <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-none min-h-[550px]" title="Tailored Resume Preview" />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-20 text-slate-600 text-xs gap-2">
                        <Loader2 className="animate-spin text-slate-500" size={24} />
                        <span>Rendering printable canvas preview...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ATS ANALYSIS */}
        {activeTab === 'ats' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">ATS Review & Analysis</h3>
              <button
                onClick={() => evaluateAtsMutation.mutate()}
                disabled={evaluateAtsMutation.isPending}
                className="bg-slate-900 border border-slate-800 text-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800 cursor-pointer disabled:opacity-55"
              >
                <RefreshCw className={evaluateAtsMutation.isPending ? 'animate-spin text-brand-500' : 'text-brand-500'} size={13} />
                <span>Re-run Audit</span>
              </button>
            </div>

            {!ats ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No ATS report calculated. Click "Re-run Audit" to compile metrics.
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Overall scores grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/80 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Overall Match</span>
                    <h5 className="text-2xl font-black text-brand-400">{ats.overall_score}%</h5>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/80 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase mb-1">ATS Compliance</span>
                    <h5 className="text-2xl font-black text-blue-400">{ats.ats_compliance_score}%</h5>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/80 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Job Match</span>
                    <h5 className="text-2xl font-black text-purple-400">{ats.job_match_score}%</h5>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/80 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Writing Quality</span>
                    <h5 className="text-2xl font-black text-green-400">{ats.writing_quality_score}%</h5>
                  </div>
                </div>

                {/* Accordions */}
                <div className="space-y-4">
                  {/* Compliance Checklist */}
                  <div className="bg-slate-950/30 rounded-2xl border border-slate-850 overflow-hidden">
                    <button
                      onClick={() => toggleSection('compliance')}
                      className="w-full flex items-center justify-between p-4 text-left font-bold text-white hover:bg-slate-900/40 cursor-pointer"
                    >
                      <span>Structural ATS Compliance Checklist</span>
                      {collapsedSections.compliance ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {!collapsedSections.compliance && (
                      <div className="p-4 border-t border-slate-850 bg-slate-950/10 space-y-3">
                        {ats.compliance_checklist.map((item, idx) => (
                          <div key={idx} className="flex gap-2.5 items-start text-xs">
                            <span className={item.passed ? 'text-green-400' : 'text-red-400'}>
                              {item.passed ? '✓' : '✗'}
                            </span>
                            <div>
                              <strong className="text-white block">{item.check_name}</strong>
                              <span className="text-slate-400">{item.details}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Missing Keywords Categorized */}
                  <div className="bg-slate-950/30 rounded-2xl border border-slate-850 overflow-hidden">
                    <button
                      onClick={() => toggleSection('keywords')}
                      className="w-full flex items-center justify-between p-4 text-left font-bold text-white hover:bg-slate-900/40 cursor-pointer"
                    >
                      <span>Keyword Match Groups & Gaps</span>
                      {collapsedSections.keywords ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {!collapsedSections.keywords && (
                      <div className="p-4 border-t border-slate-850 bg-slate-950/10 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-2">Critical Keyword Gaps</span>
                            <div className="flex flex-wrap gap-1.5">
                              {ats.missing_keywords_categorized.critical?.length === 0 ? (
                                <span className="text-slate-500 text-xs">None</span>
                              ) : (
                                ats.missing_keywords_categorized.critical.map((kw, i) => (
                                  <span key={i} className="text-[10px] bg-red-950/30 text-red-400 border border-red-900/40 px-2 py-0.5 rounded">
                                    {kw}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-2">Recommended Keyword Gaps</span>
                            <div className="flex flex-wrap gap-1.5">
                              {ats.missing_keywords_categorized.recommended?.length === 0 ? (
                                <span className="text-slate-500 text-xs">None</span>
                              ) : (
                                ats.missing_keywords_categorized.recommended.map((kw, i) => (
                                  <span key={i} className="text-[10px] bg-amber-950/30 text-amber-400 border border-amber-900/40 px-2 py-0.5 rounded">
                                    {kw}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Contextual Gaps</span>
                            <div className="flex flex-wrap gap-1.5">
                              {ats.missing_keywords_categorized.contextual?.length === 0 ? (
                                <span className="text-slate-500 text-xs">None</span>
                              ) : (
                                ats.missing_keywords_categorized.contextual.map((kw, i) => (
                                  <span key={i} className="text-[10px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                                    {kw}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI suggestion apply card */}
                  <div className="bg-slate-950/30 rounded-2xl border border-slate-850 overflow-hidden">
                    <button
                      onClick={() => toggleSection('rewrites')}
                      className="w-full flex items-center justify-between p-4 text-left font-bold text-white hover:bg-slate-900/40 cursor-pointer"
                    >
                      <span>AI Recommendations & One-Click Apply Fixes</span>
                      {collapsedSections.rewrites ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {!collapsedSections.rewrites && (
                      <div className="p-4 border-t border-slate-850 bg-slate-950/10 space-y-4">
                        {ats.rewrite_suggestions?.length === 0 ? (
                          <div className="text-slate-500 text-xs">No pending rephrasing suggestions!</div>
                        ) : (
                          <div className="space-y-4">
                            {ats.rewrite_suggestions.map((sug, i) => (
                              <div key={i} className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                                <div className="space-y-2 flex-1">
                                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                                    {sug.section_type} (Item #{sug.item_index + 1})
                                  </span>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                    <div className="bg-slate-900 p-2.5 rounded border border-slate-950">
                                      <span className="text-[9px] font-bold text-red-400 uppercase tracking-wide block mb-1">Current Bullet:</span>
                                      <p className="text-slate-400 line-through italic">{sug.original_text}</p>
                                    </div>
                                    <div className="bg-slate-900 p-2.5 rounded border border-slate-950">
                                      <span className="text-[9px] font-bold text-teal-400 uppercase tracking-wide block mb-1">AI Rephrased Suggestion:</span>
                                      <p className="text-slate-200 font-medium">{sug.suggested_text}</p>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-slate-400 pt-1">💡 {sug.explanation}</p>
                                </div>
                                <button
                                  onClick={() => handleApplyRewrite(sug)}
                                  className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer select-none shrink-0"
                                >
                                  Apply Suggestion
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: COVER LETTER */}
        {activeTab === 'coverletter' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Cover Letter</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateCoverLetterMutation.mutate()}
                  disabled={generateCoverLetterMutation.isPending}
                  className="bg-slate-900 border border-slate-800 text-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-850 cursor-pointer disabled:opacity-55"
                >
                  <RefreshCw className={generateCoverLetterMutation.isPending ? 'animate-spin' : ''} size={13} />
                  <span>Regenerate CL</span>
                </button>
              </div>
            </div>

            {!application.cover_letter ? (
              <div className="text-center py-12 text-slate-500 text-xs space-y-3">
                <p>No cover letter created yet.</p>
                <button
                  onClick={() => generateCoverLetterMutation.mutate()}
                  className="bg-brand-500 hover:bg-brand-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl"
                >
                  Generate Cover Letter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor Textarea */}
                <div className="space-y-4">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Letter Content</label>
                  <textarea
                    rows={18}
                    value={application.cover_letter}
                    onChange={(e) => {
                      // Update cover letter draft local state
                      updateApplicationMutation.mutate({ cover_letter: e.target.value });
                    }}
                    className="w-full bg-slate-950/80 border border-slate-850 text-slate-200 rounded-xl p-4 text-xs font-mono outline-none focus:border-brand-500 resize-y leading-relaxed"
                  />
                </div>

                {/* Downloads & Printing details */}
                <div className="glass bg-slate-950/15 border border-slate-850 rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-4">
                  <FileText size={48} className="text-brand-400" />
                  <h4 className="font-bold text-white">Download Cover Letter</h4>
                  <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                    Export your custom generated cover letter to submit alongside your resume. Naming complies with standard guidelines automatically.
                  </p>
                  
                  <div className="flex gap-3 w-full max-w-xs">
                    <button
                      onClick={() => handleDownloadCoverLetter('txt')}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Download TXT</span>
                    </button>
                    <button
                      onClick={() => handleDownloadCoverLetter('pdf')}
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-slate-950 text-xs py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-brand-500/10"
                    >
                      <Download size={14} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: JOB DETAILS */}
        {activeTab === 'jd' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white pb-3 border-b border-slate-800">Job Description details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Extracted list skills */}
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider block mb-2">Required Skills Extracted</span>
                  <div className="flex flex-wrap gap-1.5">
                    {application.parsed_job_description?.required_skills?.map((sk, i) => (
                      <span key={i} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-200 px-2 py-0.5 rounded">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider block mb-2">Preferred Skills / Certs</span>
                  <div className="flex flex-wrap gap-1.5">
                    {application.parsed_job_description?.preferred_skills?.map((sk, i) => (
                      <span key={i} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Job Keywords</span>
                  <div className="flex flex-wrap gap-1.5">
                    {application.parsed_job_description?.keywords?.map((kw, i) => (
                      <span key={i} className="text-[10px] bg-slate-900/60 border border-slate-850 text-slate-400 px-2 py-0.5 rounded">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Original parsed JD */}
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Original Raw Text</label>
                <div className="w-full bg-slate-950/60 border border-slate-850 text-slate-300 rounded-xl p-4 text-xs max-h-[350px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {application.raw_job_description}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: NOTES */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Application Notes</h3>
              <button
                onClick={handleSaveNotes}
                className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Save Notes
              </button>
            </div>
            
            <p className="text-slate-400 text-xs leading-relaxed">
              Use this workspace to log follow-ups, interview topics, salary expectations, recruiter details, and timeline thoughts. Notes persist for this specific application.
            </p>

            <textarea
              rows={15}
              value={appNotes}
              onChange={(e) => setAppNotes(e.target.value)}
              placeholder="- Recruiter John contacted me on Monday&#10;- Technical interview scheduled for next Thursday&#10;- Discussed salary range: $120k-$130k"
              className="w-full bg-slate-950/80 border border-slate-850 text-slate-200 rounded-xl p-4 text-xs outline-none focus:border-brand-500 font-sans leading-relaxed resize-y"
            />
          </div>
        )}

        {/* TAB 7: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white pb-3 border-b border-slate-800 font-extrabold tracking-tight">
              Application Change Log & History
            </h3>
            
            <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6 py-2">
              {application.timeline_events && application.timeline_events.length > 0 ? (
                application.timeline_events.map((event, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle icon */}
                    <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-slate-950 border border-slate-900" />
                    
                    <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 max-w-2xl space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                          event.type === 'created' ? 'bg-indigo-950 text-indigo-400' :
                          event.type === 'status_change' ? 'bg-amber-950 text-amber-400' :
                          event.type === 'resume_generated' ? 'bg-purple-950 text-purple-400' :
                          event.type === 'cover_letter_generated' ? 'bg-green-950 text-green-400' :
                          'bg-slate-900 text-slate-400'
                        }`}>
                          {event.type}
                        </span>
                        <span className="text-slate-500 font-semibold">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      
                      <h4 className="text-xs font-bold text-white">{event.message}</h4>
                      {event.notes && (
                        <p className="text-[11px] text-slate-400 italic">
                          {event.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-xs">
                  No timeline markers recorded.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Bullet Refinement Sparkles Modal */}
      {activeBulletRegen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-brand-400" />
                <span>AI Bullet Point Refiner</span>
              </h3>
              <button
                onClick={() => setActiveBulletRegen(null)}
                className="text-slate-400 hover:text-white cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Original Bullet</label>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-xs text-slate-300 italic">
                  {activeBulletRegen.expIdx !== -1 
                    ? experiences[activeBulletRegen.expIdx].description_bullets[activeBulletRegen.bulletIdx]
                    : projects[activeBulletRegen.projIdx ?? 0].description_bullets[activeBulletRegen.bulletIdx]}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Custom Instructions (e.g. "focus on AWS latency")</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={regenInstructions}
                    onChange={(e) => setRegenInstructions(e.target.value)}
                    placeholder="Specific tweaks, metrics to emphasize..."
                    className="flex-1 bg-slate-950/80 border border-slate-850 text-white rounded-xl py-2 px-3 outline-none focus:border-brand-500 text-xs"
                  />
                  <button
                    onClick={handleRegenWithInstructions}
                    disabled={isRegening}
                    className="bg-brand-500 hover:bg-brand-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Rewrite
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider">AI Alternatives (Click to apply)</label>
                {isRegening ? (
                  <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-brand-400" size={16} />
                    <span>Regenerating metrics...</span>
                  </div>
                ) : regenOptions.length === 0 ? (
                  <div className="text-slate-600 text-xs italic py-2">
                    No variations ready. Complete instruction search above.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
                    {regenOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleApplyRegenOption(opt)}
                        className="w-full text-left bg-slate-950 border border-slate-850 hover:border-brand-500 p-2.5 rounded-lg text-xs leading-relaxed text-slate-200 transition-all hover:bg-slate-900/60 cursor-pointer"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
