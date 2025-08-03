import { handleImageFunction } from "./main.js";

const input = document.querySelector("#image");
const secondaryInput = document.querySelector("#secondaryImage");
const preview = document.querySelector(".single-output");
const functionSelector = document.querySelector("#functionSelector");

const primaryFileNameDisplay = document.createElement("p");
primaryFileNameDisplay.classList = "filename";
input.parentNode.insertBefore(primaryFileNameDisplay, input.nextSibling);

const secondaryFileNameDisplay = document.createElement("p");
secondaryFileNameDisplay.className = "filename";
secondaryInput.parentNode.insertBefore(
  secondaryFileNameDisplay,
  secondaryInput.nextSibling
);

let curFile = null;
let secondaryFile = null;

input.addEventListener("change", () => {
  curFile = input.files[0];
  updatePrimaryImageDisplay(curFile);
});

secondaryInput.addEventListener("change", () => {
  secondaryFile = secondaryInput.files[0];
  updateSecondaryImageDisplay(secondaryFile);
});

functionSelector.addEventListener("change", () => {
  if (curFile) {
    const selectedFunction = functionSelector.value;
    handleImageFunction(selectedFunction);
  } else {
    alert("Selecione uma imagem antes de aplicar uma operação.");
  }
});

function updatePrimaryImageDisplay(file) {
  if (!file) {
    primaryFileNameDisplay.textContent = "Nenhum arquivo selecionado";
  } else {
    primaryFileNameDisplay.textContent = `Arquivo: ${file.name}`;
  }
  const existingOutputImg = preview.querySelector(".output-img");
  if (existingOutputImg) {
    existingOutputImg.remove();
  }
  console.log("Imagem principal selecionada.");
}

function updateSecondaryImageDisplay(file) {
  if (!file) {
    secondaryFileNameDisplay.textContent = "Nenhum arquivo selecionado";
  } else {
    secondaryFileNameDisplay.textContent = `Arquivo: ${file.name}`;
  }
  console.log("Imagem secundária selecionada.");
}

function createDownloadLink(canvas, filename = "imagem.png") {
  const downloadContainer = document.querySelector(".download-container");
  downloadContainer.innerHTML = "";
  const downloadLink = document.createElement("a");
  downloadLink.href = canvas.toDataURL();
  downloadLink.download = filename;
  downloadLink.textContent = "Download da Imagem";
  downloadLink.classList = "custom-button";
  downloadContainer.appendChild(downloadLink);
  return downloadLink;
}

export {
  curFile,
  secondaryFile,
  input,
  secondaryInput,
  preview,
  functionSelector,
  updatePrimaryImageDisplay,
  updateSecondaryImageDisplay,
  createDownloadLink,
};
