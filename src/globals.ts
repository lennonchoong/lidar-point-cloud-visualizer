import * as THREE from "three";
import fragmentShader from "./glsl/fragment_shader";
import vertexShader from "./glsl/vertex_shader";
import { LASLoader } from "./loader";

export const loader = new LASLoader();
export const renderer = new THREE.WebGLRenderer();
export const geometry = new THREE.BufferGeometry();
export const material = new THREE.ShaderMaterial({
    vertexColors: true,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    
});