import { handleImageFunction } from "./main.js";

const input = document.querySelector("#image");
const preview = document.querySelector(".single-output");
const originalImageContainer = document.querySelector(".original-image");
const functionSelector = document.querySelector("#functionSelector");

const primaryFileNameDisplay = document.createElement("p");
primaryFileNameDisplay.classList = "filename";
input.parentNode.insertBefore(primaryFileNameDisplay, input.nextSibling);

let curFile = null;

input.addEventListener("change", () => {
  curFile = input.files[0];
  updatePrimaryImageDisplay(curFile);
  displayOriginalImage(curFile);
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

function displayOriginalImage(file) {
  if (!file) {
    originalImageContainer.innerHTML = "";
    return;
  }

  // Clear previous original image
  originalImageContainer.innerHTML = "";

  // Create canvas for original image
  const canvas = document.createElement("canvas");
  canvas.classList.add("styled-canva");
  const ctx = canvas.getContext("2d");
  const img = new Image();

  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    originalImageContainer.appendChild(canvas);
  };

  img.src = URL.createObjectURL(file);
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
  input,
  preview,
  originalImageContainer,
  functionSelector,
  updatePrimaryImageDisplay,
  displayOriginalImage,
  createDownloadLink,
};
