"use client";

import { useState } from "react";
import { 
  ChevronRight, Plus, HelpCircle, HardDrive, 
  GitFork, Shield, Info, ArrowUpRight, ArrowDownLeft,
  Users, CheckCircle2, Network, Radio, X
} from "lucide-react";
import { useNotifications } from "@/utils/NotificationContext";

export default function Profiles() {
  const { showNotification } = useNotifications();
  const [selectedProfileTab, setSelectedProfileTab] = useState<"zones" | "rules" | "vpcs">("zones");

  const [profiles, setProfiles] = useState([
    {
      id: "pro-9fb0d315ce",
      name: "Standard-Compliance-Profile",
      status: "Associated",
      vpcCount: 3,
      shareStatus: "Local Account Only",
      created: "2026-03-01"
    }
  ]);

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileVpcCount, setNewProfileVpcCount] = useState(1);

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    const newProfile = {
      id: "pro-" + Math.random().toString(36).substring(2, 12),
      name: newProfileName.trim(),
      status: "Associated",
      vpcCount: Number(newProfileVpcCount),
      shareStatus: "Local Account Only",
      created: new Date().toISOString().split("T")[0]
    };

    setProfiles([...profiles, newProfile]);
    setIsDrawerOpen(false);
    setNewProfileName("");
    setNewProfileVpcCount(1);
    showNotification("success", "Profile Created", `Successfully created Route 53 profile ${newProfileName}`);
  };

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="aws-breadcrumbs">
        <span>Route 53</span>
        <ChevronRight size={10} className="aws-breadcrumb-separator" />
        <span>Profiles</span>
      </div>

      {/* Header */}
      <div className="aws-page-header">
        <div>
          <h1 className="aws-page-title">Route 53 Profiles</h1>
          <p className="aws-page-subtitle">Group DNS hosted zone associations, resolver rules, and firewall groups, and link them to multiple VPCs.</p>
        </div>
        <button className="aws-btn aws-btn-primary" onClick={() => setIsDrawerOpen(true)}>
          <Plus size={14} /> Create profile
        </button>
      </div>

      {/* Profile Overview Card */}
      <div className="aws-card">
        <div className="aws-card-header" style={{ backgroundColor: "var(--aws-bg-body)" }}>
          <span style={{ fontWeight: 700 }}>Active Profiles</span>
        </div>
        <div className="aws-table-container">
          <table className="aws-table">
            <thead>
              <tr>
                <th>Profile ID</th>
                <th>Profile Name</th>
                <th>Status</th>
                <th>Linked VPCs Count</th>
                <th>Share Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "13px" }}>{p.id}</td>
                  <td style={{ fontWeight: 600, color: "var(--aws-blue-primary)" }}>{p.name}</td>
                  <td>
                    <span className="aws-badge aws-badge-success">
                      {p.status}
                    </span>
                  </td>
                  <td>{p.vpcCount} VPCs</td>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Users size={14} style={{ color: "var(--aws-text-secondary)" }} /> {p.shareStatus}
                    </span>
                  </td>
                  <td>{p.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile details structure tabs */}
      <div className="aws-page-header" style={{ marginBottom: "14px", marginTop: "32px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700 }}>
          Profile configuration: {profiles[0]?.name || "No profile selected"}
        </h2>
      </div>

      <div className="aws-tabs" style={{ marginBottom: "20px" }}>
        <button 
          className={`aws-tab-item ${selectedProfileTab === "zones" ? "active" : ""}`}
          style={{ background: "none", border: "none" }}
          onClick={() => setSelectedProfileTab("zones")}
        >
          Hosted Zone Associations (1)
        </button>
        <button 
          className={`aws-tab-item ${selectedProfileTab === "rules" ? "active" : ""}`}
          style={{ background: "none", border: "none" }}
          onClick={() => setSelectedProfileTab("rules")}
        >
          Resolver Rule Associations (2)
        </button>
        <button 
          className={`aws-tab-item ${selectedProfileTab === "vpcs" ? "active" : ""}`}
          style={{ background: "none", border: "none" }}
          onClick={() => setSelectedProfileTab("vpcs")}
        >
          VPC Associations (3)
        </button>
      </div>

      {/* Tabs panels */}
      <div className="aws-card" style={{ padding: "20px" }}>
        {selectedProfileTab === "zones" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontSize: "14px", color: "var(--aws-text-secondary)", alignSelf: "center" }}>
                Add hosted zones to share DNS resolution policies across associated VPCs automatically.
              </span>
              <button className="aws-btn aws-btn-blue">Associate Hosted Zone</button>
            </div>

            <table className="aws-table">
              <thead>
                <tr>
                  <th>Hosted Zone ID</th>
                  <th>Domain Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "13px" }}>ZH0134VMNS00</td>
                  <td style={{ fontWeight: 600 }}>corp.internal</td>
                  <td><span style={{ color: "var(--aws-green)", fontWeight: "bold" }}>● Associated</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {selectedProfileTab === "rules" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontSize: "14px", color: "var(--aws-text-secondary)", alignSelf: "center" }}>
                Link Resolver Rules to resolve names using custom network bridges or on-prem directories.
              </span>
              <button className="aws-btn aws-btn-blue">Associate Rule</button>
            </div>

            <table className="aws-table">
              <thead>
                <tr>
                  <th>Rule ID</th>
                  <th>Rule Name</th>
                  <th>Domain Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "13px" }}>rsl-rule-872abf</td>
                  <td style={{ fontWeight: 600 }}>Forward-To-Corporate</td>
                  <td>corp.global</td>
                  <td><span style={{ color: "var(--aws-green)", fontWeight: "bold" }}>● Associated</span></td>
                </tr>
                <tr>
                  <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "13px" }}>rsl-rule-90efbd</td>
                  <td style={{ fontWeight: 600 }}>System-Inter-Link</td>
                  <td>net.internal</td>
                  <td><span style={{ color: "var(--aws-green)", fontWeight: "bold" }}>● Associated</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {selectedProfileTab === "vpcs" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontSize: "14px", color: "var(--aws-text-secondary)", alignSelf: "center" }}>
                Active Virtual Private Clouds linked to this profile. Group rules apply to resolving tables.
              </span>
              <button className="aws-btn aws-btn-blue">Link VPC</button>
            </div>

            <table className="aws-table">
              <thead>
                <tr>
                  <th>VPC ID</th>
                  <th>Region</th>
                  <th>Association Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "13px" }}>vpc-0912abfe8029</td>
                  <td>us-east-1</td>
                  <td><span style={{ color: "var(--aws-green)", fontWeight: "bold" }}>● Active</span></td>
                </tr>
                <tr>
                  <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "13px" }}>vpc-8ef9a012cd31</td>
                  <td>us-west-2</td>
                  <td><span style={{ color: "var(--aws-green)", fontWeight: "bold" }}>● Active</span></td>
                </tr>
                <tr>
                  <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "13px" }}>vpc-bbd1134a6efc</td>
                  <td>eu-west-1</td>
                  <td><span style={{ color: "var(--aws-green)", fontWeight: "bold" }}>● Active</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Profile Drawer */}
      <div className={`aws-drawer ${isDrawerOpen ? "open" : ""}`} style={{ pointerEvents: "auto" }}>
        <div className="aws-drawer-header">
          <span className="aws-drawer-title">Create Profile</span>
          <button className="aws-drawer-close" onClick={() => setIsDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleCreateProfile} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="aws-drawer-body">
            <div className="aws-alert aws-alert-warning" style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <Info size={16} />
                <div style={{ fontSize: "12px" }}>
                  Profiles allow you to share Route 53 resource configurations across multiple VPCs and AWS accounts using Resource Access Manager (RAM).
                </div>
              </div>
            </div>

            <div className="aws-drawer-field">
              <label className="aws-drawer-label">Profile Name</label>
              <input 
                type="text" 
                className="aws-input" 
                value={newProfileName} 
                onChange={(e) => setNewProfileName(e.target.value)} 
                placeholder="e.g. Production-Compliance-Profile"
                required
                style={{ marginTop: "6px" }}
              />
            </div>

            <div className="aws-drawer-field">
              <label className="aws-drawer-label">Initial VPC Associations Count</label>
              <input 
                type="number" 
                className="aws-input" 
                min={0}
                value={newProfileVpcCount} 
                onChange={(e) => setNewProfileVpcCount(Number(e.target.value))} 
                style={{ marginTop: "6px" }}
              />
            </div>

            <div className="aws-drawer-field">
              <label className="aws-drawer-label">Share Status</label>
              <select className="aws-select" style={{ marginTop: "6px" }} disabled>
                <option>Local Account Only (Default)</option>
                <option>Shared via RAM</option>
              </select>
            </div>
          </div>
          <div className="aws-drawer-footer" style={{ padding: "16px 20px", borderTop: "1px solid var(--aws-border-color)", display: "flex", justifyContent: "flex-end", gap: "10px", backgroundColor: "var(--aws-bg-body)" }}>
            <button type="button" className="aws-btn" onClick={() => setIsDrawerOpen(false)}>Cancel</button>
            <button type="submit" className="aws-btn aws-btn-blue">Create profile</button>
          </div>
        </form>
      </div>
    </div>
  );
}
