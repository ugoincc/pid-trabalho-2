import {
  curFile,
  preview,
  createDownloadLink,
  currentThreshold,
} from "./common.js";

// Funcao auxiliar para converter para escala de cinza usando formula luma
export function converte_escala_de_cinza(dadosImagem) {
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

// Funcao de limiarizacao simples
export function limiarizacao_simples(dadosCinza, limiar = 14) {
  const valorLimiar = Math.round(limiar);
  const resultado = new Uint8ClampedArray(dadosCinza.length);

  for (let i = 0; i < dadosCinza.length; i++) {
    resultado[i] = dadosCinza[i] >= valorLimiar ? 0 : 255;
  }

  return resultado;
}

export function LimiarizacaoSimplesImg() {
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
    const largura = tela.width;
    const altura = tela.height;

    // Usa a função auxiliar para converter para escala de cinza
    const dadosCinza = converte_escala_de_cinza(dadosImagem);

    // Aplica limiarização simples
    const dadosLimiarizados = limiarizacao_simples(dadosCinza, currentThreshold);

    // Aplica os valores limiarizados à imagem RGBA
    for (let i = 0, j = 0; i < dadosImagem.data.length; i += 4, j++) {
      dadosImagem.data[i] = dadosLimiarizados[j];     // R
      dadosImagem.data[i + 1] = dadosLimiarizados[j]; // G
      dadosImagem.data[i + 2] = dadosLimiarizados[j]; // B
      // Mantém o canal Alpha
    }

    contexto.putImageData(dadosImagem, 0, 0);
    preview.appendChild(tela);

    const containerDownload = document.querySelector(".download-container");
    containerDownload.innerHTML = "";
    const linkDownload = createDownloadLink(
      tela,
      "imagem_limiarizacao_simples.png"
    );
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

    // Aplica os valores de escala de cinza a imagem
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

// Aplica a erosao em imagem dilatada
function aplicarErosao(imagem_dilatada, largura, altura) {
  const imagem_copia = new Uint8ClampedArray(imagem_dilatada); // copia de entrada
  const imagem_fechamento = new Uint8ClampedArray(imagem_dilatada.length); // imagem de saida

  for (let linha = 1; linha < altura - 1; linha++) {
    for (let coluna = 1; coluna < largura - 1; coluna++) {
      let menor = 255;

      // Percorre vizinhanca 3x3
      // [-1, -1]  [-1, 0]  [-1, 1]     (x-1,y-1)  (x,y-1)  (x+1,y-1)
      // [ 0, -1]  [ 0, 0]  [ 0, 1]  ->  (x-1,y)    (x,y)    (x+1,y)
      // [ 1, -1]  [ 1, 0]  [ 1, 1]     (x-1,y+1)  (x,y+1)  (x+1,y+1)

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const vizinhoX = coluna + dx;
          const vizinhoY = linha + dy;
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

// Aplica a dilatacao para imagem e escala de cinza
function aplicarDilatacao(imagemCinza, largura, altura) {
  const resultado = new Uint8Array(largura * altura);

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      let max = 0;

      // Percorre a vizinhanca 3x3
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          // Verifica se esta dentro dos limites da imagem
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

// Funcao para realcar elementos mais claros que o fundo.
function transformadaBottomHat(dadosCinza, largura, altura) {
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

export function TransformadaBottomHatImg(){
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
    const largura = tela.width;
    const altura = tela.height;

    // Converte para escala de cinza
    const dadosCinza = converte_escala_de_cinza(dadosImagem);

    // Aplica a transformada Bottom Hat
    const dadosBottomHat = transformadaBottomHat(dadosCinza, largura, altura);

    for (let i = 0, j = 0; i < dadosImagem.data.length; i += 4, j++) {
      const invertido = 255 - dadosBottomHat[j]; // Inverte o valor
      dadosImagem.data[i] = invertido;
      dadosImagem.data[i + 1] = invertido;
      dadosImagem.data[i + 2] = invertido;
  // Mantém o canal Alpha (dadosImagem.data[i + 3]) sem alterações
}


    contexto.putImageData(dadosImagem, 0, 0);
    preview.appendChild(tela);

    const containerDownload = document.querySelector(".download-container");
    containerDownload.innerHTML = "";
    const linkDownload = createDownloadLink(tela, "imagem_bottom_hat.png");
    containerDownload.appendChild(linkDownload);
  };
}


//---------------------------------------------------------------//
//-------------------------Segundo Fluxo-------------------------//
//---------------------------------------------------------------//

// Funcao para converter RGB para HSV
function rgbParaHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * ((g - b) / delta);
      if (h < 0) h += 360;
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

export function TransformarRgbParaHsvImg() {
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
    const largura = tela.width;
    const altura = tela.height;

    // Novo array para dados da imagem (RGBA)
    const dadosSaida = new Uint8ClampedArray(dadosImagem.data.length);

    // Percorre pixels (4 por pixel: R,G,B,A)
    for (let i = 0; i < dadosImagem.data.length; i += 4) {
      const r = dadosImagem.data[i];
      const g = dadosImagem.data[i + 1];
      const b = dadosImagem.data[i + 2];

      const hsv = rgbParaHsv(r, g, b);

      // Vamos usar o canal V para criar imagem em tons de cinza
      const v = Math.round(hsv.v * 255);

      dadosSaida[i] = v;       // R
      dadosSaida[i + 1] = v;   // G
      dadosSaida[i + 2] = v;   // B
      dadosSaida[i + 3] = dadosImagem.data[i + 3]; // mantém Alpha
    }

    const novaImagem = new ImageData(dadosSaida, largura, altura);
    contexto.putImageData(novaImagem, 0, 0);
    preview.appendChild(tela);

    const containerDownload = document.querySelector(".download-container");
    containerDownload.innerHTML = "";
    const linkDownload = createDownloadLink(tela, "imagem_valor_hsv.png");
    containerDownload.appendChild(linkDownload);
  };
}

// Aplica uma segmentacao baseada nos canais de Saturacao (S) e Valor (V) do espaço de cor HSV.
export function aplicarHSV(
  dadosImagem,
  largura,
  altura,
  limiarS = 0.5,
  limiarV = 0.5
) {
  const dados = dadosImagem.data;
  const resultado = new Uint8ClampedArray(largura * altura);

  // Percorre cada pixel da imagem
  for (let i = 0, j = 0; i < dados.length; i += 4, j++) {
    const r = dados[i];
    const g = dados[i + 1];
    const b = dados[i + 2];

    const { s, v } = rgbParaHsv(r, g, b);

    // Marca como possível fissura pixels com baixa saturação e baixo valor (brilho)
    if (s <= limiarS && v <= limiarV) {
      resultado[j] = 0; // pixel destacado
    } else {
      resultado[j] = 255; // fundo
    }
  }

  return resultado; // máscara binária 0 ou 255
}

export function AplicarHSVImg() {
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
    const largura = tela.width;
    const altura = tela.height;

    // Ajuste os limiares aqui, se desejar
    const limiarS = 0.5;
    const limiarV = 0.5;

    const mascaraHSV = aplicarHSV(dadosImagem, largura, altura, limiarS, limiarV);

    // Construir imagem RGBA a partir da máscara (preto e branco)
    const dadosSaida = new Uint8ClampedArray(dadosImagem.data.length);
    for (let i = 0, j = 0; i < dadosSaida.length; i += 4, j++) {
      const val = mascaraHSV[j];
      dadosSaida[i] = val;       // R
      dadosSaida[i + 1] = val;   // G
      dadosSaida[i + 2] = val;   // B
      dadosSaida[i + 3] = 255;   // Alpha totalmente opaco
    }

    const novaImagem = new ImageData(dadosSaida, largura, altura);
    contexto.putImageData(novaImagem, 0, 0);
    preview.appendChild(tela);

    const containerDownload = document.querySelector(".download-container");
    containerDownload.innerHTML = "";
    const linkDownload = createDownloadLink(tela, "imagem_hsv_binaria.png");
    containerDownload.appendChild(linkDownload);
  };
}

export function combinarImagens(dadosLimiarizados, imagemHSV) {
  const resultado = new Uint8ClampedArray(dadosLimiarizados.length);

  for (let i = 0; i < dadosLimiarizados.length; i++) {
    // AND logico invertido para mascaras com 0 = fissura
    resultado[i] = dadosLimiarizados[i] === 0 && imagemHSV[i] === 0 ? 0 : 255;
  }

  return resultado;
}

// Realca a fissura atraves da transformada de hat combinada com HSV
export function realcarFissura() {
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
    const dadosImagemCopia = new ImageData(
      new Uint8ClampedArray(dadosImagem.data),
      largura,
      altura
    );

    // -------------------- Convertendo o vetor extraido para escala de cinza -------------------- //
    const dadosCinza = converte_escala_de_cinza(dadosImagem);

    // -------------------- Aplicando a transformada de bottom hat ------------------------------ //
    const dadosTransformadaHat = transformadaBottomHat(
      dadosCinza,
      largura,
      altura
    );

    // -------------------- Aplicando limiarizacao a imagem ------------------------------------- //
    const dadosLimiarizados = limiarizacao_simples(
      dadosTransformadaHat,
      currentThreshold
    );

    // -------------------- Transformando a imagem original de RGB para HSV --------------------- //
    const imagemHSV = aplicarHSV(dadosImagemCopia, largura, altura, 0.6, 0.6);

    // -------------------- Combinando a imagem 1 (transformada de hat) e a imagem 2 (HSV) ------ //
    let imagemResultante = combinarImagens(dadosLimiarizados, imagemHSV);

    // Converte para RGBA
    const dadosRGBA = new Uint8ClampedArray(largura * altura * 4);
    for (let i = 0; i < imagemResultante.length; i++) {
      dadosRGBA[i * 4 + 0] = imagemResultante[i];
      dadosRGBA[i * 4 + 1] = imagemResultante[i];
      dadosRGBA[i * 4 + 2] = imagemResultante[i];
      dadosRGBA[i * 4 + 3] = 255;
    }

    const novaImagem = new ImageData(dadosRGBA, tela.width, tela.height);
    contexto.putImageData(novaImagem, 0, 0);
    preview.appendChild(tela);

    const containerDownload = document.querySelector(".download-container");
    containerDownload.innerHTML = "";
    const linkDownload = createDownloadLink(
      tela,
      "imagem_fissura_detectada.png"
    );
    containerDownload.appendChild(linkDownload);
  };
}
