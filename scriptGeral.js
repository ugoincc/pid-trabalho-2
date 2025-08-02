import { curFile, preview, createDownloadLink } from "./common.js";

// Funcao auxiliar para converter para escala de cinza usando formula luma
function converte_escala_de_cinza(dadosImagem) {
  const dados = dadosImagem.data;
  const largura = dadosImagem.width;
  const altura = dadosImagem.height;

  // Array para armazenar os valores em escala de cinza
  const dadosCinza = new Uint8Array(largura * altura);

  // Conversao para escala de cinza usando formula luma
  for (let i = 0, j = 0; i < dados.length; i += 4, j++) {
    // Y = 0.299R + 0.587G + 0.114B
    dadosCinza[j] = Math.round(
      dados[i] * 0.299 + dados[i + 1] * 0.587 + dados[i + 2] * 0.114
    );
  }

  return dadosCinza;
}

// Função de limiarização simples
function limiarizacao_simples(dadosImagem, limiar = 0.9) {
  const dados = dadosImagem.data;
  const largura = dadosImagem.width;
  const altura = dadosImagem.height;

  const valorLimiar = Math.round(limiar * 255); // 0.9 * 255 = 229.5 → 230

  // Converte para escala de cinza primeiro
  const dadosCinza = converte_escala_de_cinza(dadosImagem);

  for (let i = 0, j = 0; i < dados.length; i += 4, j++) {
    const valorBinario = dadosCinza[j] >= valorLimiar ? 255 : 0;

    dados[i] = valorBinario;     // Vermelho
    dados[i + 1] = valorBinario; // Verde
    dados[i + 2] = valorBinario; // Azul
    
  }

  return dadosImagem;
}

// Função para limiarizar a imagem
export function limiarizar() {
  const tela = document.createElement("canvas");
  tela.classList.add("styled-canva");
  const contexto = tela.getContext("2d");
  const imagem = new Image();
  imagem.src = URL.createObjectURL(curFile);

  imagem.onload = () => {
    tela.width = imagem.width;
    tela.height = imagem.height;
    contexto.drawImage(imagem, 0, 0);

    const dadosImagem = contexto.getImageData(0, 0, tela.width, tela.height);

    const imagemLimiarizada = limiarizacao_simples(dadosImagem, 0.9);
    contexto.putImageData(imagemLimiarizada, 0, 0);

    preview.appendChild(tela);

    const containerDownload = document.querySelector(".download-container");
    containerDownload.innerHTML = "";
    const linkDownload = createDownloadLink(tela, "imagem_limiarizada.png");
    containerDownload.appendChild(linkDownload);
  };
}


// Funcao de conversao para escala de cinza
export function escala_de_cinza() {
  const tela = document.createElement("canvas");
  tela.classList.add("styled-canva");
  const contexto = tela.getContext("2d");
  const imagem = new Image();
  imagem.src = URL.createObjectURL(curFile);

  imagem.onload = () => {
    tela.width = imagem.width;
    tela.height = imagem.height;
    contexto.drawImage(imagem, 0, 0);

    const dadosImagem = contexto.getImageData(0, 0, tela.width, tela.height);
    const dados = dadosImagem.data;

    const dadosCinza = converte_escala_de_cinza(dadosImagem);

    // Aplica os valores de escala de cinza à imagem
    for (let i = 0, j = 0; i < dados.length; i += 4, j++) {
      dados[i] = dadosCinza[j]; // Vermelho
      dados[i + 1] = dadosCinza[j]; // Verde
      dados[i + 2] = dadosCinza[j]; // Azul 
    }

    contexto.putImageData(dadosImagem, 0, 0);
    preview.appendChild(tela);

    const containerDownload = document.querySelector(".download-container");
    containerDownload.innerHTML = "";
    const linkDownload = createDownloadLink(tela, "imagem_escala_cinza.png");
    containerDownload.appendChild(linkDownload);
  };
}

function aplicarErosao(imagem_dilatada, largura, altura) {
  const imagem_copia = new Uint8ClampedArray(imagem_dilatada); // cópia de entrada
  const imagem_fechamento = new Uint8ClampedArray(imagem_dilatada.length); // imagem de saída

  for (let linha = 1; linha < altura - 1; linha++) {
    for (let coluna = 1; coluna < largura - 1; coluna++) {
      let menor = 255;

      // Percorre vizinhança 3x3
      // [-1, -1]  [-1, 0]  [-1, 1]     (x-1,y-1)  (x,y-1)  (x+1,y-1)
      // [ 0, -1]  [ 0, 0]  [ 0, 1]  →  (x-1,y)    (x,y)    (x+1,y)
      // [ 1, -1]  [ 1, 0]  [ 1, 1]     (x-1,y+1)  (x,y+1)  (x+1,y+1)

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const vizinhoX = linha + dx;
          const vizinhoY = coluna + dy;
          const indice = vizinhoY * largura + vizinhoX;
          menor = Math.min(menor, imagem_copia[indice]);
        }
      }

      const indiceCentro = linha * largura + coluna;
      imagem_fechamento[indiceCentro] = menor;
    }
  }

  return imagem_fechamento;
}


function aplicarDilatacao(imagemCinza, largura, altura) {
  const resultado = new Uint8Array(largura * altura);

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      let max = 0;

      // Percorre a vizinhança 3x3
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          // Verifica se está dentro dos limites da imagem
          if (nx >= 0 && nx < largura && ny >= 0 && ny < altura) {
            const indiceVizinho = ny * largura + nx;
            max = Math.max(max, imagemCinza[indiceVizinho]);
          }
        }
      }

      const indice = y * largura + x;
      resultado[indice] = max;
    }
  }

  return resultado;
}

// Funcao para realçar elementos mais claros que o fundo.
export function transformadaBottomHat (dadosCinza, largura, altura){

  // Substituicao do valor de cada pixel pelo valor maximo dos vizinhos
  const imagem_dilatada = aplicarDilatacao(dadosCinza, largura, altura);

  // Substituicao do valor de cada pixel pelo valor minimo dos valores vizinhos 
  const imagem_fechamento = aplicarErosao(imagem_dilatada, largura, altura);

  // 2. Bottom Hat = fechamento - imagem original
  const resultado = new Uint8ClampedArray(dadosCinza.length);
  for (let i = 0; i < dadosCinza.length; i++) {
    resultado[i] = Math.max(0, imagem_fechamento[i] - dadosCinza[i]);
  }

  return resultado;    
}

export function detectarFissura(){
  const tela = document.createElement("canvas");
  tela.classList.add("styled-canva");
  const contexto = tela.getContext("2d");
  const imagem = new Image();
  imagem.src = URL.createObjectURL(curFile);

  imagem.onload = () => {
    tela.width = imagem.width;
    tela.height = imagem.height;
    let largura = tela.width;
    let altura = tela.height;
    contexto.drawImage(imagem, 0, 0);

    const dadosImagem = contexto.getImageData(0, 0, tela.width, tela.height);
    const dados = dadosImagem.data;

    // -------------------- Convertendo o vetor extraido para escala de cinza -------------------- //
    const dadosCinza = converte_escala_de_cinza(dadosImagem);

    // -------------------- Aplicando a transformada de bottom hat ------------------------------ // 
    const dadosTransformadaHat = transformadaBottomHat(dadosCinza, largura, altura);

    // -------------------- Aplicando limiarizacao à imagem --------------------- //
    //const dadosLimiarizados = limiarizacao_simples(dadosTransformadaHat);
    // Converte para RGBA
    
    const dadosRGBA = new Uint8ClampedArray(tela.width * tela.height * 4);
    for (let i = 0; i < dadosTransformadaHat.length; i++) {
      dadosRGBA[i * 4 + 0] = dadosTransformadaHat[i];
      dadosRGBA[i * 4 + 1] = dadosTransformadaHat[i];
      dadosRGBA[i * 4 + 2] = dadosTransformadaHat[i];
      dadosRGBA[i * 4 + 3] = 255;
    }

    const novaImagem = new ImageData(dadosRGBA, tela.width, tela.height);
    contexto.putImageData(novaImagem, 0, 0);
    preview.appendChild(tela);

    const containerDownload = document.querySelector(".download-container");
    containerDownload.innerHTML = "";
    const linkDownload = createDownloadLink(tela, "imagem_fissura_detectada.png");
    containerDownload.appendChild(linkDownload);
  };
}