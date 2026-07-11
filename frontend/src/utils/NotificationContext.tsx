"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextProps {
  notifications: Toast[];
  showNotification: (type: ToastType, title: string, message?: string, duration?: number) => void;
  dismissNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Toast[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (type: ToastType, title: string, message?: string, duration = 5000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, type, title, message, duration };
      
      setNotifications((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissNotification(id);
        }, duration);
      }
    },
    [dismissNotification]
  );

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, dismissNotification }}>
      {children}
      
      {/* Toast elements rendering wrapper */}
      <div className="toasts-container">
        {notifications.map((toast) => {
          let alertClass = "aws-alert-info";
          let Icon = Info;
          if (toast.type === "success") {
            alertClass = "aws-alert-success";
            Icon = CheckCircle;
          } else if (toast.type === "error") {
            alertClass = "aws-alert-danger";
            Icon = AlertCircle;
          } else if (toast.type === "warning") {
            alertClass = "aws-alert-warning";
            Icon = AlertCircle;
          }

          return (
            <div
              key={toast.id}
              className={`aws-alert ${alertClass}`}
              style={{
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                width: "350px",
                display: "grid",
                gridTemplateColumns: "24px 1fr 20px",
                alignItems: "start",
                pointerEvents: "auto",
              }}
            >
              <Icon size={18} style={{ marginTop: "2px" }} />
              <div>
                <strong style={{ fontSize: "14px", display: "block" }}>{toast.title}</strong>
                {toast.message && (
                  <p style={{ fontSize: "12px", marginTop: "4px", opacity: 0.9 }}>
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismissNotification(toast.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
