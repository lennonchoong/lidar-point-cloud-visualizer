const fragmentShader = `
    varying vec4 vColors;

    void main() {

        gl_FragColor = vColors;

    }
`;

export default fragmentShader;