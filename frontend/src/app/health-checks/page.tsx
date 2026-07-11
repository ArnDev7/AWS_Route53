"use client";

import { useEffect, useState } from "react";
import { 
  Activity, Plus, Trash2, CheckCircle, AlertTriangle, 
  HelpCircle, ChevronRight, X, Play, RefreshCw, Info 
} from "lucide-react";
import { api, HealthCheck } from "@/utils/api";

type ToastType = "success" | "danger" | "warning";
interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export default function HealthChecks() {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHc, setSelectedHc] = useState<string | null>(null);

  // Form Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("ENDPOINT");
  const [formMonitorLink, setFormMonitorLink] = useState("domain"); // "ip" or "domain"
  const [formIpAddress, setFormIpAddress] = useState("");
  const [formDomainName, setFormDomainName] = useState("");
  const [formProtocol, setFormProtocol] = useState("HTTP");
  const [formPort, setFormPort] = useState(80);
  const [formPath, setFormPath] = useState("/");
  const [submitting, setSubmitting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchHealthChecks = async () => {
    try {
      setLoading(true);
      const res = await api.getHealthChecks();
      setHealthChecks(res);
    } catch (e: any) {
      addToast(e.message || "Failed to load health checks", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthChecks();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast("Please provide a name for the health check", "warning");
      return;
    }
    if (formMonitorLink === "ip" && !formIpAddress.trim()) {
      addToast("Please provide an IP address", "warning");
      return;
    }
    if (formMonitorLink === "domain" && !formDomainName.trim()) {
      addToast("Please provide a target domain name", "warning");
      return;
    }

    try {
      setSubmitting(true);
      await api.createHealthCheck({
        name: formName.trim(),
        type: formType,
        ip_address: formMonitorLink === "ip" ? formIpAddress.trim() : undefined,
        domain_name: formMonitorLink === "domain" ? formDomainName.trim() : undefined,
        protocol: formProtocol,
        port: Number(formPort),
        path: formProtocol !== "TCP" ? formPath.trim() : undefined
      });
      setIsDrawerOpen(false);
      // Reset form fields
      setFormName("");
      setFormIpAddress("");
      setFormDomainName("");
      setFormProtocol("HTTP");
      setFormPort(80);
      setFormPath("/");
      addToast("Health check registered successfully");
      fetchHealthChecks();
    } catch (e: any) {
      addToast(e.message || "Unable to create health check", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedHc) return;
    if (!confirm("Are you sure you want to delete the selected health check?")) return;

    try {
      await api.deleteHealthCheck(selectedHc);
      addToast("Health check deleted successfully");
      setSelectedHc(null);
      fetchHealthChecks();
    } catch (e: any) {
      addToast(e.message || "Failed to delete health check", "danger");
    }
  };

  const toggleMockStatus = async (id: string, name: string) => {
    try {
      const updated = await api.toggleHealthCheck(id);
      addToast(`Health check status toggled to '${updated.status}' for ${name}`);
      setHealthChecks((prev) => 
        prev.map((item) => (item.id === id ? { ...item, status: updated.status } : item))
      );
    } catch (e: any) {
      addToast(e.message || "Failed to toggle status", "danger");
    }
  };

  // Simulator State
  const [simProtocol, setSimProtocol] = useState("HTTP");
  const [simTarget, setSimTarget] = useState("");
  const [simPort, setSimPort] = useState(80);
  const [simPath, setSimPath] = useState("/");
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<{ status: string; response_code: string; message: string } | null>(null);

  const runSimulateProbe = async () => {
    if (!simTarget.trim()) {
      addToast("Please provide a target host domain or IP to simulate", "warning");
      return;
    }
    
    setSimRunning(true);
    setSimResult(null);
    try {
      const res = await api.testHealthCheck(simProtocol, simTarget.trim(), simPort, simProtocol !== "TCP" ? simPath : undefined);
      setSimResult(res);
      if (res.status === "Healthy") {
        addToast("Simulation successful: target endpoint is Healthy", "success");
      } else {
        addToast("Simulation warning: target endpoint is Unhealthy", "danger");
      }
    } catch (e: any) {
      setSimResult({
        status: "Unhealthy",
        response_code: "Connection Error",
        message: e.message || "Failed to make endpoint socket query."
      });
      addToast(e.message || "Simulation failed with connector exception", "danger");
    } finally {
      setSimRunning(false);
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 100px)" }}>
      {/* Breadcrumbs */}
      <div className="aws-breadcrumbs">
        <span>Route 53</span>
        <ChevronRight size={10} className="aws-breadcrumb-separator" />
        <span>Health checks</span>
      </div>

      {/* Header */}
      <div className="aws-page-header">
        <div>
          <h1 className="aws-page-title">Health checks</h1>
          <p className="aws-page-subtitle">Monitors the health and performance of your web servers and other resources.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="aws-btn" onClick={fetchHealthChecks} title="Refresh Table">
            <RefreshCw size={14} />
          </button>
          <button 
            className="aws-btn" 
            disabled={!selectedHc}
            onClick={handleDelete}
            style={{ color: selectedHc ? "var(--aws-red)" : "inherit" }}
          >
            <Trash2 size={14} /> Delete health check
          </button>
          <button className="aws-btn aws-btn-primary" onClick={() => setIsDrawerOpen(true)}>
            <Plus size={14} /> Create health check
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="aws-card" style={{ padding: 0 }}>
        <div className="aws-table-toolbar" style={{ padding: "10px 20px" }}>
          <span style={{ fontWeight: 600, color: "var(--aws-text-secondary)" }}>
            Health Checks ({healthChecks.length})
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "var(--aws-text-secondary)" }}>
              * Click the status badge to toggle between Healthy and Unhealthy to test DNS failover.
            </span>
          </div>
        </div>

        <div className="aws-table-container">
          <table className="aws-table">
            <thead>
              <tr>
                <th className="aws-table-checkbox" style={{ width: "40px" }}></th>
                <th>Health Check ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>IP / Domain Target</th>
                <th>Protocol / Port</th>
                <th>Path</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 0" }}>
                    <RefreshCw size={24} className="aws-spin" style={{ color: "var(--aws-text-secondary)" }} />
                    <div style={{ marginTop: "10px", color: "var(--aws-text-secondary)" }}>Loading health checks...</div>
                  </td>
                </tr>
              ) : healthChecks.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "60px 0", color: "var(--aws-text-secondary)" }}>
                    <Activity size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
                    <div>No health checks registered yet.</div>
                    <button 
                      className="aws-btn aws-btn-blue" 
                      onClick={() => setIsDrawerOpen(true)}
                      style={{ marginTop: "15px" }}
                    >
                      <Plus size={14} /> Create a health check
                    </button>
                  </td>
                </tr>
              ) : (
                healthChecks.map((hc) => (
                  <tr 
                    key={hc.id} 
                    className={selectedHc === hc.id ? "selected" : ""}
                    onClick={() => setSelectedHc(selectedHc === hc.id ? null : hc.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="aws-table-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedHc === hc.id} 
                        onChange={() => setSelectedHc(selectedHc === hc.id ? null : hc.id)}
                      />
                    </td>
                    <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "13px" }}>{hc.id}</td>
                    <td style={{ fontWeight: 600 }}>{hc.name}</td>
                    <td onClick={(e) => { e.stopPropagation(); toggleMockStatus(hc.id, hc.name); }}>
                      <span 
                        className={`aws-badge ${
                          hc.status === "Healthy" ? "aws-badge-success" : "aws-badge-danger"
                        }`}
                        title="Click to toggle status"
                        style={{ 
                          cursor: "pointer", 
                          display: "inline-flex", 
                          alignItems: "center", 
                          gap: "6px"
                        }}
                      >
                        {hc.status === "Healthy" ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                        {hc.status}
                      </span>
                    </td>
                    <td>{hc.ip_address || hc.domain_name || "-"}</td>
                    <td><span className="aws-badge-pill" style={{ padding: "2px 6px" }}>{hc.protocol}</span> port {hc.port}</td>
                    <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "12px" }}>{hc.path || "-"}</td>
                    <td suppressHydrationWarning>{new Date(hc.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Target Resource Simulator (AWS Test Resource Health style) */}
      <div className="aws-card" style={{ marginTop: "24px", marginBottom: "40px" }}>
        <div className="aws-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={18} style={{ color: "#0972ec" }} />
            <span style={{ fontWeight: "bold" }}>Health Check Simulator (Query Endpoint Health)</span>
          </div>
          <span className="aws-badge aws-badge-public">
            AWS Standard 3xx Intercept Verified
          </span>
        </div>
        
        <div className="aws-card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", padding: "20px" }}>
          {/* Simulator Form Fields */}
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px", color: "var(--aws-text-primary)" }}>
              Define Target Probe Configuration
            </h4>
            
            <div className="aws-form-group">
              <label className="aws-label">Quick Templates</label>
              <div className="aws-label-desc">Select a preset to test standard AWS validation standards.</div>
              <select 
                className="aws-select"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "http_ok") {
                    setSimProtocol("HTTP");
                    setSimTarget("httpbin.org");
                    setSimPort(80);
                    setSimPath("/status/200");
                  } else if (val === "http_redirect") {
                    setSimProtocol("HTTP");
                    setSimTarget("httpbin.org");
                    setSimPort(80);
                    setSimPath("/status/301"); // Returns redirection code
                  } else if (val === "http_redirect_loop") {
                    setSimProtocol("HTTP");
                    setSimTarget("httpbin.org");
                    setSimPort(80);
                    setSimPath("/redirect/3"); // Redirects multiple times
                  } else if (val === "https_secure") {
                    setSimProtocol("HTTPS");
                    setSimTarget("github.com");
                    setSimPort(443);
                    setSimPath("/");
                  } else if (val === "tcp_ok") {
                    setSimProtocol("TCP");
                    setSimTarget("1.1.1.1");
                    setSimPort(53);
                    setSimPath("");
                  } else if (val === "http_fail") {
                    setSimProtocol("HTTP");
                    setSimTarget("httpbin.org");
                    setSimPort(80);
                    setSimPath("/status/500");
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>--- Select a preset to test ---</option>
                <option value="http_ok">Standard Web Service (HTTP 200 OK)</option>
                <option value="http_redirect">{"AWS Standard Redirect (HTTP 301 Redirect -> Bypassed & Healthy)"}</option>
                <option value="http_redirect_loop">{"Multiple Redirect Path (HTTP 302 Redirect -> Bypassed & Healthy)"}</option>
                <option value="https_secure">Secured Domain (HTTPS 200 OK)</option>
                <option value="tcp_ok">Cloud DNS Resolver (TCP 1.1.1.1:53 Connection)</option>
                <option value="http_fail">{"Fatal Web Service (HTTP 500 Server Error -> Unhealthy)"}</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px" }}>
              <div className="aws-form-group">
                <label className="aws-label">Protocol</label>
                <select 
                  className="aws-select"
                  value={simProtocol}
                  onChange={(e) => {
                    const p = e.target.value;
                    setSimProtocol(p);
                    if (p === "HTTPS") setSimPort(443);
                    else if (p === "HTTP") setSimPort(80);
                    else if (p === "TCP") setSimPort(80);
                  }}
                >
                  <option value="HTTP">HTTP</option>
                  <option value="HTTPS">HTTPS</option>
                  <option value="TCP">TCP</option>
                </select>
              </div>

              <div className="aws-form-group">
                <label className="aws-label">IP Address or Domain Name</label>
                <input 
                  type="text" 
                  className="aws-input" 
                  placeholder="e.g. example.com"
                  value={simTarget}
                  onChange={(e) => setSimTarget(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px" }}>
              <div className="aws-form-group">
                <label className="aws-label">Port</label>
                <input 
                  type="number" 
                  className="aws-input"
                  min={1}
                  max={65535}
                  value={simPort}
                  onChange={(e) => setSimPort(Number(e.target.value))}
                />
              </div>

              {simProtocol !== "TCP" && (
                <div className="aws-form-group">
                  <label className="aws-label">Path</label>
                  <input 
                    type="text" 
                    className="aws-input"
                    placeholder="/"
                    value={simPath}
                    onChange={(e) => setSimPath(e.target.value)}
                  />
                </div>
              )}
            </div>

            <button 
              type="button"
              className="aws-btn aws-btn-blue"
              style={{ width: "100%", marginTop: "10px", padding: "10px", fontWeight: "bold" }}
              disabled={simRunning}
              onClick={runSimulateProbe}
            >
              {simRunning ? (
                <>
                  <RefreshCw className="aws-spin" size={14} style={{ marginRight: "8px" }} />
                  Probing URL Endpoint...
                </>
              ) : "Run Live Simulation Probe"}
            </button>
          </div>

          {/* Simulator Output Terminal Panel */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: "260px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px", color: "var(--aws-text-primary)" }}>
              Probe Sandbox Log Output
            </h4>

            <div 
              style={{
                flex: 1,
                backgroundColor: "#1b2028",
                border: "1px solid #2d3748",
                borderRadius: "4px",
                padding: "16px",
                color: "#cbd5e0",
                fontFamily: "var(--aws-font-mono)",
                fontSize: "12.5px",
                lineHeight: "1.6",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto"
              }}
            >
              {simResult ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2d3748", paddingBottom: "10px", marginBottom: "12px" }}>
                    <span style={{ color: "#a0aec0", fontWeight: "bold" }}>PROBE STATUS:</span>
                    <span 
                      style={{ 
                        fontWeight: "bold",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor: simResult.status === "Healthy" ? "rgba(72, 187, 120, 0.2)" : "rgba(245, 101, 101, 0.2)",
                        color: simResult.status === "Healthy" ? "#48bb78" : "#f56565",
                        border: `1px solid ${simResult.status === "Healthy" ? "#48bb78" : "#f56565"}`
                      }}
                    >
                      {simResult.status}
                    </span>
                  </div>
                  
                  <div>
                    <span style={{ color: "#e2e8f0", fontWeight: "bold" }}>&gt;_ URL Host:</span> {simProtocol.toLowerCase()}://{simTarget}:{simPort}{simProtocol !== "TCP" ? simPath : ""}
                  </div>
                  <div style={{ marginTop: "4px" }}>
                    <span style={{ color: "#e2e8f0", fontWeight: "bold" }}>&gt;_ Reply Status Code:</span> {simResult.response_code || "-"}
                  </div>
                  <div style={{ marginTop: "12px", color: "#a0aec0", display: "flex", gap: "6px", alignItems: "flex-start", backgroundColor: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "4px", borderLeft: `3px solid ${simResult.status === "Healthy" ? "#3182ce" : "#dd6b20"}` }}>
                    <Info size={16} style={{ flexShrink: 0, marginTop: "2px", color: simResult.status === "Healthy" ? "#3182ce" : "#dd6b20" }} />
                    <span style={{ fontSize: "12px" }}>{simResult.message}</span>
                  </div>
                  
                  <div style={{ flex: 1 }}></div>
                  <div style={{ color: "#718096", fontSize: "11px", borderTop: "1px solid #2d3748", paddingTop: "8px", marginTop: "12px", textAlign: "right" }}>
                    Route53 Probe Daemon Simulator v1.0.0
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "#8b949e", textAlign: "center", padding: "20px" }}>
                  <Play size={32} style={{ marginBottom: "14px", color: "var(--aws-blue-primary)", opacity: 0.85 }} />
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "#e2e8f0" }}>Ready for Simulation Input</div>
                  <div style={{ fontSize: "11px", marginTop: "6px", color: "#718096", maxWidth: "260px", lineHeight: "1.4" }}>Select one of the Quick Templates or configure custom endpoints and press "Run Live Simulation Probe".</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slide Drawer for creation */}
      <div className={`aws-drawer ${isDrawerOpen ? "open" : ""}`} style={{ width: "480px" }}>
        <div className="aws-drawer-header">
          <span className="aws-drawer-title">Create health check</span>
          <button className="aws-drawer-close" onClick={() => setIsDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreateSubmit} className="aws-drawer-body">
          <div className="aws-form-group">
            <label className="aws-label">Name</label>
            <div className="aws-label-desc">Specify a descriptive name for this health check.</div>
            <input 
              type="text" 
              className="aws-input" 
              placeholder="e.g. main-web-prod"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </div>

          <div className="aws-form-group">
            <label className="aws-label">What to monitor</label>
            <select 
              className="aws-select" 
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
            >
              <option value="ENDPOINT">Endpoint IP / domain status check</option>
              <option value="ALARM">Calculated health of other checks</option>
            </select>
          </div>

          {formType === "ENDPOINT" ? (
            <>
              <div className="aws-form-group">
                <label className="aws-label">Specify endpoint by</label>
                <div className="aws-radio-group">
                  <label className="aws-radio-label">
                    <input 
                      type="radio" 
                      name="monitor_target" 
                      value="ip"
                      checked={formMonitorLink === "ip"}
                      onChange={() => setFormMonitorLink("ip")}
                    />
                    <span>IP address (e.g. 192.0.2.1)</span>
                  </label>
                  <label className="aws-radio-label">
                    <input 
                      type="radio" 
                      name="monitor_target" 
                      value="domain"
                      checked={formMonitorLink === "domain"}
                      onChange={() => setFormMonitorLink("domain")}
                    />
                    <span>Domain name (e.g. web.mysite.com)</span>
                  </label>
                </div>
              </div>

              {formMonitorLink === "ip" ? (
                <div className="aws-form-group">
                  <label className="aws-label">IP Address</label>
                  <input 
                    type="text" 
                    className="aws-input" 
                    placeholder="e.g. 198.51.100.12"
                    value={formIpAddress}
                    onChange={(e) => setFormIpAddress(e.target.value)}
                    required={formMonitorLink === "ip"}
                  />
                </div>
              ) : (
                <div className="aws-form-group">
                  <label className="aws-label">Domain Name</label>
                  <input 
                    type="text" 
                    className="aws-input" 
                    placeholder="e.g. app.example.com"
                    value={formDomainName}
                    onChange={(e) => setFormDomainName(e.target.value)}
                    required={formMonitorLink === "domain"}
                  />
                </div>
              )}

              <div className="aws-form-group">
                <label className="aws-label">Protocol</label>
                <select 
                  className="aws-select" 
                  value={formProtocol}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormProtocol(val);
                    if (val === "HTTPS") setFormPort(443);
                    else if (val === "HTTP") setFormPort(80);
                    else if (val === "TCP") setFormPort(80);
                  }}
                >
                  <option value="HTTP">HTTP (Non-secure web endpoint)</option>
                  <option value="HTTPS">HTTPS (TLS-secured web endpoint)</option>
                  <option value="TCP">TCP Port Probe</option>
                </select>
              </div>

              <div className="aws-form-group">
                <label className="aws-label">Port</label>
                <input 
                  type="number" 
                  className="aws-input" 
                  min={1} 
                  max={65535}
                  value={formPort}
                  onChange={(e) => setFormPort(Number(e.target.value))}
                  required
                />
              </div>

              {formProtocol !== "TCP" && (
                <div className="aws-form-group">
                  <label className="aws-label">Path</label>
                  <div className="aws-label-desc">URL endpoint path to probe (e.g. /healthz or /).</div>
                  <input 
                    type="text" 
                    className="aws-input" 
                    placeholder="/"
                    value={formPath}
                    onChange={(e) => setFormPath(e.target.value)}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="aws-alert aws-alert-warning" style={{ margin: "20px 0" }}>
              <HelpCircle size={18} style={{ flexShrink: 0 }} />
              <div>
                Calculated alarms aggregate multiple endpoint checks. In mock mode, this falls back to endpoint monitoring parameters.
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "30px", borderTop: "1px solid #eaeded", paddingTop: "15px" }}>
            <button 
              type="button" 
              className="aws-btn" 
              onClick={() => setIsDrawerOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="aws-btn aws-btn-blue"
              disabled={submitting}
            >
              {submitting ? "Creating check..." : "Create health check"}
            </button>
          </div>
        </form>
      </div>

      {/* Floating toasts */}
      <div className="toasts-container">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={`aws-alert ${
              t.type === "success" ? "aws-alert-success" : 
              t.type === "danger" ? "aws-alert-danger" : 
              "aws-alert-warning"
            }`}
            style={{ margin: 0, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}
          >
            {t.type === "success" && <CheckCircle size={16} />}
            {t.type === "danger" && <AlertTriangle size={16} />}
            {t.type === "warning" && <HelpCircle size={16} />}
            <span style={{ fontSize: "13px" }}>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
