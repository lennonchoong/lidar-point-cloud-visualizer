import { Tools } from "./my_types";

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
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    prevMarker: THREE.Mesh,
    currMarker: THREE.Mesh,
    line: THREE.Line
) => {
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
        points: [prevMarker, currMarker],
        lines: [line],
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
    }
};

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
    }m`
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
