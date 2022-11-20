import { geometry, material, renderer } from "./globals";
import { loadPoints } from "./main";
import { cleanUp, handleFile } from "./utils";

let optionOpen = true;

const optionsLabel = document.getElementById('options-label');
const optionsText = document.getElementById('options-text');
const optionsBody = document.getElementById('options-body');
const arrowIcon = document.getElementById('arrow-icon');
const input = document.getElementById("file-input");

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
    handleFile(e, loadPoints);
});


export {};