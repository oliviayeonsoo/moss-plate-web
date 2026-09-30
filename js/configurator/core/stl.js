/** 메시 → binary STL (ArrayBuffer) */
export function toBinarySTL(mesh, header = 'moss plate - parametric') {
  const n = mesh.triangleCount;
  const buf = new ArrayBuffer(84 + n * 50);
  const dv = new DataView(buf);
  const head = new Uint8Array(buf, 0, 80);
  for (let i = 0; i < Math.min(header.length, 79); i++) head[i] = header.charCodeAt(i) & 0x7f;
  dv.setUint32(80, n, true);

  let o = 84;
  for (let t = 0; t < n; t++) {
    const q = t * 9;
    dv.setFloat32(o, mesh.normals[q], true);
    dv.setFloat32(o + 4, mesh.normals[q + 1], true);
    dv.setFloat32(o + 8, mesh.normals[q + 2], true);
    o += 12;
    for (let v = 0; v < 9; v++) { dv.setFloat32(o, mesh.positions[q + v], true); o += 4; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return buf;
}

/** 브라우저에서 파일로 저장 */
export function downloadSTL(mesh, filename) {
  const blob = new Blob([toBinarySTL(mesh, filename)], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
