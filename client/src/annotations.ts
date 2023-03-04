import { AngleMarker, Annotation, Tools } from "./my_types";

export const createAnnotation = (
    x: number,
    y: number,
    z: number,
    label: string,
    marker: THREE.Mesh
) => {
    const elem = document.createElement("div");
    const annotation = {
        element: elem,
        x: x,
        y: y,
        yAdjusted: y,
        z: z,
        heightOffset: 15,
        type: Tools.Point,
    };
    elem.classList.add("annotation");
    elem.innerText = label;
    window["annotations"].push(annotation);
    document.body.appendChild(elem);
    return {
        annotation: annotation,
        point: marker,
    };
};

export const createLineAnnotation = (
    prevMarker: THREE.Mesh,
    currMarker: THREE.Mesh,
    line: THREE.Line
) => {
    const [x1, y1, z1] = [
        prevMarker.position.x,
        prevMarker.position.y,
        prevMarker.position.z,
    ];
    const [x2, y2, z2] = [
        currMarker.position.x,
        currMarker.position.y,
        currMarker.position.z,
    ];

    const [midX, midY, midZ] = getMidDist(x1, y1, z1, x2, y2, z2);

    const elem = document.createElement("div");
    const annotation = {
        element: elem,
        x: midX,
        y: midY,
        yAdjusted: midY,
        z: midZ,
        heightOffset: 0,
        type: Tools.Distance,
    };
    elem.classList.add("annotation");
    elem.innerText = labelDistanceMeasure(x1, y1, z1, x2, y2, z2);
    window["annotations"].push(annotation);
    document.body.appendChild(elem);
    return {
        annotation: annotation,
        point1: prevMarker,
        point2: currMarker,
        line: line,
    };
};

export const createAngleAnnotations = (
    m1: THREE.Mesh,
    m2: THREE.Mesh,
    m3: THREE.Mesh,
    l1: THREE.Line,
    l2: THREE.Line,
    l3: THREE.Line
) => {
    const [x1, y1, z1] = [m1.position.x, m1.position.y, m1.position.z];
    const [x2, y2, z2] = [m2.position.x, m2.position.y, m2.position.z];
    const [x3, y3, z3] = [m3.position.x, m3.position.y, m3.position.z];

    const e1 = document.createElement("div");
    const e2 = document.createElement("div");
    const e3 = document.createElement("div");

    const a1 = calculateAngle(x2, y2, z2, x1, y1, z1, x3, y3, z3);
    const a2 = calculateAngle(x1, y1, z1, x2, y2, z2, x3, y3, z3);
    const a3 = calculateAngle(x2, y2, z2, x3, y3, z3, x1, y1, z1);

    e1.innerHTML = a1;
    e2.innerHTML = a2;
    e3.innerHTML = a3;
    e1.classList.add("annotation");
    e2.classList.add("annotation");
    e3.classList.add("annotation");

    const anno1 = {
        element: e1,
        x: x1,
        y: y1,
        yAdjusted: y1,
        z: z1,
        heightOffset: 15,
        type: Tools.Angle,
    };

    const anno2 = {
        element: e2,
        x: x2,
        y: y2,
        yAdjusted: y2,
        z: z2,
        heightOffset: 15,
        type: Tools.Angle,
    };

    const anno3 = {
        element: e3,
        x: x3,
        y: y3,
        yAdjusted: y3,
        z: z3,
        heightOffset: 15,
        type: Tools.Angle,
    };

    window["annotations"].push(anno1, anno2, anno3);
    document.body.appendChild(e1);
    document.body.appendChild(e2);
    document.body.appendChild(e3);
    const pointAnnotationMap = new Map<THREE.Mesh, Annotation>();
    const pointLineMap = new Map<THREE.Mesh, THREE.Line[]>();
    const linePointMap = new Map<THREE.Line, THREE.Mesh[]>();

    pointAnnotationMap.set(m1, anno1);
    pointAnnotationMap.set(m2, anno2);
    pointAnnotationMap.set(m3, anno3);
    pointLineMap.set(m1, [l2, l3]);
    pointLineMap.set(m2, [l2, l1]);
    pointLineMap.set(m3, [l1, l3]);
    linePointMap.set(l1, [m2, m3]);
    linePointMap.set(l2, [m1, m2]);
    linePointMap.set(l3, [m1, m3]);

    return {
        pointAnnotationMap: pointAnnotationMap,
        pointLineMap: pointLineMap,
        linePointMap: linePointMap,
        point1: m1,
        point2: m2,
        point3: m3,
    };
};

// Function to find the angle between
// the two lines
function calculateAngle(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    x3: number,
    y3: number,
    z3: number
) {
    // Find direction ratio of line AB
    const ABx = x1 - x2;
    const ABy = y1 - y2;
    const ABz = z1 - z2;

    // Find direction ratio of line BC
    const BCx = x3 - x2;
    const BCy = y3 - y2;
    const BCz = z3 - z2;

    // Find the dotProduct
    // of lines AB & BC
    const dotProduct = ABx * BCx + ABy * BCy + ABz * BCz;

    // Find magnitude of
    // line AB and BC
    const magnitudeAB = ABx * ABx + ABy * ABy + ABz * ABz;
    const magnitudeBC = BCx * BCx + BCy * BCy + BCz * BCz;

    // Find the cosine of
    // the angle formed
    // by line AB and BC
    let angle = dotProduct;
    angle /= Math.sqrt(magnitudeAB * magnitudeBC);

    // Print the angle
    return `${Math.round(((Math.acos(angle) * 180) / Math.PI) * 100) / 100}&deg;`;
}

export const recalculateAngles = (group: AngleMarker) => {
    const [x1, y1, z1] = [
        group.point1.position.x,
        group.point1.position.y,
        group.point1.position.z,
    ];
    const [x2, y2, z2] = [
        group.point2.position.x,
        group.point2.position.y,
        group.point2.position.z,
    ];
    const [x3, y3, z3] = [
        group.point3.position.x,
        group.point3.position.y,
        group.point3.position.z,
    ];

    const a1 = calculateAngle(x2, y2, z2, x1, y1, z1, x3, y3, z3);

    const a2 = calculateAngle(x1, y1, z1, x2, y2, z2, x3, y3, z3);

    const a3 = `${
        Math.round((180 - parseFloat(a1) - parseFloat(a2)) * 100) / 100
    }&deg;`;

    group.pointAnnotationMap.get(group.point1)!.element.innerHTML = a1;
    group.pointAnnotationMap.get(group.point2)!.element.innerHTML = a2;
    group.pointAnnotationMap.get(group.point3)!.element.innerHTML = a3;
};

export const calculateArea = (
    m1: THREE.Mesh,
    m2: THREE.Mesh,
    m3: THREE.Mesh,
    m4: THREE.Mesh
) => {
    const [x1, y1, z1] = [m1.position.x, m1.position.y, m1.position.z];
    const [x2, y2, z2] = [m2.position.x, m2.position.y, m2.position.z];
    const [x3, y3, z3] = [m3.position.x, m3.position.y, m3.position.z];
    const [x4, y4, z4] = [m4.position.x, m4.position.y, m4.position.z];

    const a1 =
        (parseFloat(calculateAngle(x1, y1, z1, x2, y2, z2, x3, y3, z3)) *
            Math.PI) /
        180;
    const a2 =
        (parseFloat(calculateAngle(x3, y3, z3, x4, y4, z4, x1, y1, z1)) *
            Math.PI) /
        180;

    const AB1 = Math.sqrt(
        Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2)
    );
    const BC1 = Math.sqrt(
        Math.pow(x3 - x2, 2) + Math.pow(y3 - y2, 2) + Math.pow(z3 - z2, 2)
    );
    const AB2 = Math.sqrt(
        Math.pow(x1 - x4, 2) + Math.pow(y1 - y4, 2) + Math.pow(z1 - z4, 2)
    );
    const BC2 = Math.sqrt(
        Math.pow(x3 - x4, 2) + Math.pow(y3 - y4, 2) + Math.pow(z3 - z4, 2)
    );

    return Math.round(0.5 * (AB1 * BC1 * Math.sin(a1) + AB2 * BC2 * Math.sin(a2)) * 100) / 100;
};

export const calculateAreaAnnotationPos = (
    m1: THREE.Mesh,
    m2: THREE.Mesh,
    m3: THREE.Mesh,
    m4: THREE.Mesh
) => {
    const [x1, y1, z1] = [m1.position.x, m1.position.y, m1.position.z];
    const [x2, y2, z2] = [m2.position.x, m2.position.y, m2.position.z];
    const [x3, y3, z3] = [m3.position.x, m3.position.y, m3.position.z];
    const [x4, y4, z4] = [m4.position.x, m4.position.y, m4.position.z];

    const xAve = (x1 + x2 + x3 + x4) / 4;
    const yAve = (y1 + y2 + y3 + y4) / 4;
    const zAve = (z1 + z2 + z3 + z4) / 4;

    return { xAve: xAve, yAve: yAve, zAve: zAve };
};

export const createAreaAnnotation = (
    m1: THREE.Mesh,
    m2: THREE.Mesh,
    m3: THREE.Mesh,
    m4: THREE.Mesh,
    l1: THREE.Line,
    l2: THREE.Line,
    l3: THREE.Line,
    l4: THREE.Line
) => {
    const area = calculateArea(m1, m2, m3, m4);
    const { xAve, yAve, zAve } = calculateAreaAnnotationPos(m1, m2, m3, m4);
    const elem = document.createElement("div");
    elem.classList.add("annotation");
    elem.innerHTML = `${area}m<sup>2</sup>`;
    const anno = {
        element: elem,
        x: xAve,
        y: yAve,
        yAdjusted: yAve,
        z: zAve,
        heightOffset: 0,
        type: Tools.Area,
    };

    window["annotations"].push(anno);
    document.body.appendChild(elem);

    const anno1 = createLineAnnotation(m1, m2, l1).annotation;
    const anno2 = createLineAnnotation(m2, m3, l2).annotation;
    const anno3 = createLineAnnotation(m3, m4, l3).annotation;
    const anno4 = createLineAnnotation(m4, m1, l4).annotation;

    const lineAnnotationMap = new Map<THREE.Line, Annotation>();
    const pointLineMap = new Map<THREE.Mesh, THREE.Line[]>();
    const linePointMap = new Map<THREE.Line, THREE.Mesh[]>();

    lineAnnotationMap.set(l1, anno1);
    lineAnnotationMap.set(l2, anno2);
    lineAnnotationMap.set(l3, anno3);
    lineAnnotationMap.set(l4, anno4);
    pointLineMap.set(m1, [l1, l4]);
    pointLineMap.set(m2, [l2, l1]);
    pointLineMap.set(m3, [l2, l3]);
    pointLineMap.set(m4, [l4, l3]);
    linePointMap.set(l1, [m1, m2]);
    linePointMap.set(l2, [m2, m3]);
    linePointMap.set(l3, [m3, m4]);
    linePointMap.set(l4, [m4, m1]);

    return {
        lineAnnotationMap: lineAnnotationMap,
        pointLineMap: pointLineMap,
        linePointMap: linePointMap,
        point1: m1,
        point2: m2,
        point3: m3,
        point4: m4,
        areaAnnotation: anno,
    };
};

export const createHeightAnnotation = (x: number, y: number, z: number, marker: THREE.Mesh) => {
    const headers = window["headers"];
    const zOffset = headers.MinimumBounds[2] + (headers.MaximumBounds[2] - headers.MinimumBounds[2]) / 2
    const minZAdjusted = headers.MinimumBounds[2] - zOffset
    const elem = document.createElement("div");
    const annotation = {
        element: elem,
        x: x,
        y: y,
        yAdjusted: y,
        z: z,
        heightOffset: 15,
        type: Tools.Point,
    };
    elem.classList.add("annotation");
    elem.innerHTML = `${Math.round((y - minZAdjusted) * 100) / 100}m`;
    window["annotations"].push(annotation);
    document.body.appendChild(elem);
    return {
        annotation: annotation,
        point: marker,
    };
}

export const labelPointMeasure = (x: number, y: number, z: number) => {
    const headers = window["headers"];
    const [minX, minY, minZ] = headers.MinimumBounds;
    const [maxX, maxY, maxZ] = headers.MaximumBounds;
    const [midX, midY, midZ] = [
        minX + (maxX - minX) / 2,
        minY + (maxY - minY) / 22,
        minZ + (maxZ - minZ) / 2,
    ];

    return `${Math.round((x + midX) * 100) / 100}, ${
        Math.round((z + midY) * 100) / 100
    }, ${Math.round((y + midZ) * 100) / 100}`;
};

export const labelDistanceMeasure = (
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number
) => {
    return `${
        Math.round(
            Math.sqrt(
                Math.pow(x1 - x2, 2) +
                    Math.pow(y1 - y2, 2) +
                    Math.pow(z1 - z2, 2)
            ) * 100
        ) / 100
    }m`;
};

export const getMidDist = (
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number
) => {
    return [
        Math.min(x1, x2) + Math.abs(x1 - x2) / 2,
        Math.min(y1, y2) + Math.abs(y1 - y2) / 2,
        Math.min(z1, z2) + Math.abs(z1 - z2) / 2,
    ];
};
