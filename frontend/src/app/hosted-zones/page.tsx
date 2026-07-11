"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  Search, 
  X, 
  Database,
  ExternalLink,
  ChevronRight,
  HelpCircle
} from "lucide-react";
import { api } from "@/utils/api";
import { useNotifications } from "@/utils/NotificationContext";

interface HostedZone {
  id: string;
  name: string;
  type: string;
  description: string;
  comment: string;
  vpc_id: string;
  vpc_region: string;
  record_count: number;
  created_at: string;
}

export default function HostedZones() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showNotification } = useNotifications();

  // Zones State
  const [zones, setZones] = useState<HostedZone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Create Zone Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [newZoneName, setNewZoneName] = useState<string>("");
  const [newZoneType, setNewZoneType] = useState<string>("Public");
  const [newZoneDesc, setNewZoneDesc] = useState<string>("");
  const [newZoneComment, setNewZoneComment] = useState<string>("");
  const [newZoneVpcId, setNewZoneVpcId] = useState<string>("");
  const [newZoneVpcRegion, setNewZoneVpcRegion] = useState<string>("us-east-1");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  // VPC Regions Options
  const vpcRegions = [
    { value: "us-east-1", label: "US East (N. Virginia)" },
    { value: "us-east-2", label: "US East (Ohio)" },
    { value: "us-west-1", label: "US West (N. California)" },
    { value: "us-west-2", label: "US West (Oregon)" },
    { value: "eu-west-1", label: "Europe (Ireland)" },
    { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" }
  ];

  // Refresh Hosted Zones List
  const fetchZones = async (query = "") => {
    setLoading(true);
    try {
      const data = await api.listZones(query);
      setZones(data);
      // Deselect if not in list
      if (selectedZoneId && !data.some((z: HostedZone) => z.id === selectedZoneId)) {
        setSelectedZoneId(null);
      }
    } catch (err: any) {
      showNotification("error", "Failed to retrieve Hosted Zones", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
    
    // Check if redirect query asks to open creation drawer immediately
    if (searchParams.get("create") === "true") {
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  // Handle Search Input Change
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setCurrentPage(1);
      fetchZones(searchQuery);
    }
  };

  // Create hosted zone submission
  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) {
      showNotification("error", "Domain Name is required");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await api.createZone({
        name: newZoneName.trim(),
        type: newZoneType,
        description: newZoneDesc.trim() || undefined,
        comment: newZoneComment.trim() || undefined,
        vpc_id: newZoneType === "Private" ? newZoneVpcId.trim() : undefined,
        vpc_region: newZoneType === "Private" ? newZoneVpcRegion : undefined
      });

      showNotification("success", "Hosted Zone Created", `Domain ${resp.name} successfully registered with ID ${resp.id}`);
      
      // Reset Form State
      setNewZoneName("");
      setNewZoneType("Public");
      setNewZoneDesc("");
      setNewZoneComment("");
      setNewZoneVpcId("");
      setNewZoneVpcRegion("us-east-1");
      
      setIsDrawerOpen(false);
      fetchZones();
    } catch (err: any) {
      showNotification("error", "Failed to create Hosted Zone", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete hosted zone
  const handleDeleteZone = async () => {
    if (!selectedZoneId) return;
    
    const zoneToDelete = zones.find((z) => z.id === selectedZoneId);
    if (!zoneToDelete) return;

    if (!confirm(`Are you sure you want to delete Hosted Zone '${zoneToDelete.name}' (${zoneToDelete.id})? This will delete all records within this zone.`)) {
      return;
    }

    try {
      await api.deleteZone(selectedZoneId);
      showNotification("success", "Hosted Zone Deleted", `Successfully removed zone ${zoneToDelete.name}`);
      setSelectedZoneId(null);
      fetchZones();
    } catch (err: any) {
      showNotification("error", "Failed to delete Hosted Zone", err.message);
    }
  };

  const activeSelectedZone = zones.find((z) => z.id === selectedZoneId);

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="aws-breadcrumbs">
        <span>Route 53</span>
        <span className="aws-breadcrumb-separator"><ChevronRight size={10} /></span>
        <span>Hosted zones</span>
      </div>

      {/* Title Panel */}
      <div className="aws-page-header">
        <div>
          <h1 className="aws-page-title">Hosted zones</h1>
          <p className="aws-page-subtitle">A hosted zone is a container for records that define how to route traffic for a domain.</p>
        </div>
      </div>

      {/* Alert Tips */}
      <div className="aws-alert aws-alert-warning" style={{ borderLeftColor: "#ff9900" }}>
        <HelpCircle size={18} style={{ color: "#ff9900", marginTop: "2px" }} />
        <div>
          <strong>AWS Route53 Simulation Mode</strong>
          <span style={{ display: "block", fontSize: "12px", marginTop: "4px" }}>
            This clone stores and queries values successfully in SQLite. Nameserver records (NS) and SOA records are generated automatically on zone registration.
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="aws-card">
        {/* Table Toolbar controls */}
        <div className="aws-table-toolbar">
          <div className="aws-search-filter-box">
            <span style={{ fontSize: "13px", fontWeight: "bold", color: "#545b64", whiteSpace: "nowrap" }}>Filter zones:</span>
            <div className="aws-table-search">
              <Search size={16} className="aws-table-search-icon" />
              <input 
                type="text" 
                className="aws-table-search-input" 
                placeholder="Domain name... (Press Enter)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyPress}
              />
            </div>
            {(searchQuery || zones.length === 0) && (
              <button 
                className="aws-btn" 
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                  fetchZones("");
                }}
                style={{ padding: "6px 12px" }}
              >
                Clear
              </button>
            )}
          </div>

          <div className="aws-table-actions">
            <button 
              className="aws-btn" 
              onClick={() => fetchZones(searchQuery)}
              title="Refresh List"
            >
              <RefreshCw size={14} />
            </button>
            <button 
              className="aws-btn"
              disabled={!selectedZoneId}
              onClick={() => setSelectedZoneId(null)}
            >
              Deselect
            </button>
            <button 
              className="aws-btn"
              disabled={!selectedZoneId}
              onClick={() => selectedZoneId && router.push(`/hosted-zones/${selectedZoneId}`)}
            >
              View details
            </button>
            <button 
              className="aws-btn"
              disabled={!selectedZoneId}
              style={{ color: selectedZoneId ? "#d13212" : "inherit" }}
              onClick={handleDeleteZone}
            >
              <Trash2 size={14} /> Delete
            </button>
            <button 
              className="aws-btn aws-btn-blue"
              onClick={() => setIsDrawerOpen(true)}
            >
              <Plus size={14} /> Create hosted zone
            </button>
          </div>
        </div>

        {/* Table container */}
        <div className="aws-table-container">
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--aws-text-secondary)" }}>
              <span>Retrieving hosted zones...</span>
            </div>
          ) : zones.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--aws-text-secondary)" }}>
              <p>No hosted zones found matching your environment query.</p>
              <p style={{ fontSize: "12px", marginTop: "4px" }}>Click "Create hosted zone" to register a new domain name.</p>
            </div>
          ) : (
            <table className="aws-table">
              <thead>
                <tr>
                  <th className="aws-table-checkbox"></th>
                  <th>Domain name</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Record count</th>
                  <th>Comment</th>
                  <th>Hosted zone ID</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const zoneTotalPages = Math.max(1, Math.ceil(zones.length / PAGE_SIZE));
                  const safeZonePage = Math.min(currentPage, zoneTotalPages);
                  const pagedZones = zones.slice((safeZonePage - 1) * PAGE_SIZE, safeZonePage * PAGE_SIZE);
                  return pagedZones.map((zone) => (
                  <tr 
                    key={zone.id} 
                    className={selectedZoneId === zone.id ? "selected" : ""}
                    onClick={() => setSelectedZoneId(zone.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="aws-table-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedZoneId === zone.id}
                        onChange={() => {
                          if (selectedZoneId === zone.id) {
                            setSelectedZoneId(null);
                          } else {
                            setSelectedZoneId(zone.id);
                          }
                        }}
                      />
                    </td>
                    <td>
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/hosted-zones/${zone.id}`);
                        }}
                        style={{ color: "#0972ec", fontWeight: "bold", textDecoration: "underline", cursor: "pointer" }}
                      >
                        {zone.name}
                      </span>
                    </td>
                    <td>
                      <span className={`aws-badge ${zone.type === "Public" ? "aws-badge-public" : "aws-badge-private"}`}>
                        {zone.type}
                      </span>
                    </td>
                    <td>{zone.description || "-"}</td>
                    <td>
                      <span className="aws-badge aws-badge-pill">{zone.record_count}</span>
                    </td>
                    <td>{zone.comment || "-"}</td>
                    <td style={{ fontFamily: "var(--aws-font-mono)", fontSize: "12.5px" }}>{zone.id}</td>
                  </tr>
                ));
                })()}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer stats count */}
        {(() => {
          const zoneTotalPages = Math.max(1, Math.ceil(zones.length / PAGE_SIZE));
          const safeZonePage = Math.min(currentPage, zoneTotalPages);
          return (
            <div className="aws-pagination">
              <span>Showing <strong>{zones.length === 0 ? 0 : (safeZonePage - 1) * PAGE_SIZE + 1}–{Math.min(safeZonePage * PAGE_SIZE, zones.length)}</strong> of <strong>{zones.length}</strong> hosted zones</span>
              {zoneTotalPages > 1 && (
                <div className="aws-pagination-buttons">
                  <button className="aws-pagination-btn" disabled={safeZonePage <= 1} onClick={() => setCurrentPage(safeZonePage - 1)}>Previous</button>
                  {Array.from({ length: zoneTotalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} className={`aws-pagination-btn ${p === safeZonePage ? "active" : ""}`} onClick={() => setCurrentPage(p)}>{p}</button>
                  ))}
                  <button className="aws-pagination-btn" disabled={safeZonePage >= zoneTotalPages} onClick={() => setCurrentPage(safeZonePage + 1)}>Next</button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Sliding CREATE hosted zone drawer */}
      <div className={`aws-drawer ${isDrawerOpen ? "open" : ""}`} style={{ width: "460px" }}>
        <div className="aws-drawer-header">
          <span className="aws-drawer-title">Create hosted zone</span>
          <button className="aws-drawer-close" onClick={() => setIsDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreateZone} className="aws-drawer-body">
          <div className="aws-form-group">
            <label className="aws-label">Domain name</label>
            <div className="aws-label-desc">Enter the name of the domain. For example, example.com.</div>
            <input 
              type="text" 
              className="aws-input" 
              placeholder="example.com"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              required
            />
          </div>

          <div className="aws-form-group">
            <label className="aws-label">Description</label>
            <div className="aws-label-desc">Optional description explaining the purpose of this hosted zone.</div>
            <input 
              type="text" 
              className="aws-input" 
              placeholder="Core production domains"
              value={newZoneDesc}
              onChange={(e) => setNewZoneDesc(e.target.value)}
            />
          </div>

          <div className="aws-form-group">
            <label className="aws-label">Type</label>
            <div className="aws-label-desc">Select whether you want to route internet traffic or internal corporate VPC traffic.</div>
            
            <div className="aws-radio-group">
              <label className="aws-radio-label">
                <input 
                  type="radio" 
                  name="zone_type" 
                  value="Public" 
                  checked={newZoneType === "Public"} 
                  onChange={() => setNewZoneType("Public")}
                />
                <div>
                  <strong>Public hosted zone</strong>
                  <div style={{ fontSize: "11px", color: "var(--aws-text-secondary)" }}>
                    Routes traffic on the internet. Anyone can query this zone's DNS answers over public root systems.
                  </div>
                </div>
              </label>

              <label className="aws-radio-label">
                <input 
                  type="radio" 
                  name="zone_type" 
                  value="Private" 
                  checked={newZoneType === "Private"} 
                  onChange={() => setNewZoneType("Private")}
                />
                <div>
                  <strong>Private hosted zone</strong>
                  <div style={{ fontSize: "11px", color: "var(--aws-text-secondary)" }}>
                    Routes traffic within one or more Virtual Private Clouds (VPCs) that you specify. Queries are isolated.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* VPC Fields for Private Host Zone */}
          {newZoneType === "Private" && (
            <div style={{ borderLeft: "2px solid #0972ec", paddingLeft: "15px", margin: "10px 0 20px 0" }}>
              <div className="aws-form-group">
                <label className="aws-label">VPC ID</label>
                <div className="aws-label-desc">Specify a Virtual Private Cloud (VPC) to link with this hosted zone.</div>
                <input 
                  type="text" 
                  className="aws-input" 
                  placeholder="vpc-0fae2b109cc4c89"
                  value={newZoneVpcId}
                  onChange={(e) => setNewZoneVpcId(e.target.value)}
                  required={newZoneType === "Private"}
                />
              </div>

              <div className="aws-form-group">
                <label className="aws-label">VPC Region</label>
                <select 
                  className="aws-select"
                  value={newZoneVpcRegion}
                  onChange={(e) => setNewZoneVpcRegion(e.target.value)}
                >
                  {vpcRegions.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label} ({region.value})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="aws-form-group">
            <label className="aws-label">Comment</label>
            <div className="aws-label-desc">Optional internal administrator comment tag.</div>
            <input 
              type="text" 
              className="aws-input" 
              placeholder="Created by Admin"
              value={newZoneComment}
              onChange={(e) => setNewZoneComment(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "30px", borderTop: "1px solid #eaeded", paddingTop: "15px" }}>
            <button 
              type="button" 
              className="aws-btn" 
              disabled={submitting}
              onClick={() => setIsDrawerOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="aws-btn aws-btn-blue"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create hosted zone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
