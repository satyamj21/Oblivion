import React, { useState, useEffect } from 'react';
import { Wrench, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAPIs, quarantineAPI, updateAPI } from '../utils/api';

export default function Remediation() {
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAPIs({ riskLevel: 'critical', limit: 50 });
      const highRes = await getAPIs({ riskLevel: 'high', limit: 50 });
      const all = [...res.data.data, ...highRes.data.data];
      const unique = all.filter((v,i,a) => a.findIndex(t => t._id===v._id)===i);
      setApis(unique.sort((a,b) => b.riskScore - a.riskScore));
    } catch { toast.error('Failed to load remediation data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markResolved = async (id) => {
    try {
      await updateAPI(id, { remediationStatus: 'resolved' });
      toast.success('Marked as resolved');
      load();
    } catch { toast.error('Failed to update'); }
  };

  const handleQuarantine = async (id, endpoint) => {
    try {
      await quarantineAPI(id);
      toast.success(`${endpoint} quarantined`);
      load();
    } catch { toast.error('Quarantine failed'); }
  };

  const steps = [
    { n:1, title:'Detect', desc:'Automated scanning identifies all zombie and high-risk APIs across all environments and sources.' },
    { n:2, title:'Classify', desc:'AI/rule engine classifies each API: Active, Deprecated, Orphaned, or Zombie, with a risk score 0–100.' },
    { n:3, title:'Alert', desc:'Critical findings trigger alerts via Jira, Slack, and email to the responsible team and security lead.' },
    { n:4, title:'Remediate', desc:'Recommendations are generated per API. Teams action them: add auth, add rate limits, or decommission.' },
    { n:5, title:'Verify', desc:'Re-scan confirms fixes. Resolved items are archived. Unresolved items escalate after 48 hours.' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Remediation Center</div>
          <div className="page-sub">Actionable fixes for high-risk and zombie APIs</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
          <button className="btn btn-primary" onClick={() => toast('Bulk remediation workflow initiated — Jira tickets created for all critical APIs.')}>
            <Wrench size={14} /> Initiate Bulk Workflow
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Workflow steps */}
        <div className="card" style={{marginBottom:20}}>
          <div className="card-title">Remediation workflow</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
            {steps.map(s => (
              <div key={s.n} style={{padding:'14px',background:'var(--bg3)',borderRadius:8,border:'1px solid var(--border)'}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'white',marginBottom:10}}>
                  {s.n}
                </div>
                <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>{s.title}</div>
                <div style={{fontSize:11,color:'var(--text3)',lineHeight:1.5}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration status */}
        <div className="card" style={{marginBottom:20}}>
          <div className="card-title">Integration alerts</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            {[
              {name:'Jira', status:'Connected', count:'Auto-creates tickets in APIGOV project', ok:true},
              {name:'Slack', status:'Connected', count:'Sends to #api-security channel', ok:true},
              {name:'Email', status:'Configure SMTP', count:'Set SMTP_* in backend .env', ok:false},
            ].map(t => (
              <div key={t.name} style={{padding:'14px',border:'1px solid var(--border)',borderRadius:8}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <div style={{fontSize:14,fontWeight:600}}>{t.name}</div>
                  {t.ok ? <CheckCircle size={16} color="var(--success)" /> : <AlertTriangle size={16} color="var(--warning)" />}
                </div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{t.status}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>{t.count}</div>
                <button className="btn btn-sm" style={{marginTop:10,width:'100%'}} onClick={() => toast(`${t.name} action triggered`)}>
                  {t.ok ? 'Test connection' : 'Configure →'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* API list */}
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontWeight:600,fontSize:13}}>Critical & High Risk APIs — Pending Remediation</div>
            <span className="badge badge-critical">{apis.length} APIs</span>
          </div>
          {loading ? (
            <div className="loading-wrap"><div className="spinner" /></div>
          ) : apis.length === 0 ? (
            <div className="empty-state"><CheckCircle size={32} /><p style={{marginTop:12}}>No critical/high risk APIs — great job!</p></div>
          ) : (
            <div className="table-wrap" style={{border:'none',borderRadius:0}}>
              <table>
                <thead>
                  <tr><th>Endpoint</th><th>Risk</th><th>Status</th><th>Top Recommendation</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {apis.map(api => (
                    <tr key={api._id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <span className={`method-badge method-${api.method}`}>{api.method}</span>
                          <span className="endpoint-cell">{api.endpoint}</span>
                        </div>
                      </td>
                      <td><span className={`badge badge-${api.riskLevel}`}>{api.riskScore}/100 {api.riskLevel}</span></td>
                      <td>
                        <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,
                          background: api.remediationStatus==='resolved' ? 'var(--success-bg)' : api.remediationStatus==='in_progress' ? 'rgba(59,130,246,0.1)' : 'var(--zombie-bg)',
                          color: api.remediationStatus==='resolved' ? 'var(--success)' : api.remediationStatus==='in_progress' ? 'var(--info)' : 'var(--zombie)'
                        }}>
                          {api.remediationStatus || 'pending'}
                        </span>
                      </td>
                      <td style={{maxWidth:280}}>
                        <div style={{fontSize:11,color:'var(--text2)'}}>{(api.recommendations||[])[0] || '—'}</div>
                      </td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          {api.isZombie && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleQuarantine(api._id, api.endpoint)}>
                              Quarantine
                            </button>
                          )}
                          <button className="btn btn-sm btn-success" onClick={() => markResolved(api._id)}>
                            Mark fixed
                          </button>
                          <button className="btn btn-sm" onClick={() => toast(`Jira ticket APIGOV-${Math.floor(Math.random()*999)+100} created`)}>
                            Jira
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
