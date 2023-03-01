import * as THREE from "three";
import DragControls from "./dragcontrols";
import { Annotation, MarkerGroup, Tools, PointMarker, DistanceMarker, isPointMarker, isDistanceMarker } from "./my_types";
import {
    createAnnotation,
    createLineAnnotation,
    getMidDist,
    labelDistanceMeasure,
    labelPointMeasure,
} from "./annotations";

const pointMeasure = document.getElementById("point-measure");
const distanceMeasure = document.getElementById("distance-measure");
const heightMeasure = document.getElementById("height-measure");
const areaMeasure = document.getElementById("area-measure");
const angleMeasure = document.getElementById("angle-measure");
const buttons = [
    pointMeasure,
    distanceMeasure,
    heightMeasure,
    areaMeasure,
    angleMeasure,
];
const clearToolsBtn = document.getElementById("clear-tools");
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const geometry = new THREE.SphereGeometry(1, 32, 16);
let map = new Map<THREE.Object3D, MarkerGroup>();
const dragControls = new DragControls(
    window["markerSphereMeshes"].map(({ mesh }) => mesh),
    window["camera"],
    window["renderer"].domElement
);
const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
});
const lines: THREE.Line[] = [];

window["geometry"].push(geometry);
window["material"].push(lineMaterial);

let active = false;
let selectedTool: Tools | null = null;
let clicksOnTool: number = 0;
let highlightMarker: THREE.Mesh | null = null;
let markersInUse: THREE.Mesh[] = [];
let linesInUse: THREE.Line[] = [];

const addSphereMarker = (x: number, y: number, z: number) => {
    const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
    });
    const sphere = new THREE.Mesh(geometry, material);
    material.needsUpdate = true;
    sphere.position.set(x, y, z);
    window["markerSphereMeshes"].push({
        mesh: sphere,
        x: x,
        y: y,
        z: z,
    });
    window["material"].push(material);
    window["scene"].add(sphere);

    return sphere;
};

const addHighlightMarker = (x: number, y: number, z: number) => {
    const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.5,
    });
    const sphere = new THREE.Mesh(geometry, material);
    material.needsUpdate = true;
    sphere.position.set(x, y, z);
    window["markerSphereMeshes"].push({
        mesh: sphere,
        x: x,
        y: y,
        z: z,
    });
    window["material"].push(material);
    window["scene"].add(sphere);

    return sphere;
};

const getClosestPoint = (e: MouseEvent | PointerEvent) => {
    const scene = window["scene"];
    const camera = window["camera"];
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const intersect = raycaster.intersectObject(scene);

    if (intersect.length <= 0) return;

    for (let o of intersect) {
        if (o?.object.type === "Points") {
            return o;
        }
    }

    return null;
};

const addLine = (
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number
) => {
    const points = [
        new THREE.Vector3(x1, y1, z1),
        new THREE.Vector3(x2, y2, z2),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.attributes.position.needsUpdate = true;
    const line = new THREE.Line(geometry, lineMaterial);
    window["geometry"].push(geometry);
    window["scene"].add(line);
    lines.push(line);
    return line;
};

const pointClick = (x: number, y: number, z: number) => {
    const marker = addSphereMarker(x, y, z);
    const annotation = createAnnotation(
        x,
        y,
        z,
        labelPointMeasure(x, y, z),
        marker
    );
    dragControls.addToObjects(marker);
    handleOuterClick();
    map.set(marker, annotation);
};

const distanceClick = (x: number, y: number, z: number) => {
    if (clicksOnTool === 0) {
        markersInUse.push(addSphereMarker(x, y, z));
        clicksOnTool++;
    } else if (clicksOnTool === 1) {
        const currMarker = addSphereMarker(x, y, z);
        if (highlightMarker) {
            window["scene"].remove(highlightMarker);
        }
        const previousMarker = markersInUse.pop();
        if (previousMarker) {
            const [x1, y1, z1] = [
                previousMarker.position.x,
                previousMarker.position.y,
                previousMarker.position.z,
            ];

            const line = addLine(x, y, z, x1, y1, z1);
            const annotation = createLineAnnotation(
                x,
                y,
                z,
                x1,
                y1,
                z1,
                previousMarker,
                currMarker,
                line
            );
            dragControls.addToObjects(currMarker);
            dragControls.addToObjects(previousMarker);
            map.set(currMarker, annotation);
            map.set(previousMarker, annotation);
        }

        handleOuterClick();
    }
};

const angleClick = (x: number, y: number, z: number) => {
    if (clicksOnTool === 0) {
        markersInUse.push(addSphereMarker(x, y, z));
        clicksOnTool++;
    } else if (clicksOnTool === 1) {
        markersInUse.push(addSphereMarker(x, y, z));
        const previousMarker = markersInUse[0];

        if (previousMarker) {
            const [x1, y1, z1] = [
                previousMarker.position.x,
                previousMarker.position.y,
                previousMarker.position.z,
            ];

            const line = addLine(x, y, z, x1, y1, z1);
            // const annotation = createLineAnnotation(
            //     x,
            //     y,
            //     z,
            //     x1,
            //     y1,
            //     z1,
            //     previousMarker,
            //     currMarker,
            //     line
            // );
            
            linesInUse.push(line)
        }
        clicksOnTool++;
    } else if (clicksOnTool === 2) {
        const currMarker = addSphereMarker(x, y, z);
        const prev1 = markersInUse.pop();
        const prev2 = markersInUse.pop();
        const prevLine = linesInUse.pop();

        if (prev1 && prev2) {
            const [x1, y1, z1, x2, y2, z2] = [
                prev1.position.x,
                prev1.position.y,
                prev1.position.z,
                prev2.position.x,
                prev2.position.y,
                prev2.position.z,
            ];

            const line1 = addLine(x, y, z, x1, y1, z1);
            const line2 = addLine(x, y, z, x2, y2, z2);
            dragControls.addToObjects(currMarker);
            dragControls.addToObjects(prev1);
            dragControls.addToObjects(prev2);


        }

        handleOuterClick();
    }
};

const handleToolClick = (e: MouseEvent) => {
    const closestPoint = getClosestPoint(e);
    if (!closestPoint) {
        handleOuterClick();
        return;
    }

    const [x, y, z] = [
        closestPoint!.point.x,
        closestPoint!.point.y,
        closestPoint!.point.z,
    ];

    switch (selectedTool) {
        case Tools.Point:
            pointClick(x, y, z);
            break;
        case Tools.Distance:
            distanceClick(x, y, z);
            break;
        case Tools.Angle:
            angleClick(x, y, z);
            break;
    }
};

const updateGlobalState = (
    obj: THREE.Object3D,
    x: number,
    y: number,
    z: number
) => {
    window["markerSphereMeshes"].forEach((d) => {
        if (d.mesh === obj) {
            d.x = x;
            d.y = y;
            d.z = z;
        }
    });
};

dragControls.addEventListener("hoveron", (e) => {
    e.object.material.opacity = 0.5;
});

dragControls.addEventListener("hoveroff", (e) => {
    e.object.material.opacity = 1;
});

dragControls.addEventListener("dragstart", () => {
    window["controls"].enableRotate = false;
});

dragControls.addEventListener("drag", (e) => {
    const closestPoint = getClosestPoint(e.event);

    if (!closestPoint) return;

    const { x, y, z } = closestPoint.point;

    e.object.position.set(x, y, z);

    updateGlobalState(e.object, x, y, z);

    const group = map.get(e.object);

    if (!group) return;


    if (isPointMarker(group)) {
        const annotation = group.annotation
        annotation.x = x;
        annotation.y = y;
        annotation.yAdjusted = y;
        annotation.z = z;
        annotation.element.innerHTML = labelPointMeasure(x, y, z);
    } else if (isDistanceMarker(group)) {
        const annotation = group.annotation
        const line = group.line;
        const [p1, p2] = [group.point1, group.point2];
        const [x1, y1, z1] = [p1.position.x, p1.position.y, p1.position.z];
        const [x2, y2, z2] = [p2.position.x, p2.position.y, p2.position.z];
        const [midX, midY, midZ] = getMidDist(x1, y1, z1, x2, y2, z2);
        line.geometry.attributes.position.setXYZ(0, x1, y1, z1);
        line.geometry.attributes.position.setXYZ(1, x2, y2, z2);
        line.geometry.attributes.position.needsUpdate = true;
        annotation.x = midX;
        annotation.y = midY;
        annotation.yAdjusted = midY;
        annotation.z = midZ;
        annotation.element.innerHTML = labelDistanceMeasure(
            x1,
            y1,
            z1,
            x2,
            y2,
            z2
        );
    } else if (isAngleMarker(group)) {

    }

});

const buttonClickHandler = (e: MouseEvent) => {
    e.stopPropagation();
    handleOuterClick();
    active = !active;
    (e.target as HTMLButtonElement).classList.add("active-button");

    if (active) {
        highlightMarker = addHighlightMarker(-100000, -100000, -100000);
    }

    switch ((e.target as HTMLElement).id) {
        case Tools.Point:
            selectedTool = Tools.Point;
            break;
        case Tools.Distance:
            selectedTool = Tools.Distance;
            break;
        case Tools.Angle:
            selectedTool = Tools.Angle;
            break;
    }
};

const handleOuterClick = () => {
    active = false;
    clicksOnTool = 0;
    if (highlightMarker) {
        window["scene"].remove(highlightMarker);
        highlightMarker = null;
    }
    buttons.forEach((b) => b?.classList.remove("active-button"));
};

dragControls.addEventListener("dragend", () => {
    window["controls"].enableRotate = true;
});

buttons.forEach((b) => {
    b?.addEventListener("click", buttonClickHandler);
});

clearToolsBtn?.addEventListener("click", () => {
    window["annotations"].forEach((d) => {
        d.element.remove();
    });

    window["markerSphereMeshes"].forEach((d) => {
        window["scene"].remove(d.mesh);
    });

    lines.forEach((d) => {
        window["scene"].remove(d);
    });

    window["annotations"] = [];
    window["markerSphereMeshes"] = [];
    map = new Map<THREE.Object3D, Annotation>();
    (document.getElementById("z-exaggeration") as HTMLInputElement).disabled =
        false;
});

window.addEventListener("click", (e) => {
    if (active) {
        (
            document.getElementById("z-exaggeration") as HTMLInputElement
        ).disabled = true;
        handleToolClick(e);
        return;
    }
});

window.addEventListener("mousemove", (e) => {
    // console.log(highlightMarker);
    if (!highlightMarker) return;

    const closestPoint = getClosestPoint(e);

    if (!closestPoint) return;

    highlightMarker.position.set(
        closestPoint.point.x,
        closestPoint.point.y,
        closestPoint.point.z
    );
});

export {};
