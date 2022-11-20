import {
    LASHeaders,
    NumberArrayTypes,
    PointFormat,
    PointFormatReader,
} from "./types";
import { pointFormatReaders } from "./utils";

export class LASLoader {
    private buffer: ArrayBuffer;
    private header: LASHeaders;
    private readOffset: number;
    public version: number;

    constructor(buffer: ArrayBuffer) {
        this.buffer = buffer;
        this.header = this.getHeaders();
        this.version = this.readVersion();
        this.readOffset = 0;

        if (this.version > 13) {
            throw new Error("File versions <= 1.3 supported");
        }

        if (pointFormatReaders[this.header.formatID] === undefined) {
            throw new Error("Unsupported point format ID");
        }
    }

    getHeaders(): LASHeaders {
        const bounds = this.readAsMultiple(
            this.buffer,
            Float64Array,
            32 * 3 + 83,
            6
        );
        return {
            pointOffset: this.readAsSingle(this.buffer, Uint32Array, 32 * 3),
            formatID: this.readAsSingle(this.buffer, Uint8Array, 32 * 3 + 8),
            structSize: this.readAsSingle(this.buffer, Uint16Array, 32 * 3 + 9),
            pointCount: this.readAsSingle(
                this.buffer,
                Uint32Array,
                32 * 3 + 11
            ),
            scale: this.readAsMultiple(
                this.buffer,
                Float64Array,
                32 * 3 + 35,
                3
            ),
            offset: this.readAsMultiple(
                this.buffer,
                Float64Array,
                32 * 3 + 59,
                3
            ),
            maximumBounds: [bounds[0], bounds[2], bounds[4]],
            minimumBounds: [bounds[1], bounds[3], bounds[5]],
        };
    }

    readAsSingle(
        buffer: ArrayBuffer,
        type: NumberArrayTypes,
        offset: number
    ): number {
        const sub = buffer.slice(offset, offset + type.BYTES_PER_ELEMENT);
        const r = new type(sub);
        return r[0];
    }

    readAsMultiple(
        buffer: ArrayBuffer,
        type: NumberArrayTypes,
        offset: number,
        count: number
    ): number[] {
        const sub = buffer.slice(
            offset,
            offset + type.BYTES_PER_ELEMENT * count
        );
        const r = new type(sub);
        const ret: number[] = [];
        for (let i = 0; i < count; i++) {
            ret.push(r[i]);
        }
        return ret;
    }

    readVersion(): number {
        const version = new Int8Array(this.buffer, 24, 2);
        return version[0] * 10 + version[1];
    }

    loadData(
        count: number,
        skip: number
    ): Promise<{ buffer: ArrayBuffer; count: number; hasMoreData: boolean }> {
        return new Promise((response) => {
            let start;
            if (skip <= 1) {
                count = Math.min(
                    count,
                    this.header.pointCount - this.readOffset
                );
                start =
                    this.header.pointOffset +
                    this.readOffset * this.header.structSize;
                const end = start + count * this.header.structSize;
                response({
                    buffer: this.buffer.slice(start, end),
                    count: count,
                    hasMoreData:
                        this.readOffset + count < this.header.pointCount,
                });
                this.readOffset += count;
            } else {
                const pointsToRead = Math.min(
                    count * skip,
                    this.header.pointCount - this.readOffset
                );
                const bufferSize = Math.ceil(pointsToRead / skip);
                let pointsRead = 0;

                const buf = new Uint8Array(bufferSize * this.header.structSize);

                for (let i = 0; i < pointsToRead; i++) {
                    if (i % skip === 0) {
                        start =
                            this.header.pointOffset +
                            this.readOffset * this.header.structSize;
                        const src = new Uint8Array(
                            this.buffer,
                            start,
                            this.header.structSize
                        );

                        buf.set(src, pointsRead * this.header.structSize);
                        pointsRead++;
                    }

                    this.readOffset++;
                }

                response({
                    buffer: buf.buffer,
                    count: pointsRead,
                    hasMoreData: this.readOffset < this.header.pointCount,
                });
            }
        });
    }
}

export class LASBatch {
    private header: LASHeaders;
    private buffer: ArrayBuffer;
    private pointFormatReader: PointFormatReader;
    public count: number;

    constructor(buffer: ArrayBuffer, header: LASHeaders, count: number) {
        this.header = header;
        this.buffer = buffer;
        this.count = count;
        this.pointFormatReader = pointFormatReaders[this.header.formatID];
    }

    getPoint(index: number): PointFormat {
        if (index < 0 || index > this.count) {
            throw new Error("Out of range");
        }

        const dv = new DataView(
            this.buffer,
            index * this.header.structSize,
            this.header.structSize
        );
        return this.pointFormatReader(dv);
    }
}
