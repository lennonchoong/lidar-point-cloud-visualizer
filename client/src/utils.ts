import { loader } from "./globals";
import { LASBatch, LASLoader } from "./loader";
import { colorClassifications, LASHeaders, PointFormatReader } from "./types";
import { updateProgressBar, hideProgressBar } from "./ui";
import HugeUploader from "huge-uploader";

export const handleFile = (
    e: Event,
    callback: (header: LASHeaders, batcher: LASBatch[]) => void
) => {
    const currentTarget = e.target as HTMLInputElement;

    if (!currentTarget.files) return;

    const uploader = new HugeUploader({
        endpoint: "http://localhost:8080/upload",
        file: currentTarget.files[0],
        chunkSize: 10,
        headers: {
            sessionId: window.sessionId
        }
    });

    uploader.on("finish", () => {
        console.log("done");
    });

    // const fr = new FileReader();

    // const batcher: LASBatch[] = [];

    // fr.onload = async () => {
    //     console.time('points')
    //     const fileBuffer = fr.result;
    //     if (fileBuffer && typeof fileBuffer !== "string") {
    //         loader.loadFile(fileBuffer);
    //         const header = loader.getHeaders();
    //         console.log(header);
    //         await readLASFileInBatches(loader, header, batcher);
    //         // callback(header, batcher);
    //     }
    // };

    // console.log(currentTarget.files[0].size)
    // fr.readAsArrayBuffer(currentTarget.files[0]);
};

const readLASFileInBatches = (
    loader: LASLoader,
    header: LASHeaders,
    batcher: LASBatch[]
) => {
    const promise = loader.loadData(10000, 0);
    return promise.then(
        ({
            buffer,
            count,
            cumulativeRead,
            hasMoreData,
        }): Promise<[LASHeaders, LASBatch[]]> => {
            batcher.push(new LASBatch(buffer, header, count));
            updateProgressBar(cumulativeRead / header.pointCount);

            if (hasMoreData) {
                return readLASFileInBatches(loader, header, batcher);
            } else {
                hideProgressBar();
                console.timeEnd('points')
                return Promise.resolve([header, batcher]);
            }
        }
    );
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

export const cleanUp = (
    geometry: THREE.BufferGeometry,
    material: THREE.ShaderMaterial,
    renderer: THREE.WebGLRenderer
) => {
    geometry.dispose();
    material.dispose();
    renderer.clear();
};

export const determineColor = (
    color: number[] | undefined,
    classification: number | undefined,
    idx: number
) => {
    if (color) {
        return color[idx] / 255;
    }

    if (classification && classification in colorClassifications) {
        return colorClassifications[classification][idx] / 255;
    }

    return 1;
};

export const gcd = (m: number, n: number): number => {
    if (n === 0) return m;

    if (n > m) return gcd(n, m);

    return gcd(n, m % n);
};
