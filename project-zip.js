(function (global) {
  'use strict';

  const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;
  const MAX_PROJECT_BYTES = 16 * 1024 * 1024;
  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const MAX_ENTRIES = 500;
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let value = n;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    crcTable[n] = value >>> 0;
  }

  function crc32(bytes) {
    let value = 0xffffffff;
    for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
    return (value ^ 0xffffffff) >>> 0;
  }

  function decodeName(bytes) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { return new TextDecoder('windows-1252').decode(bytes); }
  }

  function normalizePath(raw) {
    const path = raw.replace(/\\/g, '/');
    if (!path || path.startsWith('/') || /^[a-z]:/i.test(path) || path.includes('\0')) throw new Error('O ZIP contém um caminho de arquivo inválido.');
    const parts = path.split('/').filter(part => part && part !== '.');
    if (!parts.length || parts.some(part => part === '..')) throw new Error('O ZIP contém um caminho que sai da pasta do projeto.');
    const normalized = parts.join('/');
    if (normalized.length > 240) throw new Error('O ZIP contém um nome de arquivo muito longo.');
    return normalized;
  }

  async function inflateRaw(compressed, expectedSize) {
    if (typeof DecompressionStream !== 'function') throw new Error('Este navegador não oferece suporte à descompactação ZIP. Atualize o Chrome e tente novamente.');
    let stream;
    try { stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw')); }
    catch { throw new Error('Não foi possível abrir a compressão deste ZIP neste navegador.'); }
    const reader = stream.getReader();
    const chunks = [];
    let length = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > MAX_FILE_BYTES || length > expectedSize) {
          await reader.cancel();
          throw new Error('O ZIP contém um arquivo que ultrapassa o limite permitido.');
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const result = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
  }

  async function extract(file) {
    if (!file || !/\.zip$/i.test(file.name || '')) throw new Error('Selecione um arquivo .zip.');
    if (file.size > MAX_ARCHIVE_BYTES) throw new Error('O ZIP deve ter no máximo 25 MB.');
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const lowerBound = Math.max(0, bytes.length - 65557);
    let endOffset = -1;
    for (let offset = bytes.length - 22; offset >= lowerBound; offset--) {
      if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.length) {
        endOffset = offset;
        break;
      }
    }
    if (endOffset < 0) throw new Error('O arquivo não parece ser um ZIP válido ou está incompleto.');
    const disk = view.getUint16(endOffset + 4, true);
    const centralDisk = view.getUint16(endOffset + 6, true);
    const entriesOnDisk = view.getUint16(endOffset + 8, true);
    const entryCount = view.getUint16(endOffset + 10, true);
    const centralSize = view.getUint32(endOffset + 12, true);
    const centralOffset = view.getUint32(endOffset + 16, true);
    if (disk || centralDisk || entriesOnDisk !== entryCount) throw new Error('ZIP dividido em vários volumes não é compatível.');
    if (entryCount === 0 || entryCount > MAX_ENTRIES || centralOffset + centralSize > endOffset) throw new Error('O ZIP está vazio, corrompido ou contém arquivos demais.');
    if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw new Error('ZIP64 ainda não é compatível. Compacte o projeto como ZIP padrão.');

    const files = [];
    const seen = new Set();
    let cursor = centralOffset;
    let totalSize = 0;
    for (let index = 0; index < entryCount; index++) {
      if (cursor + 46 > centralOffset + centralSize || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('A lista de arquivos do ZIP está corrompida.');
      const flags = view.getUint16(cursor + 8, true);
      const method = view.getUint16(cursor + 10, true);
      const crc = view.getUint32(cursor + 16, true);
      const compressedSize = view.getUint32(cursor + 20, true);
      const uncompressedSize = view.getUint32(cursor + 24, true);
      const nameLength = view.getUint16(cursor + 28, true);
      const extraLength = view.getUint16(cursor + 30, true);
      const commentLength = view.getUint16(cursor + 32, true);
      const localOffset = view.getUint32(cursor + 42, true);
      const entryEnd = cursor + 46 + nameLength + extraLength + commentLength;
      if (entryEnd > centralOffset + centralSize) throw new Error('Um nome de arquivo do ZIP está incompleto.');
      const rawName = decodeName(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
      cursor = entryEnd;
      if (rawName.endsWith('/')) continue;
      const path = normalizePath(rawName);
      if (path.split('/').some(part => part === '__MACOSX' || part.startsWith('._'))) continue;
      if (flags & 1) throw new Error('O ZIP está protegido por senha. Remova a senha e tente novamente.');
      if (uncompressedSize > MAX_FILE_BYTES) throw new Error(`O arquivo "${path}" excede 8 MB.`);
      totalSize += uncompressedSize;
      if (totalSize > MAX_PROJECT_BYTES) throw new Error('Os arquivos do projeto descompactados ultrapassam 16 MB.');
      if (seen.has(path.toLowerCase())) throw new Error(`O ZIP contém nomes duplicados: ${path}.`);
      seen.add(path.toLowerCase());
      if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error(`O arquivo "${path}" está corrompido.`);
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const dataEnd = dataStart + compressedSize;
      if (dataEnd > bytes.length) throw new Error(`Os dados de "${path}" estão incompletos.`);
      const compressed = bytes.subarray(dataStart, dataEnd);
      let content;
      if (method === 0) content = compressed.slice();
      else if (method === 8) content = await inflateRaw(compressed, uncompressedSize);
      else throw new Error(`O ZIP usa uma compressão não compatível no arquivo "${path}".`);
      if (content.length !== uncompressedSize || crc32(content) !== crc) throw new Error(`Não foi possível validar o arquivo "${path}".`);
      files.push({ path, bytes: content });
    }
    if (!files.length) throw new Error('O ZIP não contém arquivos de projeto.');

    const firstSegments = files.map(entry => entry.path.split('/'));
    const wrapper = firstSegments.every(parts => parts.length > 1 && parts[0] === firstSegments[0][0]) ? firstSegments[0][0] : '';
    if (wrapper) files.forEach(entry => { entry.path = entry.path.slice(wrapper.length + 1); });
    return files;
  }

  global.LumaTexZip = Object.freeze({ extract });
})(window);
