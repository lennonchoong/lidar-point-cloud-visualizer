import { geometry, material, renderer } from "./globals";
import { loadPoints } from "./main";
import { cleanUp, handleFile } from "./utils";

let optionOpen = true;

const optionsLabel = document.getElementById('options-label');
const optionsText = document.getElementById('options-text');
const optionsBody = document.getElementById('options-body');
const arrowIcon = document.getElementById('arrow-icon');
const input = document.getElementById("file-input");
const loadingBarContainer = document.getElementById('loading-bar-container');
const loadingBarFiller = document.getElementById('loading-bar-filler');
let start = 0;
let end = 0; 

optionsLabel?.addEventListener('click', () => {
    if (optionsText?.innerText) {
        optionsText.innerText = optionOpen ? "Show" : "Hide";
    }

    arrowIcon?.classList.toggle('down');
    optionsBody?.classList.toggle('close');
    optionOpen = !optionOpen;
});

input?.addEventListener("change", (e) => {
    cleanUp(geometry, material, renderer);
    showProgressBar();
    handleFile(e, loadPoints);
});

export const showProgressBar = () => {
    loadingBarContainer?.classList.add('show');
    loadingBarContainer?.classList.remove('hidden');
    if (loadingBarFiller) {
        loadingBarFiller.style.width = '0%';
    }
    start = new Date().getTime();
}

export const updateProgressBar = (progress: number) => {
    if (loadingBarFiller) {
        setTimeout(() => {
            console.log(`${Math.floor(progress * 100)}%`);
            loadingBarFiller.style.width = `${Math.floor(progress * 100)}%`;
        }, 400)
    }
}

export const hideProgressBar = () => {
    setTimeout(() => {
        loadingBarContainer?.classList.remove('show');
        loadingBarContainer?.classList.add('hidden');    
        if (loadingBarFiller) {
            loadingBarFiller.style.width = '0%';
        }
    }, 200)
}

export {};