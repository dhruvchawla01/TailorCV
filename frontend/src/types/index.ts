export interface User {
  id: number;
  email: string;
  full_name?: string;
  created_at: string;
}

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
}

export interface Experience {
  company: string;
  position: string;
  location?: string;
  start_date: string;
  end_date?: string;
  description_bullets: string[];
  current: boolean;
}

export interface Project {
  title: string;
  role?: string;
  description_bullets: string[];
  technologies: string[];
  link?: string;
}

export interface Skill {
  name: string;
  category?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date?: string;
  link?: string;
}

export interface Achievement {
  title: string;
  description: string;
  date?: string;
}

export interface Education {
  school: string;
  degree: string;
  field_of_study?: string;
  start_date: string;
  end_date?: string;
  gpa?: string;
}

export interface Resume {
  contact_info: ContactInfo;
  summary: string;
  experiences: Experience[];
  projects: Project[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
  achievements: Achievement[];
}

export interface Profile {
  id: number;
  user_id: number;
  summary: string;
  contact_info: ContactInfo;
  experiences: Experience[];
  projects: Project[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
  achievements: Achievement[];
  updated_at: string;
}

export interface JDExtracted {
  job_title: string;
  company: string;
  responsibilities: string[];
  required_skills: string[];
  preferred_skills: string[];
  keywords: string[];
  experience_level?: string;
  certifications: string[];
  soft_skills: string[];
}

export interface ATSChecklistItem {
  check_name: string;
  passed: boolean;
  details: string;
}

export interface KeywordGroup {
  category: string;
  required_keywords: string[];
  matched_keywords: string[];
  missing_keywords: string[];
  percentage: number;
}

export interface MissingKeywordsCategorized {
  critical: string[];
  recommended: string[];
  contextual: string[];
}

export interface RewriteSuggestion {
  suggestion_id: string;
  section_type: string;
  item_index: number;
  bullet_index?: number;
  original_text: string;
  suggested_text: string;
  explanation: string;
}

export interface RecommendationItem {
  priority: string;
  reason: string;
  expected_impact: string;
  suggested_action: string;
  one_click_fix_type: string;
  target_rewrite_id?: string;
}

export interface SectionScoreItem {
  section_name: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface RedundancyCheckItem {
  type: string;
  content: string;
  suggestion: string;
}

export interface ValidationFlag {
  severity: string;
  field: string;
  unsupported_statement: string;
  suggested_fix: string;
}

export interface ATSEvaluation {
  ats_compliance_score: number;
  job_match_score: number;
  content_quality_score: number;
  writing_quality_score: number;
  overall_score: number;
  
  ats_compliance_explanation: string;
  job_match_explanation: string;
  content_quality_explanation: string;
  writing_quality_explanation: string;
  
  compliance_checklist: ATSChecklistItem[];
  keyword_coverage_groups: KeywordGroup[];
  missing_keywords_categorized: MissingKeywordsCategorized;
  
  strengths: string[];
  recommendations: RecommendationItem[];
  rewrite_suggestions: RewriteSuggestion[];
  section_scores: SectionScoreItem[];
  
  strongest_section: string;
  weakest_section: string;
  seniority_estimate: string;
  recruiter_match_estimate: string;
  
  redundancy_checks: RedundancyCheckItem[];
  profile_validation_flags: ValidationFlag[];
}

export interface TimelineEvent {
  type: string;
  timestamp: string;
  message: string;
  notes?: string;
}

export interface Application {
  id: number;
  uid: string;
  user_id: number;
  job_title: string;
  company: string;
  raw_job_description: string;
  parsed_job_description?: JDExtracted;
  tailored_resume_data?: Resume;
  cover_letter?: string;
  ats_score_data?: ATSEvaluation;
  status: string;
  job_posting_url?: string;
  date_applied?: string;
  notes?: string;
  timeline_events?: TimelineEvent[];
  reminder_date?: string;
  reminder_notes?: string;
  reminder_status?: string;
  created_at: string;
  updated_at: string;
}
