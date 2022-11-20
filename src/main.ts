import { handleFile, normalizeAlphas } from "./utils";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { LASBatch } from "./loader";
import { LASHeaders } from "./types";
import vertexShader from "./vertex_shader";
import fragmentShader from "./fragment_shader";

const input = document.getElementById("file-input");
const glRenderer = document.getElementById("gl-container");

input?.addEventListener("change", (e) => handleFile(e, loadPoints));

const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const controls = new OrbitControls(camera, renderer.domElement);

const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true
});

function loadPoints(header: LASHeaders, batcher: LASBatch[]) {
    const [minX, minY, minZ] = header.minimumBounds;
    const [maxX, maxY, maxZ] = header.maximumBounds;
    const [scaleX, scaleY, scaleZ] = header.scale;
    let maxIntensity = 0;
    const colors = [];
    const vertices = [];
    const geometry = new THREE.BufferGeometry();

    const midX = (maxX - minX) / 2;
    const midY = (maxY - minY) / 2;

    for (const batch of batcher) {
        for (let i = 0; i < batch.count; i++) {
            const p = batch.getPoint(i);
            vertices.push(
                p.position[0] * scaleX - minX - midX,
                p.position[2] * scaleZ - minZ,
                p.position[1] * scaleY - minY - midY
            );

            colors.push(
                p.color ? p.color[0] : 255,
                p.color ? p.color[2] : 255,
                p.color ? p.color[1] : 255,
                p.intensity 
            );

            maxIntensity = Math.max(maxIntensity, p.intensity);
        }
    }

    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
    );

    normalizeAlphas(colors, maxIntensity);

    geometry.setAttribute(
        "colors",
        new THREE.Float32BufferAttribute(colors, 4)
    );

    positionCamera(header);

    scene.add(new THREE.Points(geometry, material));

    animate();
}

function positionCamera(header: LASHeaders) {
    const [maxX, maxY, maxZ] = header.maximumBounds;
    const [minX, minY, minZ] = header.minimumBounds;
    const [distX, distY, distZ] = [maxX - minX, maxY - minY, maxZ - minZ]
    camera.position.set(0, 2 * distZ, -100)
    // camera.lookAt(new THREE.Vector3(0, maxY - minY, 0));

    // const [scaleX, scaleY, scaleZ] = header.scale;
    // camera.position.x = (maxX - minX) / 2
    // camera.position.y = (maxY - minY) / 2
    // camera.position.set((maxX - minX) / 2, 100, (maxY - minY) / 2);
    // camera.lookAt(new THREE.Vector3((maxX - minX) / 2, 0, (maxY - minY) / 2));

    console.log(camera.position)
}

function animate() {
    requestAnimationFrame(animate);

    controls.update();

    render();
}

function render() {
    renderer.render(scene, camera);
}

renderer.setSize(window.innerWidth, window.innerHeight);

glRenderer?.appendChild(renderer.domElement);

export {};
