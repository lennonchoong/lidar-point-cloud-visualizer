// import { LASBatch, LASLoader } from "./loader";
import {
    // colorClassifications,
    // LASHeaders,
    PointFormatReader,
} from "./my_types";
// import { updateProgressBar, hideProgressBar } from "./ui";
import HugeUploader from "huge-uploader";
import { hideProgressBar, showProgressBar, updateProgressBar } from "./ui";

export const handleFile = (e: Event) => {
    const currentTarget = e.target as HTMLInputElement;

    if (!currentTarget.files) return;

    showProgressBar();

    const uploader = new HugeUploader({
        endpoint: "http://localhost:8080/upload",
        file: currentTarget.files[0],
        chunkSize: 10,
        headers: {
            sessionId: window.sessionId,
        },
    });

    uploader.on("finish", () => {
        hideProgressBar();
    });

    uploader.on("progress", (prog: any) => {
        updateProgressBar(prog.detail, `Uploading... (${prog.detail}%)`)
    })
};

export const cleanUp = () => {
    console.log("CLEANING UP");

    if (window["geometry"]) {
        window["geometry"].dispose();
    } 

    if (window["material"]) {
        window["material"].dispose();
    } 

    if (window["renderer"]) {
        window["renderer"].clear();   
    }
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
