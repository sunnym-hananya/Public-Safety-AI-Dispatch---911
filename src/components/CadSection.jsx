// Agent 3 CAD Integration section.
// Shows address validation, caller history, location incident history, and available units.
// Displays a loading state while Agent 3 is running.
//
// Props:
//   step    — current workflow step (used to show loading spinner during 'cad-lookup')
//   cadData — Agent 3 output object (null while loading)
function CadSection({ step, cadData }) {
  return (
    <div className="comparison-section" style={{ marginTop: '20px' }}>
      <h2 className="comparison-title">Agent 3 — CAD Integration</h2>

      {step === 'cad-lookup' && (
        <div className="loading">
          <span className="spinner"></span>
          Querying CAD databases...
        </div>
      )}

      {cadData && (
        <>
          {/* Degraded mode banner — shown when Agent 3 failed */}
          {cadData.degraded && (
            <div className="cad-alert cad-alert-danger" style={{ marginBottom: '20px' }}>
              <span className="cad-alert-icon">⚠</span>
              Agent 3 failed — CAD database data is unavailable. Address, unit, and caller information could not be retrieved. All fields below show defaults; dispatcher must query the CAD system manually.
            </div>
          )}

          {/* Alert banners */}
          {cadData.alerts && cadData.alerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {cadData.alerts.map((alert, i) => (
                <div key={i} className={`cad-alert cad-alert-${alert.severity}`}>
                  <span className="cad-alert-icon">
                    {alert.severity === 'danger' ? '⚠' : 'ℹ'}
                  </span>
                  {alert.message}
                </div>
              ))}
            </div>
          )}

          {/* Address + caller | Past incidents */}
          <div className="cad-grid">

            {/* Left column: address validation + caller history */}
            <div>
              <div className="cad-card">
                <div className="cad-card-title">Address Validation</div>
                {cadData.addressValid ? (
                  <div>
                    <div className="address-status address-valid">
                      <span>✓</span> VERIFIED IN GIS
                    </div>
                    <div className="address-detail-row">
                      <span className="address-detail-label">Address</span>
                      <span>{cadData.addressDetails.address}</span>
                    </div>
                    <div className="address-detail-row">
                      <span className="address-detail-label">City</span>
                      <span>{cadData.addressDetails.city}, {cadData.addressDetails.postal}</span>
                    </div>
                    <div className="address-detail-row">
                      <span className="address-detail-label">Zone type</span>
                      <span>{cadData.addressDetails.type}</span>
                    </div>
                    <div className="address-detail-row">
                      <span className="address-detail-label">Coordinates</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                        {cadData.addressDetails.lat}, {cadData.addressDetails.lng}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="address-status address-invalid">
                      <span>✕</span> NOT IN GIS DATABASE
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '10px' }}>
                      Manually verify address before dispatch. May be a rural address, new development, or transcription error.
                    </div>
                  </div>
                )}
              </div>

              <div className="cad-card" style={{ marginTop: '16px' }}>
                <div className="cad-card-title">Caller History</div>
                {cadData.callerHistory ? (
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>{cadData.callerHistory.name}</div>
                    <div className="address-detail-row">
                      <span className="address-detail-label">Total calls</span>
                      <span style={{ color: 'var(--warning)', fontWeight: '700' }}>{cadData.callerHistory.callCount}</span>
                    </div>
                    <div className="address-detail-row">
                      <span className="address-detail-label">Last call</span>
                      <span>{cadData.callerHistory.lastCall}</span>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {cadData.callerHistory.notes}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    No frequent caller record. Phone number unknown or first-time caller.
                  </div>
                )}
              </div>
            </div>

            {/* Right column: past incidents table */}
            <div className="cad-card">
              <div className="cad-card-title">
                Location History
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '8px' }}>
                  last 30 days
                </span>
              </div>
              {(cadData.pastIncidents || []).length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
                  No incidents recorded at this address in the last 30 days.
                </div>
              ) : (
                <table className="incidents-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Priority</th>
                      <th>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cadData.pastIncidents || []).map((inc) => (
                      <tr key={inc.id}>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {inc.date}
                        </td>
                        <td>{inc.type}</td>
                        <td>
                          <span className={`priority-badge priority-${inc.priority.toLowerCase()}`}>
                            {inc.priority}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{inc.outcome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Available units */}
          <div className="cad-card" style={{ marginTop: '16px' }}>
            <div className="cad-card-title">Available Units</div>
            <div className="unit-list">
              {(cadData.availableUnits || []).map((unit) => (
                <div key={unit.id} className="unit-row">
                  <span className="unit-id">{unit.id}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px', minWidth: '90px' }}>
                    {unit.type}
                  </span>
                  <span className={`unit-status unit-status-${unit.status.toLowerCase().replace(' ', '-')}`}>
                    {unit.status === 'Available' ? '●' : unit.status === 'En Route' ? '◐' : '○'} {unit.status}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px', flex: 1 }}>
                    {unit.location}
                  </span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize:   '13px',
                    color:      unit.eta ? 'var(--accent-primary)' : 'var(--text-muted)',
                    minWidth:   '70px',
                    textAlign:  'right',
                  }}>
                    {unit.eta ? `ETA ${unit.eta} min` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
