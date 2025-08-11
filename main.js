import { realcarFissura, escala_de_cinza,TransformadaBottomHatImg,TransformarRgbParaHsvImg,AplicarHSVImg,LimiarizacaoSimplesImg, realcarFissuraVerde, realcarFissuraVerdeComSuavizacao } from "./preProcessamento.js";

import "./common.js";

// Variáveis para controle de debouncing e cancelamento
let thresholdTimeout = null;
let currentProcessing = false;
let pendingFunction = null;

// Função para limpar o preview
function clearPreview() {
  const preview = document.querySelector(".single-output");
  preview.innerHTML = "";
}

// Função com debouncing para mudanças de threshold
function handleThresholdChange(selectedFunction) {
  // Cancela o timeout anterior se existir
  if (thresholdTimeout) {
    clearTimeout(thresholdTimeout);
  }
  
  // Armazena a função pendente
  pendingFunction = selectedFunction;
  
  // Define um novo timeout com delay de 300ms
  thresholdTimeout = setTimeout(() => {
    if (pendingFunction && !currentProcessing) {
      executeFunction(pendingFunction);
    }
    thresholdTimeout = null;
    pendingFunction = null;
  }, 300); // 300ms de delay
}

// Função para executar as funções de processamento
async function executeFunction(selectedFunction) {
  // Previne execuções simultâneas
  if (currentProcessing) {
    return;
  }
  
  currentProcessing = true;
  clearPreview();
  
  try {
    switch (selectedFunction) {
      case "fun1":
        await escala_de_cinza();
        break;
      case "fun2":
        await realcarFissura();
        break;
      case "fun3":
        await TransformadaBottomHatImg();
        break;
      case "fun4":
        await TransformarRgbParaHsvImg();
        break;
      case "fun5":
        await AplicarHSVImg();
        break;
      case "fun6":
        await LimiarizacaoSimplesImg();
        break;
      case "fun7":
        await realcarFissuraVerde();
        break;
      case "fun8":
        await realcarFissuraVerdeComSuavizacao()
      default:
        const msg = document.createElement("p");
        msg.textContent = "Nenhuma função selecionada.";
        const preview = document.querySelector(".single-output");
        preview.appendChild(msg);
    }
  } catch (error) {
    console.error("Erro ao executar função:", selectedFunction, error);
    const preview = document.querySelector(".single-output");
    const errorMsg = document.createElement("p");
    errorMsg.textContent = "Erro ao processar a imagem: " + error.message;
    errorMsg.style.color = "red";
    preview.appendChild(errorMsg);
  } finally {
    currentProcessing = false;
  }
}

// Escuta mudanças no threshold com debouncing
document.addEventListener("thresholdChanged", (event) => {
  const functionSelector = document.querySelector("#functionSelector");
  
  // Aplica debouncing para fun2 (realcarFissura) e fun6 (LimiarizacaoSimplesImg) que usam threshold
  if (functionSelector.value === "fun2") {
    handleThresholdChange("fun2");
  } else if (functionSelector.value === "fun6") {
    handleThresholdChange("fun6");
  }
});

// Escuta mudanças na seleção de função (execução imediata)
document.addEventListener("functionChanged", (event) => {
  // Cancela qualquer operação de threshold pendente
  if (thresholdTimeout) {
    clearTimeout(thresholdTimeout);
    thresholdTimeout = null;
    pendingFunction = null;
  }
  
  handleImageFunction(event.detail);
});

// Função principal para lidar com mudanças de função
export function handleImageFunction(selectedFunction) {
  executeFunction(selectedFunction);
}