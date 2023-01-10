import { LASHeaders } from './my_types';
import { hideProgressBar, showProgressBar, updateProgressBar } from './ui';

class Socket {
    private ws: WebSocket | undefined = undefined; 
    private o;
    private url: string | undefined;
    private header: LASHeaders | undefined;
    private chunks: number[][];
    private chunkCount: number = 0;

    constructor(url: string) {
        this.ws = new WebSocket(url);
        this.o = this;
        this.url = url;
        this.chunks = [];
    }

    connect(callback: (points: number[][], header: LASHeaders) => void) {
        if (!this.ws) return;

        const socket = this.ws
        const o = this.o

        socket.onopen = function () {
            console.log("ws opened")
        };
    
        socket.onmessage = function (e) {
            const data = JSON.parse(e.data);
            if (data["Event"] === "sessionId") {
                window['sessionId'] = data["SessionId"]
            } else if (data["Event"] === "points") {
                o.pointEventHandler(data);
            } else if (data["Event"] === "headers") {
                o.header = data;
            } else if (data["Event"] === "done") {
                o.doneEventHandler(callback);
            }
        };
    
        socket.onclose = (e) => {
            console.log(
                "Socket is closed. Reconnect will be attempted in 1 second.",
                e.reason
            );
            setTimeout(function () {
                if (!o.url) return;
                o.ws = new WebSocket(o.url)
                o.connect(callback);
            }, 1000);
        };
    
        socket.onerror = () => {
            socket.close();
        };
    }

    pointEventHandler(data: any) {
        if (!this.chunks.length) {
            showProgressBar();
        }
        
        this.chunks.push(data["Points"]);
        
        this.chunkCount++;
        
        const downloadProg = Math.ceil(this.chunkCount / data["TotalChunks"] * 100)
        updateProgressBar(downloadProg, `Processing... (${downloadProg}%)`)
    }

    doneEventHandler(callback: (points: number[][], header: LASHeaders) => void) {
        if (this.header) {
            console.log("CHUNKS DONE")
            callback(this.chunks, this.header)
            hideProgressBar();
            this.clearPointData();
        }
    }

    clearPointData() {
        this.chunks = [];
        this.header = undefined;
        this.chunkCount = 0;
    }
}

export default Socket;