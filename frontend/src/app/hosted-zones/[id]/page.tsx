"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft,
  Plus, 
  Trash2, 
  Edit3,
  Download, 
  Upload, 
  RefreshCw, 
  Search, 
  X,
  HelpCircle,
  Database,
  Tag,
  ChevronRight,
  Info
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

interface DNSRecord {
  id: string;
  hosted_zone_id: string;
  name: string;
  type: string;
  value: string;
  ttl: number;
  routing_policy: string;
  weight?: number;
  region?: string;
  failover_status?: string;
  health_check_id?: string;
  created_at: string;
}

export default function HostedZoneDetail() {
  const params = useParams();
  const zoneId = params.id as string;
  const router = useRouter();
  const { showNotification } = useNotifications();

  // Zone and Records state
  const [zone, setZone] = useState<HostedZone | null>(null);
  const [records, setRecords] = useState<DNSRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"records" | "details">("records");

  // Record Form/Wizard state
  const [isRecordDrawerOpen, setIsRecordDrawerOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<DNSRecord | null>(null);
  const [recSubDomain, setRecSubDomain] = useState<string>("");
  const [recType, setRecType] = useState<string>("A");
  const [recValue, setRecValue] = useState<string>("");
  const [recTtl, setRecTtl] = useState<number>(300);
  const [recPolicy, setRecPolicy] = useState<string>("Simple");
  const [recWeight, setRecWeight] = useState<string>("");
  const [recRegion, setRecRegion] = useState<string>("us-east-1");
  const [recFailover, setRecFailover] = useState<string>("Primary");
  const [recHealthCheck, setRecHealthCheck] = useState<string>("");
  const [recordSubmitting, setRecordSubmitting] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  // Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>("");
  const [importing, setImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Zone Details & Records list
  const loadZoneData = async () => {
    setLoading(true);
    try {
      // Get zone det
      const data = await api.getZone(zoneId);
      setZone(data);
      setRecords(data.records);
    } catch (err: any) {
      showNotification("error", "Error loading zone parameters", err.message);
      router.push("/hosted-zones");
    } finally {
      setLoading(false);
    }
  };

  const loadRecordsOnly = async (search = "", type = "") => {
    try {
      const data = await api.listRecords(zoneId, search, type);
      setRecords(data);
    } catch (err: any) {
      showNotification("error", "Error loading DNSRecords", err.message);
    }
  };

  useEffect(() => {
    if (zoneId) {
      loadZoneData();
    }
  }, [zoneId]);

  useEffect(() => {
    const handleCloseDrawers = () => {
      setIsRecordDrawerOpen(false);
      setIsImportModalOpen(false);
    };

    window.addEventListener("aws_close_drawers", handleCloseDrawers);
    return () => {
      window.removeEventListener("aws_close_drawers", handleCloseDrawers);
    };
  }, []);

  // Handle Search/Filter changes
  const applyFilters = () => {
    setCurrentPage(1);
    loadRecordsOnly(searchQuery, typeFilter);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };

  // Checkbox interactions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Exclude SOA and NS records from general multi-operations as they are default zone controls
      const operationalRecs = records.filter(r => r.type !== "SOA" && r.type !== "NS");
      setSelectedRecordIds(operationalRecs.map(r => r.id));
    } else {
      setSelectedRecordIds([]);
    }
  };

  const handleSelectRow = (recordId: string) => {
    setSelectedRecordIds(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  // Record Form wizard opening
  const openCreateRecord = () => {
    setEditingRecord(null);
    setRecSubDomain("");
    setRecType("A");
    setRecValue("");
    setRecTtl(300);
    setRecPolicy("Simple");
    setRecWeight("");
    setRecRegion("us-east-1");
    setRecFailover("Primary");
    setRecHealthCheck("");
    setIsRecordDrawerOpen(true);
  };

  const openEditRecord = (record: DNSRecord) => {
    if (record.type === "NS" || record.type === "SOA") {
      showNotification("warning", "Restricted Modification", "NS and SOA initial zoning parameters should be managed carefully. Edit directly to update.");
    }
    
    setEditingRecord(record);
    // Strip zone name from record name to construct subdomain text
    let sub = record.name;
    if (zone && sub.endsWith("." + zone.name)) {
      sub = sub.slice(0, -(zone.name.length + 1));
      if (sub === "") sub = "";
    }
    setRecSubDomain(sub);
    setRecType(record.type);
    setRecValue(record.value);
    setRecTtl(record.ttl);
    setRecPolicy(record.routing_policy);
    setRecWeight(record.weight !== undefined && record.weight !== null ? String(record.weight) : "");
    setRecRegion(record.region || "us-east-1");
    setRecFailover(record.failover_status || "Primary");
    setRecHealthCheck(record.health_check_id || "");
    setIsRecordDrawerOpen(true);
  };

  // Submit create or edit record form
  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recValue.trim()) {
      showNotification("error", "Record Value contains empty input fields");
      return;
    }

    setRecordSubmitting(true);
    
    // Auto prefix zone suffix
    const suffix = zone ? zone.name : "";
    let finalRecName = recSubDomain.trim();
    if (finalRecName === "" || finalRecName === "@") {
      finalRecName = suffix;
    } else {
      if (!finalRecName.endsWith(".")) finalRecName += ".";
      if (!finalRecName.endsWith(suffix)) {
        finalRecName = finalRecName.replace(/\.$/, "") + "." + suffix;
      }
    }

    const payload = {
      name: finalRecName,
      type: recType,
      value: recValue.trim(),
      ttl: recTtl,
      routing_policy: recPolicy,
      weight: recPolicy === "Weighted" ? (parseInt(recWeight) || 0) : undefined,
      region: ["Geolocation", "Latency"].includes(recPolicy) ? recRegion : undefined,
      failover_status: recPolicy === "Failover" ? recFailover : undefined,
      health_check_id: recPolicy === "Failover" ? recHealthCheck : undefined
    };

    try {
      if (editingRecord) {
        await api.updateRecord(editingRecord.id, payload);
        showNotification("success", "DNS Record Updated", `Successfully modified ${finalRecName}`);
      } else {
        await api.createRecord(zoneId, payload);
        showNotification("success", "DNS Record Created", `Successfully deployed ${finalRecName}`);
      }
      setIsRecordDrawerOpen(false);
      
      // Reload zone details & record counts
      loadZoneData();
    } catch (err: any) {
      showNotification("error", "Operation Failed", err.message);
    } finally {
      setRecordSubmitting(false);
    }
  };

  // Delete single record
  const handleDeleteSingleRecord = async (record: DNSRecord) => {
    if (record.type === "NS" || record.type === "SOA") {
      if (!confirm(`Warning: Deleting default DNS System Record '${record.type}' might break resource queries. Proceed?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete DNS Record '${record.name}' (${record.type})?`)) {
        return;
      }
    }

    try {
      await api.deleteRecord(record.id);
      showNotification("success", "Record Deleted", `Successfully removed ${record.name}`);
      setSelectedRecordIds(prev => prev.filter(id => id !== record.id));
      loadZoneData();
    } catch (err: any) {
      showNotification("error", "Failed to delete record", err.message);
    }
  };

  // Bulk delete selected records
  const handleBulkDelete = async () => {
    if (selectedRecordIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete the ${selectedRecordIds.length} selected DNS records?`)) {
      return;
    }

    try {
      await api.bulkDeleteRecords(selectedRecordIds);
      showNotification("success", "Bulk Deletion Successful", `Removed ${selectedRecordIds.length} records.`);
      setSelectedRecordIds([]);
      loadZoneData();
    } catch (err: any) {
      showNotification("error", "Bulk Deletion Failed", err.message);
    }
  };

  // Export record list
  const handleExport = async (format: "bind" | "json") => {
    if (!zone) return;
    try {
      const resp = await api.exportZone(zoneId, format);
      
      let blob;
      let filename;
      
      if (format === "json") {
        const jsonStr = JSON.stringify(resp, null, 2);
        blob = new Blob([jsonStr], { type: "application/json" });
        filename = `${zone.name}json`;
      } else {
        blob = new Blob([resp.content], { type: "text/plain" });
        filename = `${zone.name}zone`;
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification("success", "Export Completed", `DNS Zone downloaded in ${format.toUpperCase()} format.`);
    } catch (err: any) {
      showNotification("error", "Export Failed", err.message);
    }
  };

  // Drag and drop BIND file selector
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    
    const file = fileList[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === "string") {
        setImportText(event.target.result);
      }
    };
    reader.readAsText(file);
  };

  // Run importer
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) {
      showNotification("error", "Import raw text field is empty");
      return;
    }

    setImporting(true);
    try {
      const result = await api.importZoneRawText(zoneId, importText);
      showNotification("success", "Import Successful", `Processed and created ${result.length} DNS resource records.`);
      setIsImportModalOpen(false);
      setImportText("");
      loadZoneData();
    } catch (err: any) {
      showNotification("error", "Import Failed", err.message);
    } finally {
      setImporting(false);
    }
  };

  if (loading && !zone) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Retrieving Hosted Zone configurations...</div>;
  }

  if (!zone) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Hosted Zone not found.</div>;
  }

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedRecords = records.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);
  const isAllSelected = records.length > 0 && selectedRecordIds.length === records.filter(r => r.type !== "SOA" && r.type !== "NS").length;

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="aws-breadcrumbs">
        <span>Route 53</span>
        <span className="aws-breadcrumb-separator"><ChevronRight size={10} /></span>
        <span style={{ color: "#0972ec", cursor: "pointer" }} onClick={() => router.push("/hosted-zones")}>Hosted zones</span>
        <span className="aws-breadcrumb-separator"><ChevronRight size={10} /></span>
        <span>{zone.name}</span>
      </div>

      {/* Main Title Actions Row */}
      <div className="aws-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button 
            className="aws-btn" 
            onClick={() => router.push("/hosted-zones")}
            style={{ borderRadius: "50%", width: "36px", height: "36px", padding: 0 }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="aws-page-title">{zone.name}</h1>
            <p className="aws-page-subtitle">Hosted Zone ID: <span style={{ fontFamily: "var(--aws-font-mono)", fontWeight: "bold" }}>{zone.id}</span></p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="aws-btn" onClick={() => setIsImportModalOpen(true)}>
            <Upload size={14} /> Import BIND zone file
          </button>
          
          {/* Download split actions drop */}
          <button className="aws-btn" onClick={() => handleExport("bind")}>
            <Download size={14} /> Export BIND
          </button>
          <button className="aws-btn" onClick={() => handleExport("json")}>
            <Download size={14} /> Export JSON
          </button>
        </div>
      </div>

      {/* Zone Details Cards Subpanel */}
      <div className="aws-card" style={{ marginBottom: "20px" }}>
        <div className="aws-card-body" style={{ padding: "16px 20px" }}>
          <div className="detail-grid">
            <div className="aws-drawer-field" style={{ margin: 0 }}>
              <span className="aws-drawer-label">Domain Name</span>
              <div className="aws-drawer-value" style={{ fontWeight: "700" }}>{zone.name}</div>
            </div>
            
            <div className="aws-drawer-field" style={{ margin: 0 }}>
              <span className="aws-drawer-label">Routing Type</span>
              <div className="aws-drawer-value">
                <span className={`aws-badge ${zone.type === "Public" ? "aws-badge-public" : "aws-badge-private"}`}>
                  {zone.type}
                </span>
                {zone.type === "Private" && (
                  <span style={{ fontSize: "12px", color: "var(--aws-text-secondary)", display: "block", marginTop: "2px" }}>
                    Linked VPC: {zone.vpc_id} ({zone.vpc_region})
                  </span>
                )}
              </div>
            </div>

            <div className="aws-drawer-field" style={{ margin: 0 }}>
              <span className="aws-drawer-label">Record Count</span>
              <div className="aws-drawer-value">{zone.record_count} Records</div>
            </div>

            <div className="aws-drawer-field" style={{ margin: 0 }}>
              <span className="aws-drawer-label">Description / Status</span>
              <div className="aws-drawer-value">{zone.description || "Core Route53 records group"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="aws-tabs">
        <li 
          className={`aws-tab-item ${activeTab === "records" ? "active" : ""}`}
          onClick={() => setActiveTab("records")}
        >
          Records ({records.length})
        </li>
        <li 
          className={`aws-tab-item ${activeTab === "details" ? "active" : ""}`}
          onClick={() => setActiveTab("details")}
        >
          Hosted zone details
        </li>
      </ul>

      {activeTab === "details" ? (
        <div className="aws-card">
          <div className="aws-card-header"><span style={{ fontWeight: "bold" }}>Properties</span></div>
          <div className="aws-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div>
                <table className="aws-table" style={{ border: "1px solid #eaeded" }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: "bold", backgroundColor: "#fafbfc", width: "150px" }}>Hosted zone ID</td>
                      <td style={{ fontFamily: "var(--aws-font-mono)" }}>{zone.id}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold", backgroundColor: "#fafbfc" }}>Created At</td>
                      <td suppressHydrationWarning>{new Date(zone.created_at).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold", backgroundColor: "#fafbfc" }}>Comment tag</td>
                      <td>{zone.comment || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                {zone.type === "Private" ? (
                  <div style={{ padding: "16px", backgroundColor: "#fafbfc", border: "1px solid #eaeded", borderRadius: "2px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "10px" }}>Associated VPCs</h3>
                    <p style={{ fontSize: "13px", color: "var(--aws-text-secondary)" }}>
                      This hosted zone resolver is linked to the following VPC. Resolving local domain requests inside this subnet returns our configured values.
                    </p>
                    <table className="aws-table" style={{ marginTop: "12px", border: "1px solid #eaeded" }}>
                      <thead>
                        <tr>
                          <th>VPC ID</th>
                          <th>Region</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontFamily: "var(--aws-font-mono)" }}>{zone.vpc_id}</td>
                          <td>{zone.vpc_region}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: "16px", backgroundColor: "#fafbfc", border: "1px solid #eaeded", borderRadius: "2px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "10px" }}>Public Name Servers</h3>
                    <p style={{ fontSize: "13px", color: "var(--aws-text-secondary)", marginBottom: "10px" }}>
                      Point your domain registrar configurations (e.g. GoDaddy, Namecheap) to these nameservers to authorize Route53 resolving.
                    </p>
                    <div style={{ fontFamily: "var(--aws-font-mono)", padding: "10px", backgroundColor: "#f2f3f3", border: "1px solid #d5dbdb", borderRadius: "4px" }}>
                      {records
                        .filter(r => r.type === "NS")
                        .map(r => r.value.split("\n").map((ns, idx) => <div key={idx}>{ns}</div>))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Records Management grid */
        <div className="aws-card">
          <div className="aws-table-toolbar">
            <div className="aws-search-filter-box">
              <span style={{ fontSize: "13px", fontWeight: "bold", color: "#545b64" }}>Records:</span>
              <div className="aws-table-search">
                <Search size={16} className="aws-table-search-icon" />
                <input 
                  type="text" 
                  className="aws-table-search-input" 
                  placeholder="Record name... (Press Enter)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyPress}
                />
              </div>

              <select 
                className="aws-select"
                style={{ width: "130px", padding: "6px" }}
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                  loadRecordsOnly(searchQuery, e.target.value);
                }}
              >
                <option value="">All Types</option>
                <option value="A">A</option>
                <option value="AAAA">AAAA</option>
                <option value="CNAME">CNAME</option>
                <option value="TXT">TXT</option>
                <option value="MX">MX</option>
                <option value="NS">NS</option>
                <option value="SOA">SOA</option>
                <option value="PTR">PTR</option>
                <option value="SRV">SRV</option>
                <option value="CAA">CAA</option>
              </select>

              {(searchQuery || typeFilter) && (
                <button 
                  className="aws-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("");
                    setCurrentPage(1);
                    loadRecordsOnly("", "");
                  }}
                  style={{ padding: "6px 12px" }}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="aws-table-actions">
              <button className="aws-btn" onClick={() => loadRecordsOnly(searchQuery, typeFilter)}>
                <RefreshCw size={14} />
              </button>
              <button 
                className="aws-btn"
                disabled={selectedRecordIds.length === 0}
                onClick={() => setSelectedRecordIds([])}
              >
                Deselect
              </button>
              <button 
                className="aws-btn"
                disabled={selectedRecordIds.length !== 1}
                onClick={() => {
                  const toEdit = records.find(r => r.id === selectedRecordIds[0]);
                  if (toEdit) openEditRecord(toEdit);
                }}
              >
                <Edit3 size={14} /> Edit record
              </button>
              <button 
                className="aws-btn"
                disabled={selectedRecordIds.length === 0}
                onClick={handleBulkDelete}
                style={{ color: selectedRecordIds.length > 0 ? "#d13212" : "inherit" }}
              >
                <Trash2 size={14} /> Delete records ({selectedRecordIds.length})
              </button>
              <button 
                className="aws-btn aws-btn-blue"
                onClick={openCreateRecord}
              >
                <Plus size={14} /> Create record
              </button>
            </div>
          </div>

          <div className="aws-table-container">
            <table className="aws-table">
              <thead>
                <tr>
                  <th className="aws-table-checkbox">
                    <input 
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      disabled={records.filter(r => r.type !== "SOA" && r.type !== "NS").length === 0}
                    />
                  </th>
                  <th>Record name</th>
                  <th>Type</th>
                  <th>Routing policy</th>
                  <th>Value / Route traffic to</th>
                  <th>TTL (sec)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "var(--aws-text-secondary)" }}>
                      No records matched the filter terms.
                    </td>
                  </tr>
                ) : (
                  pagedRecords.map((rec) => {
                    const isSystemRecord = rec.type === "NS" || rec.type === "SOA";
                    const isRowSelected = selectedRecordIds.includes(rec.id);
                    
                    return (
                      <tr 
                        key={rec.id}
                        className={isRowSelected ? "selected" : ""}
                        onClick={() => {
                          if (!isSystemRecord) handleSelectRow(rec.id);
                        }}
                        style={{ cursor: isSystemRecord ? "default" : "pointer" }}
                      >
                        <td className="aws-table-checkbox" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox"
                            checked={isRowSelected}
                            disabled={isSystemRecord}
                            onChange={() => handleSelectRow(rec.id)}
                          />
                        </td>
                        <td style={{ fontWeight: "700" }}>{rec.name}</td>
                        <td>
                          <span 
                            style={{ 
                              padding: "2px 6px", 
                              borderRadius: "4px", 
                              backgroundColor: "#f2f3f3", 
                              fontSize: "12px", 
                              border: "1px solid #eaeded",
                              fontWeight: "bold" 
                            }}
                          >
                            {rec.type}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "13px" }}>
                            {rec.routing_policy}
                            {rec.routing_policy === "Weighted" && ` (Weight: ${rec.weight})`}
                            {["Geolocation", "Latency"].includes(rec.routing_policy) && ` (${rec.region})`}
                            {rec.routing_policy === "Failover" && ` (${rec.failover_status})`}
                          </span>
                        </td>
                        <td>
                          <div style={{ 
                            fontFamily: "var(--aws-font-mono)", 
                            fontSize: "12.5px", 
                            whiteSpace: "pre-wrap", 
                            maxHeight: "80px", 
                            overflowY: "auto",
                            wordBreak: "break-all"
                          }}>
                            {rec.value}
                          </div>
                        </td>
                        <td>{rec.ttl}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button 
                              onClick={() => openEditRecord(rec)}
                              style={{ border: "none", background: "none", color: "#0972ec", cursor: "pointer", fontSize: "12px" }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteSingleRecord(rec)}
                              style={{ border: "none", background: "none", color: "#d13212", cursor: "pointer", fontSize: "12px" }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="aws-pagination">
            <span>Showing <strong>{(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, records.length)}</strong> of <strong>{records.length}</strong> records</span>
            {totalPages > 1 && (
              <div className="aws-pagination-buttons">
                <button
                  className="aws-pagination-btn"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(safeCurrentPage - 1)}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`aws-pagination-btn ${p === safeCurrentPage ? "active" : ""}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="aws-pagination-btn"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(safeCurrentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sliding Create/Edit Record GUI Drawer */}
      <div className={`aws-drawer ${isRecordDrawerOpen ? "open" : ""}`} style={{ width: "480px", zIndex: 1000 }}>
        <div className="aws-drawer-header">
          <span className="aws-drawer-title">{editingRecord ? "Edit DNS record" : "Create quick record"}</span>
          <button className="aws-drawer-close" onClick={() => setIsRecordDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleRecordSubmit} className="aws-drawer-body">
          <div className="aws-form-group">
            <label className="aws-label">Record name</label>
            <div className="aws-label-desc">Subdomain string mapping. Leave empty to configure root.</div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <input 
                type="text" 
                className="aws-input" 
                placeholder="www"
                value={recSubDomain}
                onChange={(e) => setRecSubDomain(e.target.value.toLowerCase())}
                style={{ flex: 1 }}
              />
              <span 
                style={{ 
                  backgroundColor: "#f2f3f3", 
                  padding: "8px 12px", 
                  border: "1px solid #d5dbdb", 
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  color: "var(--aws-text-secondary)",
                  fontFamily: "var(--aws-font-mono)"
                }}
              >
                .{zone.name}
              </span>
            </div>
          </div>

          <div className="aws-form-group">
            <label className="aws-label">Record type</label>
            <select 
              className="aws-select"
              value={recType}
              onChange={(e) => setRecType(e.target.value)}
              disabled={editingRecord && ["NS", "SOA"].includes(editingRecord.type)}
            >
              <option value="A">A - Routes traffic to IPv4 addresses</option>
              <option value="AAAA">AAAA - Routes traffic to IPv6 addresses</option>
              <option value="CNAME">CNAME - Routes canonical domain names alias</option>
              <option value="TXT">TXT - Arbitrary text/spf verifications</option>
              <option value="MX">MX - Mail servers maps</option>
              <option value="NS">NS - Defines authority nameservers</option>
              <option value="PTR">PTR - Reverse pointer address lookup</option>
              <option value="SRV">SRV - Defines service protocols mappings</option>
              <option value="CAA">CAA - Authorize certificate authorities (CAs)</option>
            </select>
          </div>

          <div className="aws-form-group">
            <label className="aws-label">Value</label>
            <div className="aws-label-desc">Enter one target value per line.</div>
            
            {/* Visual Type tips helper */}
            <div style={{ 
              backgroundColor: "#f0f7ff", 
              border: "1px solid #d0e7ff", 
              padding: "8px 12px", 
              borderRadius: "4px", 
              fontSize: "12px", 
              display: "flex", 
              gap: "8px", 
              alignItems: "center",
              marginBottom: "8px",
              color: "#035cc5"
            }}>
              <Info size={14} style={{ flexShrink: 0 }} />
              <span>
                {recType === "A" && "Input IPv4 targets (e.g. 192.0.2.14)."}
                {recType === "AAAA" && "Input IPv6 targets (e.g. 2001:db8::1)."}
                {recType === "CNAME" && "Input absolute domain with trailing dot (e.g. lb.aws.com.)."}
                {recType === "TXT" && "Enclose text strings in quotation marks (e.g. \"v=spf1 ...\")."}
                {recType === "MX" && "Specify priority and host (e.g. 10 mail.mysite.com.)."}
                {!["A", "AAAA", "CNAME", "TXT", "MX"].includes(recType) && "Supply standard format representation rows."}
              </span>
            </div>

            <textarea 
              className="aws-textarea" 
              placeholder={
                recType === "A" ? "192.0.2.10\n192.0.2.20" :
                recType === "MX" ? "10 mx1.example.com.\n20 mx2.example.com." :
                "Enter target records values"
              }
              value={recValue}
              onChange={(e) => setRecValue(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="aws-form-group">
            <label className="aws-label">TTL (Seconds)</label>
            <div className="aws-label-desc">Define cache duration on resolver servers.</div>
            <select 
              className="aws-select"
              value={recTtl}
              onChange={(e) => setRecTtl(Number(e.target.value))}
            >
              <option value={60}>60 (1 Minute)</option>
              <option value={300}>300 (5 Minutes)</option>
              <option value={900}>900 (15 Minutes)</option>
              <option value={3600}>3600 (1 Hour)</option>
              <option value={86400}>86400 (1 Day)</option>
            </select>
          </div>

          <div className="aws-form-group">
            <label className="aws-label">Routing policy</label>
            <select 
              className="aws-select"
              value={recPolicy}
              onChange={(e) => setRecPolicy(e.target.value)}
            >
              <option value="Simple">Simple routing - standard queries</option>
              <option value="Weighted">Weighted routing - partition percentage traffic</option>
              <option value="Geolocation">Geolocation routing - map to geographic regions</option>
              <option value="Latency">Latency routing - map to lowest response regions</option>
              <option value="Failover">Failover routing - backup switchover targets</option>
            </select>
          </div>

          {/* Conditional parameters based on policy selection */}
          {recPolicy === "Weighted" && (
            <div className="aws-form-group" style={{ paddingLeft: "15px", borderLeft: "2px solid var(--aws-orange-primary)" }}>
              <label className="aws-label">Weight</label>
              <div className="aws-label-desc">Specify relative weight (0 to 255). We will partition traffic.</div>
              <input 
                type="number" 
                className="aws-input" 
                min={0} 
                max={255} 
                value={recWeight}
                onChange={(e) => setRecWeight(e.target.value)}
                required
              />
            </div>
          )}

          {["Geolocation", "Latency"].includes(recPolicy) && (
            <div className="aws-form-group" style={{ paddingLeft: "15px", borderLeft: "2px solid var(--aws-orange-primary)" }}>
              <label className="aws-label">AWS Region</label>
              <div className="aws-label-desc">Select target cloud infrastructure region.</div>
              <select className="aws-select" value={recRegion} onChange={(e) => setRecRegion(e.target.value)}>
                <option value="us-east-1">us-east-1 (N. Virginia)</option>
                <option value="us-west-2">us-west-2 (Oregon)</option>
                <option value="eu-west-1">eu-west-1 (Ireland)</option>
                <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
              </select>
            </div>
          )}

          {recPolicy === "Failover" && (
            <div style={{ paddingLeft: "15px", borderLeft: "2px solid var(--aws-orange-primary)", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="aws-form-group" style={{ margin: 0 }}>
                <label className="aws-label">Failover status type</label>
                <div className="aws-radio-group">
                  <label className="aws-radio-label">
                    <input 
                      type="radio" 
                      name="failover_type" 
                      value="Primary"
                      checked={recFailover === "Primary"}
                      onChange={() => setRecFailover("Primary")}
                    />
                    <span>Primary Endpoint</span>
                  </label>
                  <label className="aws-radio-label">
                    <input 
                      type="radio" 
                      name="failover_type" 
                      value="Secondary"
                      checked={recFailover === "Secondary"}
                      onChange={() => setRecFailover("Secondary")}
                    />
                    <span>Secondary Endpoint (Failover Reserve)</span>
                  </label>
                </div>
              </div>

              <div className="aws-form-group">
                <label className="aws-label">Health Check ID</label>
                <div className="aws-label-desc">Associate a health check for traffic redirection triggering.</div>
                <input 
                  type="text" 
                  className="aws-input" 
                  placeholder="e.g. hc-10294abef8"
                  value={recHealthCheck}
                  onChange={(e) => setRecHealthCheck(e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "30px", borderTop: "1px solid #eaeded", paddingTop: "15px" }}>
            <button 
              type="button" 
              className="aws-btn" 
              onClick={() => setIsRecordDrawerOpen(false)}
              disabled={recordSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="aws-btn aws-btn-blue"
              disabled={recordSubmitting}
            >
              {recordSubmitting ? "Saving..." : editingRecord ? "Save changes" : "Create record"}
            </button>
          </div>
        </form>
      </div>

      {/* Floating Import Modal backdrop layout */}
      {isImportModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 5000,
          padding: "20px"
        }}>
          <div className="aws-card" style={{ width: "600px", margin: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
            <div className="aws-card-header">
              <span style={{ fontWeight: "700" }}>Import DNS records from BIND zone file</span>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--aws-text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="aws-card-body">
              <p style={{ color: "var(--aws-text-secondary)", fontSize: "13px", marginBottom: "16px" }}>
                Import records by pasting typical BIND syntax outputs, or upload your zone config file below. Values for matching subdomains and types will be merged appropriately.
              </p>

              <div className="aws-form-group">
                <label className="aws-label">Upload Zone file</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".zone,.txt,.db,*"
                  onChange={handleImportFileChange}
                />
                <button 
                  type="button" 
                  className="aws-btn" 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", borderStyle: "dashed", padding: "16px", justifyContent: "center" }}
                >
                  <Upload size={16} /> Choose file or Drag & Drop zone file here
                </button>
              </div>

              <div className="aws-form-group">
                <label className="aws-label">BIND Raw Contents</label>
                <textarea 
                  className="aws-textarea"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`$ORIGIN ${zone.name}\n$TTL 3600\n@\tIN\tSOA\tns-1.awsdns.com. hostmaster.awsdns.com. ( 1 7200 900 1209600 86400 )\nwww\tIN\tA\t192.0.2.15\nmail\tIN\tA\t192.0.2.20`}
                  rows={8}
                  style={{ fontFamily: "var(--aws-font-mono)", fontSize: "12px" }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", borderTop: "1px solid #eaeded", paddingTop: "15px" }}>
                <button 
                  type="button" 
                  className="aws-btn" 
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={importing}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="aws-btn aws-btn-blue"
                  disabled={importing}
                >
                  {importing ? "Importing records..." : "Import zone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
