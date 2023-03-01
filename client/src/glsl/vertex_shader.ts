const vertexShader = `
    attribute vec4 colors;
    uniform float size;
    uniform float zexag;

    varying vec4 vColors;

    void main() {

        vColors = colors;
        vec4 projected = projectionMatrix * modelViewMatrix * vec4( position[0], position[1] * (1.0 + 2.0 * (zexag / 100.0)), position[2], 1.0 );
        gl_Position = projected;

        float xDelta = pow(position[0] - cameraPosition[0], 2.0);
        float yDelta = pow(position[1] - cameraPosition[1], 2.0);
        float zDelta = pow(position[2] - cameraPosition[2], 2.0);
        float delta  = pow(xDelta + yDelta + zDelta, 0.5);
        gl_PointSize = size / delta;
    }
`;

export default vertexShader;