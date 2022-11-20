export interface LASHeaders {
    pointOffset: number;
    formatID: number;
    structSize: number;
    pointCount: number;
    scale: number[];
    offset: number[];
    maximumBounds: number[];
    minimumBounds: number[];
}

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