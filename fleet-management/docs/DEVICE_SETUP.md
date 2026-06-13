# GPS Device Configuration Guide
# دليل ضبط أجهزة GPS

## Server Connection Details / بيانات الاتصال بالسيرفر

```
TCP Server:  yourdomain.com : 5000
MQTT Broker: yourdomain.com : 1883
HTTP URL:    https://yourdomain.com/gps/data
```

---

## Teltonika FMB920 / FMB140 Configuration

### Via Teltonika Configurator:

1. Open **Teltonika Configurator** software
2. Connect device via USB
3. Go to **GPRS** settings:
   - **APN**: Your SIM card APN
   - **Server IP/Domain**: `yourdomain.com`
   - **Server Port**: `5000`
   - **Protocol**: TCP
4. Go to **Data Acquisition**:
   - **Min Period**: 30 seconds (while moving)
   - **Min Saved Records**: 1
5. **Save & Send** configuration

### SMS Configuration (alternative):
```
setparam 2001:yourdomain.com;2002:5000;2003:0
```

---

## Concox GT06 / GT02 Configuration

Send SMS commands to the device SIM:

```
# Set server IP and port
SERVER,0,yourdomain.com,5000,0#

# Set APN
APN,your_apn_name#

# Set upload interval (30 seconds)
TIMER,30#

# Check status
STATUS#
```

---

## Queclink GV20 / GV300 Configuration

```
# Set server
AT+GTFRI=gv20,,,,,,,,,yourdomain.com,5000,,,,,,,,0001$

# Set report interval
AT+GTFRI=gv20,,,,30,,,,,,,,,,,,,,0002$
```

---

## HTTP Protocol (Generic Devices)

Devices that support HTTP can POST to:

```
POST https://yourdomain.com/gps/data
Content-Type: application/json

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

---

## MQTT Protocol

```
Topic: devices/{IMEI}/data
Payload (JSON):
{
  "lat": 24.7136,
  "lng": 46.6753,
  "speed": 60,
  "heading": 180,
  "engine": 1,
  "fuel": 75,
  "timestamp": 1700000000
}
```

---

## Adding Device to System / إضافة الجهاز للنظام

1. Login to the web dashboard
2. Go to **Vehicles** → Add Vehicle
3. After creating the vehicle, the system auto-creates a device slot
4. Or go to API: `POST /api/devices` with the IMEI number
5. Assign the device to a vehicle

---

## Troubleshooting / استكشاف الأخطاء

| Problem | Solution |
|---------|----------|
| Device not connecting | Check firewall port 5000 is open |
| No data received | Verify IMEI is registered in system |
| Wrong position | Check GPS antenna placement |
| Delayed updates | Reduce report interval in device config |
