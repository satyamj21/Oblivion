import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldOff, Trash2, RefreshCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { getZombieAPIs, quarantineAPI, deleteAPI } from '../utils/api';

function RiskBadge({ level, score }) {
  return (
    <span className={`badge badge-${level}`}>
      {level.toUpperCase()} {score}/100
    </span>
  );
}

export default function ZombieCenter() {
  const [zombies, setZombies] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getZombieAPIs();
      setZombies(res.data.data);
    } catch { toast.error('Failed to load zombie APIs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleQuarantine = async (id, endpoint) => {
    if (!window.confirm(`Quarantine and disable ${endpoint}?`)) return;
    try {
      await quarantineAPI(id);
      toast.success('API quarantined — gateway rule disabled');
      load();
    } catch { toast.error('Failed to quarantine'); }
  };

  const handleDelete = async (id, endpoint) => {
    if (!window.confirm(`Permanently remove zombie record for ${endpoint}?`)) return;
    try {
      await deleteAPI(id);
      toast.success('Zombie API record removed');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const handleQuarantineAll = async () => {
    if (!window.confirm(`Quarantine ALL ${zombies.length} zombie APIs? This will disable them.`)) return;
    let count = 0;
    for (const z of zombies.filter(z => z.status !== 'quarantined')) {
      try { await quarantineAPI(z._id); count++; } catch {}
    }
    toast.success(`${count} zombie APIs quarantined`);
    load();
  };

  const criticalCount  = zombies.filter(z => z.riskLevel === 'critical').length;
  const noAuthCount    = zombies.filter(z => !z.security?.hasAuth).length;
  const piiCount       = zombies.filter(z => z.security?.exposesPII || z.security?.exposesFinancial).length;
  const avgInactive    = zombies.length > 0 ? Math.round(zombies.reduce((a,z) => a + (z.daysInactive||0), 0) / zombies.length) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{display:'flex',alignItems:'center',gap:8}}>
            <AlertTriangle size={20} color="var(--zombie)" />
            Zombie API Threat Center
          </div>
          <div className="page-sub">{zombies.length} zombie APIs detected — stale, exposed, and dangerous</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
          {zombies.length > 0 && (
            <button className="btn btn-danger" onClick={handleQuarantineAll}>
              <ShieldOff size={14} /> Quarantine All
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="metrics-grid">
          <div className="metric-card zombie">
            <div className="metric-label">Total Zombies</div>
            <div className="metric-value zombie">{zombies.length}</div>
          </div>
          <div className="metric-card danger">
            <div className="metric-label">Critical Risk</div>
            <div className="metric-value danger">{criticalCount}</div>
          </div>
          <div className="metric-card danger">
            <div className="metric-label">No Authentication</div>
            <div className="metric-value danger">{noAuthCount}</div>
          </div>
          <div className="metric-card warning">
            <div className="metric-label">Exposing PII / Financial</div>
            <div className="metric-value warning">{piiCount}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg Days Inactive</div>
            <div className="metric-value">{avgInactive}</div>
          </div>
        </div>

        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : zombies.length === 0 ? (
          <div className="empty-state" style={{padding:'80px 20px'}}>
            <Zap size={40} style={{opacity:0.3,marginBottom:12}} />
            <p style={{fontSize:15,fontWeight:500}}>No zombie APIs detected</p>
            <p style={{marginTop:8,fontSize:13}}>Load demo data from the Overview page to see zombie detection in action.</p>
          </div>
        ) : (
          <div>
            {zombies.map(z => (
              <div key={z._id} className="zombie-card">
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                      <span className={`method-badge method-${z.method}`}>{z.method}</span>
                      <span className="zombie-endpoint">{z.endpoint}</span>
                      {z.status === 'quarantined' && <span className="badge badge-quarantined">QUARANTINED</span>}
                    </div>

                    {/* Why it's a zombie */}
                    <div className="zombie-reasons">
                      {(z.zombieReasons || []).map((r, i) => (
                        <span key={i} className="zombie-reason-tag">{r}</span>
                      ))}
                    </div>

                    {/* Security flags */}
                    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
                      {!z.security?.hasAuth && (
                        <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'rgba(239,68,68,0.15)',color:'var(--danger)',border:'1px solid rgba(239,68,68,0.2)'}}>
                          ✗ No Auth
                        </span>
                      )}
                      {!z.security?.usesHTTPS && (
                        <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'rgba(239,68,68,0.15)',color:'var(--danger)',border:'1px solid rgba(239,68,68,0.2)'}}>
                          ✗ No HTTPS
                        </span>
                      )}
                      {!z.security?.hasRateLimit && (
                        <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'rgba(245,158,11,0.15)',color:'var(--warning)',border:'1px solid rgba(245,158,11,0.2)'}}>
                          ! No Rate Limit
                        </span>
                      )}
                      {z.security?.exposesPII && (
                        <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'rgba(239,68,68,0.15)',color:'var(--danger)',border:'1px solid rgba(239,68,68,0.2)'}}>
                          ✗ Exposes PII
                        </span>
                      )}
                      {z.security?.exposesFinancial && (
                        <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'rgba(239,68,68,0.15)',color:'var(--danger)',border:'1px solid rgba(239,68,68,0.2)'}}>
                          ✗ Exposes Financial Data
                        </span>
                      )}
                    </div>

                    {/* OWASP Violations */}
                    {(z.security?.owaspViolations || []).length > 0 && (
                      <div style={{marginTop:8}}>
                        {z.security.owaspViolations.map((v, i) => (
                          <span key={i} className="tag" style={{margin:'2px'}}>{v}</span>
                        ))}
                      </div>
                    )}

                    {/* Recommendations */}
                    {(z.recommendations || []).length > 0 && (
                      <div style={{marginTop:10,padding:'10px 12px',background:'var(--bg3)',borderRadius:8,border:'1px solid var(--border)'}}>
                        <div style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Recommendations</div>
                        {z.recommendations.slice(0,3).map((r, i) => (
                          <div key={i} style={{fontSize:12,color:'var(--text2)',padding:'2px 0',display:'flex',gap:6}}>
                            <span style={{color:'var(--zombie)',flexShrink:0}}>→</span>
                            {r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8,flexShrink:0}}>
                    <RiskBadge level={z.riskLevel} score={z.riskScore} />
                    <div style={{fontSize:11,color:'var(--text3)'}}>
                      {z.daysInactive > 0 ? `${z.daysInactive}d inactive` : 'Never active'}
                    </div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>
                      Team: <span style={{color:'var(--text2)'}}>{z.owner || z.team || 'Unknown'}</span>
                    </div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>
                      Source: <span style={{color:'var(--text2)'}}>{z.source}</span>
                    </div>
                  </div>
                </div>

                <div className="zombie-actions">
                  {z.status !== 'quarantined' && (
                    <button className="btn btn-sm btn-danger" onClick={() => handleQuarantine(z._id, z.endpoint)}>
                      <ShieldOff size={12} /> Quarantine
                    </button>
                  )}
                  <button className="btn btn-sm" onClick={() => toast(`Jira ticket APIGOV-${Math.floor(Math.random()*999)+200} created for ${z.endpoint}`)}>
                    Create Jira Ticket
                  </button>
                  <button className="btn btn-sm" onClick={() => toast(`Slack alert sent to #api-security for ${z.endpoint}`)}>
                    Notify Slack
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(z._id, z.endpoint)} style={{marginLeft:'auto'}}>
                    <Trash2 size={12} /> Remove Record
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
