/**
 * PrepVista AI — Backend API Client
 * Centralized HTTP client for all backend communication.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;

  setTokens(access: string, refresh: string) {
    this.token = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pv_access_token', access);
      localStorage.setItem('pv_refresh_token', refresh);
    }
  }

  loadTokens() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('pv_access_token');
      this.refreshToken = localStorage.getItem('pv_refresh_token');
    }
  }

  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pv_access_token');
      localStorage.removeItem('pv_refresh_token');
    }
  }

  getToken() {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('pv_access_token');
    }
    return this.token;
  }

  async request(path: string, options: ApiOptions = {}): Promise<any> {
    const { method = 'GET', body, headers = {}, isFormData = false } = options;

    const requestHeaders: Record<string, string> = { ...headers };
    const currentToken = this.getToken();
    if (currentToken) {
      requestHeaders['Authorization'] = `Bearer ${currentToken}`;
    }
    if (!isFormData) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body) {
      config.body = isFormData ? body : JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${path}`, config);

    // Handle 401 — try token refresh
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        requestHeaders['Authorization'] = `Bearer ${this.token}`;
        const retryResponse = await fetch(`${API_URL}${path}`, { ...config, headers: requestHeaders });
        if (!retryResponse.ok) throw await this.parseError(retryResponse);
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      throw await this.parseError(response);
    }

    return response.json();
  }

  private async tryRefresh(): Promise<boolean> {
    try {
      const resp = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (resp.ok) {
        const data = await resp.json();
        this.setTokens(data.access_token, data.refresh_token);
        return true;
      }
    } catch (e) { /* refresh failed */ }
    this.clearTokens();
    return false;
  }

  private async parseError(response: Response): Promise<Error> {
    try {
      const data = await response.json();
      const detail = typeof data.detail === 'string' ? data.detail :
                     data.detail?.message || JSON.stringify(data.detail) || 'An error occurred';
      return new Error(detail);
    } catch {
      return new Error(`Request failed with status ${response.status}`);
    }
  }

  // ── Auth ─────────────────────────────────
  async signup(email: string, password: string, fullName: string) {
    const data = await this.request('/auth/signup', {
      method: 'POST',
      body: { email, password, full_name: fullName },
    });
    if (data.access_token) this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (data.access_token) this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async completeOnboarding(prepGoal: string, fullName: string) {
    return this.request('/auth/onboarding', {
      method: 'POST',
      body: { prep_goal: prepGoal, full_name: fullName },
    });
  }

  logout() {
    this.clearTokens();
  }

  // ── Dashboard ────────────────────────────
  async getDashboard() {
    return this.request('/dashboard');
  }

  async getSessionHistory(limit = 20, offset = 0) {
    return this.request(`/dashboard/sessions?limit=${limit}&offset=${offset}`);
  }

  async getSkills() {
    return this.request('/dashboard/skills');
  }

  // ── Interviews ────────────────────────────
  async setupInterview(formData: FormData) {
    return this.request('/interviews/setup', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async submitAnswer(sessionId: string, userText: string, accessToken: string) {
    return this.request(`/interviews/${sessionId}/answer`, {
      method: 'POST',
      body: { user_text: userText, access_token: accessToken },
    });
  }

  async finishInterview(sessionId: string, accessToken: string, durationActual?: number) {
    return this.request(`/interviews/${sessionId}/finish`, {
      method: 'POST',
      body: { access_token: accessToken, duration_actual: durationActual },
    });
  }

  async reportViolation(sessionId: string, accessToken: string, type: string, detail: string) {
    return this.request(`/interviews/${sessionId}/violation`, {
      method: 'POST',
      body: { access_token: accessToken, violation_type: type, detail },
    });
  }

  // ── Reports ───────────────────────────────
  async getReport(sessionId: string) {
    return this.request(`/reports/${sessionId}`);
  }

  async downloadPDF(sessionId: string): Promise<Blob> {
    const currentToken = this.getToken();
    const resp = await fetch(`${API_URL}/reports/${sessionId}/pdf`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!resp.ok) throw new Error('PDF download failed');
    return resp.blob();
  }

  // ── Billing ───────────────────────────────
  async createCheckout(plan: string) {
    return this.request('/billing/checkout', {
      method: 'POST',
      body: { plan },
    });
  }

  async getBillingPortal() {
    return this.request('/billing/portal', { method: 'POST' });
  }
}

export const api = new ApiClient();
