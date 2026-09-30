/**
 * Three.js 렌더링 전담. 코어(core/*)는 이 파일을 모르고, 이 파일은 UI 를 모른다.
 * 입력은 core/geometry.js 가 만든 {positions, normals} 뿐이다.
 *
 * 'three' 는 npm 패키지(three@0.161.0)를 쓴다. 번들러가 없으므로 index.html 의
 * importmap 이 'three' / 'three/addons/' 를 node_modules 경로로 연결한다.
 * dispose() 는 렌더 루프·ResizeObserver·컨트롤·GPU 자원·캔버스를 모두 정리한다.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createViewer(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf1f3f2);

  const camera = new THREE.PerspectiveCamera(42, 1, 1, 8000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa89a, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(0.5, -1, 1.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-1, 0.6, 0.4);
  scene.add(fill);

  const material = new THREE.MeshStandardMaterial({
    color: 0x7f8f68, roughness: 0.75, metalness: 0.02,
    side: THREE.DoubleSide, flatShading: true,
  });

  const group = new THREE.Group();
  group.rotation.x = -Math.PI / 2;        // z-up 모델 → three 의 y-up 으로
  scene.add(group);

  const grid = new THREE.GridHelper(1000, 40, 0xc3ccc3, 0xdde2dd);
  grid.position.y = -0.01;
  scene.add(grid);

  let mesh = null;
  let geom = null;

  function update(data) {
    if (mesh) { group.remove(mesh); geom.dispose(); }
    geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    const [w, d] = data.stats.size;
    geom.translate(-w / 2, -d / 2, 0);    // 원점 중심으로
    mesh = new THREE.Mesh(geom, material);
    group.add(mesh);
    grid.scale.setScalar(Math.max(1, Math.max(w, d) / 400));
  }

  function frame(data) {
    const [w, d, h] = data.stats.size;
    const r = Math.hypot(w, d, h) * 0.62;
    const dist = r / Math.sin((camera.fov * Math.PI / 180) / 2);
    camera.position.set(dist * 0.42, dist * 0.52, dist * 0.62);
    controls.target.set(0, h / 2, 0);
    camera.near = dist / 100; camera.far = dist * 20;
    camera.updateProjectionMatrix();
    controls.update();
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);   // CSS 크기까지 갱신해야 컨테이너를 안 넘친다
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let raf = 0;
  (function loop() {
    raf = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  })();

  function dispose() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    controls.dispose();
    if (geom) geom.dispose();
    material.dispose();
    grid.geometry.dispose();
    grid.material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return {
    update, frame, resize,
    setWireframe: on => { material.wireframe = on; },
    dispose,
  };
}
