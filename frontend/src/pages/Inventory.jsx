import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, ShieldOff, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAPIs, quarantineAPI, deleteAPI } from '../utils/api';

const STATUS_FILTERS = ['all','active','deprecated','orphaned','zombie','quarantined'];

function RiskBar({ score, level }) {
  return (
    <div className="risk-bar-wrap">
      <div className="risk-bar-track">
        <div className="risk-bar-fill" style={{width:`${score}%`}} data-level={level} />
      </div>
      <span className={`risk-score ${level}`}>{score}</span>
    </div>
  );
}

function MethodBadge({ method }) {
  return <span className={`method-badge method-${method}`}>{method}</span>;
}

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export default function Inventory() {
  const [apis, setApis]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage]         = useState(1);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, search };
      if (statusFilter !== 'all') {
        if (statusFilter === 'zombie') params.isZombie = true;
        else params.status = statusFilter;
      }
      const res = await getAPIs(params);
      setApis(res.data.data);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load APIs'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };
  const handleStatus = (s) => { setStatusFilter(s); setPage(1); };

  const handleQuarantine = async (id, endpoint) => {
    if (!window.confirm(`Quarantine ${endpoint}?`)) return;
    try {
      await quarantineAPI(id);
      toast.success('API quarantined successfully');
      load();
    } catch { toast.error('Failed to quarantine'); }
  };

  const handleDelete = async (id, endpoint) => {
    if (!window.confirm(`Permanently delete record for ${endpoint}?`)) return;
    try {
      await deleteAPI(id);
      toast.success('API record deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">API Inventory</div>
          <div className="page-sub">{total} APIs discovered across all environments</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      <div className="page-body">
        <div className="filter-row">
          <div className="search-wrap" style={{flex:1}}>
            <div style={{position:'relative'}}>
              <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text3)'}} />
              <input
                type="search"
                placeholder="Search endpoint, team, tag…"
                value={search}
                onChange={handleSearch}
                style={{paddingLeft:32}}
              />
            </div>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => handleStatus(s)}
                style={{
                  padding:'6px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                  border: statusFilter===s ? 'none' : '1px solid var(--border)',
                  background: statusFilter===s ? 'var(--accent)' : 'transparent',
                  color: statusFilter===s ? 'white' : 'var(--text2)'
                }}
              >
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-wrap"><div className="spinner" /></div>
          ) : apis.length === 0 ? (
            <div className="empty-state">
              <Filter size={32} />
              <p style={{marginTop:12}}>No APIs match your filters. Try loading demo data from the Overview page.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Auth</th>
                  <th>Team</th>
                  <th>Last seen</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apis.map(api => (
                  <tr key={api._id}>
                    <td><MethodBadge method={api.method} /></td>
                    <td>
                      <div className="endpoint-cell" title={api.endpoint}>{api.endpoint}</div>
                      {api.description && <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{api.description.slice(0,50)}{api.description.length>50?'…':''}</div>}
                    </td>
                    <td><StatusBadge status={api.status} /></td>
                    <td><RiskBar score={api.riskScore} level={api.riskLevel} /></td>
                    <td>
                      <span style={{
                        fontSize:11, padding:'2px 7px', borderRadius:4,
                        background: api.security?.hasAuth ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: api.security?.hasAuth ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {api.security?.authType || 'None'}
                      </span>
                    </td>
                    <td style={{fontSize:12,color:'var(--text2)'}}>{api.team || api.owner || '—'}</td>
                    <td style={{fontSize:11,color:'var(--text3)'}}>
                      {api.traffic?.lastSeen
                        ? new Date(api.traffic.lastSeen).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        {api.status !== 'quarantined' && api.isZombie && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleQuarantine(api._id, api.endpoint)} title="Quarantine">
                            <ShieldOff size={12} />
                          </button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(api._id, api.endpoint)} title="Delete record">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:16}}>
            <button className="btn btn-sm" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>← Prev</button>
            <span style={{fontSize:13,color:'var(--text2)'}}>Page {page} of {totalPages}</span>
            <button className="btn btn-sm" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
