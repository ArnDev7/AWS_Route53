"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Activity, GitMerge, ExternalLink, HelpCircle } from "lucide-react";
import { api } from "@/utils/api";

export default function Dashboard() {
  const router = useRouter();
  const [zoneCount, setZoneCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const zones = await api.listZones();
        setZoneCount(zones.length);
      } catch (err) {
        console.error("Failed to load zone counts for dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div>
      <div className="aws-breadcrumbs">
        <span>Route 53</span>
        <span className="aws-breadcrumb-separator">/</span>
        <span>Dashboard</span>
      </div>

      <div className="aws-page-header">
        <div>
          <h1 className="aws-page-title">Route 53 Dashboard</h1>
          <p className="aws-page-subtitle">Highly available and scalable Domain Name System (DNS) web service</p>
        </div>
      </div>

      {/* Main Grid widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        
        {/* Left column: Core Features */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* DNS Management section */}
          <div className="aws-card">
            <div className="aws-card-header">
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
                <Database size={18} color="#0972ec" /> DNS Management
              </span>
            </div>
            <div className="aws-card-body">
              <p style={{ color: "var(--aws-text-secondary)", marginBottom: "16px" }}>
                Manage public and private DNS records for your domains. Route 53 routes internet traffic to resources such as EC2 instances, S3 buckets, or external IP locations.
              </p>
              
              <div 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  backgroundColor: "var(--aws-bg-body)", 
                  padding: "16px",
                  border: "1px solid var(--aws-border-color)",
                  borderRadius: "4px",
                  marginBottom: "20px"
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "var(--aws-text-secondary)" }}>HOSTED ZONES</div>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--aws-text-primary)" }}>
                    {loading ? "..." : zoneCount}
                  </div>
                </div>
                <button 
                  className="aws-btn aws-btn-blue"
                  onClick={() => router.push("/hosted-zones")}
                >
                  View Hosted Zones
                </button>
              </div>

              <div style={{ display: "flex", gap: "15px" }}>
                <button className="aws-btn" onClick={() => router.push("/hosted-zones?create=true")}>
                  Create Hosted Zone
                </button>
              </div>
            </div>
          </div>

          {/* Traffic Policies Section */}
          <div className="aws-card">
            <div className="aws-card-header">
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
                <GitMerge size={18} color="#eb7211" /> Traffic Flow
              </span>
            </div>
            <div className="aws-card-body">
              <p style={{ color: "var(--aws-text-secondary)", marginBottom: "16px" }}>
                Configure sophisticated DNS routing policies like geographic, latency-based, and failover options to maximize application availability and control global workloads.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="aws-btn" onClick={() => router.push("/traffic-policies")}>
                  Configure Traffic Policies
                </button>
              </div>
            </div>
          </div>

          {/* Health Checks Section */}
          <div className="aws-card">
            <div className="aws-card-header">
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
                <Activity size={18} color="#1d8102" /> Health Checks & Availability
              </span>
            </div>
            <div className="aws-card-body">
              <p style={{ color: "var(--aws-text-secondary)", marginBottom: "16px" }}>
                Monitor web servers, endpoint IPs, and other resources. Map DNS records to health checks to configure DNS failover automatically if endpoints degrade.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="aws-btn" onClick={() => router.push("/health-checks")}>
                  Configure Health Checks
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: General side panel widget */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Quick info card */}
          <div className="aws-card">
            <div className="aws-card-header" style={{ borderBottom: "none", paddingBottom: "5px" }}>
              <span style={{ fontWeight: "700" }}>How DNS Routing Works</span>
            </div>
            <div className="aws-card-body" style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <strong>1. User queries domain name</strong>
                <p style={{ color: "var(--aws-text-secondary)", marginTop: "4px" }}>A client requests an IP for www.example.com from Route53 authority servers.</p>
              </div>
              <hr style={{ border: "none", borderTop: "1px solid var(--aws-border-color)" }} />
              <div>
                <strong>2. Evaluate Routing policy</strong>
                <p style={{ color: "var(--aws-text-secondary)", marginTop: "4px" }}>Route53 selects values based on Simple, Latency, Weighted, or Failover logic.</p>
              </div>
              <hr style={{ border: "none", borderTop: "1px solid var(--aws-border-color)" }} />
              <div>
                <strong>3. Route to target resources</strong>
                <p style={{ color: "var(--aws-text-secondary)", marginTop: "4px" }}>The clients are redirected to healthy IP targets or Elastic Load Balancers map points.</p>
              </div>
            </div>
          </div>

          {/* Useful links card */}
          <div className="aws-card">
            <div className="aws-card-header">
              <span style={{ fontWeight: "700" }}>Additional Links</span>
            </div>
            <div className="aws-card-body" style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html" target="_blank" className="aws-link" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                Route 53 Documentation <ExternalLink size={12} />
              </a>
              <a href="https://aws.amazon.com/route53/pricing/" target="_blank" className="aws-link" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                Billing & Pricing Guide <ExternalLink size={12} />
              </a>
              <a href="https://aws.amazon.com/route53/faqs/" target="_blank" className="aws-link" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                Frequently Asked Questions <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
