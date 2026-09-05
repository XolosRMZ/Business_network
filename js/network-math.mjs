// Geometry shared by the renderer and its CPU projection for accessible HTML nodes.
export const CAMERA = 6.4;
export const FOCAL = 2.25;
export const NODE_POSITIONS = Array.from({ length: 6 }, (_, i) => {
  const angle = i * Math.PI / 3 + .35;
  return [Math.cos(angle) * 2.15, Math.sin(angle) * 1.9, Math.sin(angle * 2) * .55];
});
export function rotate([x, y, z], yaw, pitch) {
  const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
  const rz = -x * Math.sin(yaw) + z * Math.cos(yaw);
  return [rx, y * Math.cos(pitch) - rz * Math.sin(pitch), y * Math.sin(pitch) + rz * Math.cos(pitch)];
}
export function project(point, yaw, pitch, width, height) {
  const [x, y, z] = rotate(point, yaw, pitch);
  const scale = FOCAL * height / (2 * (CAMERA - z));
  return [width / 2 + x * scale, height / 2 - y * scale, z];
}
export const normalize = v => {
  const length = Math.hypot(...v) || 1;
  return v.map(n => n / length);
};
export function icosphere(radius = 1.34) {
  const t = (1 + Math.sqrt(5)) / 2;
  const vertices = [[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(normalize);
  const faces = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  const triangles = [];
  for (const face of faces) {
    const [a,b,c] = face.map(i => vertices[i]);
    const middle = (p,q) => normalize(p.map((v,i) => (v + q[i]) / 2));
    const ab = middle(a,b), bc = middle(b,c), ca = middle(c,a);
    for (const tri of [[a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]]) triangles.push(tri.map(v => v.map(n => n * radius)));
  }
  return triangles;
}
export function normal([a,b,c]) {
  const u = b.map((v,i) => v-a[i]), v = c.map((n,i) => n-a[i]);
  return normalize([u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]);
}
// Keep every 44px HTML target inside the canvas and separate overlapping projections.
export function layoutNodes(points, width, height, gap = 48) {
  const margin = 25;
  const clamp = (n,max) => Math.max(margin, Math.min(max-margin,n));
  const result = points.map(([x,y,z]) => [clamp(x,width),clamp(y,height),z]);
  for (let pass=0; pass<16; pass++) {
    for (let i=0;i<result.length;i++) for (let j=i+1;j<result.length;j++) {
      const a=result[i],b=result[j];
      let dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);
      if (d>=gap) continue;
      if (d<.01) { dx=1; dy=0; d=1; }
      const push=(gap-d)/2;
      a[0]=clamp(a[0]-dx/d*push,width); a[1]=clamp(a[1]-dy/d*push,height);
      b[0]=clamp(b[0]+dx/d*push,width); b[1]=clamp(b[1]+dy/d*push,height);
    }
  }
  return result;
}
