import { LASHeaders } from './types';

class Socket {
    private ws: WebSocket | undefined = undefined; 
    private o;
    private url: string | undefined;
    private header: LASHeaders | undefined;
    private chunks: number[][];

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
                o.chunks.push(data["Points"]);
                if (o.chunks.length === data["TotalChunks"] && o.header) {
                    console.log("CHUNKS DONE")
                    callback(o.chunks, o.header)
                }
            } else if (data["Event"] === "headers") {
                o.header = data;
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
    
        socket.onerror = (err) => {
            console.log(err);
            socket.close();
        };
    }
}

export default Socket;