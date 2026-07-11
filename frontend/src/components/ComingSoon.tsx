"use client";

import React from "react";
import { Hammer } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  features: string[];
}

export default function ComingSoon({ title, description, features }: ComingSoonProps) {
  return (
    <div>
      <div className="aws-breadcrumbs">
        <span>Route 53</span>
        <span className="aws-breadcrumb-separator">/</span>
        <span>{title}</span>
      </div>

      <div className="aws-page-header">
        <div>
          <h1 className="aws-page-title">{title}</h1>
          <p className="aws-page-subtitle">AWS Route 53 Feature Integration</p>
        </div>
      </div>

      <div className="aws-card" style={{ maxWidth: "800px", margin: "0 auto", marginTop: "40px" }}>
        <div className="aws-card-body" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fffbf0",
            border: "1px solid #ff9900",
            borderRadius: "50%",
            width: "60px",
            height: "60px",
            color: "#ff9900",
            marginBottom: "20px"
          }}>
            <Hammer size={32} />
          </div>

          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "12px" }}>Coming Soon to Route 53 Console</h2>
          <p style={{ color: "var(--aws-text-secondary)", marginBottom: "32px", fontSize: "14px", lineHeight: "1.6", maxWidth: "600px", margin: "0 auto 30px auto" }}>
            {description}
          </p>

          <div style={{ textAlign: "left", maxWidth: "500px", margin: "0 auto", backgroundColor: "#fcfdfe", border: "1px solid #eaeded", padding: "20px", borderRadius: "4px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "bold", textTransform: "uppercase", color: "var(--aws-text-secondary)", marginBottom: "12px", borderBottom: "1px solid #eaeded", paddingBottom: "6px" }}>
              Planned Capabilities
            </h3>
            <ul style={{ listStyleType: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
              {features.map((feat, idx) => (
                <li key={idx} style={{ display: "flex", gap: "8px", fontSize: "13px" }}>
                  <span style={{ color: "#ec7211", fontWeight: "bold" }}>•</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
