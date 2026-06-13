/**
 * Teltonika FMB/FMT Series Protocol Parser
 * Supports: FMB920, FMB140, FMT100, FMC130, etc.
 * Protocol: Codec 8, Codec 8 Extended, Codec 16
 */

/**
 * Parse Teltonika binary data
 * @param {Buffer} buffer - Raw TCP buffer
 * @returns {Object} Parsed data with type and positions
 */
const parseTeltonika = (buffer) => {
  try {
    // IMEI login packet: starts with 0x00 0x0F followed by 15-digit IMEI
    if (buffer[0] === 0x00 && buffer[1] === 0x0F && buffer.length >= 17) {
      const imei = buffer.slice(2, 17).toString('ascii');
      if (/^\d{15}$/.test(imei)) {
        return { type: 'login', imei };
      }
    }

    // Data packet: starts with 0x00 0x00 0x00 0x00 (preamble)
    if (buffer.length >= 12 &&
        buffer[0] === 0x00 && buffer[1] === 0x00 &&
        buffer[2] === 0x00 && buffer[3] === 0x00) {

      const dataLength = buffer.readUInt32BE(4);
      if (buffer.length < dataLength + 8) return null; // Wait for more data

      const codecId = buffer[8];
      const recordCount = buffer[9];
      const positions = [];

      let offset = 10;

      for (let i = 0; i < recordCount; i++) {
        const pos = parseRecord(buffer, offset, codecId);
        if (pos) {
          positions.push(pos.data);
          offset = pos.nextOffset;
        }
      }

      return { type: 'data', positions };
    }

    return null;
  } catch (error) {
    return null;
  }
};

function parseRecord(buffer, offset, codecId) {
  try {
    // Timestamp (8 bytes, milliseconds since epoch)
    const timestamp = Number(buffer.readBigUInt64BE(offset));
    offset += 8;

    // Priority (1 byte)
    const priority = buffer[offset++];

    // GPS Element
    const longitude = buffer.readInt32BE(offset) / 10000000;
    offset += 4;
    const latitude = buffer.readInt32BE(offset) / 10000000;
    offset += 4;
    const altitude = buffer.readInt16BE(offset);
    offset += 2;
    const heading = buffer.readUInt16BE(offset);
    offset += 2;
    const satellites = buffer[offset++];
    const speed = buffer.readUInt16BE(offset);
    offset += 2;

    // IO Elements
    const eventId = codecId === 0x8E ? buffer.readUInt16BE(offset) : buffer[offset];
    offset += codecId === 0x8E ? 2 : 1;

    const totalElements = codecId === 0x8E ? buffer.readUInt16BE(offset) : buffer[offset];
    offset += codecId === 0x8E ? 2 : 1;

    let engineStatus = false;
    let ignition = false;
    let fuelLevel = null;
    let odometer = null;

    // Parse 1-byte IO elements
    const count1 = codecId === 0x8E ? buffer.readUInt16BE(offset) : buffer[offset];
    offset += codecId === 0x8E ? 2 : 1;
    for (let j = 0; j < count1; j++) {
      const ioId = codecId === 0x8E ? buffer.readUInt16BE(offset) : buffer[offset];
      offset += codecId === 0x8E ? 2 : 1;
      const ioVal = buffer[offset++];
      if (ioId === 239) ignition = ioVal === 1;      // Ignition IO
      if (ioId === 1) engineStatus = ioVal === 1;    // Digital Input 1
    }

    // Parse 2-byte IO elements
    const count2 = codecId === 0x8E ? buffer.readUInt16BE(offset) : buffer[offset];
    offset += codecId === 0x8E ? 2 : 1;
    for (let j = 0; j < count2; j++) {
      const ioId = codecId === 0x8E ? buffer.readUInt16BE(offset) : buffer[offset];
      offset += codecId === 0x8E ? 2 : 1;
      const ioVal = buffer.readUInt16BE(offset);
      offset += 2;
      if (ioId === 9) fuelLevel = (ioVal / 10);     // Fuel level %
    }

    // Parse 4-byte IO elements
    const count4 = codecId === 0x8E ? buffer.readUInt16BE(offset) : buffer[offset];
    offset += codecId === 0x8E ? 2 : 1;
    for (let j = 0; j < count4; j++) {
      const ioId = codecId === 0x8E ? buffer.readUInt16BE(offset) : buffer[offset];
      offset += codecId === 0x8E ? 2 : 1;
      const ioVal = buffer.readUInt32BE(offset);
      offset += 4;
      if (ioId === 16) odometer = ioVal / 1000;     // Odometer in km
    }

    // Skip 8-byte IO elements
    const count8 = codecId === 0x8E ? buffer.readUInt16BE(offset) : buffer[offset];
    offset += codecId === 0x8E ? 2 : 1;
    offset += count8 * (codecId === 0x8E ? 10 : 9);

    return {
      data: {
        latitude,
        longitude,
        altitude,
        speed,
        heading,
        satellites,
        engineStatus: engineStatus || ignition,
        ignition,
        fuelLevel,
        odometer,
        deviceTime: new Date(timestamp)
      },
      nextOffset: offset
    };
  } catch {
    return null;
  }
}

module.exports = { parseTeltonika };
