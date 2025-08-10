const input = document.querySelector("#image");
const preview = document.querySelector(".single-output");
const originalImageContainer = document.querySelector(".original-image");
const functionSelector = document.querySelector("#functionSelector");
const thresholdSlider = document.querySelector("#threshold");
const thresholdValue = document.querySelector("#thresholdValue");

const primaryFileNameDisplay = document.createElement("p");
primaryFileNameDisplay.classList = "filename";
input.parentNode.insertBefore(primaryFileNameDisplay, input.nextSibling);

let curFile = null;
let currentThreshold = 14;

thresholdSlider.addEventListener("change", () => {
  currentThreshold = parseInt(thresholdSlider.value);
  thresholdValue.textContent = currentThreshold;

  // Dispara um evento customizado para notificar mudanças no threshold
  const event = new CustomEvent("thresholdChanged", {
    detail: currentThreshold,
  });
  document.dispatchEvent(event);
});

// Também adiciona o evento "input" para atualização em tempo real enquanto arrasta
thresholdSlider.addEventListener("input", () => {
  currentThreshold = parseInt(thresholdSlider.value);
  thresholdValue.textContent = currentThreshold;

  // Dispara um evento customizado para notificar mudanças no threshold
  const event = new CustomEvent("thresholdChanged", {
    detail: currentThreshold,
  });
  document.dispatchEvent(event);
});

input.addEventListener("change", () => {
  curFile = input.files[0];
  updatePrimaryImageDisplay(curFile);
  displayOriginalImage(curFile);

  const selectedFunction = functionSelector.value;
  if (selectedFunction && selectedFunction !== "") {
    const event = new CustomEvent("functionChanged", {
      detail: selectedFunction,
    });
    document.dispatchEvent(event);
  }
});

functionSelector.addEventListener("change", () => {
  if (curFile) {
    const selectedFunction = functionSelector.value;
    // Dispara um evento customizado para notificar mudança de função
    const event = new CustomEvent("functionChanged", {
      detail: selectedFunction,
    });
    document.dispatchEvent(event);
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
  currentThreshold,
  updatePrimaryImageDisplay,
  displayOriginalImage,
  createDownloadLink,
};
