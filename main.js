import { realcarFissura, escala_de_cinza } from "./preProcessamento.js";

import "./common.js";

// Escuta mudanças no threshold e recarrega automaticamente se "Destacar Fissura" estiver selecionada
document.addEventListener("thresholdChanged", (event) => {
  const functionSelector = document.querySelector("#functionSelector");
  if (functionSelector.value === "fun2") {
    handleImageFunction("fun2");
  }
});

// Escuta mudanças na seleção de função
document.addEventListener("functionChanged", (event) => {
  handleImageFunction(event.detail);
});

export function handleImageFunction(selectedFunction) {
  const preview = document.querySelector(".single-output");

  preview.innerHTML = "";
  switch (selectedFunction) {
    case "fun1":
      escala_de_cinza();
      break;
    case "fun2":
      realcarFissura();
      break;
    case "fun3":
      reconhecimentoCompleto().catch((error) => {
        console.error("Erro no reconhecimento completo:", error);
        const msg = document.createElement("p");
        msg.textContent = "Erro ao executar reconhecimento: " + error.message;
        preview.appendChild(msg);
      });
      break;
    default:
      const msg = document.createElement("p");
      msg.textContent = "Nenhuma função selecionada.";
      preview.appendChild(msg);
  }
}
