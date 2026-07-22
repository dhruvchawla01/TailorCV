import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Profile, Experience, Project, Education, Skill, Certification, Achievement } from '../types';
import TipTapEditor from '../components/TipTapEditor';
import { 
  Upload, Save, Plus, Trash2, ArrowLeft, Loader2, ClipboardList, 
  Mail, PlusCircle, BookOpen, Target, Award, ListCollapse, CheckCircle2,
  GraduationCap
} from 'lucide-react';

interface ProfileProps {
  onBackToDashboard: () => void;
}

type TabType = 'contact' | 'summary' | 'experience' | 'projects' | 'education' | 'skills' | 'credentials';

export default function ProfilePage({ onBackToDashboard }: ProfileProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('contact');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local state copy of the profile for editing
  const [summary, setSummary] = useState('');
  const [contactInfo, setContactInfo] = useState<any>({});
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Fetch Master Profile
  const { data: profileData, isLoading } = useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: api.profile.get,
  });

  // Sync database profile data into local states
  useEffect(() => {
    if (profileData) {
      setSummary(profileData.summary || '');
      setContactInfo(profileData.contact_info || {});
      setExperiences(profileData.experiences || []);
      setProjects(profileData.projects || []);
      setEducation(profileData.education || []);
      setSkills(profileData.skills || []);
      setCertifications(profileData.certifications || []);
      setAchievements(profileData.achievements || []);
    }
  }, [profileData]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (updatedProfile: Partial<Profile>) => api.profile.update(updatedProfile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  });

  // Parse Resume File Mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.profile.upload(file),
    onSuccess: (newProfile) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSummary(newProfile.summary || '');
      setContactInfo(newProfile.contact_info || {});
      setExperiences(newProfile.experiences || []);
      setProjects(newProfile.projects || []);
      setEducation(newProfile.education || []);
      setSkills(newProfile.skills || []);
      setCertifications(newProfile.certifications || []);
      setAchievements(newProfile.achievements || []);
      alert('Resume parsed successfully! Please review the details below.');
    },
    onError: (err: any) => {
      alert(`Parsing failed: ${err.message}`);
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadMutation.mutate(files[0]);
    }
  };

  const handleSave = () => {
    saveMutation.mutate({
      summary,
      contact_info: contactInfo,
      experiences,
      projects,
      education,
      skills,
      certifications,
      achievements
    });
  };

  // State modification helpers
  const handleContactChange = (field: string, val: string) => {
    setContactInfo((prev: any) => ({ ...prev, [field]: val }));
  };

  // Experience functions
  const addExperience = () => {
    const newExp: Experience = {
      company: 'New Company',
      position: 'Software Engineer',
      location: '',
      start_date: '2024-01',
      end_date: 'Present',
      description_bullets: ['Accomplished key task by implementing optimized solutions.'],
      current: true
    };
    setExperiences([newExp, ...experiences]);
  };

  const removeExperience = (idx: number) => {
    setExperiences(experiences.filter((_, i) => i !== idx));
  };

  const updateExperience = (idx: number, field: keyof Experience, val: any) => {
    const updated = [...experiences];
    updated[idx] = { ...updated[idx], [field]: val };
    setExperiences(updated);
  };

  const handleExpBulletChange = (expIdx: number, bulletIdx: number, val: string) => {
    const updated = [...experiences];
    const bullets = [...updated[expIdx].description_bullets];
    bullets[bulletIdx] = val;
    updated[expIdx].description_bullets = bullets;
    setExperiences(updated);
  };

  const addExpBullet = (expIdx: number) => {
    const updated = [...experiences];
    updated[expIdx].description_bullets = [...updated[expIdx].description_bullets, 'New impact bullet detailing your key contributions.'];
    setExperiences(updated);
  };

  const removeExpBullet = (expIdx: number, bulletIdx: number) => {
    const updated = [...experiences];
    updated[expIdx].description_bullets = updated[expIdx].description_bullets.filter((_, i) => i !== bulletIdx);
    setExperiences(updated);
  };

  // Education functions
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

  // Projects functions
  const addProject = () => {
    const newProj: Project = {
      title: 'New Project Name',
      role: 'Lead Developer',
      description_bullets: ['Built custom service resulting in 20% latency decrease.'],
      technologies: ['React', 'NodeJS'],
      link: ''
    };
    setProjects([newProj, ...projects]);
  };

  const removeProject = (idx: number) => {
    setProjects(projects.filter((_, i) => i !== idx));
  };

  const updateProject = (idx: number, field: keyof Project, val: any) => {
    const updated = [...projects];
    updated[idx] = { ...updated[idx], [field]: val };
    setProjects(updated);
  };

  const handleProjBulletChange = (projIdx: number, bulletIdx: number, val: string) => {
    const updated = [...projects];
    const bullets = [...updated[projIdx].description_bullets];
    bullets[bulletIdx] = val;
    updated[projIdx].description_bullets = bullets;
    setProjects(updated);
  };

  const addProjBullet = (projIdx: number) => {
    const updated = [...projects];
    updated[projIdx].description_bullets = [...updated[projIdx].description_bullets, 'Key feature implemented on the project.'];
    setProjects(updated);
  };

  const removeProjBullet = (projIdx: number, bulletIdx: number) => {
    const updated = [...projects];
    updated[projIdx].description_bullets = updated[projIdx].description_bullets.filter((_, i) => i !== bulletIdx);
    setProjects(updated);
  };

  // Skills functions
  const addSkill = () => {
    setSkills([...skills, { name: '', category: 'Languages' }]);
  };

  const updateSkill = (idx: number, field: keyof Skill, val: string) => {
    const updated = [...skills];
    updated[idx] = { ...updated[idx], [field]: val };
    setSkills(updated);
  };

  const removeSkill = (idx: number) => {
    setSkills(skills.filter((_, i) => i !== idx));
  };

  // Credentials functions
  const addCertification = () => {
    setCertifications([...certifications, { name: '', issuer: '', date: '', link: '' }]);
  };

  const updateCertification = (idx: number, field: keyof Certification, val: string) => {
    const updated = [...certifications];
    updated[idx] = { ...updated[idx], [field]: val };
    setCertifications(updated);
  };

  const addAchievement = () => {
    setAchievements([...achievements, { title: '', description: '', date: '' }]);
  };

  const updateAchievement = (idx: number, field: keyof Achievement, val: string) => {
    const updated = [...achievements];
    updated[idx] = { ...updated[idx], [field]: val };
    setAchievements(updated);
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="animate-spin text-brand-500 mb-3" size={32} />
        <span>Loading master profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Back Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/85 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Master Profile Builder</h2>
            <p className="text-slate-400 text-sm mt-0.5">Your career source of truth. The AI refences this to tailor resumes.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* File Upload Parser */}
          <label className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer">
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="animate-spin text-brand-500" size={16} />
                <span>Parsing resume...</span>
              </>
            ) : (
              <>
                <Upload size={16} className="text-brand-500" />
                <span>Upload & Parse Resume</span>
              </>
            )}
            <input
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploadMutation.isPending}
            />
          </label>

          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex-1 md:flex-none bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98] cursor-pointer text-sm"
          >
            {saveMutation.isPending ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            <span>Save Profile</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-teal-950/40 border border-teal-500/30 text-teal-200 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="text-teal-400" size={18} />
          <span className="text-sm font-semibold">Master profile saved successfully!</span>
        </div>
      )}

      {/* Profile Sections & Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Tabs navigation */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          {[
            { id: 'contact', name: 'Contact Info', icon: Mail },
            { id: 'summary', name: 'Summary', icon: BookOpen },
            { id: 'experience', name: 'Work Experience', icon: ClipboardList },
            { id: 'projects', name: 'Projects', icon: Target },
            { id: 'education', name: 'Education', icon: GraduationCap },
            { id: 'skills', name: 'Skills Grid', icon: ListCollapse },
            { id: 'credentials', name: 'Credentials', icon: Award }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left cursor-pointer ${activeTab === tab.id ? 'bg-gradient-to-r from-brand-900/60 to-brand-600/30 text-brand-400 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'}`}
              >
                <Icon size={16} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Editing Panels */}
        <div className="lg:col-span-3 glass rounded-2xl p-6 shadow-xl min-h-[500px]">
          {/* Tab 1: Contact Info */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white pb-3 border-b border-slate-800">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    value={contactInfo.name || ''}
                    onChange={(e) => handleContactChange('name', e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-2 px-3.5 outline-none focus:border-brand-500 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    value={contactInfo.email || ''}
                    onChange={(e) => handleContactChange('email', e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-2 px-3.5 outline-none focus:border-brand-500 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Phone Number</label>
                  <input
                    type="text"
                    value={contactInfo.phone || ''}
                    onChange={(e) => handleContactChange('phone', e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-2 px-3.5 outline-none focus:border-brand-500 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Location (City, State)</label>
                  <input
                    type="text"
                    value={contactInfo.location || ''}
                    onChange={(e) => handleContactChange('location', e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-2 px-3.5 outline-none focus:border-brand-500 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Portfolio Website</label>
                  <input
                    type="text"
                    value={contactInfo.website || ''}
                    onChange={(e) => handleContactChange('website', e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-2 px-3.5 outline-none focus:border-brand-500 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">LinkedIn URL</label>
                  <input
                    type="text"
                    value={contactInfo.linkedin || ''}
                    onChange={(e) => handleContactChange('linkedin', e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-2 px-3.5 outline-none focus:border-brand-500 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">GitHub URL</label>
                  <input
                    type="text"
                    value={contactInfo.github || ''}
                    onChange={(e) => handleContactChange('github', e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-2 px-3.5 outline-none focus:border-brand-500 transition-colors text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Professional Summary */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Professional Summary</h3>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Provide a short 3-4 sentence narrative summarizing your domain expertise, leadership record, and career direction. This is rewritten dynamically when tailoring, so focus on high-level general facts here.
              </p>
              <TipTapEditor value={summary} onChange={setSummary} />
            </div>
          )}

          {/* Tab 3: Work Experience */}
          {activeTab === 'experience' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Work Experience</h3>
                <button
                  onClick={addExperience}
                  className="bg-brand-600/20 text-brand-400 border border-brand-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-brand-600/30 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Role</span>
                </button>
              </div>

              {experiences.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No work experience entries added. Click "Add Role" to begin.
                </div>
              ) : (
                <div className="space-y-8 divide-y divide-slate-800/80">
                  {experiences.map((exp, expIdx) => (
                    <div key={expIdx} className={`pt-6 first:pt-0 space-y-4`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                          <div>
                            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Company</label>
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => updateExperience(expIdx, 'company', e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-3 outline-none focus:border-brand-500 transition-colors text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Position</label>
                            <input
                              type="text"
                              value={exp.position}
                              onChange={(e) => updateExperience(expIdx, 'position', e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-3 outline-none focus:border-brand-500 transition-colors text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Dates (Start – End)</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                placeholder="2021-06"
                                value={exp.start_date}
                                onChange={(e) => updateExperience(expIdx, 'start_date', e.target.value)}
                                className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-2 outline-none focus:border-brand-500 transition-colors text-xs text-center"
                              />
                              <span className="text-slate-500">—</span>
                              <input
                                type="text"
                                placeholder="Present"
                                value={exp.end_date}
                                onChange={(e) => updateExperience(expIdx, 'end_date', e.target.value)}
                                className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-2 outline-none focus:border-brand-500 transition-colors text-xs text-center"
                                disabled={exp.current}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Location</label>
                            <input
                              type="text"
                              placeholder="City, State"
                              value={exp.location || ''}
                              onChange={(e) => updateExperience(expIdx, 'location', e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-3 outline-none focus:border-brand-500 transition-colors text-sm"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => removeExperience(expIdx)}
                          className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 mt-5 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          id={`current-${expIdx}`}
                          checked={exp.current}
                          onChange={(e) => updateExperience(expIdx, 'current', e.target.checked)}
                          className="rounded border-slate-850 bg-slate-950 text-brand-600 focus:ring-0 focus:ring-offset-0"
                        />
                        <label htmlFor={`current-${expIdx}`} className="text-slate-400 text-xs cursor-pointer select-none">
                          I currently work in this role (sets End Date to "Present")
                        </label>
                      </div>

                      {/* Bullet point lists */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Bullet Points (Action - Context - Metric)</label>
                          <button
                            onClick={() => addExpBullet(expIdx)}
                            className="text-brand-500 hover:text-brand-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <PlusCircle size={12} />
                            <span>Add Bullet</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(exp.description_bullets || []).map((bullet, bulletIdx) => (
                            <div key={bulletIdx} className="flex gap-2 items-center">
                              <span className="text-slate-600 text-xs font-bold w-4">{bulletIdx + 1}.</span>
                              <input
                                type="text"
                                value={bullet}
                                onChange={(e) => handleExpBulletChange(expIdx, bulletIdx, e.target.value)}
                                className="flex-1 bg-slate-950/40 border border-slate-850 text-slate-300 rounded-lg py-1.5 px-3 outline-none focus:border-brand-500/60 transition-colors text-sm"
                              />
                              <button
                                onClick={() => removeExpBullet(expIdx, bulletIdx)}
                                className="text-slate-500 hover:text-red-400 p-1.5 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Projects */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Projects</h3>
                <button
                  onClick={addProject}
                  className="bg-brand-600/20 text-brand-400 border border-brand-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-brand-600/30 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Project</span>
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No projects added. Click "Add Project" to begin.
                </div>
              ) : (
                <div className="space-y-8 divide-y divide-slate-800/80">
                  {projects.map((proj, projIdx) => (
                    <div key={projIdx} className="pt-6 first:pt-0 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                          <div>
                            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Project Name</label>
                            <input
                              type="text"
                              value={proj.title}
                              onChange={(e) => updateProject(projIdx, 'title', e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-3 outline-none focus:border-brand-500 transition-colors text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Role / Contributions</label>
                            <input
                              type="text"
                              placeholder="e.g. Creator / Solo Developer"
                              value={proj.role || ''}
                              onChange={(e) => updateProject(projIdx, 'role', e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-3 outline-none focus:border-brand-500 transition-colors text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Project URL Link</label>
                            <input
                              type="text"
                              placeholder="e.g. github.com/..."
                              value={proj.link || ''}
                              onChange={(e) => updateProject(projIdx, 'link', e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-3 outline-none focus:border-brand-500 transition-colors text-sm"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => removeProject(projIdx)}
                          className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 mt-5 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Technologies Used (comma separated)</label>
                        <input
                          type="text"
                          value={proj.technologies ? proj.technologies.join(', ') : ''}
                          onChange={(e) => updateProject(projIdx, 'technologies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-3 outline-none focus:border-brand-500 transition-colors text-sm"
                        />
                      </div>

                      {/* Project bullet points */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Project Accomplishments</label>
                          <button
                            onClick={() => addProjBullet(projIdx)}
                            className="text-brand-500 hover:text-brand-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <PlusCircle size={12} />
                            <span>Add Bullet</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(proj.description_bullets || []).map((bullet, bulletIdx) => (
                            <div key={bulletIdx} className="flex gap-2 items-center">
                              <span className="text-slate-600 text-xs font-bold w-4">{bulletIdx + 1}.</span>
                              <input
                                type="text"
                                value={bullet}
                                onChange={(e) => handleProjBulletChange(projIdx, bulletIdx, e.target.value)}
                                className="flex-1 bg-slate-950/40 border border-slate-850 text-slate-300 rounded-lg py-1.5 px-3 outline-none focus:border-brand-500/60 transition-colors text-sm"
                              />
                              <button
                                onClick={() => removeProjBullet(projIdx, bulletIdx)}
                                className="text-slate-500 hover:text-red-400 p-1.5 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Education */}
          {activeTab === 'education' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Education</h3>
                <button
                  onClick={addEducation}
                  className="bg-brand-600/20 text-brand-400 border border-brand-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-brand-600/30 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add School</span>
                </button>
              </div>

              {education.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No education entries added. Click "Add School" to begin.
                </div>
              ) : (
                <div className="space-y-8 divide-y divide-slate-800/80">
                  {education.map((edu, eduIdx) => (
                    <div key={eduIdx} className="pt-6 first:pt-0 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-1">
                          <div>
                            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">School / University</label>
                            <input
                              type="text"
                              value={edu.school}
                              onChange={(e) => updateEducation(eduIdx, 'school', e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-3 outline-none focus:border-brand-500 transition-colors text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Degree</label>
                            <input
                              type="text"
                              value={edu.degree}
                              onChange={(e) => updateEducation(eduIdx, 'degree', e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-3 outline-none focus:border-brand-500 transition-colors text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Field of Study</label>
                            <input
                              type="text"
                              value={edu.field_of_study || ''}
                              onChange={(e) => updateEducation(eduIdx, 'field_of_study', e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-3 outline-none focus:border-brand-500 transition-colors text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Start Date (e.g. 2020-09)</label>
                            <input
                              type="text"
                              value={edu.start_date}
                              onChange={(e) => updateEducation(eduIdx, 'start_date', e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-3 outline-none focus:border-brand-500 transition-colors text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">End Date (e.g. 2024-05)</label>
                            <input
                              type="text"
                              value={edu.end_date || ''}
                              onChange={(e) => updateEducation(eduIdx, 'end_date', e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-3 outline-none focus:border-brand-500 transition-colors text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">GPA (Optional)</label>
                            <input
                              type="text"
                              value={edu.gpa || ''}
                              onChange={(e) => updateEducation(eduIdx, 'gpa', e.target.value)}
                              className="w-full bg-slate-950/60 border border-slate-850 text-white rounded-xl py-1.5 px-3 outline-none focus:border-brand-500 transition-colors text-sm"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removeEducation(eduIdx)}
                          className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 mt-5 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Skills Grid */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Skills Grid</h3>
                <button
                  onClick={addSkill}
                  className="bg-brand-600/20 text-brand-400 border border-brand-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-brand-600/30 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Skill</span>
                </button>
              </div>

              {skills.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No skills added. Click "Add Skill" to begin.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skills.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                      <input
                        type="text"
                        placeholder="Skill (e.g. Python)"
                        value={s.name}
                        onChange={(e) => updateSkill(idx, 'name', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-lg py-1.5 px-2.5 outline-none focus:border-brand-500 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Category (e.g. Backend)"
                        value={s.category || ''}
                        onChange={(e) => updateSkill(idx, 'category', e.target.value)}
                        className="w-32 bg-slate-900 border border-slate-800 text-brand-400 rounded-lg py-1.5 px-2.5 outline-none focus:border-brand-500 text-sm"
                      />
                      <button
                        onClick={() => removeSkill(idx)}
                        className="text-slate-500 hover:text-red-400 p-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 6: Credentials (Certs + Achievements) */}
          {activeTab === 'credentials' && (
            <div className="space-y-8">
              {/* Certs Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Award size={18} className="text-brand-500" />
                    <span>Certifications</span>
                  </h3>
                  <button
                    onClick={addCertification}
                    className="bg-brand-600/20 text-brand-400 border border-brand-500/30 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-brand-600/30 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Certificate</span>
                  </button>
                </div>

                {certifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm bg-slate-950/20 rounded-xl">
                    No certifications added.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {certifications.map((cert, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                        <input
                          type="text"
                          placeholder="Name (e.g. AWS Developer)"
                          value={cert.name}
                          onChange={(e) => updateCertification(idx, 'name', e.target.value)}
                          className="flex-1 min-w-[150px] bg-slate-900 border border-slate-800 text-white rounded-lg py-1.5 px-2.5 outline-none focus:border-brand-500 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Issuer (e.g. Amazon)"
                          value={cert.issuer}
                          onChange={(e) => updateCertification(idx, 'issuer', e.target.value)}
                          className="w-32 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg py-1.5 px-2.5 outline-none focus:border-brand-500 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Date (e.g. 2024-05)"
                          value={cert.date || ''}
                          onChange={(e) => updateCertification(idx, 'date', e.target.value)}
                          className="w-28 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg py-1.5 px-2.5 outline-none focus:border-brand-500 text-xs text-center"
                        />
                        <button
                          onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Achievements Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen size={18} className="text-brand-500" />
                    <span>Achievements</span>
                  </h3>
                  <button
                    onClick={addAchievement}
                    className="bg-brand-600/20 text-brand-400 border border-brand-500/30 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-brand-600/30 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Achievement</span>
                  </button>
                </div>

                {achievements.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm bg-slate-950/20 rounded-xl">
                    No achievements added.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {achievements.map((ach, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                        <input
                          type="text"
                          placeholder="Title (e.g. Hackathon Winner)"
                          value={ach.title}
                          onChange={(e) => updateAchievement(idx, 'title', e.target.value)}
                          className="flex-1 min-w-[150px] bg-slate-900 border border-slate-800 text-white rounded-lg py-1.5 px-2.5 outline-none focus:border-brand-500 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Description (e.g. Won first place out of 100 teams)"
                          value={ach.description}
                          onChange={(e) => updateAchievement(idx, 'description', e.target.value)}
                          className="flex-2 min-w-[200px] bg-slate-900 border border-slate-800 text-slate-300 rounded-lg py-1.5 px-2.5 outline-none focus:border-brand-500 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Date"
                          value={ach.date || ''}
                          onChange={(e) => updateAchievement(idx, 'date', e.target.value)}
                          className="w-28 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg py-1.5 px-2.5 outline-none focus:border-brand-500 text-xs text-center"
                        />
                        <button
                          onClick={() => setAchievements(achievements.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
