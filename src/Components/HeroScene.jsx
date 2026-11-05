import { useEffect, useRef } from "react";
import * as THREE from "three";

const makeMaterial = (color, roughness = 0.48) =>
  new THREE.MeshStandardMaterial({ color, roughness });

function HeroScene() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      host.dataset.sceneFallback = "true";
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0.15, 10.2);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xf6f5f0, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xc6c6ba, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(-3, 5, 8);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xdce8ff, 0.75);
    fillLight.position.set(4, 1, 5);
    scene.add(fillLight);

    const group = new THREE.Group();
    group.scale.setScalar(0.78);
    scene.add(group);

    const materials = {
      paper: makeMaterial(0xffffff, 0.72),
      ink: makeMaterial(0x252820, 0.52),
      muted: makeMaterial(0xe8e7df, 0.82),
      lime: makeMaterial(0xd5f36a, 0.4),
      blue: makeMaterial(0x7189d2, 0.42),
      violet: makeMaterial(0x9985d3, 0.42),
      coral: makeMaterial(0xe39470, 0.42),
      pink: makeMaterial(0xe7a4bd, 0.42),
      green: makeMaterial(0x9dbc82, 0.42),
    };

    const addMesh = (geometry, material, parent, position, rotation = null) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      if (rotation) mesh.rotation.set(...rotation);
      parent.add(mesh);
      return mesh;
    };

    // Floating campaign brief: a shared point where profiles and projects meet.
    const brief = new THREE.Group();
    brief.position.set(0, 0.12, 0.18);
    brief.rotation.set(-0.08, -0.16, 0.035);
    group.add(brief);

    addMesh(
      new THREE.BoxGeometry(1.85, 1.72, 0.12),
      materials.paper,
      brief,
      [0, 0, 0],
    );
    addMesh(
      new THREE.BoxGeometry(0.82, 0.08, 0.025),
      materials.ink,
      brief,
      [-0.42, 0.48, 0.08],
    );
    addMesh(
      new THREE.BoxGeometry(0.52, 0.045, 0.025),
      materials.muted,
      brief,
      [-0.57, 0.31, 0.08],
    );

    const sampleMaterials = [materials.coral, materials.lime, materials.blue];
    [-0.56, 0, 0.56].forEach((x, index) => {
      addMesh(
        new THREE.BoxGeometry(0.39, 0.55, 0.055),
        sampleMaterials[index],
        brief,
        [x, -0.05, 0.09],
      );
      addMesh(
        new THREE.BoxGeometry(0.28, 0.04, 0.02),
        materials.muted,
        brief,
        [x, -0.39, 0.09],
      );
    });

    // Two collaborators flank the project, rather than being trapped in a frame.
    const makePerson = (x, clothing, scale = 1) => {
      const person = new THREE.Group();
      addMesh(
        new THREE.CapsuleGeometry(0.24, 0.64, 6, 16),
        clothing,
        person,
        [0, -0.45, 0],
      );
      addMesh(
        new THREE.SphereGeometry(0.22, 28, 24),
        materials.paper,
        person,
        [0, 0.18, 0.02],
      );
      person.position.set(x, -0.3, 0.24);
      person.scale.setScalar(scale);
      group.add(person);
      return person;
    };

    const creator = makePerson(-1.85, materials.coral, 0.88);
    const business = makePerson(1.85, materials.violet, 0.88);

    // Small floating tokens suggest profiles, ideas and active collaborations.
    const tokens = [
      addMesh(new THREE.SphereGeometry(0.14, 24, 20), materials.lime, group, [-1.25, 1.18, 0.52]),
      addMesh(new THREE.SphereGeometry(0.11, 24, 20), materials.pink, group, [1.48, 0.92, 0.55]),
      addMesh(new THREE.BoxGeometry(0.24, 0.24, 0.2), materials.green, group, [-1.42, -1.14, 0.48], [0.2, 0.4, 0.12]),
      addMesh(new THREE.BoxGeometry(0.22, 0.22, 0.18), materials.blue, group, [1.46, -1.18, 0.48], [0.3, -0.3, 0.18]),
    ];
    tokens.forEach((token) => {
      token.userData.baseY = token.position.y;
    });

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame = 0;
    const render = (time = 0) => {
      if (!reducedMotion) {
        group.rotation.y = Math.sin(time * 0.00022) * 0.035;
        creator.position.y = -0.3 + Math.sin(time * 0.00065) * 0.035;
        business.position.y = -0.3 + Math.sin(time * 0.00065 + 1.2) * 0.035;
        brief.rotation.y = -0.16 + Math.sin(time * 0.00032) * 0.025;
        tokens.forEach((token, index) => {
          token.position.y =
            token.userData.baseY + Math.sin(time * 0.0007 + index) * 0.045;
        });
      }
      renderer.render(scene, camera);
      if (!reducedMotion) frame = window.requestAnimationFrame(render);
    };

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = host;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (reducedMotion) renderer.render(scene, camera);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      group.traverse((object) => {
        if (object.isMesh) object.geometry.dispose();
      });
      Object.values(materials).forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="hero-scene" ref={hostRef} />;
}

export default HeroScene;
