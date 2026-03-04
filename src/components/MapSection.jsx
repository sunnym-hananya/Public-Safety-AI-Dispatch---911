// Interactive Leaflet map showing incident location, unit positions, response zones,
// dashed route lines, and a toggleable historical heatmap.
//
// Props:
//   extraction — Agent 1 output (urgencyLevel, incidentType, location, etc.)
//   cadData    — Agent 3 output (addressDetails, availableUnits)
//   routing    — Agent 4 output (primary, multiUnit) — used to highlight recommended units
//
// Depends on globals: RESPONSE_ZONES, HEAT_POINTS, UNIT_COLOR (src/constants.js)
// Requires: Leaflet 1.9.4, Esri Leaflet, Leaflet.heat (loaded via index.html CDN)
function MapSection({ extraction, cadData, routing, fallbackCoords }) {
  const containerRef       = useRef(null);
  const mapRef             = useRef(null);
  const groupsRef          = useRef({});
  const heatLayerRef       = useRef(null);
  const incidentCoordsRef  = useRef(null);

  const [layers, setLayers] = useState({ units: true, zones: true, routes: true, history: false });

  // Derive incident coordinates from CAD match, scenario fallback, or Edmonton default.
  const getIncidentCoords = (cad) => {
    if (cad?.addressDetails) return [cad.addressDetails.lat, cad.addressDetails.lng];
    if (fallbackCoords) return fallbackCoords;
    return [53.5620, -113.5050]; // Edmonton city centre default
  };

  // ── Initialise Leaflet map once on mount ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current || typeof L === 'undefined') return;

    const map = L.map(containerRef.current, {
      center: [53.5620, -113.5050],
      zoom: 12,
      zoomControl: true,
    });

    // Esri World Street Map — raster tiles, no API key required.
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a>', maxZoom: 19 }
    ).addTo(map);

    // Layer groups (history is off by default).
    const groups = {
      incident: L.layerGroup().addTo(map),
      units:    L.layerGroup().addTo(map),
      zones:    L.layerGroup().addTo(map),
      routes:   L.layerGroup().addTo(map),
      history:  L.layerGroup(),
    };
    groupsRef.current = groups;

    // Response zone rectangles (static, drawn once on init).
    RESPONSE_ZONES.forEach((zone) => {
      L.rectangle(zone.bounds, {
        color: zone.color, weight: 2, fillOpacity: 0.07, opacity: 0.6,
      })
        .bindPopup(`<strong style="color:${zone.color}">${zone.name}</strong>`)
        .addTo(groups.zones);
    });

    // Historical heatmap (static). Falls back to translucent circles if plugin unavailable.
    try {
      if (typeof L.heatLayer !== 'undefined') {
        heatLayerRef.current = L.heatLayer(HEAT_POINTS, { radius: 28, blur: 20, maxZoom: 17 });
        heatLayerRef.current.eachLayer
          ? heatLayerRef.current.eachLayer((l) => groups.history.addLayer(l))
          : groups.history.addLayer(heatLayerRef.current);
      } else {
        HEAT_POINTS.forEach(([lat, lng, intensity]) =>
          L.circleMarker([lat, lng], {
            radius: 10, color: '#ff4d4d', fillColor: '#ff4d4d',
            fillOpacity: intensity * 0.5, weight: 0,
          }).addTo(groups.history)
        );
      }
    } catch (e) { /* heatmap is decorative — safe to skip */ }

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Redraw incident marker + unit markers whenever data changes ───────────
  useEffect(() => {
    if (!mapRef.current || !extraction) return;
    const map                         = mapRef.current;
    const { incident, units, routes } = groupsRef.current;
    if (!incident) return;

    const coords = getIncidentCoords(cadData);
    incidentCoordsRef.current = coords;

    // Incident marker with urgency-driven pulse animation.
    incident.clearLayers();
    const urgency    = extraction.urgencyLevel || 'MEDIUM';
    const pulseClass = urgency === 'CRITICAL' ? 'pulse-critical'
                     : urgency === 'HIGH'     ? 'pulse-high'
                     :                          'pulse-medium';

    L.marker(coords, {
      icon: L.divIcon({
        className: '',
        html: `<div class="incident-marker ${pulseClass}"><span>!</span></div>`,
        iconSize:   [38, 38],
        iconAnchor: [19, 19],
      }),
    })
      .bindPopup(`
        <div style="font-family:sans-serif;min-width:200px">
          <div style="color:#ff4d4d;font-weight:700;font-size:14px;margin-bottom:6px">
            ${urgency} — ${extraction.incidentType}
          </div>
          <div style="margin-bottom:4px"><strong>Location:</strong> ${extraction.location?.address || 'Unknown'}</div>
          <div style="margin-bottom:4px"><strong>Issue:</strong> ${extraction.situation?.chiefComplaint || '—'}</div>
          <div><strong>Response:</strong> ${extraction.estimatedResponseNeeded || '—'}</div>
        </div>
      `)
      .addTo(incident);

    // Unit markers + route lines.
    // Primary recommended unit gets a larger highlighted marker and a solid route line.
    if (cadData?.availableUnits?.length) {
      units.clearLayers();
      routes.clearLayers();

      const primaryId    = routing?.primary?.unitId;
      const multiUnitIds = new Set((routing?.multiUnit || []).map((u) => u.unitId));

      cadData.availableUnits.forEach((unit) => {
        if (!unit.lat || !unit.lng) return;

        const color       = UNIT_COLOR[unit.type] || '#888';
        const opacity     = unit.status === 'Available' ? 1
                          : unit.status === 'En Route'  ? 0.75
                          :                               0.35;
        const isPrimary   = unit.id === primaryId;
        const isMulti     = multiUnitIds.has(unit.id);
        const iconSize    = isPrimary ? [44, 44] : [30, 30];
        const iconAnchor  = isPrimary ? [22, 22] : [15, 15];
        const markerClass = isPrimary
          ? 'unit-map-marker unit-map-marker--primary'
          : 'unit-map-marker';

        L.marker([unit.lat, unit.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div class="${markerClass}" style="background:${color};opacity:${opacity}">
                     <span>${isPrimary ? '★' : unit.type[0]}</span>
                   </div>`,
            iconSize,
            iconAnchor,
          }),
          // Primary rises above other markers
          zIndexOffset: isPrimary ? 1000 : isMulti ? 500 : 0,
        })
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:180px">
              <div style="font-weight:700;font-size:14px;margin-bottom:6px">
                ${isPrimary ? '★ PRIMARY — ' : ''}${unit.id}
              </div>
              <div style="margin-bottom:3px">Type: ${unit.type}</div>
              <div style="margin-bottom:3px">Status: <strong style="color:${
                unit.status === 'Available' ? '#00d4aa'
                : unit.status === 'En Route' ? '#ffb84d'
                : '#888'
              }">${unit.status}</strong></div>
              <div style="margin-bottom:3px">Location: ${unit.location}</div>
              <div>${unit.eta ? `ETA: <strong>${unit.eta} min</strong>` : 'Unavailable'}</div>
              ${isPrimary ? `<div style="margin-top:6px;color:#00d4aa;font-size:12px">Recommended primary dispatch</div>` : ''}
            </div>
          `)
          .addTo(units);

        // Primary → solid bright route; other available → faint dashed.
        if (unit.status === 'Available') {
          L.polyline([[unit.lat, unit.lng], coords], isPrimary
            ? { color, weight: 3, opacity: 0.85, dashArray: null }
            : { color, weight: 2, opacity: 0.35, dashArray: '7, 9' }
          ).addTo(routes);
        }
      });
    }

    map.setView(coords, 13);
  }, [extraction, cadData, routing]);

  // ── Sync layer group visibility with toggle state ─────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const g   = groupsRef.current;
    if (!g.units) return;

    layers.units   ? map.addLayer(g.units)   : map.removeLayer(g.units);
    layers.zones   ? map.addLayer(g.zones)   : map.removeLayer(g.zones);
    layers.routes  ? map.addLayer(g.routes)  : map.removeLayer(g.routes);
    layers.history ? map.addLayer(g.history) : map.removeLayer(g.history);
  }, [layers]);

  const toggle = (key) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const resetView = () => {
    if (mapRef.current && incidentCoordsRef.current) {
      mapRef.current.setView(incidentCoordsRef.current, 13);
    }
  };

  const TOGGLE_LABELS = { units: 'Units', zones: 'Zones', routes: 'Routes', history: 'Heatmap' };

  return (
    <div className="comparison-section" style={{ marginTop: '20px' }}>
      <h2 className="comparison-title">Incident Map</h2>

      {/* Layer toggles */}
      <div className="map-controls">
        {Object.keys(TOGGLE_LABELS).map((key) => (
          <button
            key={key}
            className={`map-toggle${layers[key] ? ' active' : ''}`}
            onClick={() => toggle(key)}
          >
            {TOGGLE_LABELS[key]}
          </button>
        ))}
        <button
          className="map-toggle"
          onClick={resetView}
          title="Re-centre map on incident location"
          style={{ marginLeft: 'auto' }}
        >
          ⊕ Reset View
        </button>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center' }}>
          ★ = Recommended primary unit &nbsp;·&nbsp; Click any marker for details
        </span>
      </div>

      <div ref={containerRef} className="map-container"></div>

      {/* Legend */}
      <div className="map-legend">
        <span className="legend-title">Legend</span>
        {[
          { label: 'Incident',  color: '#ff4d4d' },
          { label: 'Police',    color: '#4d9fff' },
          { label: 'Fire',      color: '#ff6432' },
          { label: 'Ambulance', color: '#00d4aa' },
          { label: 'Available', color: '#00d4aa', shape: 'ring' },
          { label: 'En Route',  color: '#ffb84d', shape: 'ring' },
          { label: 'Busy',      color: '#555',    shape: 'ring' },
        ].map((item) => (
          <div key={item.label} className="legend-item">
            <span
              className="legend-dot"
              style={{
                background: item.shape === 'ring' ? 'transparent' : item.color,
                border:     item.shape === 'ring' ? `2px solid ${item.color}` : 'none',
              }}
            ></span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
