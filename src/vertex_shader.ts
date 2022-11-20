const vertexShader = `
    attribute vec4 colors;

    varying vec4 vColors;

    void main() {

        vColors = colors;

        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

        gl_PointSize = 1.0;

        gl_Position = projectionMatrix * mvPosition;

    }
`;

export default vertexShader;