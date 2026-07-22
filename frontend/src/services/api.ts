import type { 
  User, Profile, Application, Resume
} from '../types';


const rawBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
let cleanBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
if (!cleanBaseUrl.endsWith('/api/v1')) {
  cleanBaseUrl = `${cleanBaseUrl}/api/v1`;
}
const API_BASE_URL = cleanBaseUrl;

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Do not set Content-Type if it is a FormData payload (e.g. file upload)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'API Request Failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  // Handle empty or file responses
  const contentType = response.headers.get('Content-Type');
  if (contentType && (contentType.includes('application/pdf') || contentType.includes('text/plain') || contentType.includes('application/octet-stream'))) {
    return response.blob() as unknown as T;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<{ access_token: string; token_type: string }> => {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      return apiFetch('/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
    },
    register: async (email: string, password: string, fullName?: string): Promise<User> => {
      return apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
    },
    getMe: async (): Promise<User> => {
      return apiFetch('/auth/me');
    },
    googleLogin: async (idToken: string): Promise<{ access_token: string; token_type: string }> => {
      return apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ id_token: idToken }),
      });
    },
    getConfig: async (): Promise<{ google_client_id: string | null }> => {
      return apiFetch('/auth/config');
    },
  },

  profile: {
    get: async (): Promise<Profile> => {
      return apiFetch('/profile');
    },
    update: async (data: Partial<Profile>): Promise<Profile> => {
      return apiFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    upload: async (file: File): Promise<Profile> => {
      const formData = new FormData();
      formData.append('file', file);
      return apiFetch('/profile/upload', {
        method: 'POST',
        body: formData,
      });
    },
  },

  applications: {
    list: async (): Promise<Application[]> => {
      return apiFetch('/applications');
    },
    create: async (jobTitle: string, company: string, rawJobDescription: string): Promise<Application> => {
      return apiFetch('/applications', {
        method: 'POST',
        body: JSON.stringify({ job_title: jobTitle, company, raw_job_description: rawJobDescription }),
      });
    },
    get: async (id: number): Promise<Application> => {
      return apiFetch(`/applications/${id}`);
    },
    checkDuplicate: async (company: string, jobTitle: string): Promise<Application[]> => {
      return apiFetch(`/applications/check-duplicate?company=${encodeURIComponent(company)}&job_title=${encodeURIComponent(jobTitle)}`);
    },
    update: async (id: number, data: Partial<Application>): Promise<Application> => {
      return apiFetch(`/applications/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    getCoverLetterPdfBlob: async (id: number): Promise<Blob> => {
      return apiFetch<Blob>(`/applications/${id}/cover-letter/pdf`);
    },
    getCoverLetterTxtBlob: async (id: number): Promise<Blob> => {
      return apiFetch<Blob>(`/applications/${id}/cover-letter/txt`);
    },
    delete: async (id: number): Promise<void> => {
      return apiFetch(`/applications/${id}`, {
        method: 'DELETE',
      });
    },
    tailor: async (id: number): Promise<Application> => {
      return apiFetch(`/applications/${id}/tailor`, {
        method: 'POST',
      });
    },
    updateResume: async (id: number, resumeData: Resume): Promise<Application> => {
      return apiFetch(`/applications/${id}/resume`, {
        method: 'PUT',
        body: JSON.stringify(resumeData),
      });
    },
    evaluateAts: async (id: number): Promise<Application> => {
      return apiFetch(`/applications/${id}/ats`, {
        method: 'POST',
      });
    },
    generateCoverLetter: async (id: number): Promise<Application> => {
      return apiFetch(`/applications/${id}/cover-letter`, {
        method: 'POST',
      });
    },
    getPdfBlob: async (id: number): Promise<Blob> => {
      return apiFetch<Blob>(`/applications/${id}/pdf`);
    },
    regenerateBullet: async (bullet: string, jobDescription: string, additionalInstructions?: string): Promise<{ options: string[] }> => {
      return apiFetch('/applications/regenerate-bullet', {
        method: 'POST',
        body: JSON.stringify({ bullet, job_description: jobDescription, additional_instructions: additionalInstructions }),
      });
    },
  },
};
export { API_BASE_URL };
