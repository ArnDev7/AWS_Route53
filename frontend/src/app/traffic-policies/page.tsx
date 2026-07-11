"use client";

import { useState } from "react";
import { 
  ChevronRight, Plus, Map, GitFork, Shield, ArrowRight,
  Monitor, CheckCircle2, Server, HelpCircle, Laptop, X
} from "lucide-react";
import { useNotifications } from "@/utils/NotificationContext";

interface Policy {
  id: string;
  name: string;
  description: string;
  version: number;
  recordsCount: number;
}

const SAMPLE_POLICIES: Policy[] = [
  {
    id: "tp-0ga8fb12cd",
    name: "Global-Failover-Web-Portal",
    description: "Georouting splitter dividing North America requests and Rest-of-World with high-availability Active-Passive failover backup servers.",
    version: 1,
    recordsCount: 2
  },
  {
    id: "tp-89c02d1af9",
    name: "Latency-Optimized-API",
    description: "Reroutes api.example.com requests to the lowest response regions (us-east-1, eu-west-1, ap-southeast-1) with weighted canary testing.",
    version: 2,
    recordsCount: 1
  }
];

export default function TrafficPolicies() {
  const { showNotification } = useNotifications();
  const [policies, setPolicies] = useState<Policy[]>(SAMPLE_POLICIES);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(SAMPLE_POLICIES[0].id);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newPolicyDesc, setNewPolicyDesc] = useState("");

  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName.trim()) return;

    const newPolicy: Policy = {
      id: "tp-" + Math.random().toString(36).substring(2, 10),
      name: newPolicyName.trim(),
      description: newPolicyDesc.trim() || "Custom DNS traffic policy dividing queries dynamically.",
      version: 1,
      recordsCount: 0
    };

    setPolicies([...policies, newPolicy]);
    setSelectedPolicyId(newPolicy.id);
    setIsDrawerOpen(false);
    setNewPolicyName("");
    setNewPolicyDesc("");
    showNotification("success", "Traffic Policy Created", `Successfully created policy rule: ${newPolicyName}`);
  };

  const selectedPolicy = policies.find(p => p.id === selectedPolicyId);

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="aws-breadcrumbs">
        <span>Route 53</span>
        <ChevronRight size={10} className="aws-breadcrumb-separator" />
        <span>Traffic policies</span>
      </div>

      {/* Header */}
      <div className="aws-page-header">
        <div>
          <h1 className="aws-page-title">Traffic policies</h1>
          <p className="aws-page-subtitle">Define complex routing configurations using visual flows combining latency, geolocation, failover, and weights.</p>
        </div>
        <button className="aws-btn aws-btn-primary" onClick={() => setIsDrawerOpen(true)}>
          <Plus size={14} /> Create traffic policy
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "24px", alignItems: "start" }}>
        
        {/* Sidebar list */}
        <div className="aws-card" style={{ padding: 0 }}>
          <div className="aws-card-header" style={{ padding: "12px 18px", backgroundColor: "var(--aws-bg-body)" }}>
            <span style={{ fontWeight: 700, fontSize: "14px" }}>Available Policies</span>
          </div>
          <div className="aws-card-body" style={{ padding: 0 }}>
            {policies.map((p) => (
              <div 
                key={p.id}
                onClick={() => setSelectedPolicyId(p.id)}
                style={{
                  padding: "16px",
                  borderBottom: "1px solid var(--aws-border-color)",
                  cursor: "pointer",
                  backgroundColor: selectedPolicyId === p.id ? "var(--aws-tab-hover-bg)" : "transparent",
                  borderLeft: selectedPolicyId === p.id ? "4px solid var(--aws-blue-primary)" : "4px solid transparent"
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "14px", color: selectedPolicyId === p.id ? "var(--aws-blue-primary)" : "inherit" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--aws-text-secondary)", marginTop: "4px", lineBreak: "anywhere", height: "36px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.description}
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "8px", fontSize: "11px", color: "var(--aws-text-secondary)" }}>
                  <span>Version: {p.version}</span>
                  <span>•</span>
                  <span>Records: {p.recordsCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Details & Interactive SVG Canvas Pane */}
        {selectedPolicy && (
          <div className="aws-card" style={{ margin: 0 }}>
            <div className="aws-card-header" style={{ borderBottom: "1px solid var(--aws-border-color)" }}>
              <div>
                <span className="aws-card-title" style={{ fontSize: "18px" }}>{selectedPolicy.name}</span>
                <span className="aws-badge-pill" style={{ marginLeft: "10px", verticalAlign: "middle" }}>
                  Version {selectedPolicy.version}
                </span>
              </div>
              <span style={{ fontSize: "12px", color: "var(--aws-text-secondary)", fontFamily: "var(--aws-font-mono)" }}>
                ID: {selectedPolicy.id}
              </span>
            </div>

            <div className="aws-card-body">
              <p style={{ color: "var(--aws-text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
                {selectedPolicy.description}
              </p>

              {/* Feature tip — uses blue info banner to distinguish from amber system notices */}
              <div 
                style={{ 
                  backgroundColor: "#f0f7ff", 
                  border: "1px solid var(--aws-blue-primary)", 
                  borderLeft: "5px solid var(--aws-blue-primary)",
                  borderRadius: "2px", 
                  padding: "12px 16px",
                  marginBottom: "24px",
                  fontSize: "13px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center"
                }}
                className="aws-alert aws-alert-info"
              >
                <Map size={16} style={{ color: "var(--aws-blue-primary)", flexShrink: 0 }} />
                <span>
                  <strong>Interactive Query Path Tester</strong>: Hover over the nodes in the traffic map flowchart below to highlight query resolution routing directions.
                </span>
              </div>

              {/* Node diagram container */}
              <div 
                style={{ 
                  border: "1px solid var(--aws-border-color-dark)", 
                  borderRadius: "4px", 
                  backgroundColor: "var(--aws-bg-body)", 
                  padding: "30px",
                  minHeight: "450px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  overflowX: "auto"
                }}
              >
                {selectedPolicyId === "tp-0ga8fb12cd" ? (
                  /* GLOBAL FAILOVER COMBINATOR TREE SOURCE */
                  <svg width="700" height="380" style={{ fontFamily: "var(--aws-font-family)" }}>
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 2 L 8 5 L 0 8 z" fill="#aab7c4" />
                      </marker>
                      <marker id="arrow-high" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 2 L 8 5 L 0 8 z" fill="var(--aws-blue-primary)" />
                      </marker>
                    </defs>

                    {/* CONNECTIONS (PATHS) */}
                    <line x1="350" y1="55" x2="350" y2="95" stroke={highlightedNode ? "var(--aws-blue-primary)" : "#aab7c4"} strokeWidth={highlightedNode ? "2.5" : "1.5"} markerEnd={highlightedNode ? "url(#arrow-high)" : "url(#arrow)"} />
                    
                    <path d="M 275 125 L 170 125 L 170 170" fill="none" stroke={highlightedNode === "na" ? "var(--aws-blue-primary)" : "#aab7c4"} strokeWidth={highlightedNode === "na" ? "2.5" : "1.5"} markerEnd={highlightedNode === "na" ? "url(#arrow-high)" : "url(#arrow)"} />
                    <text x="190" y="115" fontSize="11" fill="var(--aws-text-secondary)" fontWeight="bold">North America</text>
                    
                    <path d="M 425 125 L 530 125 L 530 170" fill="none" stroke={highlightedNode === "row" ? "var(--aws-blue-primary)" : "#aab7c4"} strokeWidth={highlightedNode === "row" ? "2.5" : "1.5"} markerEnd={highlightedNode === "row" ? "url(#arrow-high)" : "url(#arrow)"} />
                    <text x="445" y="115" fontSize="11" fill="var(--aws-text-secondary)" fontWeight="bold">Default (RoW)</text>

                    <line x1="170" y1="220" x2="100" y2="275" stroke={highlightedNode === "na" ? "var(--aws-blue-primary)" : "#aab7c4"} strokeWidth={highlightedNode === "na" ? "2" : "1"} markerEnd={highlightedNode === "na" ? "url(#arrow-high)" : "url(#arrow)"} />
                    <text x="105" y="248" fontSize="10" fill="var(--aws-text-secondary)">Primary</text>

                    <line x1="170" y1="220" x2="255" y2="275" stroke={highlightedNode === "na" ? "var(--aws-blue-primary)" : "#aab7c4"} strokeWidth={highlightedNode === "na" ? "2" : "1"} markerEnd={highlightedNode === "na" ? "url(#arrow-high)" : "url(#arrow)"} />
                    <text x="220" y="248" fontSize="10" fill="var(--aws-text-secondary)">Backup</text>

                    <line x1="530" y1="220" x2="530" y2="275" stroke={highlightedNode === "row" ? "var(--aws-blue-primary)" : "#aab7c4"} strokeWidth={highlightedNode === "row" ? "2.5" : "1.5"} markerEnd={highlightedNode === "row" ? "url(#arrow-high)" : "url(#arrow)"} />

                    {/* NODE ELEMENTS */}
                    {/* 1. SOURCE — dark slate entry point */}
                    <g onMouseEnter={() => setHighlightedNode("source")} onMouseLeave={() => setHighlightedNode(null)} style={{ cursor: "pointer" }}>
                      <rect x="275" y="15" width="150" height="40" rx="4" fill="#232f3e" />
                      <text x="350" y="39" fill="white" fontSize="13" fontWeight="bold" textAnchor="middle">Query: example.com</text>
                    </g>

                    {/* 2. RULE — orange-bordered decision with rounded corners */}
                    <g onMouseEnter={() => setHighlightedNode("geo")} onMouseLeave={() => setHighlightedNode(null)} style={{ cursor: "pointer" }}>
                      <rect x="275" y="95" width="150" height="55" rx="6" fill="var(--aws-bg-card)" stroke="var(--aws-orange-primary)" strokeWidth="2" />
                      <text x="350" y="118" fill="var(--aws-text-primary)" fontSize="12" fontWeight="bold" textAnchor="middle">Geolocation Rule</text>
                      <text x="350" y="136" fill="var(--aws-text-secondary)" fontSize="11" textAnchor="middle">Map client IP region</text>
                    </g>

                    {/* 3. DECISION — blue solid-border failover node */}
                    <g onMouseEnter={() => setHighlightedNode("na")} onMouseLeave={() => setHighlightedNode(null)} style={{ cursor: "pointer" }}>
                      <rect x="90" y="170" width="160" height="50" rx="4" fill={highlightedNode === "na" ? "var(--aws-tab-hover-bg)" : "var(--aws-bg-card)"} stroke="var(--aws-blue-primary)" strokeWidth="2.5" />
                      <text x="170" y="192" fill="var(--aws-text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">Active / Passive Failover</text>
                      <text x="170" y="208" fill="var(--aws-green)" fontSize="9" fontWeight="bold" textAnchor="middle">Health Check Enabled</text>
                    </g>

                    {/* 4. TERMINAL — primary endpoint with green left accent */}
                    <g>
                      <rect x="35" y="275" width="130" height="55" rx="3" fill="var(--aws-bg-card)" stroke="var(--aws-border-color)" strokeWidth="1" />
                      <rect x="35" y="275" width="3" height="55" rx="1" fill="var(--aws-green)" />
                      <text x="100" y="296" fill="var(--aws-text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">US-East web pool</text>
                      <text x="100" y="314" fill="var(--aws-text-secondary)" fontSize="10" textAnchor="middle">198.51.100.12</text>
                    </g>

                    {/* 5. TERMINAL — backup endpoint with amber left accent */}
                    <g>
                      <rect x="190" y="275" width="130" height="55" rx="3" fill="var(--aws-bg-card)" stroke="var(--aws-border-color)" strokeWidth="1" />
                      <rect x="190" y="275" width="3" height="55" rx="1" fill="var(--aws-yellow)" />
                      <text x="255" y="296" fill="var(--aws-text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">US-West standby</text>
                      <text x="255" y="314" fill="var(--aws-text-secondary)" fontSize="10" textAnchor="middle">198.51.100.22</text>
                    </g>

                    {/* 6. DECISION — route-to-endpoint node */}
                    <g onMouseEnter={() => setHighlightedNode("row")} onMouseLeave={() => setHighlightedNode(null)} style={{ cursor: "pointer" }}>
                      <rect x="455" y="170" width="150" height="50" rx="4" fill={highlightedNode === "row" ? "var(--aws-tab-hover-bg)" : "var(--aws-bg-card)"} stroke="#0972ec" strokeWidth="1.5" />
                      <text x="530" y="200" fill="var(--aws-text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">Route to Endpoint</text>
                    </g>

                    {/* 7. TERMINAL — EU endpoint with green left accent */}
                    <g>
                      <rect x="470" y="275" width="130" height="55" rx="3" fill="var(--aws-bg-card)" stroke="var(--aws-border-color)" strokeWidth="1" />
                      <rect x="470" y="275" width="3" height="55" rx="1" fill="var(--aws-green)" />
                      <text x="535" y="296" fill="var(--aws-text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">EU-Dublin Hub</text>
                      <text x="535" y="314" fill="var(--aws-text-secondary)" fontSize="10" textAnchor="middle">54.238.10.99</text>
                    </g>
                  </svg>
                ) : selectedPolicyId === "tp-89c02d1af9" ? (
                  /* LATENCY Canary SPLITTER TREE SOURCE */
                  <svg width="700" height="380" style={{ fontFamily: "var(--aws-font-family)" }}>
                    <defs>
                      <marker id="arrow2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 2 L 8 5 L 0 8 z" fill="#aab7c4" />
                      </marker>
                      <marker id="arrow2-high" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 2 L 8 5 L 0 8 z" fill="var(--aws-blue-primary)" />
                      </marker>
                    </defs>

                    {/* CONNECTIONS (PATHS) */}
                    <line x1="350" y1="55" x2="350" y2="95" stroke={highlightedNode ? "var(--aws-blue-primary)" : "#aab7c4"} strokeWidth={highlightedNode ? "2.5" : "1.5"} markerEnd={highlightedNode ? "url(#arrow2-high)" : "url(#arrow2)"} />
                    
                    <path d="M 275 125 L 170 125 L 170 170" fill="none" stroke={highlightedNode === "east" ? "var(--aws-blue-primary)" : "#aab7c4"} strokeWidth={highlightedNode === "east" ? "2.5" : "1.5"} markerEnd={highlightedNode === "east" ? "url(#arrow2-high)" : "url(#arrow2)"} />
                    <text x="190" y="115" fontSize="11" fill="var(--aws-text-secondary)" fontWeight="bold">Lowest latency</text>

                    <path d="M 425 125 L 530 125 L 530 170" fill="none" stroke={highlightedNode === "canary" ? "var(--aws-blue-primary)" : "#aab7c4"} strokeWidth={highlightedNode === "canary" ? "2.5" : "1.5"} markerEnd={highlightedNode === "canary" ? "url(#arrow2-high)" : "url(#arrow2)"} />
                    <text x="445" y="115" fontSize="11" fill="var(--aws-text-secondary)" fontWeight="bold">Ap-Southeast</text>

                    <line x1="170" y1="220" x2="170" y2="275" stroke={highlightedNode === "east" ? "var(--aws-blue-primary)" : "#aab7c4"} strokeWidth={highlightedNode === "east" ? "2.5" : "1.5"} markerEnd={highlightedNode === "east" ? "url(#arrow2-high)" : "url(#arrow2)"} />

                    <line x1="530" y1="220" x2="465" y2="275" stroke={highlightedNode === "canary" ? "var(--aws-blue-primary)" : "#aab7c4"} strokeWidth={highlightedNode === "canary" ? "2" : "1"} markerEnd={highlightedNode === "canary" ? "url(#arrow2-high)" : "url(#arrow2)"} />
                    <text x="465" y="248" fontSize="10" fill="var(--aws-text-secondary)">Canary 10%</text>

                    <line x1="530" y1="220" x2="600" y2="275" stroke={highlightedNode === "canary" ? "var(--aws-blue-primary)" : "#aab7c4"} strokeWidth={highlightedNode === "canary" ? "2" : "1"} markerEnd={highlightedNode === "canary" ? "url(#arrow2-high)" : "url(#arrow2)"} />
                    <text x="575" y="248" fontSize="10" fill="var(--aws-text-secondary)">Main 90%</text>

                    {/* NODES */}
                    {/* SOURCE — dark slate entry */}
                    <g onMouseEnter={() => setHighlightedNode("source")} onMouseLeave={() => setHighlightedNode(null)} style={{ cursor: "pointer" }}>
                      <rect x="265" y="15" width="170" height="40" rx="4" fill="#232f3e" />
                      <text x="350" y="39" fill="white" fontSize="13" fontWeight="bold" textAnchor="middle">Query: api.example.com</text>
                    </g>

                    {/* RULE — orange-bordered decision */}
                    <g onMouseEnter={() => setHighlightedNode("latency")} onMouseLeave={() => setHighlightedNode(null)} style={{ cursor: "pointer" }}>
                      <rect x="275" y="95" width="150" height="55" rx="6" fill="var(--aws-bg-card)" stroke="var(--aws-orange-primary)" strokeWidth="2" />
                      <text x="350" y="118" fill="var(--aws-text-primary)" fontSize="12" fontWeight="bold" textAnchor="middle">Latency Rule</text>
                      <text x="350" y="136" fill="var(--aws-text-secondary)" fontSize="11" textAnchor="middle">Shortest network path</text>
                    </g>

                    {/* DECISION — region cluster */}
                    <g onMouseEnter={() => setHighlightedNode("east")} onMouseLeave={() => setHighlightedNode(null)} style={{ cursor: "pointer" }}>
                      <rect x="90" y="170" width="160" height="50" rx="4" fill={highlightedNode === "east" ? "var(--aws-tab-hover-bg)" : "var(--aws-bg-card)"} stroke="#0972ec" strokeWidth="1.5" />
                      <text x="170" y="200" fill="var(--aws-text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">US-East-1 Cluster</text>
                    </g>

                    {/* TERMINAL — Virginia endpoint */}
                    <g>
                      <rect x="105" y="275" width="130" height="55" rx="3" fill="var(--aws-bg-card)" stroke="var(--aws-border-color)" strokeWidth="1" />
                      <rect x="105" y="275" width="3" height="55" rx="1" fill="var(--aws-green)" />
                      <text x="170" y="296" fill="var(--aws-text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">Virginia App API</text>
                      <text x="170" y="314" fill="var(--aws-text-secondary)" fontSize="10" textAnchor="middle">198.51.100.3</text>
                    </g>

                    {/* DECISION — canary weighted split */}
                    <g onMouseEnter={() => setHighlightedNode("canary")} onMouseLeave={() => setHighlightedNode(null)} style={{ cursor: "pointer" }}>
                      <rect x="450" y="170" width="160" height="50" rx="4" fill={highlightedNode === "canary" ? "var(--aws-tab-hover-bg)" : "var(--aws-bg-card)"} stroke="var(--aws-blue-primary)" strokeWidth="2.5" />
                      <text x="530" y="200" fill="var(--aws-text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">Weighted Split (Canary)</text>
                    </g>

                    {/* TERMINAL — Preview API */}
                    <g>
                      <rect x="400" y="275" width="130" height="55" rx="3" fill="var(--aws-bg-card)" stroke="var(--aws-border-color)" strokeWidth="1" />
                      <rect x="400" y="275" width="3" height="55" rx="1" fill="var(--aws-yellow)" />
                      <text x="465" y="296" fill="var(--aws-text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">Preview API v3</text>
                      <text x="465" y="314" fill="var(--aws-text-secondary)" fontSize="10" textAnchor="middle">52.92.110.15</text>
                    </g>

                    {/* TERMINAL — Stable API */}
                    <g>
                      <rect x="540" y="275" width="120" height="55" rx="3" fill="var(--aws-bg-card)" stroke="var(--aws-border-color)" strokeWidth="1" />
                      <rect x="540" y="275" width="3" height="55" rx="1" fill="var(--aws-green)" />
                      <text x="600" y="296" fill="var(--aws-text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">Stable API v2</text>
                      <text x="600" y="314" fill="var(--aws-text-secondary)" fontSize="10" textAnchor="middle">52.92.110.10</text>
                    </g>
                  </svg>
                ) : (
                  /* OTHER CUSTOM ADDED POLICIES ROOT PLACEHOLDER FLOW */
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "350px", color: "var(--aws-text-secondary)" }}>
                    <Map size={48} style={{ marginBottom: "16px", strokeWidth: 1.5 }} />
                    <strong style={{ color: "var(--aws-text-primary)" }}>Visual Map Initialized</strong>
                    <span style={{ fontSize: "12px", marginTop: "4px" }}>Click edit rules configuration on this custom policy to link geo, latency, or failover nodes.</span>
                  </div>
                )}

                {/* Flowchart Legend/Key */}
                {selectedPolicyId && (
                  <div 
                    style={{ 
                      display: "flex", 
                      justifyContent: "center", 
                      flexWrap: "wrap",
                      gap: "24px", 
                      fontSize: "12px", 
                      color: "var(--aws-text-secondary)", 
                      marginTop: "20px",
                      paddingTop: "14px",
                      borderTop: "1px solid var(--aws-border-color)",
                      width: "100%",
                      maxWidth: "680px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ display: "inline-block", width: "12px", height: "12px", border: "1px solid var(--aws-border-color-dark)", backgroundColor: "var(--aws-bg-card)", borderLeft: "3px solid var(--aws-green)", borderRadius: "2px" }}></span>
                      <span style={{ fontWeight: 500 }}>Active / Serving Endpoint</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ display: "inline-block", width: "12px", height: "12px", border: "1px solid var(--aws-border-color-dark)", backgroundColor: "var(--aws-bg-card)", borderLeft: "3px solid var(--aws-yellow)", borderRadius: "2px" }}></span>
                      <span style={{ fontWeight: 500 }}>Standby / Passive Endpoint</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid var(--aws-orange-primary)", backgroundColor: "var(--aws-bg-card)", borderRadius: "2px" }}></span>
                      <span style={{ fontWeight: 500 }}>Routing Rule Node (Geo / Latency)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2.5px solid var(--aws-blue-primary)", backgroundColor: "var(--aws-bg-card)", borderRadius: "2px" }}></span>
                      <span style={{ fontWeight: 500 }}>Decision / Split Node</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Traffic Policy Drawer */}
      <div className={`aws-drawer ${isDrawerOpen ? "open" : ""}`} style={{ pointerEvents: "auto" }}>
        <div className="aws-drawer-header">
          <span className="aws-drawer-title">Create Traffic Policy</span>
          <button className="aws-drawer-close" onClick={() => setIsDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleCreatePolicy} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="aws-drawer-body">
            <div className="aws-alert aws-alert-warning" style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <Map size={16} />
                <div style={{ fontSize: "12px" }}>
                  Traffic policies allow you to write rules using visual diagrams. The visual editor maps queries using Latency, Geolocation, and Failover weights.
                </div>
              </div>
            </div>

            <div className="aws-drawer-field">
              <label className="aws-drawer-label">Policy Name</label>
              <input 
                type="text" 
                className="aws-input" 
                value={newPolicyName} 
                onChange={(e) => setNewPolicyName(e.target.value)} 
                placeholder="e.g. Asia-Pacific-Splitter"
                required
                style={{ marginTop: "6px" }}
              />
            </div>

            <div className="aws-drawer-field">
              <label className="aws-drawer-label">Description</label>
              <textarea 
                className="aws-textarea" 
                rows={4}
                value={newPolicyDesc} 
                onChange={(e) => setNewPolicyDesc(e.target.value)} 
                placeholder="Describe routing rules and splits..."
                style={{ marginTop: "6px", resize: "none" }}
              />
            </div>
          </div>
          <div className="aws-drawer-footer" style={{ padding: "16px 20px", borderTop: "1px solid var(--aws-border-color)", display: "flex", justifyContent: "flex-end", gap: "10px", backgroundColor: "var(--aws-bg-body)" }}>
            <button type="button" className="aws-btn" onClick={() => setIsDrawerOpen(false)}>Cancel</button>
            <button type="submit" className="aws-btn aws-btn-blue">Create policy</button>
          </div>
        </form>
      </div>
    </div>
  );
}
