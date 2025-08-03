
import {
  detectarFissura,
  escala_de_cinza,
} from "./scriptGeral.js";


import "./common.js";

export function handleImageFunction(selectedFunction) {
  const preview = document.querySelector(".single-output");

  preview.innerHTML = "";
  switch (selectedFunction) {
    case "fun1":
      escala_de_cinza();
      break;
    case "fun2":
      detectarFissura();
      break;
    case "fun3":
      
      break;

      default:
      const msg = document.createElement("p");
      msg.textContent = "Nenhuma função selecionada.";
      preview.appendChild(msg);
  }
}
