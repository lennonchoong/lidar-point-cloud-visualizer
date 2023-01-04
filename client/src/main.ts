import { determineColor, normalizeAlphas } from "./utils";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { LASBatch } from "./loader";
import { LASHeaders } from "./types";
import { geometry, material, renderer } from "./globals";
import Octree from "./octree";

const glRenderer = document.getElementById("gl-container");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
const controls = new OrbitControls(camera, renderer.domElement);

export function loadPoints(header: LASHeaders, batcher: LASBatch[]) {
    const [minX, minY, minZ] = header.minimumBounds;
    const [maxX, maxY, maxZ] = header.maximumBounds;
    const [scaleX, scaleY, scaleZ] = header.scale;
    console.log("generating Octree");
    const colors = [];
    const vertices = [];
    const midX = (maxX - minX) / 2;
    const midY = (maxY - minY) / 2;
    const octree = new Octree(7, -midX, midX, 0, maxZ - minZ, -midY, midY);
    let total = 0;
    console.time("points")
    for (const batch of batcher) {
        total += batch.count;
        for (let i = 0; i < batch.count; i++) {
            const p = batch.getPoint(i);
            octree.addPoint(
                p.position[0] * scaleX - minX - midX,
                p.position[2] * scaleZ - minZ,
                p.position[1] * scaleY - minY - midY,
                determineColor(p.color, p.classification, 0),
                determineColor(p.color, p.classification, 1),
                determineColor(p.color, p.classification, 2),
                p.intensity
            );
        }
    }

    console.log("Optimizing octree");

    octree.optimize();

    console.log("Done optimizing octree");

    const optimizedPoints = octree.getPoints();
    for (let i = 0; i < optimizedPoints.length; i += 7) {
        vertices.push(
            optimizedPoints[i],
            optimizedPoints[i + 1],
            optimizedPoints[i + 2]
        );
        colors.push(
            optimizedPoints[i + 3],
            optimizedPoints[i + 4],
            optimizedPoints[i + 5],
            optimizedPoints[i + 6] / octree.maxAlpha
        );
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

    console.timeEnd("points")
}

function positionCamera(header: LASHeaders) {
    const [maxX, maxY, maxZ] = header.maximumBounds;
    const [minX, minY, minZ] = header.minimumBounds;
    const [distX, distY, distZ] = [maxX - minX, maxY - minY, maxZ - minZ];
    camera.position.set(0, 2 * distZ, -100);
    // camera.lookAt(new THREE.Vector3(0, maxY - minY, 0));

    // const [scaleX, scaleY, scaleZ] = header.scale;
    // camera.position.x = (maxX - minX) / 2
    // camera.position.y = (maxY - minY) / 2
    // camera.position.set((maxX - minX) / 2, 100, (maxY - minY) / 2);
    // camera.lookAt(new THREE.Vector3((maxX - minX) / 2, 0, (maxY - minY) / 2));

    console.log(camera.position);
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