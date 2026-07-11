"use client";

import { useState } from "react";
import { 
  ChevronRight, Plus, HelpCircle, HardDrive, 
  GitFork, Shield, Info, ArrowUpRight, ArrowDownLeft, X 
} from "lucide-react";
import { useNotifications } from "@/utils/NotificationContext";

export default function Resolver() {
  const { showNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<"inbound" | "outbound" | "rules">("inbound");

  // Inbound Endpoints State
  const [inbounds, setInbounds] = useState([
    {
      id: "rsl-in-709de812",
      name: "Corporate-HQ-Inbound",
      vpcId: "vpc-0912abfe8029",
      status: "Operational",
      ips: ["10.0.1.15", "10.0.2.42"],
      created: "2026-02-14"
    }
  ]);

  // Outbound Endpoints State
  const [outbounds, setOutbounds] = useState([
    {
      id: "rsl-out-a9821d3f",
      name: "On-Premises-Bridge",
      vpcId: "vpc-0912abfe8029",
      status: "Operational",
      ips: ["10.0.12.8", "10.0.13.9"],
      created: "2026-02-14"
    }
  ]);

  // Rules State
  const [rules, setRules] = useState([
    {
      id: "rsl-rule-bf081a29",
      name: "Forward-Corp-Internal",
      domain: "corp.internal.",
      ruleType: "Forward",
      outboundEndpoint: "On-Premises-Bridge",
      targetIps: ["172.16.20.100", "172.16.20.101"],
      status: "Active"
    },
    {
      id: "rsl-rule-sys-local",
      name: "System-Local-Rule",
      domain: ".",
      ruleType: "System",
      outboundEndpoint: "-",
      targetIps: ["Local AWS recursive resolver"],
      status: "Active"
    }
  ]);

  // Drawer Configuration
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<"inbound" | "outbound" | "rule">("inbound");

  // New item inputs
  const [newName, setNewName] = useState("");
  const [newVpc, setNewVpc] = useState("vpc-0912abfe8029");
  const [newIps, setNewIps] = useState("10.0.1.50, 10.0.2.50");
  const [newDomain, setNewDomain] = useState("corp-sub.internal.");
  const [newRuleType, setNewRuleType] = useState("Forward");
  const [newOutboundEp, setNewOutboundEp] = useState("On-Premises-Bridge");

  // Handle submits
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const parsedIps = newIps.split(",").map(ip => ip.trim()).filter(Boolean);

    if (drawerType === "inbound") {
      const entry = {
        id: "rsl-in-" + Math.random().toString(36).substring(2, 10),
        name: newName.trim(),
        vpcId: newVpc,
        status: "Operational",
        ips: parsedIps.length ? parsedIps : ["10.0.1.99"],
        created: new Date().toISOString().split("T")[0]
      };
      setInbounds([...inbounds, entry]);
      showNotification("success", "Inbound Endpoint Configured", `Successfully created ${newName}`);
    } else if (drawerType === "outbound") {
      const entry = {
        id: "rsl-out-" + Math.random().toString(36).substring(2, 10),
        name: newName.trim(),
        vpcId: newVpc,
        status: "Operational",
        ips: parsedIps.length ? parsedIps : ["10.0.12.99"],
        created: new Date().toISOString().split("T")[0]
      };
      setOutbounds([...outbounds, entry]);
      showNotification("success", "Outbound Endpoint Configured", `Successfully created ${newName}`);
    } else {
      const entry = {
        id: "rsl-rule-" + Math.random().toString(36).substring(2, 10),
        name: newName.trim(),
        domain: newDomain.endsWith(".") ? newDomain : newDomain + ".",
        ruleType: newRuleType,
        outboundEndpoint: newRuleType === "System" ? "-" : newOutboundEp,
        targetIps: newRuleType === "System" ? ["Local AWS recursive resolver"] : parsedIps,
        status: "Active"
      };
      setRules([...rules, entry]);
      showNotification("success", "Resolver Rule Active", `Rule ${newName} applied to DNS configuration.`);
    }

    setIsDrawerOpen(false);
    setNewName("");
  };

  const openDrawerForType = (type: "inbound" | "outbound" | "rule") => {
    setDrawerType(type);
    if (type === "inbound") {
      setNewName("Office-Network-Inbound");
      setNewIps("10.0.1.55, 10.0.2.88");
    } else if (type === "outbound") {
      setNewName("Office-Briding-Outbound");
      setNewIps("10.0.15.10, 10.0.16.10");
    } else {
      setNewName("Forward-To-OnPrem");
      setNewIps("192.168.1.100, 192.168.2.100");
    }
    setIsDrawerOpen(true);
  };

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="aws-breadcrumbs">
        <span>Route 53</span>
        <ChevronRight size={10} className="aws-breadcrumb-separator" />
        <span>Resolver</span>
      </div>

      {/* Header */}
      <div className="aws-page-header">
        <div>
          <h1 className="aws-page-title">Route 53 Resolver</h1>
          <p className="aws-page-subtitle">Configure inbound/outbound DNS endpoints and forwarding rules for hybrid cloud infrastructure.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {activeTab === "inbound" && (
            <button className="aws-btn aws-btn-primary" onClick={() => openDrawerForType("inbound")}>
              <Plus size={14} /> Configure inbound endpoint
            </button>
          )}
          {activeTab === "outbound" && (
            <button className="aws-btn aws-btn-primary" onClick={() => openDrawerForType("outbound")}>
              <Plus size={14} /> Configure outbound endpoint
            </button>
          )}
          {activeTab === "rules" && (
            <button className="aws-btn aws-btn-primary" onClick={() => openDrawerForType("rule")}>
              <Plus size={14} /> Add resolver rule
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="aws-tabs" style={{ marginBottom: "24px" }}>
        <button 
          className={`aws-tab-item ${activeTab === "inbound" ? "active" : ""}`} 
          style={{ background: "none", border: "none" }}
          onClick={() => setActiveTab("inbound")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowDownLeft size={14} /> Inbound DNS Endpoints
          </span>
        </button>
        <button 
          className={`aws-tab-item ${activeTab === "outbound" ? "active" : ""}`} 
          style={{ background: "none", border: "none" }}
          onClick={() => setActiveTab("outbound")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowUpRight size={14} /> Outbound DNS Endpoints
          </span>
        </button>
        <button 
          className={`aws-tab-item ${activeTab === "rules" ? "active" : ""}`} 
          style={{ background: "none", border: "none" }}
          onClick={() => setActiveTab("rules")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <GitFork size={14} /> Resolver Rules
          </span>
        </button>
      </div>

      {/* Tab Panel Contents */}
      {activeTab === "inbound" && (
        <div className="aws-card" style={{ padding: 0 }}>
          <div className="aws-table-toolbar">
            <span style={{ fontWeight: 600, color: "var(--aws-text-secondary)" }}>
              Inbound Endpoints - Listen for external queries routed into your Virtual Private Clouds
            </span>
          </div>
          <div className="aws-table-container">
            <table className="aws-table">
              <thead>
                <tr>
                  <th>Endpoint ID</th>
                  <th>Name</th>
                  <th>VPC Associated</th>
                  <th>Status</th>
                  <th>Hosted IPv4 Addresses</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {inbounds.map((ep) => (
                  <tr key={ep.id}>
                    <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "13px" }}>{ep.id}</td>
                    <td style={{ fontWeight: 600 }}>{ep.name}</td>
                    <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "13px" }}>{ep.vpcId}</td>
                    <td>
                      <span className="aws-badge aws-badge-success">
                        {ep.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {ep.ips.map((ip) => (
                          <span key={ip} className="aws-badge-pill" style={{ padding: "2px 6px" }}>{ip}</span>
                        ))}
                      </div>
                    </td>
                    <td>{ep.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "outbound" && (
        <div className="aws-card" style={{ padding: 0 }}>
          <div className="aws-table-toolbar">
            <span style={{ fontWeight: 600, color: "var(--aws-text-secondary)" }}>
              Outbound Endpoints - Forward VPC queries to corporate/on-premises DNS servers
            </span>
          </div>
          <div className="aws-table-container">
            <table className="aws-table">
              <thead>
                <tr>
                  <th>Endpoint ID</th>
                  <th>Name</th>
                  <th>VPC Associated</th>
                  <th>Status</th>
                  <th>Interface IPv4 Targets</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {outbounds.map((ep) => (
                  <tr key={ep.id}>
                    <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "13px" }}>{ep.id}</td>
                    <td style={{ fontWeight: 600 }}>{ep.name}</td>
                    <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "13px" }}>{ep.vpcId}</td>
                    <td>
                      <span className="aws-badge aws-badge-success">
                        {ep.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {ep.ips.map((ip) => (
                          <span key={ip} className="aws-badge-pill" style={{ padding: "2px 6px" }}>{ip}</span>
                        ))}
                      </div>
                    </td>
                    <td>{ep.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div className="aws-card" style={{ padding: 0 }}>
          <div className="aws-table-toolbar">
            <span style={{ fontWeight: 600, color: "var(--aws-text-secondary)" }}>
              Resolver Rules - Define redirects matching domain queries
            </span>
          </div>
          <div className="aws-table-container">
            <table className="aws-table">
              <thead>
                <tr>
                  <th>Rule ID</th>
                  <th>Name</th>
                  <th>Domain Suffix</th>
                  <th>Rule Type</th>
                  <th>Outbound Endpoint Use</th>
                  <th>Resolve Target Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((ru) => (
                  <tr key={ru.id}>
                    <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "13px" }}>{ru.id}</td>
                    <td style={{ fontWeight: 600 }}>{ru.name}</td>
                    <td style={{ fontWeight: 600, color: "var(--aws-blue-primary)" }}>{ru.domain}</td>
                    <td>
                      <span className="aws-badge-pill" style={{ padding: "2px 6px" }}>{ru.ruleType}</span>
                    </td>
                    <td>{ru.outboundEndpoint}</td>
                    <td>
                      <div style={{ fontSize: "13px" }}>
                        {ru.targetIps.map((ip) => (
                          <div key={ip}>{ip}</div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="aws-badge aws-badge-success">
                        {ru.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide Drawer Setup */}
      <div className={`aws-drawer ${isDrawerOpen ? "open" : ""}`} style={{ pointerEvents: "auto" }}>
        <div className="aws-drawer-header">
          <span className="aws-drawer-title">
            {drawerType === "inbound" && "Configure Inbound Endpoint"}
            {drawerType === "outbound" && "Configure Outbound Endpoint"}
            {drawerType === "rule" && "Add Resolver Rule"}
          </span>
          <button className="aws-drawer-close" onClick={() => setIsDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="aws-drawer-body">
            <div className="aws-drawer-field">
              <label className="aws-drawer-label">Configuration Name</label>
              <input 
                type="text" 
                className="aws-input" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                required
                style={{ marginTop: "6px" }}
              />
            </div>

            {(drawerType === "inbound" || drawerType === "outbound") && (
              <>
                <div className="aws-drawer-field">
                  <label className="aws-drawer-label">Target VPC Association</label>
                  <select 
                    className="aws-select" 
                    value={newVpc} 
                    onChange={(e) => setNewVpc(e.target.value)}
                    style={{ marginTop: "6px" }}
                  >
                    <option value="vpc-0912abfe8029">vpc-0912abfe8029 (US-East VPC)</option>
                    <option value="vpc-8ef9a012cd31">vpc-8ef9a012cd31 (US-West VPC)</option>
                  </select>
                </div>

                <div className="aws-drawer-field">
                  <label className="aws-drawer-label">IP Bindings / Interface targets (Comma-separated)</label>
                  <input 
                    type="text" 
                    className="aws-input" 
                    value={newIps} 
                    onChange={(e) => setNewIps(e.target.value)} 
                    style={{ marginTop: "6px" }}
                  />
                  <small style={{ color: "var(--aws-text-secondary)", fontSize: "11px", display: "block", marginTop: "4px" }}>
                    Provide at least two IP targets for AWS multi-AZ redundancy.
                  </small>
                </div>
              </>
            )}

            {drawerType === "rule" && (
              <>
                <div className="aws-drawer-field">
                  <label className="aws-drawer-label">Domain Name (Query matching suffix)</label>
                  <input 
                    type="text" 
                    className="aws-input" 
                    value={newDomain} 
                    onChange={(e) => setNewDomain(e.target.value)} 
                    placeholder="e.g. branch.corporate."
                    required
                    style={{ marginTop: "6px" }}
                  />
                </div>

                <div className="aws-drawer-field">
                  <label className="aws-drawer-label">Rule Type</label>
                  <select 
                    className="aws-select" 
                    value={newRuleType} 
                    onChange={(e) => setNewRuleType(e.target.value)}
                    style={{ marginTop: "6px" }}
                  >
                    <option value="Forward">Forward (Redirect queries to outbound endpoint)</option>
                    <option value="System">System (DNS resolves locally by Route 53)</option>
                  </select>
                </div>

                {newRuleType === "Forward" && (
                  <>
                    <div className="aws-drawer-field">
                      <label className="aws-drawer-label">Outbound Endpoint Link</label>
                      <select 
                        className="aws-select" 
                        value={newOutboundEp} 
                        onChange={(e) => setNewOutboundEp(e.target.value)}
                        style={{ marginTop: "6px" }}
                      >
                        {outbounds.map(o => (
                          <option key={o.id} value={o.name}>{o.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="aws-drawer-field">
                      <label className="aws-drawer-label">Corporate DNS Targets (Comma-separated)</label>
                      <input 
                        type="text" 
                        className="aws-input" 
                        value={newIps} 
                        onChange={(e) => setNewIps(e.target.value)} 
                        style={{ marginTop: "6px" }}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <div className="aws-drawer-footer" style={{ padding: "16px 20px", borderTop: "1px solid var(--aws-border-color)", display: "flex", justifyContent: "flex-end", gap: "10px", backgroundColor: "var(--aws-bg-body)" }}>
            <button type="button" className="aws-btn" onClick={() => setIsDrawerOpen(false)}>Cancel</button>
            <button type="submit" className="aws-btn aws-btn-blue">Create configuration</button>
          </div>
        </form>
      </div>
    </div>
  );
}
