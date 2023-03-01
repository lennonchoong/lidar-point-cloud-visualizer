const defaultOptions: { [key: string]: any } = {
    clustering: true,
    subsample: true,
    lod: true,
    density: 100,
    camera: 1,
    fov: 75,
    zExag: 0,
};

(document.getElementById("clustering") as HTMLInputElement).checked =
    defaultOptions.clustering;
(document.getElementById("subsample") as HTMLInputElement).checked =
    defaultOptions.subsample;
(document.getElementById("lod") as HTMLInputElement).checked =
    defaultOptions.lod;
(document.getElementById("density") as HTMLInputElement).value =
    defaultOptions.density;

document.getElementById("clustering")?.addEventListener("change", (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    defaultOptions["clustering"] = checked;

    (document.getElementById("lod") as HTMLInputElement).disabled = !checked;
});

document.getElementById("subsample")?.addEventListener("change", (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    defaultOptions["subsample"] = checked;

    (document.getElementById("density") as HTMLInputElement).disabled =
        !checked;
});

document.getElementById("lod")?.addEventListener("change", (e) => {
    defaultOptions["lod"] = (e.target as HTMLInputElement).checked;
});

document.getElementById("density")?.addEventListener("change", (e) => {
    defaultOptions["density"] = (e!.target as HTMLInputElement).value;
});

const buttonIDs = [
    "perspective-camera",
    "orthogonal-camera",
    "top-view-camera",
];

const buttonClickHandler = (e: Event) => {
    const value = parseInt((e.target as HTMLButtonElement).value);

    if (value === defaultOptions["camera"]) return;

    if (value !== 1) {
        (document.getElementById("camera-fov") as HTMLInputElement).disabled =
            true;
    } else {
        (document.getElementById("camera-fov") as HTMLInputElement).disabled =
            false;
    }

    defaultOptions["camera"] = value;
    buttonIDs.forEach((d) =>
        document!.getElementById(d)!.classList.remove("active-button")
    );
    (e.target as HTMLButtonElement).classList.add("active-button");
    window.dispatchEvent(new Event("update-camera"));
};

buttonIDs.forEach((d) =>
    document!.getElementById(d)!.addEventListener("click", buttonClickHandler)
);

export default defaultOptions;
