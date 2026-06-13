# Fleet Management API Documentation

Base URL: `https://yourdomain.com/api`

All endpoints (except auth) require: `Authorization: Bearer <token>`

---

## Authentication

### POST /auth/login
```json
Request:  { "email": "admin@fleet.com", "password": "Admin@123456" }
Response: { "success": true, "data": { "accessToken": "...", "refreshToken": "...", "user": {...} } }
```

### POST /auth/refresh
```json
Request:  { "refreshToken": "..." }
Response: { "success": true, "data": { "accessToken": "..." } }
```

### GET /auth/me
Returns current user profile.

---

## Vehicles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /vehicles | List all vehicles |
| GET | /vehicles/:id | Get vehicle details |
| POST | /vehicles | Create vehicle |
| PUT | /vehicles/:id | Update vehicle |
| DELETE | /vehicles/:id | Delete vehicle |
| GET | /vehicles/:id/history | Position history |
| GET | /vehicles/:id/trips | Trip history |

### Query params for GET /vehicles:
- `search` - Search by name or plate
- `group_id` - Filter by group
- `page`, `limit` - Pagination

---

## Real-time Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tracking/live | All vehicles live positions |
| GET | /tracking/vehicle/:id/live | Single vehicle live |
| GET | /tracking/stats | Dashboard statistics |

---

## Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /alerts | List alerts |
| PUT | /alerts/:id/read | Mark as read |
| PUT | /alerts/read-all | Mark all as read |
| GET | /alerts/configs | Alert configurations |
| POST | /alerts/configs | Create alert config |
| DELETE | /alerts/configs/:id | Delete config |

### Alert Types:
- `speed` - Speed exceeded
- `geofence_enter` - Entered geofence
- `geofence_exit` - Exited geofence
- `disconnect` - Device disconnected
- `engine_on` / `engine_off` - Engine status
- `low_fuel` - Low fuel level

---

## Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /reports/trips | Trip report |
| GET | /reports/speed-violations | Speed violations |
| GET | /reports/engine-hours | Engine hours |
| GET | /reports/geofence | Geofence events |

### Query params:
- `from`, `to` - Date range (ISO format)
- `vehicle_id` - Filter by vehicle
- `format` - `pdf` or `excel` for export

---

## Geofences

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /geofences | List geofences |
| GET | /geofences/:id | Get geofence |
| POST | /geofences | Create geofence |
| PUT | /geofences/:id | Update geofence |
| DELETE | /geofences/:id | Delete geofence |

---

## WebSocket

Connect: `wss://yourdomain.com/ws?token=<accessToken>`

### Events received:
```json
{ "type": "position_update", "data": { "vehicleId": "...", "latitude": 24.7, "longitude": 46.6, "speed": 60, "status": "moving" } }
{ "type": "new_alert", "data": { "id": "...", "alertType": "speed", "title": "Speed Alert", "vehicleId": "..." } }
{ "type": "connected", "message": "Real-time tracking active" }
```

---

## GPS HTTP Endpoint (for devices)

### POST /gps/data
```json
{
  "imei": "123456789012345",
  "lat": 24.7136,
  "lng": 46.6753,
  "speed": 60,
  "heading": 180,
  "timestamp": 1700000000,
  "fuel": 75,
  "engine": 1,
  "satellites": 8
}
```
