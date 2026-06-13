const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { query } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/reports/trips
 * Trip report with distance, duration, speed
 */
router.get('/trips', async (req, res) => {
  try {
    const { vehicle_id, from, to, format } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    let whereClause = 'WHERE v.company_id = $1 AND t.start_time BETWEEN $2 AND $3';
    const params = [req.companyId, fromDate, toDate];

    if (vehicle_id) {
      whereClause += ' AND t.vehicle_id = $4';
      params.push(vehicle_id);
    }

    const result = await query(`
      SELECT 
        t.id, t.start_time, t.end_time, t.distance, t.duration,
        t.max_speed, t.avg_speed, t.idle_time, t.fuel_consumed,
        t.start_address, t.end_address,
        v.name as vehicle_name, v.plate_number,
        d.full_name as driver_name
      FROM trips t
      JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      ${whereClause}
      ORDER BY t.start_time DESC
    `, params);

    if (format === 'pdf') return exportTripsPDF(res, result.rows, fromDate, toDate);
    if (format === 'excel') return exportTripsExcel(res, result.rows, fromDate, toDate);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/reports/speed-violations
 */
router.get('/speed-violations', async (req, res) => {
  try {
    const { vehicle_id, from, to, format } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    let whereClause = `WHERE a.company_id = $1 AND a.alert_type = 'speed' AND a.created_at BETWEEN $2 AND $3`;
    const params = [req.companyId, fromDate, toDate];

    if (vehicle_id) {
      whereClause += ' AND a.vehicle_id = $4';
      params.push(vehicle_id);
    }

    const result = await query(`
      SELECT a.*, v.name as vehicle_name, v.plate_number, v.max_speed,
             d.full_name as driver_name
      FROM alerts a
      JOIN vehicles v ON a.vehicle_id = v.id
      LEFT JOIN drivers d ON v.driver_id = d.id
      ${whereClause}
      ORDER BY a.created_at DESC
    `, params);

    if (format === 'excel') return exportSpeedExcel(res, result.rows);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/reports/engine-hours
 * Engine on/off hours report
 */
router.get('/engine-hours', async (req, res) => {
  try {
    const { vehicle_id, from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    let whereClause = 'WHERE v.company_id = $1 AND t.start_time BETWEEN $2 AND $3';
    const params = [req.companyId, fromDate, toDate];

    if (vehicle_id) {
      whereClause += ' AND t.vehicle_id = $4';
      params.push(vehicle_id);
    }

    const result = await query(`
      SELECT 
        v.id, v.name, v.plate_number,
        COUNT(t.id) as trip_count,
        COALESCE(SUM(t.duration), 0) as total_engine_seconds,
        COALESCE(SUM(t.idle_time), 0) as total_idle_seconds,
        COALESCE(SUM(t.distance), 0) as total_distance,
        COALESCE(MAX(t.max_speed), 0) as max_speed_recorded,
        COALESCE(AVG(t.avg_speed), 0) as avg_speed
      FROM vehicles v
      LEFT JOIN trips t ON v.id = t.vehicle_id
      ${whereClause}
      GROUP BY v.id, v.name, v.plate_number
      ORDER BY total_engine_seconds DESC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/reports/geofence
 */
router.get('/geofence', async (req, res) => {
  try {
    const { geofence_id, from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    let whereClause = `WHERE a.company_id = $1 AND a.alert_type IN ('geofence_enter', 'geofence_exit') AND a.created_at BETWEEN $2 AND $3`;
    const params = [req.companyId, fromDate, toDate];

    if (geofence_id) {
      whereClause += ' AND a.geofence_id = $4';
      params.push(geofence_id);
    }

    const result = await query(`
      SELECT a.*, v.name as vehicle_name, v.plate_number,
             g.name as geofence_name
      FROM alerts a
      JOIN vehicles v ON a.vehicle_id = v.id
      LEFT JOIN geofences g ON a.geofence_id = g.id
      ${whereClause}
      ORDER BY a.created_at DESC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================
// Export helpers
// =============================================

async function exportTripsPDF(res, trips, from, to) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=trips-report.pdf');
  doc.pipe(res);

  doc.fontSize(18).text('Fleet Management - Trips Report', { align: 'center' });
  doc.fontSize(10).text(`Period: ${from.toLocaleDateString()} - ${to.toLocaleDateString()}`, { align: 'center' });
  doc.moveDown();

  // Table headers
  const headers = ['Vehicle', 'Plate', 'Driver', 'Start', 'Distance (km)', 'Duration', 'Max Speed'];
  const colWidths = [100, 80, 100, 120, 80, 80, 80];
  let x = 40;

  doc.fontSize(9).font('Helvetica-Bold');
  headers.forEach((h, i) => { doc.text(h, x, doc.y, { width: colWidths[i] }); x += colWidths[i]; });
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(760, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(8);
  trips.forEach(trip => {
    if (doc.y > 520) { doc.addPage(); }
    x = 40;
    const row = [
      trip.vehicle_name || '',
      trip.plate_number || '',
      trip.driver_name || 'N/A',
      trip.start_time ? new Date(trip.start_time).toLocaleString() : '',
      parseFloat(trip.distance || 0).toFixed(1),
      trip.duration ? `${Math.floor(trip.duration / 3600)}h ${Math.floor((trip.duration % 3600) / 60)}m` : '0',
      `${trip.max_speed || 0} km/h`
    ];
    row.forEach((cell, i) => { doc.text(cell, x, doc.y, { width: colWidths[i] }); x += colWidths[i]; });
    doc.moveDown(0.5);
  });

  doc.end();
}

async function exportTripsExcel(res, trips) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Trips Report');

  sheet.columns = [
    { header: 'Vehicle', key: 'vehicle_name', width: 20 },
    { header: 'Plate Number', key: 'plate_number', width: 15 },
    { header: 'Driver', key: 'driver_name', width: 20 },
    { header: 'Start Time', key: 'start_time', width: 20 },
    { header: 'End Time', key: 'end_time', width: 20 },
    { header: 'Distance (km)', key: 'distance', width: 15 },
    { header: 'Duration (min)', key: 'duration_min', width: 15 },
    { header: 'Max Speed (km/h)', key: 'max_speed', width: 18 },
    { header: 'Avg Speed (km/h)', key: 'avg_speed', width: 18 },
    { header: 'Start Address', key: 'start_address', width: 30 },
    { header: 'End Address', key: 'end_address', width: 30 }
  ];

  // Style header row
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  trips.forEach(trip => {
    sheet.addRow({
      ...trip,
      duration_min: trip.duration ? Math.round(trip.duration / 60) : 0,
      distance: parseFloat(trip.distance || 0).toFixed(2)
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=trips-report.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}

async function exportSpeedExcel(res, violations) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Speed Violations');

  sheet.columns = [
    { header: 'Vehicle', key: 'vehicle_name', width: 20 },
    { header: 'Plate Number', key: 'plate_number', width: 15 },
    { header: 'Driver', key: 'driver_name', width: 20 },
    { header: 'Speed (km/h)', key: 'speed', width: 15 },
    { header: 'Max Allowed', key: 'max_speed', width: 15 },
    { header: 'Date/Time', key: 'created_at', width: 20 },
    { header: 'Latitude', key: 'latitude', width: 15 },
    { header: 'Longitude', key: 'longitude', width: 15 }
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

  violations.forEach(v => sheet.addRow(v));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=speed-violations.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = router;
