/**
 * Concox/Queclink Protocol Parser
 * Supports: GT06, GT02, GV20, GV300, etc.
 * Protocol: GT06 binary protocol
 */

const parseConcox = (buffer) => {
  try {
    if (buffer.length < 10) return null;

    // Start bits: 0x78 0x78 (short) or 0x79 0x79 (long)
    const isLong = buffer[0] === 0x79 && buffer[1] === 0x79;
    const headerSize = isLong ? 4 : 3;

    const packetLength = isLong ? buffer.readUInt16BE(2) : buffer[2];
    const protocolNumber = buffer[headerSize];

    // Protocol 0x01 = Login packet
    if (protocolNumber === 0x01) {
      const imei = buffer.slice(headerSize + 1, headerSize + 9)
        .toString('hex')
        .replace(/^0+/, '');
      return { type: 'login', imei };
    }

    // Protocol 0x12 = GPS Location
    if (protocolNumber === 0x12) {
      const offset = headerSize + 1;
      const pos = parseGT06Location(buffer, offset);
      if (pos) return { type: 'data', positions: [pos] };
    }

    // Protocol 0x22 = GPS + LBS + Status
    if (protocolNumber === 0x22) {
      const offset = headerSize + 1;
      const pos = parseGT06Location(buffer, offset);
      if (pos) return { type: 'data', positions: [pos] };
    }

    return null;
  } catch {
    return null;
  }
};

function parseGT06Location(buffer, offset) {
  try {
    // Date/Time: YY MM DD HH MM SS
    const year = 2000 + buffer[offset];
    const month = buffer[offset + 1];
    const day = buffer[offset + 2];
    const hour = buffer[offset + 3];
    const minute = buffer[offset + 4];
    const second = buffer[offset + 5];
    offset += 6;

    const deviceTime = new Date(year, month - 1, day, hour, minute, second);

    // GPS info byte
    const gpsInfo = buffer[offset++];
    const satellites = gpsInfo & 0x0F;

    // Latitude (4 bytes, degrees * 30000)
    const latRaw = buffer.readUInt32BE(offset);
    offset += 4;
    const lngRaw = buffer.readUInt32BE(offset);
    offset += 4;

    let latitude = latRaw / 30000 / 60;
    let longitude = lngRaw / 30000 / 60;

    // Speed (1 byte, km/h)
    const speed = buffer[offset++];

    // Course/Status (2 bytes)
    const courseStatus = buffer.readUInt16BE(offset);
    offset += 2;

    // Direction flags
    const isNorth = (courseStatus & 0x0400) !== 0;
    const isEast = (courseStatus & 0x0800) !== 0;
    const isGPSReal = (courseStatus & 0x1000) !== 0;
    const heading = courseStatus & 0x03FF;

    if (!isNorth) latitude = -latitude;
    if (!isEast) longitude = -longitude;

    return {
      latitude,
      longitude,
      speed,
      heading,
      satellites,
      deviceTime,
      engineStatus: true // GT06 doesn't always send engine status in location packet
    };
  } catch {
    return null;
  }
}

module.exports = { parseConcox };
