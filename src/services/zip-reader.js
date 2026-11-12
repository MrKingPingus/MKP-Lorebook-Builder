// Read a ZIP archive into its files. The counterpart to zip-builder.js.
//
// Our own archives store files uncompressed, which needs no decoder at all.
// A backup that someone unpacked and zipped up again will be deflated, so that
// is handled too, through the browser's DecompressionStream. Anything else
// (encryption, ZIP64, other methods) is refused with a plain message.

const SIG_END     = 0x06054b50; // end of central directory
const SIG_CENTRAL = 0x02014b50; // one central directory record
const SIG_LOCAL   = 0x04034b50; // one local file header
const METHOD_STORED  = 0;
const METHOD_DEFLATE = 8;

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot open a compressed zip. Use the backup file exactly as it was downloaded.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * @param {ArrayBuffer} buffer
 * @returns {Promise<Array<{ name: string, data: Uint8Array }>>}
 */
export async function readZip(buffer) {
  const bytes = new Uint8Array(buffer);
  const view  = new DataView(buffer);

  // The end record sits at the tail, after an optional comment of up to 64 KiB.
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === SIG_END) { end = i; break; }
  }
  if (end === -1) throw new Error('That file is not a zip archive.');

  const count = view.getUint16(end + 10, true);
  let at      = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const files = [];

  for (let n = 0; n < count; n++) {
    if (view.getUint32(at, true) !== SIG_CENTRAL) throw new Error('The zip archive is damaged.');
    const flags      = view.getUint16(at + 8, true);
    const method     = view.getUint16(at + 10, true);
    const packedSize = view.getUint32(at + 20, true);
    const nameLen    = view.getUint16(at + 28, true);
    const extraLen   = view.getUint16(at + 30, true);
    const commentLen = view.getUint16(at + 32, true);
    const localAt    = view.getUint32(at + 42, true);
    const name       = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLen));
    at += 46 + nameLen + extraLen + commentLen;

    if (name.endsWith('/')) continue; // a folder record, not a file
    if (flags & 1) throw new Error('The zip archive is password-protected.');
    if (view.getUint32(localAt, true) !== SIG_LOCAL) throw new Error('The zip archive is damaged.');

    const dataAt = localAt + 30 + view.getUint16(localAt + 26, true) + view.getUint16(localAt + 28, true);
    const packed = bytes.subarray(dataAt, dataAt + packedSize);

    if (method === METHOD_STORED)       files.push({ name, data: packed });
    else if (method === METHOD_DEFLATE) files.push({ name, data: await inflateRaw(packed) });
    else throw new Error(`The zip archive uses a compression this builder cannot read (method ${method}).`);
  }
  return files;
}
