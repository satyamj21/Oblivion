import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import { getSecurityPosture, getSecurityViolations } from '../utils/api';

function CheckRow({ label, pass, warn, detail }) {
  const cls = pass === true ? 'ci-pass' : pass === 'warn' ? 'ci-warn' : 'ci-fail';
  const symbol = pass === true ? '✓' : pass === 'warn' ? '!' : '✗';
  return (
    <div className="check-row">
      <div>
        <div style={{fontSize:13}}>{label}</div>
        {detail && <div style={{fontSize:11,color:'var(--text3)',marginTop:1}}>{detail}</div>}
      </div>
      <div className={`check-icon ${cls}`}>{symbol}</div>
    </div>
  );
}

function CoverageBar({ label, pct, color }) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:6}}>
        <span style={{color:'var(--text2)'}}>{label}</span>
        <span style={{fontWeight:600}}>{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{width:`${pct}%`,background:color||'var(--accent)'}} />
      </div>
    </div>
  );
}

export default function SecurityPosture() {
  const [posture, setPosture]      = useState(null);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading]      = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [p, v] = await Promise.all([getSecurityPosture(), getSecurityViolations()]);
      setPosture(p.data.data);
      setViolations(v.data.data);
    } catch { toast.error('Failed to load security data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>;
  if (!posture?.total) return (
    <div>
      <div className="page-header"><div><div className="page-title">Security Posture</div></div></div>
      <div className="page-body"><div className="empty-state"><Shield size={40} /><p style={{marginTop:12}}>No APIs scanned yet — load demo data first.</p></div></div>
    </div>
  );

  const auth = posture.authentication || {};
  const radarData = [
    { subject: 'Auth', value: auth.percentage || 0 },
    { subject: 'HTTPS', value: posture.transport?.percentage || 0 },
    { subject: 'Rate Limit', value: posture.rateLimit?.percentage || 0 },
    { subject: 'CORS', value: posture.cors?.percentage || 0 },
    { subject: 'No PII Leak', value: Math.round(100 - ((posture.dataExposure?.pii||0) / posture.total * 100)) },
  ];

  const owaspData = Object.entries(posture.owaspViolations || {}).map(([k,v]) => ({name: k, count: v}));

  const authByType = auth.byType || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Security Posture</div>
          <div className="page-sub">OWASP API Top 10 · Authentication · Transport · Data exposure</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      <div className="page-body">
        <div className="card-grid-2">
          {/* Radar chart */}
          <div className="card">
            <div className="card-title">Security Coverage Radar</div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="subject" tick={{fill:'var(--text3)',fontSize:11}} />
                <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Coverage bars */}
          <div className="card">
            <div className="card-title">Coverage by control</div>
            <CoverageBar label="Authentication" pct={auth.percentage||0} color={auth.percentage>70?'var(--success)':'var(--danger)'} />
            <CoverageBar label="HTTPS / TLS" pct={posture.transport?.percentage||0} color="var(--info)" />
            <CoverageBar label="Rate Limiting" pct={posture.rateLimit?.percentage||0} color="var(--warning)" />
            <CoverageBar label="CORS Policy" pct={posture.cors?.percentage||0} color="#8b5cf6" />
          </div>
        </div>

        <div className="card-grid-2">
          {/* Auth type breakdown */}
          <div className="card">
            <div className="card-title">Authentication method distribution</div>
            <CheckRow label="OAuth 2.0" pass={authByType.OAuth2>0} detail={`${authByType.OAuth2||0} APIs`} />
            <CheckRow label="JWT Bearer" pass={authByType.JWT>0} detail={`${authByType.JWT||0} APIs`} />
            <CheckRow label="API Key" pass={authByType.API_KEY>0} warn detail={`${authByType.API_KEY||0} APIs — upgrade recommended`} />
            <CheckRow label="HTTP Basic" pass={false} detail={`${authByType.Basic||0} APIs — insecure, replace immediately`} />
            <CheckRow label="No Auth (None)" pass={authByType.None===0 || !authByType.None} detail={`${authByType.None||0} APIs exposed without authentication`} />
          </div>

          {/* Compliance */}
          <div className="card">
            <div className="card-title">Compliance status</div>
            <CheckRow label="RBI API Security Guidelines" pass={auth.percentage>80} detail="Requires ≥80% auth coverage" />
            <CheckRow label="GDPR — Data minimisation" pass={(posture.dataExposure?.pii||0)===0} detail={`${posture.dataExposure?.pii||0} APIs exposing PII`} />
            <CheckRow label="PCI-DSS — Financial data" pass={(posture.dataExposure?.financial||0)===0} detail={`${posture.dataExposure?.financial||0} APIs exposing financial data`} />
            <CheckRow label="HTTPS enforcement" pass={posture.transport?.percentage===100} detail={posture.transport?.percentage<100?`${100-posture.transport.percentage}% APIs not using HTTPS`:undefined} />
            <CheckRow label="Rate limiting (OWASP API4)" pass={posture.rateLimit?.percentage>90 ? true : posture.rateLimit?.percentage>60 ? 'warn' : false} detail={`${posture.rateLimit?.percentage||0}% APIs have rate limiting`} />
          </div>
        </div>

        {/* OWASP violations */}
        {owaspData.length > 0 && (
          <div className="card">
            <div className="card-title">OWASP API Top 10 — Violation Count</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={owaspData} barSize={32}>
                <XAxis dataKey="name" tick={{fill:'var(--text3)',fontSize:10}} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{background:'#1a2035',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,fontSize:12}} />
                <Bar dataKey="count" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top violating APIs */}
        {violations.length > 0 && (
          <div className="card">
            <div className="card-title">APIs with OWASP violations</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Endpoint</th><th>Method</th><th>Risk</th><th>Violations</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {violations.slice(0,10).map(api => (
                    <tr key={api._id}>
                      <td className="endpoint-cell">{api.endpoint}</td>
                      <td><span className={`method-badge method-${api.method}`}>{api.method}</span></td>
                      <td>
                        <span className={`badge badge-${api.riskLevel}`}>{api.riskScore}/100</span>
                      </td>
                      <td style={{maxWidth:320}}>
                        {(api.security?.owaspViolations||[]).slice(0,2).map((v,i) => (
                          <div key={i} style={{fontSize:11,color:'var(--text3)',padding:'1px 0'}}>{v}</div>
                        ))}
                        {(api.security?.owaspViolations||[]).length > 2 && (
                          <div style={{fontSize:11,color:'var(--text3)'}}>+{api.security.owaspViolations.length-2} more</div>
                        )}
                      </td>
                      <td><span className={`badge badge-${api.status}`}>{api.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
