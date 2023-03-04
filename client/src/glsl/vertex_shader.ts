const vertexShader = `
    attribute vec4 colors;
    attribute int classification;
    uniform float size;
    uniform float zexag;
    uniform vec3 colormap[12];

    varying vec4 vColors;

    void main() {
        if (classification >= 0 && classification <= 11) {
            vColors = vec4(colormap[classification][0] / 255.0, colormap[classification][1] / 255.0, colormap[classification][2] / 255.0, colors[3]);
        } else {
            vColors = colors;
        }

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