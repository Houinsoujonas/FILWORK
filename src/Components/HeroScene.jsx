import { useEffect, useRef } from "react";
import * as THREE from "three";

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
    camera.position.set(0, 0.2, 8.2);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xf6f5f0, 0);
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b8ad, 2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
    keyLight.position.set(-3, 5, 7);
    scene.add(keyLight);

    const group = new THREE.Group();
    group.scale.setScalar(0.88);
    scene.add(group);

    const paper = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const ink = new THREE.MeshStandardMaterial({ color: 0x171814, roughness: 0.45 });
    const lime = new THREE.MeshStandardMaterial({ color: 0xd5f36a, roughness: 0.42 });
    const muted = new THREE.MeshStandardMaterial({ color: 0xe8e7df, roughness: 0.8 });

    // A simple project brief: a paper card, heading, and three work samples.
    const brief = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.72, 0.14), paper);
    brief.position.set(0, 0, 0.22);
    group.add(brief);

    const heading = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.095, 0.035), ink);
    heading.position.set(-0.52, 0.48, 0.32);
    group.add(heading);

    const subheading = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.055, 0.035), muted);
    subheading.position.set(-0.69, 0.29, 0.32);
    group.add(subheading);

    [-0.72, 0, 0.72].forEach((x, index) => {
      const sample = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.55, 0.07),
        index === 1 ? lime : muted,
      );
      sample.position.set(x, -0.19, 0.34);
      group.add(sample);
      const sampleLine = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.045, 0.025), ink);
      sampleLine.position.set(x, -0.58, 0.35);
      group.add(sampleLine);
    });

    const makePerson = (x, bodyMaterial, scale = 1) => {
      const person = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.24, 0.56, 5, 12),
        bodyMaterial,
      );
      body.position.y = -0.3;
      person.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 20), paper);
      head.position.y = 0.26;
      person.add(head);
      person.position.set(x, -0.02, 0.34);
      person.scale.setScalar(scale);
      group.add(person);
      return person;
    };

    const leftPerson = makePerson(-1.85, ink, 0.94);
    const rightPerson = makePerson(1.85, lime, 0.94);

    // A restrained connecting mark ties the people to the shared project.
    const connector = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 16), lime);
    connector.position.set(0, 1.15, 0.48);
    group.add(connector);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const render = (time = 0) => {
      if (!reducedMotion) {
        group.rotation.y = Math.sin(time * 0.00028) * 0.045;
        leftPerson.position.y = -0.02 + Math.sin(time * 0.0007) * 0.035;
        rightPerson.position.y = -0.02 + Math.sin(time * 0.0007 + 1.2) * 0.035;
        connector.position.y = 1.15 + Math.sin(time * 0.0008) * 0.07;
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
      [paper, ink, lime, muted].forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="hero-scene" ref={hostRef} />;
}

export default HeroScene;
