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
  AlertTriangle,
  Shield,
  Database,
  Zap,
  RefreshCw,
  Play,
  Activity,
  Lock,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { getDashboardStats, runDemoScan } from "../utils/api";

const PIE_C = {
  active: "#16a34a",
  deprecated: "#ca8a04",
  orphaned: "#2563eb",
  zombie: "#ea580c",
  quarantined: "#7c3aed",
};
const BAR_C = ["#d97706", "#16a34a", "#ea580c", "#2563eb", "#7c3aed"];

/* Custom tooltip */
const Tip = memo(({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#1c1917",
        border: "1px solid #44403c",
        borderRadius: 8,
        padding: "8px 13px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        pointerEvents: "none",
      }}
    >
      {label && (
        <div
          style={{
            color: "#78716c",
            fontSize: 10,
            marginBottom: 5,
            fontFamily: "DM Mono,monospace",
          }}
        >
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
              width: 7,
              height: 7,
              borderRadius: 2,
              background: p.color || p.payload?.color,
              display: "inline-block",
            }}
          />
          {p.name && (
            <span style={{ color: "#a8a29e", fontSize: 11 }}>{p.name}:</span>
          )}
          <span style={{ color: "#fafaf9", fontSize: 14, fontWeight: 700 }}>
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
});

/* Recent activity feed — static for now */
const FEED = [
  {
    color: "#ea580c",
    text: (
      <>
        <strong>/api/legacy/auth</strong> classified as Zombie API
      </>
    ),
    time: "2m ago",
  },
  {
    color: "#d97706",
    text: (
      <>
        <strong>/internal/diag/ping</strong> — no owner assigned
      </>
    ),
    time: "14m ago",
  },
  {
    color: "#16a34a",
    text: <>3 deprecated APIs decommissioned via workflow</>,
    time: "1h ago",
  },
  {
    color: "#7c3aed",
    text: <>OWASP scan completed — 6 violations found</>,
    time: "2h ago",
  },
  {
    color: "#2563eb",
    text: <>Swagger import: 8 new endpoints registered</>,
    time: "3h ago",
  },
];

const HEALTH = [
  { name: "Scanner engine", val: "Active", ok: true },
  { name: "API Gateway", val: "Connected", ok: true },
  { name: "MongoDB", val: "Connected", ok: true },
  { name: "Alert engine", val: "Running", ok: true },
  { name: "ELK Stack", val: "Not configured", ok: false },
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
      toast.error("Cannot reach backend — run npm run dev in /backend");
    } finally {
      setLoading(false);
    }
  }, [onCountsLoad]);

  const runDemo = useCallback(async () => {
    setScanning(true);
    toast("Loading demo dataset…");
    try {
      const r = await runDemoScan();
      toast.success(
        `${r.data.total} APIs found · ${r.data.zombiesFound} zombies`,
      );
      load();
    } catch {
      toast.error("Scan failed");
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

  const c = stats?.counts || {};
  const r = stats?.risk || {};
  const al = stats?.alerts || {};
  const total = c.total || 0;

  const pieData = [
    { name: "Active", value: c.active || 0, color: PIE_C.active },
    { name: "Deprecated", value: c.deprecated || 0, color: PIE_C.deprecated },
    { name: "Orphaned", value: c.orphaned || 0, color: PIE_C.orphaned },
    { name: "Zombie", value: c.zombie || 0, color: PIE_C.zombie },
    {
      name: "Quarantined",
      value: c.quarantined || 0,
      color: PIE_C.quarantined,
    },
  ].filter((d) => d.value > 0);

  const authData = (stats?.authBreakdown || []).map((a) => ({
    name: a._id || "None",
    count: a.count,
  }));

  return (
    <div>
      {/* ── Sticky topbar ── */}
      <div className="topbar">
        <div style={{ flex: 1 }}>
          <div className="topbar-title">Dashboard</div>
          <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 1 }}>
            Home › Dashboard
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <RefreshCw size={12} />
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

      {/* ── Hero banner — badge + title + description + CTAs + rings ── */}
      <div className="hero-section">
        <div className="hero-inner">
          {/* Left: content */}
          <div className="hero-left">
            {/* Badge chip */}
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Zombie API Discovery &amp; Defence
            </div>

            {/* Big title */}
            <div className="hero-name">
              Oblivion<span className="hero-dot">.</span>
            </div>

            {/* Description */}
            <p className="hero-lead">
              An automated platform that continuously scans the bank's network
              infrastructure, API gateways, and deployment environments to
              discover <strong>undocumented</strong>, <strong>shadow</strong>,
              and <em>zombie APIs</em>. It classifies each API's security
              posture, provides actionable recommendations, and supports
              automated decommissioning with full audit trails for{" "}
              <strong>RBI &amp; PCI-DSS compliance</strong>.
            </p>

            {/* Three CTA buttons */}
            <div className="hero-cta">
              <button
                className="hero-btn-primary"
                onClick={() => navigate("/inventory")}
              >
                <Eye size={14} /> View API Inventory
              </button>
              <button
                className="hero-btn-outline"
                onClick={() => navigate("/monitoring")}
              >
                <Activity size={14} /> Live Monitoring
              </button>
              <button
                className="hero-btn-outline"
                onClick={() => navigate("/security")}
              >
                <Shield size={14} /> Compliance Reports
              </button>
            </div>
          </div>

          {/* Right: decorative concentric rings with threat dots */}
          <div className="hero-graphic">
            {/* Rings at 160, 120, 80px */}
            {[160, 120, 80].map((s, i) => (
              <div
                key={i}
                className="hero-ring"
                style={{
                  width: s,
                  height: s,
                  top: `calc(50% - ${s / 2}px)`,
                  left: `calc(50% - ${s / 2}px)`,
                }}
              />
            ))}
            {/* Center shield icon */}
            <div className="hero-ring-center">⚡</div>
            {/* Floating threat dots — different positions from reference */}
            <div
              className="hero-ring-dot"
              style={{
                width: 10,
                height: 10,
                top: "18%",
                left: "72%",
                color: "#ea580c",
                background: "#ea580c",
              }}
            />
            <div
              className="hero-ring-dot"
              style={{
                width: 8,
                height: 8,
                top: "66%",
                left: "12%",
                color: "#7c3aed",
                background: "#7c3aed",
              }}
            />
            <div
              className="hero-ring-dot"
              style={{
                width: 9,
                height: 9,
                top: "80%",
                left: "70%",
                color: "#16a34a",
                background: "#16a34a",
              }}
            />
            <div
              className="hero-ring-dot"
              style={{
                width: 7,
                height: 7,
                top: "30%",
                left: "20%",
                color: "#d97706",
                background: "#d97706",
              }}
            />
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* ── Empty notice ── */}
        {total === 0 && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: 20,
              borderRadius: 8,
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              fontSize: 13,
              color: "#92400e",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span>⚡</span>
            <span>
              <strong>No data yet.</strong> Click "Load Demo" to populate with
              realistic banking API data.
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={runDemo}
              style={{ marginLeft: "auto", flexShrink: 0 }}
            >
              Load Demo
            </button>
          </div>
        )}

        {/* ── KPI bar — flat, borderless row of numbers ── */}
        <div className="kpi-bar">
          <div className="kpi-item">
            <div className="kpi-num amber">{total}</div>
            <div className="kpi-label">TOTAL APIS</div>
            <div className="kpi-sub">All environments</div>
          </div>
          <div className="kpi-item">
            <div className="kpi-num orange">{c.zombie || 0}</div>
            <div className="kpi-label">ZOMBIE APIs</div>
            <div className="kpi-sub bad">
              {(c.zombie || 0) > 0 ? "Action required" : "All clear"}
            </div>
          </div>
          <div className="kpi-item">
            <div className="kpi-num red">{r.criticalRisk || 0}</div>
            <div className="kpi-label">CRITICAL RISK</div>
            <div className="kpi-sub">Score ≥ 75/100</div>
          </div>
          <div className="kpi-item">
            <div className="kpi-num" style={{ color: "var(--ink)" }}>
              {r.avgRiskScore || 0}
            </div>
            <div className="kpi-label">AVG RISK SCORE</div>
            <div className="kpi-sub">/100 across all APIs</div>
          </div>
          <div className="kpi-item">
            <div className="kpi-num purple">{al.unresolved || 0}</div>
            <div className="kpi-label">OPEN ALERTS</div>
            <div className="kpi-sub bad">{al.critical || 0} critical</div>
          </div>
          <div className="kpi-item">
            <div className="kpi-num green">{c.quarantined || 0}</div>
            <div className="kpi-label">QUARANTINED</div>
            <div className="kpi-sub good">Shut down</div>
          </div>
        </div>

        {/* ── Row 1: Classification + Threat breakdown ── */}
        <div className="twin">
          {/* Pie */}
          <div className="panel amber-accent">
            <div className="panel-title">API Classification</div>
            {pieData.length > 0 ? (
              <div className="pie-wrap">
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx={60}
                      cy={60}
                      innerRadius={36}
                      outerRadius={58}
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
                <div className="pie-legend">
                  {pieData.map((d) => (
                    <div key={d.name} className="pie-legend-row">
                      <span
                        className="pie-dot"
                        style={{ background: d.color }}
                      />
                      <span className="pie-name">{d.name}</span>
                      <span className="pie-count">{d.value}</span>
                      <span className="pie-pct">
                        {total ? Math.round((d.value / total) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "30px 0" }}>
                <p>Run a scan first</p>
              </div>
            )}
          </div>

          {/* Threat count breakdown */}
          <div className="panel red-accent">
            <div className="panel-title">Threat Breakdown</div>
            <div className="threat-list">
              {[
                {
                  icon: "👻",
                  bg: "#fef2f2",
                  label: "Shadow APIs",
                  count: c.orphaned || 0,
                  color: "#dc2626",
                },
                {
                  icon: "🧟",
                  bg: "#fff7ed",
                  label: "Zombie APIs",
                  count: c.zombie || 0,
                  color: "#ea580c",
                },
                {
                  icon: "🕰️",
                  bg: "#fefce8",
                  label: "Stale / Deprecated",
                  count: c.deprecated || 0,
                  color: "#ca8a04",
                },
                {
                  icon: "🛡️",
                  bg: "#f0fdf4",
                  label: "Active & Secure",
                  count: c.active || 0,
                  color: "#16a34a",
                },
              ].map((t) => (
                <div key={t.label} className="threat-row">
                  <div className="threat-icon" style={{ background: t.bg }}>
                    {t.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="threat-name">{t.label}</div>
                  </div>
                  <div>
                    <div className="threat-count" style={{ color: t.color }}>
                      {t.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 2: Auth chart + Risk matrix ── */}
        {authData.length > 0 && (
          <div className="twin">
            <div className="panel teal-accent">
              <div className="panel-title">Authentication Methods</div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart
                  data={authData}
                  barSize={24}
                  margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: "#a8a29e",
                      fontSize: 10,
                      fontFamily: "DM Mono,monospace",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    content={<Tip />}
                    cursor={{ fill: "rgba(217,119,6,0.04)" }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} name="APIs">
                    {authData.map((_, i) => (
                      <Cell key={i} fill={BAR_C[i % BAR_C.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel orange-accent">
              <div className="panel-title">Risk Distribution</div>
              <div className="risk-grid">
                {[
                  {
                    label: "CRITICAL",
                    val: r.criticalRisk || 0,
                    color: "#dc2626",
                  },
                  { label: "HIGH", val: r.highRisk || 0, color: "#ea580c" },
                  {
                    label: "MEDIUM",
                    val: Math.max(
                      0,
                      total -
                        (r.criticalRisk || 0) -
                        (r.highRisk || 0) -
                        (c.active || 0),
                    ),
                    color: "#ca8a04",
                  },
                  { label: "LOW", val: c.active || 0, color: "#16a34a" },
                ].map((x) => (
                  <div key={x.label} className="risk-cell">
                    <div className="risk-cell-num" style={{ color: x.color }}>
                      {x.val}
                    </div>
                    <div className="risk-cell-label">{x.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Row 3: Capabilities + Health ── */}
        <div className="twin">
          <div className="panel green-accent">
            <div className="panel-title">Platform Capabilities</div>
            <div className="cap-strip">
              {[
                {
                  g: "📡",
                  t: "Continuous Network Scanning",
                  d: "Scans gateways, repos and CI/CD environments in real-time",
                },
                {
                  g: "🧟",
                  t: "Zombie API Detection",
                  d: "Flags stale endpoints that remain live with no active callers",
                },
                {
                  g: "🔐",
                  t: "Security Posture Analysis",
                  d: "OWASP Top 10 + RBI/PCI-DSS compliance evaluation per endpoint",
                },
                {
                  g: "⚡",
                  t: "Automated Decommissioning",
                  d: "One-click quarantine with Jira, Slack and email notifications",
                },
              ].map((x) => (
                <div key={x.t} className="cap-row">
                  <div className="cap-glyph">{x.g}</div>
                  <div>
                    <div className="cap-row-title">{x.t}</div>
                    <div className="cap-row-desc">{x.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel purple-accent">
            <div className="panel-title">System Health</div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 600,
                color: "#16a34a",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "3px 10px",
                borderRadius: 20,
                marginBottom: 14,
                fontFamily: "DM Mono,monospace",
              }}
            >
              ● Operational
            </div>
            <div className="health-strip">
              {HEALTH.map((h) => (
                <div key={h.name} className="health-row">
                  <div
                    className="health-dot"
                    style={{ background: h.ok ? "#86efac" : "#fcd34d" }}
                  />
                  <span className="health-name">{h.name}</span>
                  <span className={`health-val ${h.ok ? "ok" : "warn"}`}>
                    {h.val}
                  </span>
                </div>
              ))}
            </div>

            {/* Recent alerts — minimal */}
            {(al.recent || []).length > 0 && (
              <>
                <div className="divider" />
                <div className="panel-title" style={{ marginBottom: 8 }}>
                  Recent Alerts
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate("/zombies")}
                  >
                    View →
                  </button>
                </div>
                {al.recent.slice(0, 3).map((a) => (
                  <div
                    key={a._id}
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: "6px 0",
                      borderBottom: "1px solid var(--line)",
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        color:
                          a.severity === "critical"
                            ? "var(--red)"
                            : "var(--yellow)",
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    >
                      <AlertTriangle size={12} />
                    </span>
                    <span style={{ flex: 1, color: "var(--ink2)" }}>
                      {a.message}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Activity feed ── */}
        <div className="panel" style={{ borderLeft: "3px solid var(--amber)" }}>
          <div className="panel-title">Recent Activity</div>
          <div>
            {FEED.map((f, i) => (
              <div key={i} className="feed-item">
                <div className="feed-dot" style={{ background: f.color }} />
                <div className="feed-text">{f.text}</div>
                <div className="feed-time">{f.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Source breakdown ── */}
        {(stats?.sourceBreakdown || []).length > 0 && (
          <div
            className="panel"
            style={{ borderLeft: "3px solid var(--line2)", marginTop: 20 }}
          >
            <div className="panel-title">Discovery Sources</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
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
