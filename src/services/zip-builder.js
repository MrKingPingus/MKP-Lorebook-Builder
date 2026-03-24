// Construct a valid ZIP binary with CRC32 checksums, local file headers, and central directory record

// CRC32 lookup table
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16LE(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32LE(view, offset, value) {
  view.setUint32(offset, value, true);
}

const encoder = new TextEncoder();

function encode(str) {
  return encoder.encode(str);
}

/**
 * Build a ZIP Blob from an array of { name, data } objects.
 * `data` should be a string or Uint8Array.
 */
export function buildZip(files) {
  const encodedFiles = files.map(({ name, data }) => ({
    nameBytes: encode(name),
    dataBytes: typeof data === 'string' ? encode(data) : data,
  }));

  // Build local file entries
  const localEntries = [];
  let offset = 0;

  for (const { nameBytes, dataBytes } of encodedFiles) {
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header: 30 bytes + name
    const header = new ArrayBuffer(30 + nameBytes.length);
    const view = new DataView(header);
    writeUint32LE(view, 0,  0x04034b50); // local file header signature
    writeUint16LE(view, 4,  20);          // version needed
    writeUint16LE(view, 6,  0);           // general purpose bit flag
    writeUint16LE(view, 8,  0);           // compression method (stored)
    writeUint16LE(view, 10, 0);           // last mod file time
    writeUint16LE(view, 12, 0);           // last mod file date
    writeUint32LE(view, 14, crc);         // crc-32
    writeUint32LE(view, 18, size);        // compressed size
    writeUint32LE(view, 22, size);        // uncompressed size
    writeUint16LE(view, 26, nameBytes.length); // file name length
    writeUint16LE(view, 28, 0);           // extra field length
    new Uint8Array(header, 30).set(nameBytes);

    localEntries.push({ headerBuffer: header, dataBytes, crc, size, nameBytes, offset });
    offset += header.byteLength + size;
  }

  // Build central directory
  const centralEntries = [];
  for (const { nameBytes, crc, size, offset: localOffset } of localEntries) {
    const entry = new ArrayBuffer(46 + nameBytes.length);
    const view = new DataView(entry);
    writeUint32LE(view, 0,  0x02014b50); // central dir signature
    writeUint16LE(view, 4,  20);          // version made by
    writeUint16LE(view, 6,  20);          // version needed
    writeUint16LE(view, 8,  0);           // general purpose bit flag
    writeUint16LE(view, 10, 0);           // compression method
    writeUint16LE(view, 12, 0);           // last mod file time
    writeUint16LE(view, 14, 0);           // last mod file date
    writeUint32LE(view, 16, crc);
    writeUint32LE(view, 20, size);        // compressed size
    writeUint32LE(view, 24, size);        // uncompressed size
    writeUint16LE(view, 28, nameBytes.length);
    writeUint16LE(view, 30, 0);           // extra field length
    writeUint16LE(view, 32, 0);           // file comment length
    writeUint16LE(view, 34, 0);           // disk number start
    writeUint16LE(view, 36, 0);           // internal attributes
    writeUint32LE(view, 38, 0);           // external attributes
    writeUint32LE(view, 42, localOffset); // offset of local header
    new Uint8Array(entry, 46).set(nameBytes);
    centralEntries.push(entry);
  }

  const centralSize = centralEntries.reduce((s, e) => s + e.byteLength, 0);
  const centralOffset = offset;

  // End of central directory record
  const eocd = new ArrayBuffer(22);
  const eocdView = new DataView(eocd);
  writeUint32LE(eocdView, 0,  0x06054b50);          // EOCD signature
  writeUint16LE(eocdView, 4,  0);                    // disk number
  writeUint16LE(eocdView, 6,  0);                    // disk with start of CD
  writeUint16LE(eocdView, 8,  localEntries.length);  // entries on this disk
  writeUint16LE(eocdView, 10, localEntries.length);  // total entries
  writeUint32LE(eocdView, 12, centralSize);          // size of central directory
  writeUint32LE(eocdView, 16, centralOffset);        // offset of central directory
  writeUint16LE(eocdView, 20, 0);                    // comment length

  const parts = [
    ...localEntries.flatMap(({ headerBuffer, dataBytes }) => [headerBuffer, dataBytes]),
    ...centralEntries,
    eocd,
  ];

  return new Blob(parts, { type: 'application/zip' });
}
