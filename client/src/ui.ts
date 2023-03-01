import defaultOptions from "./options";
import { handleFile } from "./utils";

let optionOpen = true;

const optionsLabel = document.getElementById("options-label");
const optionsBody = document.getElementById("options-body");
const arrowIcon = document.getElementById("arrow-icon");
const input = document.getElementById("file-input");
const loadingBarContainer = document.getElementById("loading-bar-container");
const loadingBarFiller = document.getElementById("loading-bar-filler");
const loadingLabel = document.getElementById("loading-label");
const fileDownloader = document.getElementById("file-downloader");
const fileDownloadBtn = document.getElementById("file-download-btn");
const sliderInputs = Array.from(document.querySelectorAll("input")).filter(
    (e) => e.type === "range"
);
const sliderTooltip = document.getElementById("slider-tooltip");

sliderInputs.map((d) => {
    d.addEventListener("mouseenter", (e: MouseEvent) => {
        sliderTooltip!.style.display = "block";
        sliderTooltip!.style.top = `${e!.clientY - 35}px`;
        sliderTooltip!.style.left = `${e!.clientX}px`;
    });

    d.addEventListener("mousemove", (e: MouseEvent) => {
        sliderTooltip!.style.top = `${e!.clientY - 35}px`;
        sliderTooltip!.style.left = `${e!.clientX}px`;
        sliderTooltip!.innerHTML = d.value;
    });

    d.addEventListener("mouseleave", () => {
        sliderTooltip!.style.display = "none";
    });
});

optionsLabel?.addEventListener("click", () => {
    arrowIcon?.classList.toggle("down");
    optionsBody?.classList.toggle("close");
    optionOpen = !optionOpen;
});

input?.addEventListener("change", (e) => {
    fileDownloadBtn!.removeEventListener("click", fileDownloadOnClick);
    showProgressBar();
    handleFile(e);

    if (defaultOptions.clustering) {
        updateFileDownloadUILoading();
    }
});

const fileDownloadOnClick = () => {
    console.log("textClick");
    fileDownloader?.dispatchEvent(new Event("click"));
};

window.addEventListener("file-ready", (e: CustomEventInit) => {
    (fileDownloadBtn as HTMLButtonElement)!.disabled = false;
    fileDownloadBtn!.innerHTML = "Download";
    fileDownloadBtn!.classList.remove("loading");
    fileDownloadBtn!.style.cursor = "pointer";
    fileDownloader!.setAttribute("href", e.detail["FilePath"]);

    fileDownloadBtn!.addEventListener("click", fileDownloadOnClick);
});

const updateFileDownloadUILoading = () => {
    const fileDownloadBtn = document.getElementById("file-download-btn");
    fileDownloadBtn!.innerHTML = "Loading";
    fileDownloadBtn!.classList.add("loading");
};

export const showProgressBar = () => {
    loadingBarContainer?.classList.add("show");
    loadingBarContainer?.classList.remove("hidden");
    loadingLabel!.innerText = "Uploading... (0%)";
    loadingBarFiller!.style.width = "0%";
};

export const updateProgressBar = (progress: number, progressString: string) => {
    console.log(progressString);
    loadingLabel!.innerText = progressString;
    loadingBarFiller!.style.width = `${progress}%`;
};

export const hideProgressBar = () => {
    // setTimeout(() => {
    loadingBarContainer?.classList.remove("show");
    loadingBarContainer?.classList.add("hidden");
    loadingBarFiller!.style.width = "0%";
    // }, 800)
};

export {};
