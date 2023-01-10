import * as THREE from "three";
import fragmentShader from "./glsl/fragment_shader";
import vertexShader from "./glsl/vertex_shader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { LASHeaders } from "./my_types";
import Socket from "./socket";
import { cleanUp } from "./utils";

declare global {
    interface Window {
        sessionId: string;
        renderer: THREE.WebGLRenderer;
        geometry: THREE.BufferGeometry;
        material: THREE.ShaderMaterial;
        scene: THREE.Scene;
    }
}

const renderer = new THREE.WebGLRenderer();
const geometry = new THREE.BufferGeometry();
const scene = new THREE.Scene();
const material = new THREE.ShaderMaterial({
    vertexColors: true,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
});

window["renderer"] = renderer;
window["geometry"] = geometry;
window["material"] = material;
window["scene"] = scene;

const glRenderer = document.getElementById("gl-container");
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
const controls = new OrbitControls(camera, renderer.domElement);

function loadPoints(points: number[][], header: LASHeaders) {
    cleanUp();

    const vertices = [];
    const colors = [];
    let maxIntensity = -Infinity;

    for (let point of points) {
        for (let i = 0; i < point.length; i += 7) {
            vertices.push(point[i], point[i + 1], point[i + 2]);

            colors.push(point[i + 3], point[i + 4], point[i + 5], point[i + 6]);

            maxIntensity = Math.max(maxIntensity, point[i + 6]);
        }
    }

    console.log("POINTS: ", vertices.length / 3);

    for (let i = 3; i < colors.length; i += 4) {
        colors[i] /= maxIntensity;
    }

    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
    );

    geometry.setAttribute(
        "colors",
        new THREE.Float32BufferAttribute(colors, 4)
    );

    positionCamera(header);

    scene.add(new THREE.Points(geometry, material));

    animate();
}

function positionCamera(header: LASHeaders) {
    const maxZ = header.MaximumBounds[2];
    const minZ = header.MinimumBounds[2];
    const distZ = maxZ - minZ;
    camera.position.set(0, 2 * distZ, -100);
}

function animate() {
    requestAnimationFrame(animate);

    controls.update();

    render();
}

function render() {
    renderer.render(scene, camera);
}

new Socket("ws://localhost:8080/ws").connect(loadPoints);

renderer.setSize(window.innerWidth, window.innerHeight);

glRenderer?.appendChild(renderer.domElement);

export {};
