import React, { useState, useEffect } from "react";
import { Activity, RefreshCw, Upload, FileText } from "lucide-react";
import toast from "react-hot-toast";
import {
  getScanHistory,
  uploadSwagger,
  scanEndpoints,
  runDemoScan,
} from "../utils/api";

export default function Monitoring() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [endpointText, setEndpointText] = useState("");
  const [tab, setTab] = useState("history");

  const load = async () => {
    setLoading(true);
    try {
      const res = await getScanHistory();
      setHistory(res.data.data);
    } catch {
      toast.error("Failed to load scan history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    toast("Parsing Swagger file…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadSwagger(fd);
      toast.success(
        `Swagger scan complete — ${res.data.total} APIs found, ${res.data.zombiesFound} zombies`,
      );
      load();
    } catch {
      toast.error("Swagger parse failed");
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  };

  const handleEndpointScan = async () => {
    if (!endpointText.trim()) {
      toast.error("Paste some endpoints first");
      return;
    }
    setScanning(true);
    toast("Scanning endpoints…");
    try {
      const res = await scanEndpoints(endpointText);
      toast.success(`Scan complete — ${res.data.total} APIs processed`);
      setEndpointText("");
      load();
    } catch {
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const integrations = [
    {
      name: "GitHub Actions",
      desc: "Scan on every PR — add zombieguard-action to your workflow",
      ok: true,
    },
    {
      name: "GitLab CI",
      desc: "POST /api/scan/swagger in your .gitlab-ci.yml pipeline stage",
      ok: true,
    },
    {
      name: "Prometheus",
      desc: "Scrape /metrics endpoint for risk score gauges",
      ok: true,
    },
    {
      name: "ELK Stack",
      desc: "Configure Logstash to consume ZombieGuard alert logs",
      ok: false,
    },
    {
      name: "Jenkins",
      desc: "Add a shell step: curl -X POST $ZOMBIEGUARD_URL/api/scan/swagger",
      ok: false,
    },
    {
      name: "AWS Security Hub",
      desc: "Forward critical findings via webhook to Security Hub",
      ok: false,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Monitoring & Scanning</div>
          <div className="page-sub">
            Continuous API discovery, CI/CD integration, scan history
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Scan Input Tabs */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              gap: 0,
              marginBottom: 16,
              borderBottom: "1px solid var(--border)",
            }}
          >
            {[
              { id: "history", label: "Scan History" },
              { id: "swagger", label: "Upload Swagger" },
              { id: "paste", label: "Paste Endpoints" },
              { id: "demo", label: "Run Demo Scan" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  cursor: "pointer",
                  border: "none",
                  borderBottom:
                    tab === t.id
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                  background: "none",
                  color: tab === t.id ? "var(--text)" : "var(--text3)",
                  fontWeight: tab === t.id ? 500 : 400,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "history" &&
            (loading ? (
              <div className="loading-wrap">
                <div className="spinner" />
              </div>
            ) : history.length === 0 ? (
              <div className="empty-state">
                <Activity size={32} />
                <p style={{ marginTop: 12 }}>No scans yet</p>
              </div>
            ) : (
              <div
                className="table-wrap"
                style={{ border: "none", borderRadius: 0 }}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Scan ID</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>APIs found</th>
                      <th>Zombies</th>
                      <th>Duration</th>
                      <th>Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((s) => (
                      <tr key={s._id}>
                        <td
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            color: "var(--text3)",
                          }}
                        >
                          {s.scanId?.slice(0, 8)}…
                        </td>
                        <td>
                          <span className="tag">{s.type}</span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background:
                                s.status === "completed"
                                  ? "var(--success-bg)"
                                  : s.status === "failed"
                                    ? "var(--danger-bg)"
                                    : "var(--info-bg)",
                              color:
                                s.status === "completed"
                                  ? "var(--success)"
                                  : s.status === "failed"
                                    ? "var(--danger)"
                                    : "var(--info)",
                            }}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td>{s.results?.totalFound || 0}</td>
                        <td
                          style={{
                            color:
                              s.results?.zombiesFound > 0
                                ? "var(--zombie)"
                                : "var(--text)",
                          }}
                        >
                          {s.results?.zombiesFound || 0}
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text3)" }}>
                          {s.duration
                            ? `${(s.duration / 1000).toFixed(1)}s`
                            : "—"}
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text3)" }}>
                          {new Date(s.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {tab === "swagger" && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Upload
                size={32}
                style={{ color: "var(--text3)", marginBottom: 12 }}
              />
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                Upload OpenAPI / Swagger file
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text3)",
                  marginBottom: 20,
                }}
              >
                Supports JSON and YAML — Swagger 2.0 and OpenAPI 3.x
              </div>
              <label style={{ cursor: "pointer" }}>
                <input
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                  disabled={scanning}
                />
                <span className="btn btn-primary">
                  <FileText size={14} />{" "}
                  {scanning ? "Scanning…" : "Choose File"}
                </span>
              </label>
            </div>
          )}

          {tab === "paste" && (
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text2)",
                  marginBottom: 10,
                }}
              >
                Paste endpoints one per line. Format:{" "}
                <code
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    background: "var(--bg3)",
                    padding: "1px 6px",
                    borderRadius: 4,
                  }}
                >
                  GET /api/users
                </code>{" "}
                or just{" "}
                <code
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    background: "var(--bg3)",
                    padding: "1px 6px",
                    borderRadius: 4,
                  }}
                >
                  /api/users
                </code>
              </div>
              <textarea
                rows={8}
                value={endpointText}
                onChange={(e) => setEndpointText(e.target.value)}
                placeholder={
                  "GET /api/v1/users\nPOST /api/v1/payments/transfer\n/api/legacy/auth\nDELETE /api/admin/users"
                }
                style={{
                  marginBottom: 12,
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                }}
              />
              <button
                className="btn btn-primary"
                onClick={handleEndpointScan}
                disabled={scanning}
              >
                <Activity size={14} />{" "}
                {scanning ? "Scanning…" : "Scan Endpoints"}
              </button>
            </div>
          )}

          {tab === "demo" && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                Load realistic banking API dataset
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text3)",
                  marginBottom: 20,
                  maxWidth: 400,
                  margin: "0 auto 20px",
                }}
              >
                Populates the system with ~14 sample APIs including active
                endpoints, deprecated routes, and zombie APIs across payments,
                auth, accounts, and loans services.
              </div>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  setScanning(true);
                  try {
                    const res = await runDemoScan();
                    toast.success(
                      `Demo data loaded — ${res.data.total} APIs, ${res.data.zombiesFound} zombies detected`,
                    );
                    setTab("history");
                    load();
                  } catch {
                    toast.error("Demo scan failed");
                  } finally {
                    setScanning(false);
                  }
                }}
                disabled={scanning}
              >
                {scanning ? "Loading…" : "Load Demo Banking APIs"}
              </button>
            </div>
          )}
        </div>

        {/* DevSecOps integrations */}
        <div className="card">
          <div className="card-title">DevSecOps Pipeline Integrations</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
              gap: 12,
            }}
          >
            {integrations.map((i) => (
              <div
                key={i.name}
                style={{
                  padding: "14px",
                  background: "var(--bg3)",
                  borderRadius: 8,
                  border: `1px solid ${i.ok ? "rgba(16,185,129,0.2)" : "var(--border)"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{i.name}</div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: i.ok ? "var(--success)" : "var(--text3)",
                    }}
                  >
                    {i.ok ? "● Active" : "○ Setup"}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    lineHeight: 1.5,
                  }}
                >
                  {i.desc}
                </div>
              </div>
            ))}
          </div>

          {/* CI/CD snippet */}
          <div
            style={{
              marginTop: 20,
              padding: "14px",
              background: "var(--bg)",
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text3)",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              GitHub Actions example — add to .github/workflows/api-scan.yml
            </div>
            <pre
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--accent2)",
                overflowX: "auto",
                lineHeight: 1.6,
              }}
            >
              {`name: ZombieGuard API Scan
on: [push, pull_request]
jobs:
  api-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Upload Swagger to ZombieGuard
        run: |
          curl -X POST \\
            -F "file=@swagger.yaml" \\
            $\{{ secrets.ZOMBIEGUARD_URL }}/api/scan/swagger`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
