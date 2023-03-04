import * as THREE from "three";
import DragControls from "./dragcontrols";
import {
    Annotation,
    MarkerGroup,
    Tools,
    PointMarker,
    DistanceMarker,
    isPointMarker,
    isDistanceMarker,
    isAngleMarker,
    isAreaMarker,
} from "./my_types";
import {
    calculateArea,
    calculateAreaAnnotationPos,
    createAngleAnnotations,
    createAnnotation,
    createAreaAnnotation,
    createHeightAnnotation,
    createLineAnnotation,
    getMidDist,
    labelDistanceMeasure,
    labelPointMeasure,
    recalculateAngles,
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

const checkOutOfBounds = (e: MouseEvent) => {
    const scene = window["scene"];
    const camera = window["camera"];
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const intersect = raycaster.intersectObject(scene);

    return intersect.length <= 0;
}

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
            linesInUse.push(line);
        }
        clicksOnTool++;
    } else if (clicksOnTool === 2) {
        const currMarker = addSphereMarker(x, y, z);
        const prev1 = markersInUse.pop();
        const prev2 = markersInUse.pop();
        const prevLine = linesInUse.pop();

        if (prev1 && prev2 && prevLine) {
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

            const group = createAngleAnnotations(
                currMarker,
                prev1,
                prev2,
                prevLine,
                line1,
                line2
            );
            map.set(currMarker, group);
            map.set(prev1, group);
            map.set(prev2, group);
        }

        handleOuterClick();
    }
};

const areaClick = (x: number, y: number, z: number) => {
    if (clicksOnTool === 0) {
        console.log(linesInUse, markersInUse);
        markersInUse.push(addSphereMarker(x, y, z));
        clicksOnTool++;
    } else if (clicksOnTool <= 2) {
        const previousMarker = markersInUse[markersInUse.length - 1];
        markersInUse.push(addSphereMarker(x, y, z));

        if (previousMarker) {
            const [x1, y1, z1] = [
                previousMarker.position.x,
                previousMarker.position.y,
                previousMarker.position.z,
            ];

            linesInUse.push(addLine(x, y, z, x1, y1, z1));
        }
        clicksOnTool++;
    } else {
        const firstMarker = markersInUse[0];
        const prevMarker = markersInUse[markersInUse.length - 1];
        markersInUse.push(addSphereMarker(x, y, z));
        const [x1, y1, z1] = [
            firstMarker.position.x,
            firstMarker.position.y,
            firstMarker.position.z,
        ];
        const [x2, y2, z2] = [
            prevMarker.position.x,
            prevMarker.position.y,
            prevMarker.position.z,
        ];

        linesInUse.push(addLine(x, y, z, x2, y2, z2));
        linesInUse.push(addLine(x, y, z, x1, y1, z1));

        const areaAnno = createAreaAnnotation(
            markersInUse[0],
            markersInUse[1],
            markersInUse[2],
            markersInUse[3],
            linesInUse[0],
            linesInUse[1],
            linesInUse[2],
            linesInUse[3]
        );

        for (let marker of markersInUse) {
            map.set(marker, areaAnno);
            dragControls.addToObjects(marker);
        }

        linesInUse = [];
        markersInUse = [];
        handleOuterClick();
    }
};

const heightClick = (x: number, y: number, z: number) => { 
    const marker = addSphereMarker(x, y, z);
    const annotation = createHeightAnnotation(
        x,
        y,
        z,
        marker
    );
    dragControls.addToObjects(marker);
    handleOuterClick();
    map.set(marker, annotation);
};

const handleToolClick = (e: MouseEvent) => {
    if (checkOutOfBounds(e)) {
        handleOuterClick();
        return;
    }

    const closestPoint = getClosestPoint(e);

    if (!closestPoint) {
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
        case Tools.Area:
            areaClick(x, y, z);
            break;
        case Tools.Height:
            heightClick(x, y, z);
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
        const annotation = group.annotation;
        annotation.x = x;
        annotation.y = y;
        annotation.yAdjusted = y;
        annotation.z = z;
        annotation.element.innerHTML = labelPointMeasure(x, y, z);
    } else if (isDistanceMarker(group)) {
        const annotation = group.annotation;
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
    } else if (isAreaMarker(group)) {
        const [p1, p2, p3, p4] = [
            group.point1,
            group.point2,
            group.point3,
            group.point4,
        ];

        const [line1, line2] = group.pointLineMap.get(e.object) as THREE.Line[];
        const [p11, p12] = group.linePointMap.get(line1) as THREE.Mesh[];
        const [p21, p22] = group.linePointMap.get(line2) as THREE.Mesh[];

        const lineAnno1 = group.lineAnnotationMap.get(line1);
        const lineAnno2 = group.lineAnnotationMap.get(line2);
        const [midX1, midY1, midZ1] = getMidDist(
            line1.geometry.attributes.position.getX(0),
            line1.geometry.attributes.position.getY(0),
            line1.geometry.attributes.position.getZ(0),
            line1.geometry.attributes.position.getX(1),
            line1.geometry.attributes.position.getY(1),
            line1.geometry.attributes.position.getZ(1)
        );

        const [midX2, midY2, midZ2] = getMidDist(
            line2.geometry.attributes.position.getX(0),
            line2.geometry.attributes.position.getY(0),
            line2.geometry.attributes.position.getZ(0),
            line2.geometry.attributes.position.getX(1),
            line2.geometry.attributes.position.getY(1),
            line2.geometry.attributes.position.getZ(1)
        );

        (lineAnno1!.x = midX1), (lineAnno1!.y = midY1);
        lineAnno1!.yAdjusted = midY1;
        lineAnno1!.z = midZ1;
        lineAnno1!.element.innerHTML = labelDistanceMeasure(
            line1.geometry.attributes.position.getX(0),
            line1.geometry.attributes.position.getY(0),
            line1.geometry.attributes.position.getZ(0),
            line1.geometry.attributes.position.getX(1),
            line1.geometry.attributes.position.getY(1),
            line1.geometry.attributes.position.getZ(1)
        );

        (lineAnno2!.x = midX2), (lineAnno2!.y = midY2);
        lineAnno2!.yAdjusted = midY2;
        lineAnno2!.z = midZ2;
        lineAnno2!.element.innerHTML = labelDistanceMeasure(
            line2.geometry.attributes.position.getX(0),
            line2.geometry.attributes.position.getY(0),
            line2.geometry.attributes.position.getZ(0),
            line2.geometry.attributes.position.getX(1),
            line2.geometry.attributes.position.getY(1),
            line2.geometry.attributes.position.getZ(1)
        );

        line1.geometry.attributes.position.setXYZ(
            0,
            p11.position.x,
            p11.position.y,
            p11.position.z
        );
        line1.geometry.attributes.position.setXYZ(
            1,
            p12.position.x,
            p12.position.y,
            p12.position.z
        );
        line1.geometry.attributes.position.needsUpdate = true;

        line2.geometry.attributes.position.setXYZ(
            0,
            p21.position.x,
            p21.position.y,
            p21.position.z
        );
        line2.geometry.attributes.position.setXYZ(
            1,
            p22.position.x,
            p22.position.y,
            p22.position.z
        );
        line2.geometry.attributes.position.needsUpdate = true;

        const { xAve, yAve, zAve } = calculateAreaAnnotationPos(p1, p2, p3, p4);

        group.areaAnnotation.element.innerHTML = `${calculateArea(
            p1,
            p2,
            p3,
            p4
        )}m<sup>2</sup>`;
        group.areaAnnotation.x = xAve;
        group.areaAnnotation.y = yAve;
        group.areaAnnotation.yAdjusted = yAve;
        group.areaAnnotation.z = zAve;
    } else if (isAngleMarker(group)) {
        const annotation = group.pointAnnotationMap.get(e.object);
        const [line1, line2] = group.pointLineMap.get(e.object) as THREE.Line[];
        const [p11, p12] = group.linePointMap.get(line1) as THREE.Mesh[];
        const [p21, p22] = group.linePointMap.get(line2) as THREE.Mesh[];

        (annotation!.x = x), (annotation!.y = y);
        annotation!.yAdjusted = y;
        annotation!.z = z;

        line1.geometry.attributes.position.setXYZ(
            0,
            p11.position.x,
            p11.position.y,
            p11.position.z
        );
        line1.geometry.attributes.position.setXYZ(
            1,
            p12.position.x,
            p12.position.y,
            p12.position.z
        );
        line1.geometry.attributes.position.needsUpdate = true;

        line2.geometry.attributes.position.setXYZ(
            0,
            p21.position.x,
            p21.position.y,
            p21.position.z
        );
        line2.geometry.attributes.position.setXYZ(
            1,
            p22.position.x,
            p22.position.y,
            p22.position.z
        );
        line2.geometry.attributes.position.needsUpdate = true;

        recalculateAngles(group);
    }
});

const buttonClickHandler = (e: MouseEvent) => {
    e.stopPropagation();
    const id = (e.target as HTMLElement).id

    if (selectedTool === id) {
        selectedTool = null;
        if (highlightMarker) {
            window["scene"].remove(highlightMarker);
        }
        clicksOnTool = 0;
        highlightMarker = null;
        buttons.forEach((b) => b?.classList.remove("active-button"));
        markersInUse.forEach((d) => window["scene"].remove(d));
        linesInUse.forEach((d) => window["scene"].remove(d));
        markersInUse = [];
        linesInUse = [];
        return;
    } else {
        switch (id) {
            case Tools.Point:
                selectedTool = Tools.Point;
                break;
            case Tools.Distance:
                selectedTool = Tools.Distance;
                break;
            case Tools.Angle:
                selectedTool = Tools.Angle;
                break;
            case Tools.Area:
                selectedTool = Tools.Area;
                break;
            case Tools.Height:
                selectedTool = Tools.Height;
                break;
        }
    }
    
    if (selectedTool) {
        if (highlightMarker) {
            window["scene"].remove(highlightMarker);
        }
        clicksOnTool = 0;
        highlightMarker = null;
        buttons.forEach((b) => b?.classList.remove("active-button"));
        markersInUse.forEach((d) => window["scene"].remove(d));
        linesInUse.forEach((d) => window["scene"].remove(d));
        markersInUse = [];
        linesInUse = [];
        highlightMarker = addHighlightMarker(-100000, -100000, -100000);
        (e.target as HTMLButtonElement).classList.add("active-button");
    } 
};

const handleOuterClick = () => {
    selectedTool = null;
    clicksOnTool = 0;
    if (highlightMarker) {
        window["scene"].remove(highlightMarker);
        highlightMarker = null;
    }
    buttons.forEach((b) => b?.classList.remove("active-button"));
    markersInUse.forEach((d) => window["scene"].remove(d));
    linesInUse.forEach((d) => window["scene"].remove(d));
    markersInUse = [];
    linesInUse = [];
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
    map = new Map<THREE.Object3D, MarkerGroup>();
    (document.getElementById("z-exaggeration") as HTMLInputElement).disabled =
        false;

    markersInUse.forEach((d) => window["scene"].remove(d));
    linesInUse.forEach((d) => window["scene"].remove(d));
    markersInUse = [];
    linesInUse = [];
});

window.addEventListener("click", (e) => {
    if (selectedTool) {
        (
            document.getElementById("z-exaggeration") as HTMLInputElement
        ).disabled = true;
        handleToolClick(e);
        return;
    }
});

window.addEventListener("mousemove", (e) => {
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
