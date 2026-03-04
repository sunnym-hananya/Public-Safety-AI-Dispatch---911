'use strict';

// ── Mock GIS address database ─────────────────────────────────────────────
const GIS_ADDRESSES = [
    { id: 1,  address: '456 Oak Street',        city: 'Edmonton', postal: 'T5K 0L4', type: 'Residential', lat: 53.5461, lng: -113.4938 },
    { id: 2,  address: '123 Main Street',        city: 'Edmonton', postal: 'T5H 2J4', type: 'Commercial',  lat: 53.5444, lng: -113.4909 },
    { id: 3,  address: '789 Elm Avenue',         city: 'Edmonton', postal: 'T5G 1L8', type: 'Residential', lat: 53.5528, lng: -113.5001 },
    { id: 4,  address: '234 Maple Drive',        city: 'Edmonton', postal: 'T5M 2K3', type: 'Residential', lat: 53.5612, lng: -113.5234 },
    { id: 5,  address: '567 Pine Road',          city: 'Edmonton', postal: 'T5N 1R7', type: 'Residential', lat: 53.5389, lng: -113.5112 },
    { id: 6,  address: '890 Birch Boulevard',    city: 'Edmonton', postal: 'T5P 0J1', type: 'Commercial',  lat: 53.5502, lng: -113.4756 },
    { id: 7,  address: '345 Cedar Lane',         city: 'Edmonton', postal: 'T5R 3K8', type: 'Residential', lat: 53.5447, lng: -113.4867 },
    { id: 8,  address: '678 Willow Way',         city: 'Edmonton', postal: 'T5S 2M4', type: 'Residential', lat: 53.5581, lng: -113.5345 },
    { id: 9,  address: '901 Spruce Street',      city: 'Edmonton', postal: 'T5T 1V2', type: 'Commercial',  lat: 53.5334, lng: -113.4623 },
    { id: 10, address: '112 Aspen Avenue',       city: 'Edmonton', postal: 'T5V 0H9', type: 'Residential', lat: 53.5658, lng: -113.4512 },
    { id: 11, address: '223 River Road',         city: 'Edmonton', postal: 'T5W 3G6', type: 'Industrial',  lat: 53.5290, lng: -113.4401 },
    { id: 12, address: '334 Valley View Drive',  city: 'Edmonton', postal: 'T5X 2F3', type: 'Residential', lat: 53.5723, lng: -113.5678 },
    { id: 13, address: '445 Hillside Court',     city: 'Edmonton', postal: 'T5Y 1E0', type: 'Residential', lat: 53.5156, lng: -113.4278 },
    { id: 14, address: '556 Lakeside Lane',      city: 'Edmonton', postal: 'T5Z 0D7', type: 'Residential', lat: 53.5834, lng: -113.5890 },
    // Highway corridor (for vehicle accident / multi-agency scenarios)
    { id: 15, address: 'Highway 2 Northbound',   city: 'Edmonton', postal: 'T9E 0X0', type: 'Highway',     lat: 53.5798, lng: -113.5102 },
    // Jasper Avenue residential (cardiac arrest scenario)
    { id: 16, address: '12445 Jasper Avenue',    city: 'Edmonton', postal: 'T5M 3L2', type: 'Residential', lat: 53.5461, lng: -113.5680 },
];

// ── Mock incident history ─────────────────────────────────────────────────
// Dates relative to demo date of 2026-02-27
const PAST_INCIDENTS = [
    { id: 1,  addressId: 1,  date: '2026-02-10', type: 'Domestic Disturbance', units: ['POL-01', 'POL-03'], priority: 'HIGH',     outcome: 'Arrest made',                       notes: 'Suspect known to be volatile' },
    { id: 2,  addressId: 1,  date: '2026-01-28', type: 'Welfare Check',        units: ['POL-02'],           priority: 'LOW',      outcome: 'No action required',                notes: '' },
    { id: 3,  addressId: 1,  date: '2025-12-15', type: 'Domestic Disturbance', units: ['POL-01', 'AMB-02'], priority: 'HIGH',     outcome: 'Victim transported to hospital',    notes: 'Prior domestic history at address' },
    { id: 4,  addressId: 3,  date: '2026-02-18', type: 'Medical Emergency',    units: ['AMB-01'],           priority: 'CRITICAL', outcome: 'Patient transported',               notes: '' },
    { id: 5,  addressId: 5,  date: '2026-02-22', type: 'Structure Fire',       units: ['FIRE-01', 'FIRE-02', 'AMB-03'], priority: 'CRITICAL', outcome: 'Fire contained, no casualties', notes: '' },
    { id: 6,  addressId: 7,  date: '2026-01-14', type: 'Break and Enter',      units: ['POL-04', 'POL-05'], priority: 'MEDIUM',   outcome: 'Report taken, no arrest',           notes: '' },
    { id: 7,  addressId: 2,  date: '2026-02-05', type: 'Alarm Activation',     units: ['POL-01'],           priority: 'LOW',      outcome: 'False alarm',                       notes: '' },
    { id: 8,  addressId: 9,  date: '2026-01-30', type: 'Vehicle Accident',     units: ['AMB-02', 'POL-03', 'FIRE-01'], priority: 'HIGH', outcome: 'Two patients transported',   notes: '' },
    { id: 9,  addressId: 4,  date: '2026-02-14', type: 'Noise Complaint',      units: ['POL-05'],           priority: 'LOW',      outcome: 'Warning issued',                    notes: '' },
    { id: 10, addressId: 6,  date: '2026-02-20', type: 'Medical Emergency',    units: ['AMB-01', 'AMB-03'], priority: 'CRITICAL', outcome: 'CPR performed, patient transported', notes: '' },
    { id: 11, addressId: 10, date: '2026-02-25', type: 'Trespass',             units: ['POL-02'],           priority: 'MEDIUM',   outcome: 'Individual removed',                notes: '' },
    { id: 12, addressId: 12, date: '2026-02-01', type: 'Noise Complaint',      units: ['POL-04'],           priority: 'LOW',      outcome: 'Warning issued',                    notes: '' },
];

// ── Mock frequent caller registry ─────────────────────────────────────────
const FREQUENT_CALLERS = [
    { phone: '780-555-0147', name: 'M. Thornton', callCount: 23, lastCall: '2026-02-15', notes: 'Recurring mental health calls; rarely life-threatening' },
    { phone: '587-555-0293', name: 'R. Daniels',  callCount: 11, lastCall: '2026-01-22', notes: 'Substance-related incidents; unreliable information' },
    { phone: '780-555-0381', name: 'P. Carver',   callCount:  8, lastCall: '2026-02-08', notes: 'Domestic disputes at same address; volatile history' },
    { phone: '587-555-0512', name: 'B. Okonkwo',  callCount:  6, lastCall: '2026-01-30', notes: 'Welfare checks for elderly neighbour' },
    { phone: '780-555-0629', name: 'D. Reyes',    callCount:  5, lastCall: '2026-02-19', notes: 'Repeat nuisance calls; no criminal history' },
];

// ── Mock unit roster (lat/lng = current position for map plotting) ────────
const UNITS = [
    { id: 'AMB-01',  type: 'Ambulance', status: 'Available', location: 'Station 7',             eta: 4,    crew: 2, capabilities: ['ALS', 'BLS'],              lat: 53.5480, lng: -113.4900 },
    { id: 'AMB-02',  type: 'Ambulance', status: 'En Route',  location: 'En Route — 102 Ave',     eta: null, crew: 2, capabilities: ['BLS'],                     lat: 53.5652, lng: -113.4979 },
    { id: 'AMB-03',  type: 'Ambulance', status: 'Available', location: 'Station 12',            eta: 7,    crew: 2, capabilities: ['ALS', 'BLS'],              lat: 53.5201, lng: -113.5198 },
    { id: 'AMB-04',  type: 'Ambulance', status: 'Busy',      location: 'Foothills Hospital',     eta: null, crew: 2, capabilities: ['ALS'],                     lat: 53.5392, lng: -113.5581 },
    { id: 'FIRE-01', type: 'Fire',      status: 'Available', location: 'Station 3',             eta: 5,    crew: 4, capabilities: ['Suppression','Rescue','Hazmat'], lat: 53.5371, lng: -113.4958 },
    { id: 'FIRE-02', type: 'Fire',      status: 'Available', location: 'Station 9',             eta: 8,    crew: 4, capabilities: ['Suppression','Rescue'],     lat: 53.5561, lng: -113.5663 },
    { id: 'FIRE-03', type: 'Fire',      status: 'Busy',      location: 'Active Scene — 118 Ave', eta: null, crew: 4, capabilities: ['Suppression'],             lat: 53.5621, lng: -113.4762 },
    { id: 'POL-01',  type: 'Police',    status: 'Available', location: 'Sector 4',              eta: 3,    crew: 1, capabilities: ['Patrol'],                  lat: 53.5530, lng: -113.4992 },
    { id: 'POL-02',  type: 'Police',    status: 'Available', location: 'Sector 2',              eta: 6,    crew: 2, capabilities: ['Patrol','Traffic'],         lat: 53.5341, lng: -113.4788 },
    { id: 'POL-03',  type: 'Police',    status: 'En Route',  location: 'En Route — 97 St',       eta: null, crew: 1, capabilities: ['Patrol'],                  lat: 53.5671, lng: -113.5063 },
    { id: 'POL-04',  type: 'Police',    status: 'Available', location: 'Sector 6',              eta: 9,    crew: 1, capabilities: ['Patrol'],                  lat: 53.5448, lng: -113.5619 },
    { id: 'POL-05',  type: 'Police',    status: 'Busy',      location: 'Active Call — Downtown', eta: null, crew: 2, capabilities: ['Patrol','Crowd Control'],   lat: 53.5432, lng: -113.4871 },
];

// ── Unit types needed by incident type ───────────────────────────────────
const INCIDENT_UNIT_MAP = {
    'Medical':       ['Ambulance'],
    'Fire':          ['Fire', 'Ambulance'],
    'Police':        ['Police'],
    'Multi-Agency':  ['Police', 'Fire', 'Ambulance'],
};

// ── CAD lookup (no AI — pure database queries) ────────────────────────────
function cadLookup(extraction) {
    const rawAddress   = (extraction.location?.address  || '').trim();
    const callerPhone  = (extraction.caller?.phone      || 'unknown').trim();
    const incidentType = (extraction.incidentType       || '').trim();

    // 1. Address validation — normalise and fuzzy-match
    const norm = (s) => s.toLowerCase().replace(/[,.#\-]/g, '').replace(/\s+/g, ' ').trim();
    const inputNorm = norm(rawAddress);

    const matchedAddress = GIS_ADDRESSES.find((a) => {
        const addrNorm = norm(a.address);
        // Exact / substring match
        if (addrNorm === inputNorm || addrNorm.includes(inputNorm) || inputNorm.includes(addrNorm)) return true;
        // First-two-words overlap (catches "Highway 2 Northbound" vs "Highway 2 northbound near Airport Road exit")
        const firstTwo = addrNorm.split(' ').slice(0, 2).join(' ');
        return firstTwo.length > 3 && inputNorm.includes(firstTwo);
    }) || null;

    // 2. Past incidents at location — last 30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const pastIncidents = matchedAddress
        ? PAST_INCIDENTS
            .filter((i) => i.addressId === matchedAddress.id && new Date(i.date) >= cutoff)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
        : [];

    // All-time domestic history at address (for alert generation)
    const domesticCount = matchedAddress
        ? PAST_INCIDENTS.filter(
              (i) => i.addressId === matchedAddress.id &&
                     (i.type === 'Domestic Disturbance' || i.type === 'Domestic Violence')
          ).length
        : 0;

    // 3. Caller history
    const callerHistory = callerPhone !== 'unknown'
        ? (FREQUENT_CALLERS.find((c) => c.phone === callerPhone) || null)
        : null;

    // 4. Available units (filtered by incident type)
    const neededTypes = INCIDENT_UNIT_MAP[incidentType] || ['Police', 'Ambulance'];
    const relevantUnits = UNITS
        .filter((u) => neededTypes.includes(u.type))
        .sort((a, b) => {
            // Sort: Available first, then En Route, then Busy
            const order = { Available: 0, 'En Route': 1, Busy: 2 };
            return (order[a.status] ?? 3) - (order[b.status] ?? 3);
        });

    // 5. Alerts
    const alerts = [];

    if (!matchedAddress) {
        alerts.push({ severity: 'danger', message: 'Address not found in GIS database — verify location manually before dispatch' });
    }

    if (domesticCount > 0) {
        alerts.push({ severity: 'danger', message: `Known domestic incident history at this address (${domesticCount} total on record)` });
    }

    if (pastIncidents.length > 0) {
        alerts.push({ severity: 'warning', message: `${pastIncidents.length} prior incident(s) at this address in the last 30 days` });
    }

    if (callerHistory && callerHistory.callCount >= 5) {
        alerts.push({ severity: 'warning', message: `Frequent caller: ${callerHistory.name} (${callerHistory.callCount} calls) — ${callerHistory.notes}` });
    }

    const availableCount = relevantUnits.filter((u) => u.status === 'Available').length;
    if (availableCount === 0) {
        alerts.push({ severity: 'danger', message: 'No units currently available for this incident type — escalate immediately' });
    }

    return {
        addressValid:   !!matchedAddress,
        addressDetails: matchedAddress,
        pastIncidents,
        callerHistory,
        availableUnits: relevantUnits,
        alerts,
    };
}

module.exports = { cadLookup };
