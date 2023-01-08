export interface LASHeaders {
    Event: string,
    PointOffset: number,
    FormatId: number, 
    StructSize: number, 
    PointCount: number, 
    Scale: number[], 
    Offset: number[],
    MinimumBounds: number[],
    MaximumBounds: number[],
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

export const colorClassifications: { [key: number] : number[] } = {
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
}