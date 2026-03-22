import React, { useState, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Shield,
  Database,
  Zap,
  RefreshCw,
  Play,
  AlertTriangle,
  Activity,
  Eye,
  FileText,
  Wifi,
  Lock,
  GitBranch,
  Server,
  CheckCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getDashboardStats,
  getDashboardTrends,
  runDemoScan,
} from "../utils/api";

const PIE_C = {
  active: "#059669",
  deprecated: "#d97706",
  orphaned: "#0284c7",
  zombie: "#ea580c",
  quarantined: "#7c3aed",
};
const BAR_C = ["#0d9488", "#059669", "#ea580c", "#0284c7", "#7c3aed"];

/* Custom tooltip — always dark panel, always readable */
const Tip = memo(({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 9,
        padding: "8px 13px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
        pointerEvents: "none",
      }}
    >
      {label && (
        <div style={{ color: "#64748b", fontSize: 11, marginBottom: 5 }}>
          {label}
        </div>
      )}
      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "2px 0",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: p.name ? 2 : "50%",
              background: p.color || p.payload?.color,
              display: "inline-block",
            }}
          />
          {p.name && (
            <span style={{ color: "#94a3b8", fontSize: 12 }}>{p.name}:</span>
          )}
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
});

/* Platform capabilities list */
const CAPS = [
  {
    icon: "📡",
    bg: "#eff6ff",
    title: "Continuous Network Scanning",
    desc: "Scans API gateways, code repositories, and deployment environments in real-time",
  },
  {
    icon: "🧟",
    bg: "#fff7ed",
    title: "Zombie API Detection",
    desc: "Identifies stale, unused APIs that remain live and pose hidden security risks",
  },
  {
    icon: "🔐",
    bg: "#ecfdf5",
    title: "Security Posture Analysis",
    desc: "Evaluates auth, encryption, rate limiting and checks OWASP API Top 10 compliance",
  },
  {
    icon: "⚡",
    bg: "#faf5ff",
    title: "Automated Decommissioning",
    desc: "One-click quarantine with Jira, Slack and email workflows for team coordination",
  },
];

/* System health items */
const HEALTH = [
  { name: "Scanner", status: "Active", ok: true },
  { name: "API Gateway", status: "Connected", ok: true },
  { name: "MongoDB", status: "Connected", ok: true },
  { name: "Alert Engine", status: "Running", ok: true },
  { name: "ELK Stack", status: "Config needed", ok: false },
];

export default function Dashboard({ onCountsLoad }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const s = await getDashboardStats();
      setStats(s.data.data);
      onCountsLoad?.(s.data.data?.counts || {});
    } catch {
      toast.error(
        "Cannot reach backend — run npm run dev in the backend folder.",
      );
    } finally {
      setLoading(false);
    }
  }, [onCountsLoad]);

  const runDemo = useCallback(async () => {
    setScanning(true);
    toast("Loading demo dataset…");
    try {
      const res = await runDemoScan();
      toast.success(
        `Found ${res.data.total} APIs · ${res.data.zombiesFound} zombies`,
      );
      load();
    } catch {
      toast.error("Scan failed — check backend console.");
    } finally {
      setScanning(false);
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="loading-wrap">
        <div className="spinner" />
      </div>
    );

  const counts = stats?.counts || {};
  const risk = stats?.risk || {};
  const alerts = stats?.alerts || {};
  const total = counts.total || 0;

  const pieData = [
    { name: "Active", value: counts.active || 0, color: PIE_C.active },
    {
      name: "Deprecated",
      value: counts.deprecated || 0,
      color: PIE_C.deprecated,
    },
    { name: "Orphaned", value: counts.orphaned || 0, color: PIE_C.orphaned },
    { name: "Zombie", value: counts.zombie || 0, color: PIE_C.zombie },
    {
      name: "Quarantined",
      value: counts.quarantined || 0,
      color: PIE_C.quarantined,
    },
  ].filter((d) => d.value > 0);

  const authData = (stats?.authBreakdown || []).map((a) => ({
    name: a._id || "None",
    count: a.count,
  }));

  /* Stat row items */
  const STATS = [
    {
      icon: "📦",
      bg: "#f0fdf4",
      num: total,
      label: "Total APIs",
      numColor: "#0d9488",
    },
    {
      icon: "👻",
      bg: "#fef3f2",
      num: counts.orphaned || 0,
      label: "Shadow",
      numColor: "#dc2626",
    },
    {
      icon: "🧟",
      bg: "#fff7ed",
      num: counts.zombie || 0,
      label: "Zombie",
      numColor: "#ea580c",
    },
    {
      icon: "🕰️",
      bg: "#fffbeb",
      num: counts.deprecated || 0,
      label: "Stale",
      numColor: "#d97706",
    },
    {
      icon: "🛡️",
      bg: "#ecfdf5",
      num: counts.quarantined || 0,
      label: "Secure",
      numColor: "#059669",
    },
    {
      icon: "🎯",
      bg: "#f5f3ff",
      num: 0,
      label: "Honeypots",
      numColor: "#7c3aed",
    },
  ];

  return (
    <div>
      {/* ── Breadcrumb topbar ── */}
      <div className="topbar">
        <span className="topbar-crumb">Home</span>
        <span className="topbar-sep">›</span>
        <span className="topbar-page">Dashboard</span>
        <div className="topbar-right">
          <button className="btn btn-sm" onClick={load}>
            <RefreshCw size={12} /> Refresh
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={runDemo}
            disabled={scanning}
          >
            {total === 0 ? (
              <>
                <Play size={12} />
                {scanning ? "Scanning…" : "Load Demo"}
              </>
            ) : (
              <>
                <Zap size={12} />
                {scanning ? "Scanning…" : "Re-scan"}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── Hero banner ── */}
        <div className="hero">
          <div>
            <div className="hero-badge">
              <Shield size={13} />
              Zombie API Discovery &amp; Defence
            </div>
            <div className="hero-title">Oblivion</div>
            <p className="hero-desc">
              An automated platform that continuously scans the bank's network
              infrastructure, API gateways, and deployment environments to
              discover <strong>undocumented</strong>, <strong>shadow</strong>,
              and <em>zombie APIs</em>. It classifies each API's security
              posture, provides actionable recommendations, and supports
              automated decommissioning workflows with full audit trails for{" "}
              <strong>RBI &amp; PCI-DSS compliance</strong>.
            </p>
            <div className="hero-actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate("/inventory")}
              >
                <Eye size={14} /> View API Inventory
              </button>
              <button
                className="btn btn-outline"
                onClick={() => navigate("/monitoring")}
              >
                <Activity size={14} /> Live Monitoring
              </button>
              <button
                className="btn btn-outline"
                onClick={() => navigate("/security")}
              >
                <FileText size={14} /> Compliance Reports
              </button>
            </div>
          </div>

          {/* Decorative radar */}
          <div className="hero-radar">
            {[160, 120, 80].map((s, i) => (
              <div
                key={i}
                className="hero-radar-ring"
                style={{
                  width: s,
                  height: s,
                  top: `calc(50% - ${s / 2}px)`,
                  left: `calc(50% - ${s / 2}px)`,
                }}
              />
            ))}
            <div className="hero-radar-center">
              <Shield size={22} />
            </div>
            <div
              className="hero-radar-dot"
              style={{
                background: "#f97316",
                top: "22%",
                left: "70%",
                width: 10,
                height: 10,
              }}
            />
            <div
              className="hero-radar-dot"
              style={{
                background: "#8b5cf6",
                top: "68%",
                left: "14%",
                width: 8,
                height: 8,
              }}
            />
            <div
              className="hero-radar-dot"
              style={{
                background: "#10b981",
                top: "78%",
                left: "72%",
                width: 9,
                height: 9,
              }}
            />
          </div>
        </div>

        {/* ── Empty notice ── */}
        {total === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              marginBottom: 20,
              background: "#f0fdfa",
              border: "1px solid #99f6e4",
              borderRadius: 10,
              fontSize: 13,
              color: "#0f766e",
            }}
          >
            <Play size={15} />
            <span>
              <strong>No APIs scanned yet.</strong> Click "Load Demo" above to
              populate with realistic banking API data.
            </span>
          </div>
        )}

        {/* ── Stat row ── */}
        <div className="stat-row">
          {STATS.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg }}>
                {s.icon}
              </div>
              <div className="stat-body">
                <div className="stat-num" style={{ color: s.numColor }}>
                  {s.num}
                </div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Platform capabilities + System health ── */}
        <div className="section-row">
          <div className="section-card">
            <div className="section-card-title">
              <Shield size={16} />
              Platform Capabilities
            </div>
            {CAPS.map((c) => (
              <div key={c.title} className="cap-item">
                <div className="cap-icon" style={{ background: c.bg }}>
                  {c.icon}
                </div>
                <div className="cap-body">
                  <strong>{c.title}</strong>
                  <span>{c.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="section-card">
            <div
              className="section-card-title"
              style={{ justifyContent: "space-between" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={16} />
                System Health
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#059669",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  padding: "2px 10px",
                  borderRadius: 20,
                }}
              >
                ● Operational
              </span>
            </div>

            {/* Mini charts */}
            {pieData.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 16,
                  alignItems: "center",
                }}
              >
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx={46}
                      cy={46}
                      innerRadius={28}
                      outerRadius={46}
                      dataKey="value"
                      stroke="none"
                      paddingAngle={2}
                    >
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, fontSize: 11 }}>
                  {pieData.map((d) => (
                    <div
                      key={d.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "2px 0",
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 2,
                          background: d.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1, color: "var(--ink2)" }}>
                        {d.name}
                      </span>
                      <strong style={{ color: "var(--ink)" }}>{d.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Health rows */}
            <div>
              {HEALTH.map((h) => (
                <div key={h.name} className="health-row">
                  <div
                    className="health-dot"
                    style={{ background: h.ok ? "#10b981" : "#f59e0b" }}
                  />
                  <span className="health-name">{h.name}</span>
                  <span className={`health-status ${h.ok ? "ok" : "warn"}`}>
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Auth chart + Alerts ── */}
        {(authData.length > 0 || (alerts.recent || []).length > 0) && (
          <div className="section-row">
            {authData.length > 0 && (
              <div className="section-card">
                <div className="section-card-title">
                  <Lock size={16} />
                  Authentication Coverage
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={authData}
                    barSize={28}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      content={<Tip />}
                      cursor={{ fill: "rgba(13,148,136,0.04)" }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="APIs">
                      {authData.map((_, i) => (
                        <Cell key={i} fill={BAR_C[i % BAR_C.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="section-card">
              <div
                className="section-card-title"
                style={{ justifyContent: "space-between" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={16} /> Recent Alerts
                </span>
                <button
                  className="btn btn-sm"
                  onClick={() => navigate("/zombies")}
                >
                  View all →
                </button>
              </div>
              {(alerts.recent || []).length > 0 ? (
                alerts.recent.map((a) => (
                  <div key={a._id} className={`alert-item alert-${a.severity}`}>
                    <AlertTriangle
                      size={13}
                      style={{
                        flexShrink: 0,
                        marginTop: 2,
                        color:
                          a.severity === "critical"
                            ? "var(--red)"
                            : "var(--amber)",
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="alert-title"
                        style={{
                          color:
                            a.severity === "critical"
                              ? "var(--red)"
                              : "var(--amber)",
                        }}
                      >
                        {a.message}
                      </div>
                      <div className="alert-sub">{a.endpoint}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ padding: "28px 20px" }}>
                  <Shield size={22} />
                  <p style={{ marginTop: 8 }}>No open alerts — all clear</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Source breakdown ── */}
        {(stats?.sourceBreakdown || []).length > 0 && (
          <div className="section-card">
            <div className="section-card-title">
              <Database size={16} /> Discovery Source Breakdown
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
                gap: 10,
              }}
            >
              {stats.sourceBreakdown.map((s, i) => (
                <div key={s._id} className="source-card">
                  <div className="source-label">
                    {(s._id || "unknown").replace(/_/g, " ")}
                  </div>
                  <div className="source-count">{s.count}</div>
                  <div className="progress-track" style={{ marginTop: 8 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${total ? Math.round((s.count / total) * 100) : 0}%`,
                        background: BAR_C[i % BAR_C.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
