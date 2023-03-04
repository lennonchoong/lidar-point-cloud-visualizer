export interface LASHeaders {
    Event: string;
    PointOffset: number;
    FormatId: number;
    StructSize: number;
    PointCount: number;
    Scale: number[];
    Offset: number[];
    MinimumBounds: number[];
    MaximumBounds: number[];
}

// export const dummyLASHeader: LASHeaders = {
//     pointOffset: 0,
//     formatID: 0,
//     structSize: 0,
//     pointCount: 0,
//     scale: [],
//     offset: [],
//     maximumBounds: [],
//     minimumBounds: []
// }

export interface PointFormat {
    position: number[];
    intensity: number;
    classification: number;
    color?: number[];
}

export type PointFormatReader = (dv: DataView) => PointFormat;

export type NumberArrayTypes =
    | Uint8ArrayConstructor
    | Uint16ArrayConstructor
    | Uint32ArrayConstructor
    | Float64ArrayConstructor;

export const colorClassifications: { [key: number]: number[] } = {
    2: [161, 82, 46], // ground
    3: [0, 255, 1], // low vegetation
    4: [0, 204, 0], // medium vegetation
    5: [0, 153, 0], // high vegetation
    6: [255, 168, 0], // building
    7: [255, 0, 255], // noise
    9: [0, 0, 255], // water
    10: [255, 255, 0], // rail
    11: [255, 255, 255], // road surface
    13: [255, 255, 0], // wire - guard
    14: [255, 255, 0], // wire - conductor
    15: [255, 255, 0], // transmission tower
    16: [255, 255, 0], // wire - connector
    17: [255, 255, 0], // bridge deck
    18: [255, 255, 0], // high noise
};

export type Camera = THREE.PerspectiveCamera | THREE.OrthographicCamera;

export interface SphereMarker {
    mesh: THREE.Mesh;
    x: number;
    y: number;
    z: number;
}

export enum Tools {
    Point = "point-measure",
    Distance = "distance-measure",
    Area = "area-measure",
    Height = "height-measure",
    Angle = "angle-measure",
}

export interface Annotation {
    element: HTMLDivElement;
    x: number;
    y: number;
    yAdjusted: number;
    z: number;
    heightOffset: number;
    type: Tools;
}

export interface PointMarker {
    annotation: Annotation;
    point: THREE.Mesh;
}

export interface DistanceMarker {
    annotation: Annotation;
    point1: THREE.Mesh;
    point2: THREE.Mesh;
    line: THREE.Line;
}

export interface AngleMarker {
    pointAnnotationMap: Map<THREE.Mesh, Annotation>;
    pointLineMap: Map<THREE.Mesh, THREE.Line[]>;
    linePointMap: Map<THREE.Line, THREE.Mesh[]>;
    point1: THREE.Mesh;
    point2: THREE.Mesh;
    point3: THREE.Mesh;
}

export interface AreaMarker {
    lineAnnotationMap: Map<THREE.Line, Annotation>;
    pointLineMap: Map<THREE.Mesh, THREE.Line[]>;
    linePointMap: Map<THREE.Line, THREE.Mesh[]>;
    point1: THREE.Mesh;
    point2: THREE.Mesh;
    point3: THREE.Mesh;
    point4: THREE.Mesh;
    areaAnnotation: Annotation;
}

export function isPointMarker(s: MarkerGroup): s is PointMarker {
    return (s as PointMarker).point !== undefined;
}

export function isDistanceMarker(s: MarkerGroup): s is DistanceMarker {
    const casted = s as DistanceMarker;
    return (
        casted.point1 !== undefined &&
        casted.point2 !== undefined &&
        casted.line !== undefined
    );
}

export function isAngleMarker(s: MarkerGroup): s is AngleMarker {
    const casted = s as AngleMarker;
    return casted.pointAnnotationMap !== undefined;
}

export function isAreaMarker(s: MarkerGroup): s is AreaMarker {
    const casted = s as AreaMarker;
    return casted.areaAnnotation !== undefined;
}

export type MarkerGroup = PointMarker | DistanceMarker | AngleMarker | AreaMarker;
