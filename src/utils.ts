import { LASBatch, LASLoader } from "./loader";
import { LASHeaders, PointFormatReader } from "./types";

export const handleFile = (
    e: Event,
    callback: (header: LASHeaders, batcher: LASBatch[]) => void
) => {
    const currentTarget = e.target as HTMLInputElement;

    if (!currentTarget.files) return;

    const fr = new FileReader();

    const batcher: LASBatch[] = [];

    fr.onload = async () => {
        const fileBuffer = fr.result;
        if (fileBuffer && typeof fileBuffer !== "string") {
            const loader = new LASLoader(fileBuffer);
            const header = loader.getHeaders();
            await readLASFileInBatches(loader, header, batcher);
            callback(header, batcher);
        }
    };

    fr.readAsArrayBuffer(currentTarget.files[0]);
};

const readLASFileInBatches = (
    loader: LASLoader,
    header: LASHeaders,
    batcher: LASBatch[]
) => {
    const promise = loader.loadData(10000, 0);
    return promise.then(({ buffer, count, hasMoreData }): Promise<[LASHeaders, LASBatch[]]> => {
        batcher.push(new LASBatch(buffer, header, count));
        if (hasMoreData) {
            return readLASFileInBatches(loader, header, batcher);
        } else {
            return Promise.resolve([header, batcher]);
        }
    });
};

export const pointFormatReaders: { [key: number]: PointFormatReader } = {
    0: function (dv: DataView) {
        return {
            position: [
                dv.getInt32(0, true),
                dv.getInt32(4, true),
                dv.getInt32(8, true),
            ],
            intensity: dv.getUint16(12, true),
            classification: dv.getUint8(15),
        };
    },
    1: function (dv: DataView) {
        return {
            position: [
                dv.getInt32(0, true),
                dv.getInt32(4, true),
                dv.getInt32(8, true),
            ],
            intensity: dv.getUint16(12, true),
            classification: dv.getUint8(15),
        };
    },
    2: function (dv: DataView) {
        return {
            position: [
                dv.getInt32(0, true),
                dv.getInt32(4, true),
                dv.getInt32(8, true),
            ],
            intensity: dv.getUint16(12, true),
            classification: dv.getUint8(15),
            color: [
                dv.getUint16(20, true),
                dv.getUint16(22, true),
                dv.getUint16(24, true),
            ],
        };
    },
    3: function (dv: DataView) {
        return {
            position: [
                dv.getInt32(0, true),
                dv.getInt32(4, true),
                dv.getInt32(8, true),
            ],
            intensity: dv.getUint16(12, true),
            classification: dv.getUint8(15),
            color: [
                dv.getUint16(28, true),
                dv.getUint16(30, true),
                dv.getUint16(32, true),
            ],
        };
    },
};

export const normalizeAlphas = (colors: number[], maxIntensity: number) => {
    for (let i = 3; i < colors.length; i += 4) {
        colors[i] = colors[i] / maxIntensity;
    }
};