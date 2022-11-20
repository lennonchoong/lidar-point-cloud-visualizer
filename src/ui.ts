let optionOpen = true;

const optionsLabel = document.getElementById('options-label');
const optionsText = document.getElementById('options-text');
const optionsBody = document.getElementById('options-body');
const arrowIcon = document.getElementById('arrow-icon');

optionsLabel?.addEventListener('click', () => {
    if (optionsText?.innerText) {
        optionsText.innerText = optionOpen ? "Show" : "Hide";
    }

    arrowIcon?.classList.toggle('down');
    optionsBody?.classList.toggle('close');
    optionOpen = !optionOpen;
});


export {};