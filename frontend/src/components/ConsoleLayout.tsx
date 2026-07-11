"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  Cloud, 
  Search, 
  Bell, 
  HelpCircle, 
  Globe, 
  ChevronRight, 
  Menu, 
  LogOut, 
  Database, 
  Activity, 
  GitMerge, 
  ShieldAlert, 
  FileText, 
  User, 
  ChevronDown,
  Sun,
  Moon
} from "lucide-react";
import { getAuthToken, clearAuthToken, api } from "@/utils/api";
import { useNotifications } from "@/utils/NotificationContext";

interface ConsoleLayoutProps {
  children: React.ReactNode;
}

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { showNotification } = useNotifications();

  // Theme State
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDark = localStorage.getItem("aws_dark_mode") === "true";
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add("dark-mode");
      } else {
        document.documentElement.classList.remove("dark-mode");
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    localStorage.setItem("aws_dark_mode", String(nextDark));
    if (nextDark) {
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
    }
  };

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is on an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.isContentEditable
      ) {
        if (e.key === "Escape") {
          target.blur();
        }
        return;
      }

      // Escape close drawers
      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("aws_close_drawers"));
      }

      // Ctrl + / focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector(".aws-search-input") as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // Shift + D toggle dark mode
      if (e.shiftKey && e.key.toUpperCase() === "D") {
        e.preventDefault();
        toggleDarkMode();
      }

      // Shift + H go to dashboard
      if (e.shiftKey && e.key.toUpperCase() === "H") {
        e.preventDefault();
        router.push("/dashboard");
      }

      // Shift + Z go to hosted zones
      if (e.shiftKey && e.key.toUpperCase() === "Z") {
        e.preventDefault();
        router.push("/hosted-zones");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [darkMode, router]);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [username, setUsername] = useState<string>("");

  // Input states for Login/Register forms
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [loginUser, setLoginUser] = useState<string>("admin");
  const [loginPass, setLoginPass] = useState<string>("admin");
  const [formError, setFormError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Profile dropdown menu visibility
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  // Verify token on mount / path change
  useEffect(() => {
    async function checkAuth() {
      const token = getAuthToken();
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        const user = await api.me();
        setIsAuthenticated(true);
        setUsername(user.username);
      } catch (err) {
        // Token invalid or expired
        clearAuthToken();
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [pathname]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUser.trim() || !loginPass.trim()) {
      setFormError("All fields are required.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      await api.login(loginUser, loginPass);
      showNotification("success", "Sign-in successful", `Logged in as ${loginUser}`);
      setIsAuthenticated(true);
      setUsername(loginUser);
      router.push("/hosted-zones");
    } catch (err: any) {
      setFormError(err.message || "Failed to sign in. Verify credentials.");
      showNotification("error", "Sign-in failed", err.message || "Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUser.trim() || !loginPass.trim()) {
      setFormError("All fields are required.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      await api.register(loginUser, loginPass);
      showNotification("success", "Registration successful", "You can now sign in with your credentials.");
      setIsLoginMode(true);
      setFormError("");
    } catch (err: any) {
      setFormError(err.message || "Registration failed. Try a different username.");
      showNotification("error", "Registration failed", err.message || "Username may be taken");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    setUsername("");
    setShowProfileMenu(false);
    showNotification("info", "Signed out", "You have successfully signed out of the AWS Console.");
    router.push("/");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f1f3f4" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            border: "4px solid rgba(0, 0, 0, 0.1)",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            borderLeftColor: "#0972ec",
            animation: "spin 1s linear infinite",
            margin: "0 auto 10px auto"
          }}></div>
          <span style={{ fontSize: "14px", fontStyle: "italic", color: "#545b64" }}>Loading AWS Console...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Not authenticated? Show the custom AWS Login Interface
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="aws-logo-text" style={{ fontSize: "24px", justifyContent: "center", marginBottom: "20px" }}>
            <Cloud size={28} /> AWS Route53 <span className="aws-logo-tag">Clone</span>
          </div>

          <h2 className="login-title">{isLoginMode ? "Sign in to AWS Console" : "Create AWS Account"}</h2>
          <p className="login-subtitle">
            {isLoginMode 
              ? "Use admin / admin to access, or create a development account." 
              : "Register credentials to provision Hosted Zones."}
          </p>

          {formError && (
            <div className="aws-alert aws-alert-danger" style={{ marginBottom: "18px", padding: "8px 12px" }}>
              <ShieldAlert size={16} />
              <span style={{ fontSize: "12px" }}>{formError}</span>
            </div>
          )}

          <form onSubmit={isLoginMode ? handleLogin : handleRegister}>
            <div className="aws-form-group">
              <label className="aws-label">Username</label>
              <input 
                type="text" 
                className="aws-input" 
                value={loginUser} 
                onChange={(e) => setLoginUser(e.target.value)} 
                placeholder="Enter username"
                required
              />
            </div>
            
            <div className="aws-form-group">
              <label className="aws-label">Password</label>
              <input 
                type="password" 
                className="aws-input" 
                value={loginPass} 
                onChange={(e) => setLoginPass(e.target.value)} 
                placeholder="Enter password"
                required
              />
            </div>

            <button 
              type="submit" 
              className="aws-btn aws-btn-primary" 
              style={{ width: "100%", marginTop: "10px", padding: "10px" }}
              disabled={submitting}
            >
              {submitting ? "Signing in..." : isLoginMode ? "Sign In" : "Register"}
            </button>
          </form>

          <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
            <button 
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setFormError("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#0972ec",
                cursor: "pointer",
                fontSize: "13px",
                textDecoration: "underline"
              }}
            >
              {isLoginMode ? "Create a new mock account" : "Back to Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Console Wrapper
  const menuItems = [
    { name: "Dashboard", icon: Cloud, path: "/dashboard" },
    { name: "Hosted zones", icon: Database, path: "/hosted-zones" },
    { name: "Health checks", icon: Activity, path: "/health-checks" },
    { name: "Traffic policies", icon: GitMerge, path: "/traffic-policies" },
    { name: "Resolver", icon: GitMerge, path: "/resolver" },
    { name: "Profiles", icon: GitMerge, path: "/profiles" },
  ];

  return (
    <div>
      {/* Top Navbar */}
      <header className="aws-header">
        <div className="aws-header-left">
          <div className="aws-logo-text" onClick={() => router.push("/hosted-zones")} style={{ cursor: "pointer" }}>
            <Cloud size={20} />
            <span>Route 53</span>
            <span className="aws-logo-tag">Console</span>
          </div>
          
          <div className="aws-search-container">
            <Search size={14} className="aws-table-search-icon" style={{ color: "#aab7c4", left: "12px" }} />
            <input type="text" className="aws-search-input" placeholder="Search services, records, features..." />
          </div>
        </div>

        <div className="aws-header-right">
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#aab7c4" }}>
            <Globe size={14} />
            <span>Global</span>
          </div>

          <button 
            type="button" 
            className="aws-header-icon-btn" 
            onClick={toggleDarkMode}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button className="aws-header-icon-btn">
            <Bell size={16} />
          </button>

          <button className="aws-header-icon-btn">
            <HelpCircle size={16} />
          </button>
          
          {/* User profile with logout menu */}
          <div style={{ position: "relative" }}>
            <div className="aws-user-profile" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <User size={14} />
              <span>{username}</span>
              <ChevronDown size={12} />
            </div>

            {showProfileMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "35px",
                  right: 0,
                  backgroundColor: "#ffffff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  border: "1px solid #d5dbdb",
                  borderRadius: "4px",
                  width: "160px",
                  zIndex: 2000,
                  padding: "4px 0",
                }}
              >
                <div style={{ padding: "8px 12px", fontSize: "11px", color: "#879596", borderBottom: "1px solid #eaeded" }}>
                  AWS Account: Mock-1234
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    border: "none",
                    background: "none",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: "13px",
                    textAlign: "left",
                    color: "#d13212"
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="aws-container">
        {/* Navigation Sidebar */}
        <aside className="aws-sidebar">
          <div className="aws-sidebar-title">Route 53</div>
          <ul className="aws-sidebar-menu">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              // Check if actual path starts with or matches
              // Dashboard handles root or /dashboard
              const isActive = pathname === item.path || (item.path === "/hosted-zones" && pathname.startsWith("/hosted-zones")) || (item.path === "/dashboard" && pathname === "/");
              
              return (
                <li key={item.name} className="aws-sidebar-item">
                  <a
                    onClick={() => router.push(item.path)}
                    className={`aws-sidebar-link ${isActive ? "active" : ""}`}
                  >
                    <IconComponent size={16} />
                    <span>{item.name}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Client views window */}
        <main className="aws-main">{children}</main>
      </div>
    </div>
  );
}
