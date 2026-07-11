import { useRouter } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Retrieve token from local storage
export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("aws_r53_token");
  }
  return null;
}

// Save token to local storage
export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("aws_r53_token", token);
  }
}

// Clear token from local storage
export function clearAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("aws_r53_token");
  }
}

// Generic API caller with JWT headers
async function request(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Set default Content-Type to JSON if sending JSON body
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthToken();
    // Redirect if in browser. We let components handle it, or check status
  }

  if (!response.ok) {
    let errorDetail = "API Request failed";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      // Fallback to text
      try {
        errorDetail = await response.text();
      } catch {}
    }
    throw new Error(errorDetail);
  }

  // For 204 No Content, return null
  if (response.status === 204) {
     return null;
  }

  return response.json();
}

export const api = {
  // Auth API
  async login(username: string, password: string) {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const data = await request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    setAuthToken(data.access_token);
    return data;
  },

  async register(username: string, password: string) {
    return request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  async me() {
    return request("/api/auth/me", { method: "GET" });
  },

  // Hosted Zones API
  async listZones(search: string = "", skip = 0, limit = 100) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    params.append("skip", String(skip));
    params.append("limit", String(limit));
    return request(`/api/hosted-zones?${params.toString()}`);
  },

  async getZone(id: string) {
    return request(`/api/hosted-zones/${id}`);
  },

  async createZone(data: { name: string; type: string; description?: string; comment?: string; vpc_id?: string; vpc_region?: string }) {
    return request("/api/hosted-zones", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateZone(id: string, data: { description?: string; comment?: string; vpc_id?: string; vpc_region?: string }) {
    return request(`/api/hosted-zones/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteZone(id: string) {
    return request(`/api/hosted-zones/${id}`, {
      method: "DELETE",
    });
  },

  // DNS Records API
  async listRecords(zoneId: string, search: string = "", typeFilter: string = "") {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (typeFilter) params.append("type_filter", typeFilter);
    return request(`/api/hosted-zones/${zoneId}/records?${params.toString()}`);
  },

  async createRecord(zoneId: string, data: {
    name: string;
    type: string;
    value: string;
    ttl: number;
    routing_policy: string;
    weight?: number;
    region?: string;
    failover_status?: string;
    health_check_id?: string;
  }) {
    return request(`/api/hosted-zones/${zoneId}/records`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateRecord(recordId: string, data: {
    name?: string;
    type?: string;
    value?: string;
    ttl?: number;
    routing_policy?: string;
    weight?: number;
    region?: string;
    failover_status?: string;
    health_check_id?: string;
  }) {
    return request(`/api/records/${recordId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteRecord(recordId: string) {
    return request(`/api/records/${recordId}`, {
      method: "DELETE",
    });
  },

  async bulkDeleteRecords(recordIds: string[]) {
    return request("/api/records/bulk-delete", {
      method: "POST",
      body: JSON.stringify(recordIds),
    });
  },

  // Import/Export API
  async importZoneFile(zoneId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return request(`/api/hosted-zones/${zoneId}/import`, {
      method: "POST",
      body: formData,
    });
  },

  async importZoneRawText(zoneId: string, text: string) {
    const formData = new FormData();
    formData.append("raw_content", text);
    return request(`/api/hosted-zones/${zoneId}/import`, {
      method: "POST",
      body: formData,
    });
  },

  async exportZone(zoneId: string, format: "bind" | "json" = "bind") {
    return request(`/api/hosted-zones/${zoneId}/export?format=${format}`);
  },

  // Health Checks API
  async getHealthChecks() {
    return request("/api/health-checks") as Promise<HealthCheck[]>;
  },

  async createHealthCheck(data: {
    name: string;
    type: string;
    ip_address?: string;
    domain_name?: string;
    protocol: string;
    port: number;
    path?: string;
  }) {
    return request("/api/health-checks", {
      method: "POST",
      body: JSON.stringify(data),
    }) as Promise<HealthCheck>;
  },

  async deleteHealthCheck(hcId: string) {
    return request(`/api/health-checks/${hcId}`, {
      method: "DELETE",
    });
  },

  async toggleHealthCheck(hcId: string) {
    return request(`/api/health-checks/${hcId}/toggle`, {
      method: "POST",
    }) as Promise<HealthCheck>;
  },

  async testDnsAnswer(zoneId: string, name: string, type: string, clientRegion?: string) {
    let url = `/api/hosted-zones/${zoneId}/test-dns-answer?name=${encodeURIComponent(name)}&type=${type}`;
    if (clientRegion) {
      url += `&client_region=${encodeURIComponent(clientRegion)}`;
    }
    return request(url) as Promise<{
      query_name: string;
      query_type: string;
      client_region: string | null;
      details: string;
      resolved_values: string[];
      answers: Array<{
        id: string;
        name: string;
        type: string;
        value: string;
        ttl: number;
        routing_policy: string;
      }>;
    }>;
  },

  async testHealthCheck(protocol: string, target: string, port: number, path?: string) {
    const params = new URLSearchParams();
    params.append("protocol", protocol);
    params.append("target", target);
    params.append("port", String(port));
    if (path) params.append("path", path);
    return request(`/api/health-checks/test-probe?${params.toString()}`) as Promise<{
      status: "Healthy" | "Unhealthy";
      response_code: string;
      message: string;
    }>;
  }
};

export interface HealthCheck {
  id: string;
  name: string;
  type: string;
  ip_address?: string;
  domain_name?: string;
  protocol: string;
  port: number;
  path?: string;
  status: "Healthy" | "Unhealthy" | "Unknown";
  created_at: string;
  updated_at: string;
}
