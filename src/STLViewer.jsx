import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Box, RotateCcw, Grid3x3, X, Move3d } from 'lucide-react';

const FF = "'Share Tech Mono','Courier New',monospace";

const S = {
  panel: { background:"rgba(13,18,24,0.85)", border:"1px solid rgba(0,200,255,0.2)", borderRadius:4, padding:"18px 20px", marginBottom:16 },
  lbl:   { fontSize:11, letterSpacing:"0.25em", color:"#3A6A7A", marginBottom:12, textTransform:"uppercase" },
  btn:   (active, c="#00C8FF") => ({
    background: active ? `rgba(${c==="#00C8FF"?"0,200,255":c==="#FF6B35"?"255,107,53":"167,139,250"},0.12)` : "transparent",
    border: `1px solid ${active ? c : "rgba(0,200,255,0.15)"}`,
    color: active ? c : "#4A7A8A",
    borderRadius:3, padding:"7px 14px", cursor:"pointer", fontSize:12, fontFamily:FF, letterSpacing:"0.1em",
    display:"flex", alignItems:"center", gap:5, transition:"all 0.15s",
  }),
};

export default function STLViewer() {
  const mountRef      = useRef(null);
  const rendererRef   = useRef(null);
  const sceneRef      = useRef(null);
  const cameraRef     = useRef(null);
  const controlsRef   = useRef(null);
  const meshRef       = useRef(null);
  const frameRef      = useRef(null);

  const [loaded,      setLoaded]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [drag,        setDrag]        = useState(false);
  const [autoRotate,  setAutoRotate]  = useState(true);
  const [wireframe,   setWireframe]   = useState(false);
  const [info,        setInfo]        = useState(null);

  // Init Three.js
  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth || 700;
    const H = 420;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080B0F');
    scene.fog = new THREE.Fog('#080B0F', 400, 900);
    sceneRef.current = scene;

    // Grid
    const grid = new THREE.GridHelper(300, 30, '#0A2030', '#071018');
    grid.position.y = -55;
    scene.add(grid);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 5000);
    camera.position.set(0, 60, 180);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight(0x1A2A3A, 4);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0x00AADD, 5);
    key.position.set(150, 200, 150);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xFF6B35, 2);
    fill.position.set(-150, 50, -100);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xA78BFA, 1.5);
    rim.position.set(0, -100, -200);
    scene.add(rim);

    // Shadow plane
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x050810, roughness: 1 })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -55;
    plane.receiveShadow = true;
    scene.add(plane);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;
    controls.minDistance = 30;
    controls.maxDistance = 600;
    controlsRef.current = controls;

    // Animate
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const W = el.clientWidth;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frameRef.current);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  // Sync autoRotate
  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  // Sync wireframe
  useEffect(() => {
    if (meshRef.current) meshRef.current.material.wireframe = wireframe;
  }, [wireframe]);

  const loadSTL = useCallback((file) => {
    if (!sceneRef.current || !file) return;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const loader = new STLLoader();
        const geometry = loader.parse(e.target.result);

        // Remove old mesh
        if (meshRef.current) {
          sceneRef.current.remove(meshRef.current);
          meshRef.current.geometry.dispose();
          meshRef.current.material.dispose();
          meshRef.current = null;
        }

        // Center + normalize scale
        geometry.computeBoundingBox();
        const box  = geometry.boundingBox;
        const center = new THREE.Vector3();
        box.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);

        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const normScale = 100 / maxDim;
        geometry.scale(normScale, normScale, normScale);

        // Re-check bounds after scale
        geometry.computeBoundingBox();
        const newBox = geometry.boundingBox;
        const newSize = new THREE.Vector3();
        newBox.getSize(newSize);
        // Sit on grid
        geometry.translate(0, -newBox.min.y - 55, 0);

        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
          color:     0x0D2A3F,
          emissive:  0x020810,
          specular:  0x00C8FF,
          shininess: 80,
          wireframe: false,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        sceneRef.current.add(mesh);
        meshRef.current = mesh;

        // Reset camera
        if (controlsRef.current) controlsRef.current.reset();

        // Info
        const triCount = geometry.index
          ? geometry.index.count / 3
          : geometry.attributes.position.count / 3;

        setInfo({
          name:      file.name.replace(/\.stl$/i, ''),
          size:      (file.size / 1024).toFixed(0),
          tris:      Math.round(triCount).toLocaleString('ru-RU'),
          dims:      `${(size.x).toFixed(1)} × ${(size.y).toFixed(1)} × ${(size.z).toFixed(1)} мм`,
        });

        setLoaded(true);
        setLoading(false);
        setAutoRotate(true);
      } catch (err) {
        console.error('STL parse error:', err);
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.toLowerCase().endsWith('.stl')) loadSTL(f);
  };

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.stl';
    input.onchange = (e) => { if (e.target.files[0]) loadSTL(e.target.files[0]); };
    input.click();
  };

  const resetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      cameraRef.current.position.set(0, 60, 180);
    }
  };

  const closeModel = () => {
    if (meshRef.current && sceneRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      meshRef.current.material.dispose();
      meshRef.current = null;
    }
    setLoaded(false);
    setInfo(null);
  };

  return (
    <div style={S.panel}>
      <div style={S.lbl}>▸ STL ПРЕВЬЮЕР</div>

      {/* Drop zone — shown when no model */}
      {!loaded && !loading && (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={handleClick}
          style={{
            border: `1px dashed ${drag ? "#00C8FF" : "rgba(0,200,255,0.2)"}`,
            borderRadius: 4, padding: "48px 20px", textAlign: "center", cursor: "pointer",
            background: drag ? "rgba(0,200,255,0.05)" : "rgba(0,0,0,0.2)", transition:"all 0.15s",
          }}
        >
          <Box size={36} color={drag ? "#00C8FF" : "#1A4A5A"} style={{ margin:"0 auto 12px" }}/>
          <div style={{ fontSize:14, color: drag?"#00C8FF":"#4A7A8A", letterSpacing:"0.12em" }}>
            {drag ? "ОТПУСТИ ФАЙЛ" : "ПЕРЕТАЩИ .STL ФАЙЛ"}
          </div>
          <div style={{ fontSize:11, color:"#2A4A5A", marginTop:5 }}>или нажми для выбора</div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding:"60px 20px", textAlign:"center", color:"#3A6A7A", fontSize:12, letterSpacing:"0.2em" }}>
          ЗАГРУЗКА МОДЕЛИ...
        </div>
      )}

      {/* Three.js canvas mount — always in DOM for init */}
      <div
        ref={mountRef}
        style={{
          width:"100%", borderRadius:4, overflow:"hidden",
          border: loaded ? "1px solid rgba(0,200,255,0.15)" : "none",
          display: loaded ? "block" : "none",
        }}
      />

      {/* Controls bar */}
      {loaded && info && (
        <div style={{ marginTop:12 }}>
          {/* Info row */}
          <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:10, padding:"8px 12px", background:"rgba(0,0,0,0.3)", borderRadius:3 }}>
            <span style={{ fontSize:13, color:"#00C8FF", letterSpacing:"0.06em" }}>{info.name}</span>
            <span style={{ fontSize:11, color:"#3A6A7A" }}>{info.size} KB</span>
            <span style={{ fontSize:11, color:"#3A6A7A" }}>▲ {info.tris} треуг.</span>
            <span style={{ fontSize:11, color:"#3A6A7A" }}>⬛ {info.dims}</span>
          </div>
          {/* Button row */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button style={S.btn(autoRotate)} onClick={() => setAutoRotate(a=>!a)}>
              <RotateCcw size={13}/> {autoRotate ? "СТОП" : "АВТО"}
            </button>
            <button style={S.btn(wireframe, "#FF6B35")} onClick={() => setWireframe(w=>!w)}>
              <Grid3x3 size={13}/> СЕТКА
            </button>
            <button style={S.btn(false)} onClick={resetView}>
              <Move3d size={13}/> СБРОС КАМЕРЫ
            </button>
            <button
              style={{ ...S.btn(false), marginLeft:"auto", borderColor:"rgba(255,74,74,0.2)", color:"#FF4A4A" }}
              onClick={closeModel}
            >
              <X size={13}/> ЗАКРЫТЬ
            </button>
          </div>
          <div style={{ fontSize:10, color:"#1A3A4A", marginTop:8, letterSpacing:"0.1em" }}>
            ЛКМ — вращение &nbsp;·&nbsp; ПКМ — панорама &nbsp;·&nbsp; КОЛЁСИКО — зум
          </div>
        </div>
      )}
    </div>
  );
}
