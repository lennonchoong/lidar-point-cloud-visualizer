import * as THREE from "three";
import fragmentShader from "./glsl/fragment_shader";
import vertexShader from "./glsl/vertex_shader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Annotation, Camera, LASHeaders, SphereMarker } from "./my_types";
import Socket from "./socket";
import { cleanUp } from "./utils";
import defaultOptions from "./options";

declare global {
    interface Window {
        sessionId: string;
        renderer: THREE.WebGLRenderer;
        geometry: THREE.BufferGeometry[];
        material: THREE.Material[];
        scene: THREE.Scene;
        points: THREE.Points;
        lod: THREE.LOD;
        headers: LASHeaders;
        animationId: number;
        highLodMaterial: THREE.ShaderMaterial;
        medLodMaterial: THREE.ShaderMaterial;
        lowLodMaterial: THREE.ShaderMaterial;
        camera: THREE.Camera;
        markerSphereMeshes: SphereMarker[];
        annotations: Annotation[];
        controls: OrbitControls;
    }
}

const renderer = new THREE.WebGLRenderer();
const geometry = new THREE.BufferGeometry();
const scene = new THREE.Scene();
const light = new THREE.AmbientLight(0x404040, 1000);
const material = new THREE.ShaderMaterial({
    vertexColors: true,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    uniforms: {
        size: {
            value: 200.0,
        },
        zexag: {
            value: 0,
        },
    },
});

material.needsUpdate = true;
window["renderer"] = renderer;
window["geometry"] = [geometry];
window["material"] = [material];
window["highLodMaterial"] = material;
window["scene"] = scene;
window["lod"] = new THREE.LOD();
window["markerSphereMeshes"] = [];
window["annotations"] = [];

scene.add(light);

const glRenderer = document.getElementById("gl-container");
let camera: Camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    3000
);

window["camera"] = camera;

let controls: OrbitControls | null = new OrbitControls(
    camera,
    renderer.domElement
);

window["controls"] = controls;

function loadPoints(points: number[], header: LASHeaders) {
    console.log(header)
    cleanUp();

    const vertices = [];
    const colors = [];
    let maxIntensity = -Infinity;

    for (let i = 0; i < points.length; i += 7) {
        vertices.push(points[i], points[i + 1], points[i + 2]);
        colors.push(points[i + 3], points[i + 4], points[i + 5], points[i + 6]);
        maxIntensity = Math.max(maxIntensity, points[i + 6]);
    }

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

    const pointThree = new THREE.Points(geometry, material);

    window["headers"] = header;
    window["points"] = pointThree;
    window["lod"].addLevel(pointThree, 0);

    scene.add(pointThree);

    animate();
}

function processPoints(points: number[]): {
    points: THREE.Points;
    material: THREE.ShaderMaterial;
} {
    const vertices = [];
    const colors = [];
    let maxIntensity = -Infinity;

    const geometry = new THREE.BufferGeometry();

    for (let i = 0; i < points.length; i += 7) {
        vertices.push(points[i], points[i + 1], points[i + 2]);
        colors.push(points[i + 3], points[i + 4], points[i + 5], points[i + 6]);
        maxIntensity = Math.max(maxIntensity, points[i + 6]);
    }

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

    window["geometry"].push(geometry);

    const material = new THREE.ShaderMaterial({
        vertexColors: true,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        uniforms: {
            size: {
                value: 400.0,
            },
            zexag: {
                value: 0,
            },
        },
    });

    material.needsUpdate = true;

    window["material"].push(material);

    const pointThree = new THREE.Points(geometry, material);

    return { points: pointThree, material: material };
}

function loadLODPoints(lod: number[], renderDist: number, label: string) {
    const { points, material } = processPoints(lod);
    window["lod"].addLevel(points, renderDist);

    if (label === "medium") {
        window["medLodMaterial"] = material;
    } else {
        window["lowLodMaterial"] = material;
    }
}

function positionCamera(header: LASHeaders) {
    const [maxX, minX] = [header.MaximumBounds[0], header.MinimumBounds[0]];
    const [maxY, minY] = [header.MaximumBounds[1], header.MinimumBounds[1]];
    const [maxZ, minZ] = [header.MaximumBounds[2], header.MinimumBounds[2]];
    const distX = maxX - minX;
    const distZ = maxZ - minZ;
    const distY = maxY - minY;
    if (defaultOptions["camera"] === 1) {
        camera.position.set(0.5 * distX, 0.75 * distY, -distZ);
    } else if (defaultOptions["camera"] === 2) {
        camera.position.set(0.5 * distX, 0.75 * distY, -distZ);
    } else if (defaultOptions["camera"] == 3) {
        camera.position.set(0, distY, 0);
        camera.zoom = 1;
        camera.updateProjectionMatrix();
    }
}

const positionAnnotations = () => {
    window["annotations"].forEach(({element, x, yAdjusted, z, heightOffset}) => {
        const vector = new THREE.Vector3(x, yAdjusted, z);
        vector.project(window["camera"]);

        vector.x = Math.round(
            (0.5 + vector.x / 2) * (window.innerWidth / window.devicePixelRatio)
        ) * 2;
        vector.y = Math.round(
            (0.5 - vector.y / 2) * (window.innerHeight / window.devicePixelRatio)
        ) * 2;
        
        const styles = getComputedStyle(element);
        element.style.opacity = vector.z >= 1 ? "0" : "1";
        element.style.top = `${vector.y - parseFloat(styles.height) - heightOffset}px`;
        element.style.left = `${vector.x - parseFloat(styles.width) * 0.5}px`;
    })
}

const resizeMarkers = () => {
    window["markerSphereMeshes"].forEach(({mesh}) => {
        const distance = camera.position.distanceTo(mesh.position)
        mesh.scale.set(distance / 100, distance / 100, distance / 100)
    })
}

function animate() {
    cancelAnimationFrame(window["animationId"]);

    window["animationId"] = requestAnimationFrame(animate);

    if (controls) {
        controls.update();
    }

    resizeMarkers();
    positionAnnotations();
    render();
}

function render() {
    renderer.render(scene, camera);
}

window.addEventListener("lod-points", (e: CustomEventInit) => {
    loadLODPoints(
        e.detail["Points"],
        e.detail["RenderDistance"],
        e.detail["Label"]
    );

    scene.add(window["lod"]);
});

document.getElementById("point-size")?.addEventListener("input", (e) => {
    const value: number = parseFloat((e!.target as HTMLInputElement).value);

    window["highLodMaterial"].uniforms.size.value = value;

    if (window["medLodMaterial"]) {
        window["medLodMaterial"].uniforms.size.value = value * 2;
    }

    if (window["lowLodMaterial"]) {
        window["lowLodMaterial"].uniforms.size.value = value * 4;
    }
});

document.getElementById("camera-fov")?.addEventListener("input", (e) => {
    const value: number = parseFloat((e!.target as HTMLInputElement).value);
    defaultOptions["fov"] = value;

    if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = value;
        camera.updateProjectionMatrix();
    }
});

document.getElementById("reset-camera")?.addEventListener("click", () => {
    positionCamera(window["headers"]);
});

document.getElementById("z-exaggeration")?.addEventListener("input", (e) => {
    const value: number = parseFloat((e!.target as HTMLInputElement).value);

    defaultOptions.zExag = value;

    window["annotations"].forEach(d => {
        const { y } = d;
        const newY = y * (1.0 + 2.0 * (value / 100.0));
        d.yAdjusted = newY;
    })
    
    window["markerSphereMeshes"].forEach(({ mesh, x, y, z }) => {
        const newY = y * (1.0 + 2.0 * (value / 100.0));
        mesh.position.set(x, newY, z)
    })

    window["highLodMaterial"].uniforms.zexag.value = value;
    if (window["medLodMaterial"]) {
        window["medLodMaterial"].uniforms.zexag.value = value;
    }

    if (window["lowLodMaterial"]) {
        window["lowLodMaterial"].uniforms.zexag.value = value;
    }
});

window.addEventListener("update-camera", () => {
    const cameraType = defaultOptions["camera"];
    if (cameraType === 1) {
        camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            3000
        );
    } else if (cameraType === 2 || cameraType === 3) {
        camera = new THREE.OrthographicCamera(
            window.innerWidth / -4,
            window.innerWidth / 4,
            window.innerHeight / 4,
            window.innerHeight / -4,
            -100,
            3000
        );
    }

    window["camera"] = camera;

    if (cameraType === 3) {
        (document.getElementById("z-exaggeration") as HTMLInputElement).value =
            "0";
        (
            document.getElementById("z-exaggeration") as HTMLInputElement
        ).dispatchEvent(new Event("input"));
    }
    (document.getElementById("z-exaggeration") as HTMLInputElement).disabled =
        cameraType === 3;
    controls = new OrbitControls(camera, renderer.domElement);
    window["controls"] = controls;
    controls.enableRotate = cameraType === 1 || cameraType === 2;
    positionCamera(window["headers"]);
    animate();
});

new Socket("ws://localhost:8080/ws").connect(loadPoints);

Promise.all([
    fetch("http://localhost:8080/test").then(d => d.json()),
    fetch("http://localhost:8080/test2").then(d => d.json()),
]).then(([x, y]) => {
    loadPoints(x, y)
})

renderer.setSize(window.innerWidth, window.innerHeight);

glRenderer?.appendChild(renderer.domElement);

export {};
