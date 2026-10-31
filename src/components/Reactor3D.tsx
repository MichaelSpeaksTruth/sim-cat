import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SimulationResult, AxialProfilePoint } from '../types/eurokin';
import {
  RotateCcw,
  Eye,
  Flame,
  Wind,
  Layers,
  ZoomIn,
  Crosshair,
  Play,
  Pause
} from 'lucide-react';

interface Reactor3DProps {
  simulation: SimulationResult;
  currentZNormalized?: number;
  onZNormalizedChange?: (zNorm: number) => void;
  onSelectPellet?: () => void;
  className?: string;
}

export const Reactor3D: React.FC<Reactor3DProps> = ({
  simulation,
  currentZNormalized = 0.5,
  onZNormalizedChange,
  onSelectPellet,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [showCutaway, setShowCutaway] = useState(true);
  const [showFlow, setShowFlow] = useState(true);
  const [showThermalOverlay, setShowThermalOverlay] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [flowSpeed, setFlowSpeed] = useState(1.0);
  const [cameraView, setCameraView] = useState<'isometric' | 'front' | 'side' | 'top'>('isometric');

  const { inputs, axialProfiles } = simulation;
  const bDilution = simulation.transport.volumetricDilutionFraction;

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const slicePlaneRef = useRef<THREE.Mesh | null>(null);
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const instancedPelletsRef = useRef<THREE.InstancedMesh | null>(null);

  // Auto-rotation ref for render loop
  const autoRotateRef = useRef(true);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Interaction controls
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const cameraRotation = useRef({ theta: Math.PI / 4, phi: Math.PI / 3.2, radius: 14 });

  // Update camera position from spherical coordinates
  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraRotation.current;
    const clampedPhi = Math.max(0.05, Math.min(Math.PI - 0.05, phi));
    cameraRef.current.position.x = radius * Math.sin(clampedPhi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.cos(clampedPhi);
    cameraRef.current.position.z = radius * Math.sin(clampedPhi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 0, 0);
  };

  const setPresetView = (view: 'isometric' | 'front' | 'side' | 'top') => {
    setCameraView(view);
    if (view === 'front') {
      cameraRotation.current = { theta: 0, phi: Math.PI / 2, radius: 13 };
    } else if (view === 'side') {
      cameraRotation.current = { theta: Math.PI / 2, phi: Math.PI / 2, radius: 13 };
    } else if (view === 'top') {
      cameraRotation.current = { theta: 0, phi: 0.05, radius: 14 };
    } else {
      cameraRotation.current = { theta: Math.PI / 4, phi: Math.PI / 3.2, radius: 14 };
    }
    updateCameraPosition();
  };

  const resetCamera = () => {
    setPresetView('isometric');
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xF8FAFC); // Clean crisp light background

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight1.position.set(12, 18, 12);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xdbeafe, 0.6);
    dirLight2.position.set(-12, 6, -10);
    scene.add(dirLight2);

    const accentLight = new THREE.PointLight(0x0284c7, 0.8, 25);
    accentLight.position.set(0, 5, 4);
    scene.add(accentLight);

    // 5. Materials
    const metalSteel = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.8,
      roughness: 0.25,
    });

    const flangeMetal = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.85,
      roughness: 0.3,
    });

    const glassWallMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      metalness: 0.05,
      roughness: 0.05,
      transmission: 0.85,
      thickness: 0.5,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });

    const coolingJacketMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      metalness: 0.2,
      roughness: 0.15,
      transmission: 0.75,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });

    const reactorGroup = new THREE.Group();
    scene.add(reactorGroup);

    // Reactor Dimensions
    const bedHeight = 6.0;
    const tubeRadius = 1.35;

    // A. Main Reactor Tube
    const vesselGeo = new THREE.CylinderGeometry(
      tubeRadius,
      tubeRadius,
      bedHeight,
      48,
      1,
      true,
      showCutaway ? Math.PI * 0.25 : 0,
      showCutaway ? Math.PI * 1.5 : Math.PI * 2
    );
    const vesselMesh = new THREE.Mesh(vesselGeo, glassWallMaterial);
    reactorGroup.add(vesselMesh);

    // B. Outer Cooling Jacket
    const jacketRadius = tubeRadius + 0.45;
    const jacketHeight = bedHeight * 0.75;
    const jacketGeo = new THREE.CylinderGeometry(
      jacketRadius,
      jacketRadius,
      jacketHeight,
      36,
      1,
      true,
      showCutaway ? Math.PI * 0.25 : 0,
      showCutaway ? Math.PI * 1.5 : Math.PI * 2
    );
    const jacketMesh = new THREE.Mesh(jacketGeo, coolingJacketMaterial);
    reactorGroup.add(jacketMesh);

    // Jacket End Plates
    const ringGeo = new THREE.RingGeometry(tubeRadius, jacketRadius, 36);
    const ringTop = new THREE.Mesh(ringGeo, flangeMetal);
    ringTop.rotation.x = -Math.PI / 2;
    ringTop.position.y = jacketHeight / 2;
    reactorGroup.add(ringTop);

    const ringBot = new THREE.Mesh(ringGeo, flangeMetal);
    ringBot.rotation.x = Math.PI / 2;
    ringBot.position.y = -jacketHeight / 2;
    reactorGroup.add(ringBot);

    // C. Top Inlet Reducer & Nozzle
    const topCapGeo = new THREE.ConeGeometry(tubeRadius, 1.0, 36, 1, true);
    const topCap = new THREE.Mesh(topCapGeo, metalSteel);
    topCap.position.y = bedHeight / 2 + 0.5;
    reactorGroup.add(topCap);

    const topNozzleGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.9, 24);
    const topNozzle = new THREE.Mesh(topNozzleGeo, metalSteel);
    topNozzle.position.y = bedHeight / 2 + 1.25;
    reactorGroup.add(topNozzle);

    const topFlangeGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.15, 24);
    const topFlange = new THREE.Mesh(topFlangeGeo, flangeMetal);
    topFlange.position.y = bedHeight / 2 + 1.65;
    reactorGroup.add(topFlange);

    // D. Bottom Outlet Conical Collector & Nozzle
    const botCapGeo = new THREE.ConeGeometry(tubeRadius, 1.0, 36, 1, true);
    const botCap = new THREE.Mesh(botCapGeo, metalSteel);
    botCap.rotation.z = Math.PI;
    botCap.position.y = -bedHeight / 2 - 0.5;
    reactorGroup.add(botCap);

    const botNozzleGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.9, 24);
    const botNozzle = new THREE.Mesh(botNozzleGeo, metalSteel);
    botNozzle.position.y = -bedHeight / 2 - 1.25;
    reactorGroup.add(botNozzle);

    const botFlangeGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.15, 24);
    const botFlange = new THREE.Mesh(botFlangeGeo, flangeMetal);
    botFlange.position.y = -bedHeight / 2 - 1.65;
    reactorGroup.add(botFlange);

    // E. Packed Bed Catalyst Pellets
    const pelletCount = 420;
    const pelletRadius = 0.088;
    const pelletGeo = new THREE.SphereGeometry(pelletRadius, 10, 8);
    const pelletMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.65,
      roughness: 0.35,
    });

    const instancedPellets = new THREE.InstancedMesh(pelletGeo, pelletMat, pelletCount);
    instancedPelletsRef.current = instancedPellets;

    const dummy = new THREE.Object3D();
    const colorActive = new THREE.Color(0x334155);
    const colorInert = new THREE.Color(0x94a3b8);
    const colorHeatMap = new THREE.Color();

    const minT = 600;
    const maxT = simulation.maxTemperature || 750;

    for (let i = 0; i < pelletCount; i++) {
      const theta = Math.random() * (showCutaway ? Math.PI * 1.5 : Math.PI * 2);
      const r = Math.sqrt(Math.random()) * (tubeRadius - 0.12);
      const px = r * Math.cos(theta);
      const pz = r * Math.sin(theta);
      const py = (Math.random() - 0.5) * (bedHeight - 0.2);

      dummy.position.set(px, py, pz);
      const randScale = 0.85 + Math.random() * 0.35;
      dummy.scale.set(randScale, randScale, randScale);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      dummy.updateMatrix();

      instancedPellets.setMatrixAt(i, dummy.matrix);

      const isInert = Math.random() < bDilution;

      if (showThermalOverlay && axialProfiles && axialProfiles.length > 0) {
        const normZ = Math.max(0, Math.min(1, 0.5 - (py / bedHeight)));
        const profileIdx = Math.floor(normZ * (axialProfiles.length - 1));
        const temp = axialProfiles[profileIdx]?.temperature || inputs.temperature;
        const tFraction = Math.max(0, Math.min(1, (temp - minT) / (maxT - minT || 1)));

        colorHeatMap.setHSL(0.55 - tFraction * 0.55, 0.9, 0.45);
        instancedPellets.setColorAt(i, colorHeatMap);
      } else {
        instancedPellets.setColorAt(i, isInert ? colorInert : colorActive);
      }
    }
    instancedPellets.instanceMatrix.needsUpdate = true;
    if (instancedPellets.instanceColor) instancedPellets.instanceColor.needsUpdate = true;
    reactorGroup.add(instancedPellets);

    // F. Interactive Axial Slice Marker Plane
    const sliceGeo = new THREE.CylinderGeometry(tubeRadius + 0.05, tubeRadius + 0.05, 0.03, 36);
    const sliceMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.75,
      wireframe: true,
    });
    const slicePlane = new THREE.Mesh(sliceGeo, sliceMat);
    slicePlaneRef.current = slicePlane;
    const initialY = (0.5 - currentZNormalized) * bedHeight;
    slicePlane.position.y = initialY;
    reactorGroup.add(slicePlane);

    // G. Animated Flow Particle System
    const particleCount = 280;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let p = 0; p < particleCount; p++) {
      const pTheta = Math.random() * Math.PI * 2;
      const pR = Math.sqrt(Math.random()) * (tubeRadius - 0.2);
      positions[p * 3] = pR * Math.cos(pTheta);
      positions[p * 3 + 1] = (Math.random() - 0.5) * (bedHeight + 2.0);
      positions[p * 3 + 2] = pR * Math.sin(pTheta);

      speeds[p] = 0.02 + Math.random() * 0.03;

      // Syngas (blue) to Ammonia (amber)
      colors[p * 3] = 0.05;
      colors[p * 3 + 1] = 0.55;
      colors[p * 3 + 2] = 0.95;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    particleSystemRef.current = particleSystem;
    reactorGroup.add(particleSystem);

    // H. Coordinate Grid / Baseline ring
    const baseGrid = new THREE.GridHelper(16, 16, 0xCBD5E1, 0xE2E8F0);
    baseGrid.position.y = -bedHeight / 2 - 2.5;
    scene.add(baseGrid);

    // Render loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Continuous Auto-Rotation when user is not actively dragging
      if (autoRotateRef.current && !isDragging.current) {
        cameraRotation.current.theta += delta * 0.32;
        updateCameraPosition();
      }

      // Flow particles animation
      if (showFlow && particleSystemRef.current) {
        const posAttr = particleSystemRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const colAttr = particleSystemRef.current.geometry.attributes.color as THREE.BufferAttribute;
        const posArray = posAttr.array as Float32Array;
        const colArray = colAttr.array as Float32Array;

        const effectiveSpeed = flowSpeed * (inputs.feedFlow * 1e5);

        for (let i = 0; i < particleCount; i++) {
          const idx = i * 3;
          posArray[idx + 1] -= (speeds[i] * 1.5 + effectiveSpeed * 0.02);

          const curY = posArray[idx + 1];
          const normZ = Math.max(0, Math.min(1, 0.5 - (curY / bedHeight)));

          // Blue (N2/H2) -> Amber/Orange (NH3)
          colArray[idx] = 0.05 + normZ * 0.85;
          colArray[idx + 1] = 0.55 - normZ * 0.25;
          colArray[idx + 2] = 0.95 - normZ * 0.85;

          // Wrap around to top inlet
          if (posArray[idx + 1] < -bedHeight / 2 - 1.2) {
            posArray[idx + 1] = bedHeight / 2 + 1.2;
            const newTheta = Math.random() * Math.PI * 2;
            const newR = Math.sqrt(Math.random()) * (tubeRadius - 0.25);
            posArray[idx] = newR * Math.cos(newTheta);
            posArray[idx + 2] = newR * Math.sin(newTheta);
          }
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Mouse / Touch interaction for rotation
    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      cameraRotation.current.theta -= deltaX * 0.008;
      cameraRotation.current.phi += deltaY * 0.008;

      updateCameraPosition();
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraRotation.current.radius += e.deltaY * 0.01;
      cameraRotation.current.radius = Math.max(6, Math.min(26, cameraRotation.current.radius));
      updateCameraPosition();
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);

      renderer.dispose();
      scene.clear();
    };
  }, [showCutaway, showThermalOverlay, bDilution]);

  // Synchronize axial slice plane position whenever currentZNormalized changes
  useEffect(() => {
    if (slicePlaneRef.current) {
      const bedHeight = 6.0;
      slicePlaneRef.current.position.y = (0.5 - currentZNormalized) * bedHeight;
    }
  }, [currentZNormalized]);

  return (
    <div className={`relative bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden flex flex-col ${className}`}>
      {/* Top Overlay HUD Bar */}
      <div className="absolute top-0 left-0 right-0 h-10 px-4 bg-white/90 border-b border-slate-200/80 backdrop-blur-md flex items-center justify-between text-xs font-mono z-10 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-800">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="font-bold tracking-wider uppercase text-xs">
              Fixed-Bed 3D Reactor
            </span>
          </div>

          <span className="text-slate-300">|</span>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span>
              L: <strong className="text-slate-800">{(inputs.bedHeight * 1000).toFixed(0)} mm</strong>
            </span>
            <span>
              Dt: <strong className="text-slate-800">{(inputs.tubeDiameter * 1000).toFixed(0)} mm</strong>
            </span>
            <span>
              dp: <strong className="text-slate-800">{(inputs.particleDiameter * 1e6).toFixed(0)} µm</strong>
            </span>
          </div>
        </div>

        {/* View Camera Mode Toggles & Auto-Rotate */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
              autoRotate
                ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Toggle Continuous 360° Auto-Rotation"
          >
            {autoRotate ? <Pause className="w-3 h-3 text-blue-600" /> : <Play className="w-3 h-3 text-slate-600" />}
            <span className="hidden sm:inline">Orbit</span>
          </button>

          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setPresetView('isometric')}
              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                cameraView === 'isometric' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ISO
            </button>
            <button
              onClick={() => setPresetView('front')}
              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                cameraView === 'front' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FRONT
            </button>
            <button
              onClick={() => setPresetView('side')}
              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                cameraView === 'side' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SIDE
            </button>
            <button
              onClick={() => setPresetView('top')}
              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                cameraView === 'top' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TOP
            </button>
          </div>

          <button
            onClick={resetCamera}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full flex-1 min-h-[380px] cursor-grab active:cursor-grabbing" />

      {/* Bottom Floating Control Panel */}
      <div className="absolute bottom-3 left-3 right-3 p-2.5 bg-white/95 border border-slate-200/90 rounded-xl shadow-md backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs font-mono z-10 select-none">
        {/* Left: Visualization Feature Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCutaway(!showCutaway)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              showCutaway
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Cutaway {showCutaway ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowFlow(!showFlow)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              showFlow
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Gas Flow</span>
          </button>

          <button
            onClick={() => setShowThermalOverlay(!showThermalOverlay)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              showThermalOverlay
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Thermal Field</span>
          </button>

          {onSelectPellet && (
            <button
              onClick={onSelectPellet}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
              <span>Inspect Pellet</span>
            </button>
          )}
        </div>

        {/* Right: Axial Scrubber Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="flex items-center gap-1 text-blue-700 font-semibold">
              <Crosshair className="w-3.5 h-3.5" />
              <span>Axial Slice:</span>
            </span>
            <span className="text-slate-900 font-bold font-mono">
              z = {(currentZNormalized * inputs.bedHeight * 1000).toFixed(1)} mm
            </span>
            <span className="text-slate-500 font-mono">
              ({(currentZNormalized * 100).toFixed(0)}% L)
            </span>
          </div>

          {onZNormalizedChange && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentZNormalized}
              onChange={(e) => onZNormalizedChange(parseFloat(e.target.value))}
              className="w-24 sm:w-32 accent-blue-600 cursor-pointer"
              title="Drag to inspect reactor cross-section along axial height z"
            />
          )}
        </div>
      </div>
    </div>
  );
};
