import { cleanUp, handleFile } from "./utils";

let optionOpen = true;

const optionsLabel = document.getElementById('options-label');
const optionsText = document.getElementById('options-text');
const optionsBody = document.getElementById('options-body');
const arrowIcon = document.getElementById('arrow-icon');
const input = document.getElementById("file-input");
const loadingBarContainer = document.getElementById('loading-bar-container');
const loadingBarFiller = document.getElementById('loading-bar-filler');
const loadingLabel = document.getElementById('loading-label');

optionsLabel?.addEventListener('click', () => {
    if (optionsText?.innerText) {
        optionsText.innerText = optionOpen ? "Show" : "Hide";
    }

    arrowIcon?.classList.toggle('down');
    optionsBody?.classList.toggle('close');
    optionOpen = !optionOpen;
});

input?.addEventListener("change", (e) => {
    showProgressBar();
    handleFile(e);
});

export const showProgressBar = () => {
    loadingBarContainer?.classList.add('show');
    loadingBarContainer?.classList.remove('hidden');
    loadingLabel!.innerText = "Uploading... (0%)";
    loadingBarFiller!.style.width = '0%';
}

export const updateProgressBar = (progress: number, progressString: string) => {
    loadingLabel!.innerText = progressString;
    loadingBarFiller!.style.width = `${progress}%`;
}

export const hideProgressBar = () => {
    // setTimeout(() => {
        loadingBarContainer?.classList.remove('show');
        loadingBarContainer?.classList.add('hidden');    
        loadingBarFiller!.style.width = '0%';
    // }, 800)
}

export {};