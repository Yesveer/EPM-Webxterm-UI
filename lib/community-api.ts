import { apiRequest } from './api-client';

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  author_id: string;
  author_name: string;
  images: string[];
  created_at: string;
  updated_at: string;
  fix_count: number;
}

export interface Fix {
  id: string;
  issue_id: string;
  author_id: string;
  author_name: string;
  content: string;
  images: string[];
  likes: number;
  liked_by: string[];
  is_accepted: boolean;
  created_at: string;
}

export interface CreateIssueRequest {
  title: string;
  description: string;
  status?: string;
  images?: string[];
}

export interface UpdateIssueRequest {
  title?: string;
  description?: string;
  status?: string;
  images?: string[];
}

export interface CreateFixRequest {
  content: string;
  images?: string[];
}

export const communityAPI = {
  // Issues
  async createIssue(token: string, data: CreateIssueRequest): Promise<{ message: string; issue: Issue }> {
    return apiRequest<{ message: string; issue: Issue }>('/community/issues', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  async getAllIssues(token: string, page: number = 1, limit: number = 10): Promise<{ issues: Issue[]; page: number; limit: number }> {
    return apiRequest<{ issues: Issue[]; page: number; limit: number }>(
      `/community/issues?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        token,
      }
    );
  },

  async getIssueById(token: string, issueId: string): Promise<{ issue: Issue }> {
    return apiRequest<{ issue: Issue }>(`/community/issues/${issueId}`, {
      method: 'GET',
      token,
    });
  },

  async updateIssue(token: string, issueId: string, data: UpdateIssueRequest): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/community/issues/${issueId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  async deleteIssue(token: string, issueId: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/community/issues/${issueId}`, {
      method: 'DELETE',
      token,
    });
  },

  // Fixes
  async createFix(token: string, issueId: string, data: CreateFixRequest): Promise<{ message: string; fix: Fix }> {
    return apiRequest<{ message: string; fix: Fix }>(`/community/issues/${issueId}/fixes`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  async getFixesByIssue(token: string, issueId: string): Promise<{ fixes: Fix[] }> {
    return apiRequest<{ fixes: Fix[] }>(`/community/issues/${issueId}/fixes`, {
      method: 'GET',
      token,
    });
  },

  async likeFix(token: string, issueId: string, fixId: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/community/issues/${issueId}/fixes/${fixId}/like`, {
      method: 'POST',
      token,
    });
  },

  async unlikeFix(token: string, issueId: string, fixId: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/community/issues/${issueId}/fixes/${fixId}/like`, {
      method: 'DELETE',
      token,
    });
  },

  async markFixAsAccepted(token: string, issueId: string, fixId: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/community/issues/${issueId}/fixes/${fixId}/accept`, {
      method: 'POST',
      token,
    });
  },

  // Image upload
  async uploadImage(token: string, file: File): Promise<{ message: string; url: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

    const response = await fetch(`${API_BASE_URL}/community/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    return response.json();
  },
};
