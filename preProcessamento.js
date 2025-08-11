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
    const dadosLimiarizados = limiarizacao_simples(
      dadosCinza,
      currentThreshold
    );

    // Aplica os valores limiarizados à imagem RGBA
    for (let i = 0, j = 0; i < dadosImagem.data.length; i += 4, j++) {
      dadosImagem.data[i] = dadosLimiarizados[j]; // R
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

export function TransformadaBottomHatImg() {
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

      dadosSaida[i] = v; // R
      dadosSaida[i + 1] = v; // G
      dadosSaida[i + 2] = v; // B
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

    const mascaraHSV = aplicarHSV(
      dadosImagem,
      largura,
      altura,
      limiarS,
      limiarV
    );

    // Construir imagem RGBA a partir da máscara (preto e branco)
    const dadosSaida = new Uint8ClampedArray(dadosImagem.data.length);
    for (let i = 0, j = 0; i < dadosSaida.length; i += 4, j++) {
      const val = mascaraHSV[j];
      dadosSaida[i] = val; // R
      dadosSaida[i + 1] = val; // G
      dadosSaida[i + 2] = val; // B
      dadosSaida[i + 3] = 255; // Alpha totalmente opaco
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

export function calcularPorcentagemAreaFissura(
  imagemResultante,
  largura,
  altura
) {
  let pixelsFissura = 0;
  const totalPixels = largura * altura;

  // Conta os pixels que representam fissura (pixels brancos/claros)
  for (let i = 0; i < imagemResultante.length; i++) {
    // Considera como fissura pixels com valor próximo ao branco (acima de um limiar)
    if (imagemResultante[i] > 127) {
      // Limiar de 127 (meio da escala 0-255)
      pixelsFissura++;
    }
  }

  // Calcula a porcentagem
  const porcentagem = (pixelsFissura / totalPixels) * 100;

  return {
    pixelsFissura: pixelsFissura,
    totalPixels: totalPixels,
    porcentagem: porcentagem.toFixed(2),
  };
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

// Função separada para identificar orientação
function identificarOrientacaoFissura(imagemResultante, largura, altura) {
  let minX = largura,
    maxX = 0;
  let minY = altura,
    maxY = 0;

  for (let i = 0; i < imagemResultante.length; i++) {
    if (imagemResultante[i] === 0) {
      // pixel de fissura
      const x = i % largura;
      const y = Math.floor(i / largura);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const larguraFissura = maxX - minX;
  const alturaFissura = maxY - minY;

  if (larguraFissura > alturaFissura) {
    return "Horizontal";
  } else if (alturaFissura > larguraFissura) {
    return "Vertical";
  } else {
    return "Diagonal";
  }
}

let regiao_selecionada = null; // pq????

function selecionarAreaAutomatico(
  tela,
  contexto,
  imagem,
  processarAreaSelecionada
) {
  let selecionando = false;
  let eixoX = 0;
  let eixoY = 0;

  // obtem a posicao do correta do cursor
  function obterPosicaoRealCursor(evento) {
    const rect = tela.getBoundingClientRect();
    const escalaX = tela.width / rect.width;
    const escalaY = tela.height / rect.height;
    const x = Math.max(
      0,
      Math.min(tela.width, Math.floor((evento.clientX - rect.left) * escalaX))
    );
    const y = Math.max(
      0,
      Math.min(tela.height, Math.floor((evento.clientY - rect.top) * escalaY))
    );
    return { x, y };
  }

  // trata o evento de pressionar o cursor
  function pressionarCursor(evento) {
    evento.preventDefault();
    tela.setPointerCapture(evento.pointerId);
    selecionando = true;
    const posicao = obterPosicaoRealCursor(evento);
    eixoX = posicao.x;
    eixoY = posicao.y;
  }

  // trata o evento de movimentacao do cursor
  function tratarMovimentacaoCursor(evento) {
    if (!selecionando) return;
    const posicao = obterPosicaoRealCursor(evento);
    const largura = posicao.x - eixoX;
    const altura = posicao.y - eixoY;

    // redesenha imagem + retangulo
    contexto.clearRect(0, 0, tela.width, tela.height);
    contexto.drawImage(imagem, 0, 0);

    contexto.save();
    contexto.strokeStyle = "red";
    contexto.lineWidth = 4;
    contexto.setLineDash([6, 4]);
    contexto.strokeRect(eixoX, eixoY, largura, altura);
    contexto.restore();
  }

  // trata o evento de soltar o cursor, ajustando a selecao
  function soltarCursor(evento) {
    if (!selecionando) return;
    selecionando = false;
    tela.releasePointerCapture(evento.pointerId);

    const posicao = obterPosicaoRealCursor(evento);
    const endX = posicao.x;
    const endY = posicao.y;

    const x = Math.min(eixoX, endX);
    const y = Math.min(eixoY, endY);
    const largura = Math.abs(endX - eixoX);
    const altura = Math.abs(endY - eixoY);

    // filtro mínimo para evitar que a regiao selecionada apresente tamanho 0
    if (largura < 2 || altura < 2) {
      // redesenha imagem e volta sem processar
      contexto.clearRect(0, 0, tela.width, tela.height);
      contexto.drawImage(imagem, 0, 0);
      console.warn(
        "A região selecionada é muito pequena — selecione uma área maior."
      );
      return;
    }

    regiao_selecionada = {
      x: Math.max(0, Math.floor(x)),
      y: Math.max(0, Math.floor(y)),
      largura: Math.floor(largura),
      altura: Math.floor(altura),
    };

    // dá um pequeno delay para o canvas desenhar o retângulo antes do processamento pesado
    // e para mostrar o indicador de processamento.
    processarAreaSelecionada(regiao_selecionada);
  }

  tela.addEventListener("pointerdown", pressionarCursor);
  tela.addEventListener("pointermove", tratarMovimentacaoCursor);
  tela.addEventListener("pointerup", soltarCursor);
  tela.addEventListener("pointercancel", soltarCursor);
}

export function realcarFissuraVerde() {
  const tela = document.createElement("canvas");
  tela.classList.add("styled-canva");
  const contexto = tela.getContext("2d");
  const imagem = new Image();
  imagem.src = URL.createObjectURL(curFile);

  imagem.onload = () => {
    tela.width = imagem.width;
    tela.height = imagem.height;
    contexto.drawImage(imagem, 0, 0);
    preview.appendChild(tela);

    // indicador simples de processamento
    const mostraProcessando = (mostrar) => {
      let el = document.querySelector(".processando-overlay");
      if (mostrar) {
        if (!el) {
          el = document.createElement("div");
          el.className = "processando-overlay";
          el.style.cssText = `
            position: absolute; left: 0; top: 0; right: 0; bottom: 0;
            display:flex;align-items:center;justify-content:center;
            font-size:18px;background:rgba(0,0,0,0.35);color:#fff;
            z-index:2000; pointer-events:none;
          `;
          // inserimos próximo ao preview (assume que preview é container relativo)
          preview.style.position = "relative";
          preview.appendChild(el);
        }
        el.textContent = "Processando...";
        el.style.display = "flex";
      } else {
        if (el) el.style.display = "none";
      }
    };

    function aplicarFiltroRegiaoSelecionada(regiaoSelecionada) {
      // mostra indicador e espera tela atualizar para o usuário ver o retângulo
      mostraProcessando(true);
      setTimeout(() => {
        try {
          const dadosImagem = contexto.getImageData(
            regiaoSelecionada.x,
            regiaoSelecionada.y,
            regiaoSelecionada.largura,
            regiaoSelecionada.altura
          );

          // imagem selecionada
          const dadosImagemCopia = new ImageData(
            new Uint8ClampedArray(dadosImagem.data),
            regiaoSelecionada.largura,
            regiaoSelecionada.altura
          );

          // -------------------- Convertendo o vetor extraido para escala de cinza -------------------- //
          const dadosCinza = converte_escala_de_cinza(dadosImagem);

          // -------------------- Aplicando a transformada de bottom hat ------------------------------ //
          const dadosTransformadaHat = transformadaBottomHat(
            dadosCinza,
            regiaoSelecionada.largura,
            regiaoSelecionada.altura
          );

          // -------------------- Aplicando limiarizacao a imagem ------------------------------------- //
          const dadosLimiarizados = limiarizacao_simples(
            dadosTransformadaHat,
            currentThreshold
          );

          // -------------------- Transformando a imagem original de RGB para HSV --------------------- //
          const imagemHSV = aplicarHSV(
            dadosImagemCopia,
            regiaoSelecionada.largura,
            regiaoSelecionada.altura,
            0.6,
            0.6
          );

          // -------------------- Combinando a imagem 1 (transformada de hat) e a imagem 2 (HSV) ------ //
          const imagemResultante = combinarImagens(
            dadosLimiarizados,
            imagemHSV
          );

          // calculo de fissura e criação RGBA
          let pixelsFissura = 0;
          const totalPixels =
            regiaoSelecionada.largura * regiaoSelecionada.altura;
          const dadosRGBA = new Uint8ClampedArray(totalPixels * 4);

          for (let i = 0; i < imagemResultante.length; i++) {
            const idxRGBA = i * 4;
            if (imagemResultante[i] === 0) {
              pixelsFissura++;
              dadosRGBA[idxRGBA] = 0;
              dadosRGBA[idxRGBA + 1] = 255;
              dadosRGBA[idxRGBA + 2] = 0;
              dadosRGBA[idxRGBA + 3] = 255;
            } else {
              dadosRGBA[idxRGBA] = dadosImagem.data[idxRGBA];
              dadosRGBA[idxRGBA + 1] = dadosImagem.data[idxRGBA + 1];
              dadosRGBA[idxRGBA + 2] = dadosImagem.data[idxRGBA + 2];
              dadosRGBA[idxRGBA + 3] = 255;
            }
          }

          const orientacao = identificarOrientacaoFissura(
            imagemResultante,
            regiaoSelecionada.largura,
            regiaoSelecionada.altura
          );
          const novaImagemRegiaoSelecionada = new ImageData(
            dadosRGBA,
            regiaoSelecionada.largura,
            regiaoSelecionada.altura
          );
          contexto.putImageData(
            novaImagemRegiaoSelecionada,
            regiaoSelecionada.x,
            regiaoSelecionada.y
          );

          const containerDownload =
            document.querySelector(".download-container") || document.body;
          const infoAnterior = document.querySelector(
            ".resultado-fissura-verde"
          );
          if (infoAnterior) infoAnterior.remove();

          const divResultado = document.createElement("div");
          divResultado.classList.add("resultado-fissura-verde");
          divResultado.style.cssText = `
            position: relative;
            z-index: 1000;
            background: #bfccc2ff;
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin: 20px auto;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 6px 20px rgba(0,0,0,0.2);
            font-family: Arial, sans-serif;
            border: 3px solid #cfddd2ff;
          `;

          const porcentagem = (pixelsFissura / totalPixels) * 100;

          divResultado.innerHTML = `
            <h2 style="margin: 0 0 15px 0; font-size: 20px;">FISSURA DETECTADA NA ÁREA SELECIONADA</h2>
            <div style="font-size: 36px; font-weight: bold; margin: 15px 0; background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px;">
              ${porcentagem.toFixed(2)}%
            </div>
            <div style="font-size: 14px; margin-top: 10px;">
              <p><strong>${pixelsFissura.toLocaleString(
                "pt-BR"
              )}</strong> pixels de fissura</p>
              <p><strong>${totalPixels.toLocaleString(
                "pt-BR"
              )}</strong> pixels totais</p>
              <p><strong>Orientação:</strong> ${orientacao}</p>
            </div>
          `;

          const linkDownload = createDownloadLink(
            tela,
            "imagem_fissura_verde_destacada.png"
          );
          containerDownload.insertBefore(
            divResultado,
            containerDownload.firstChild
          );
          containerDownload.appendChild(linkDownload);
        } catch (err) {
          console.error("Erro ao processar Regiao Selecionada", err);
          alert(
            "Ocorreu um erro durante o processamento. Veja o console para detalhes."
          );
        } finally {
          mostraProcessando(false);
        }
      }, 50); // 50ms para permitir que o retangulo seja desenhado antes do processamento
    }

    // inicia selecao e faz processamento automatico ao soltar
    selecionarAreaAutomatico(
      tela,
      contexto,
      imagem,
      aplicarFiltroRegiaoSelecionada
    );
  };
}

//Funções p/ Mediana

// Funcao para transformar um vetor de dados de imagem em escala de cinza em uma matriz 2D.
// pre-condicao: 'data' e um vetor de dados de imagem de canal unico (Uint8ClampedArray) e 'largura' e 'altura' sao as dimensoes da imagem.
// pos-condicao: retorna uma matriz (array de arrays) onde cada elemento e um valor de intensidade (0-255).
function transformarVetorMatrizCinza(data, largura, altura) {
  const matriz = [];
  for (let i = 0; i < altura; i++) {
    const linha = [];
    for (let j = 0; j < largura; j++) {
      const index = i * largura + j;
      linha.push(data[index]);
    }
    matriz.push(linha);
  }
  return matriz;
}

// Funcao para encontrar o valor mediano dos pixels em uma vizinhança 5x5 de uma matriz em escala de cinza.
// pre-condicao: 'matriz' e uma matriz 2D de valores de intensidade, 'i' e 'j' sao as coordenadas do canto superior esquerdo da janela 5x5.
// pos-condicao: retorna o valor mediano (0-255) dos pixels na vizinhança.
function encontrarMedianaCinza(matriz, i, j) {
  const valores = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      valores.push(matriz[i + y][j + x]);
    }
  }
  valores.sort((a, b) => a - b);
  return valores[Math.floor(valores.length / 2)];
}

// Funcao para aplicar o filtro de mediana 5x5 em uma imagem de canal unico.
// pre-condicao: 'imagemCinza' e o vetor de dados da imagem em escala de cinza, e 'largura' e 'altura' sao suas dimensoes.
// pos-condicao: retorna um objeto contendo o novo vetor de dados da imagem filtrada ('data'), a nova largura ('largura') e a nova altura ('altura'), que sao menores devido ao tratamento de borda.
function aplicarFiltroMedianaCinza(imagemCinza, largura, altura) {
  // Converte vetor para matriz de pixels
  const matriz = transformarVetorMatrizCinza(imagemCinza, largura, altura);
  const novaLargura = largura - 4;
  const novaAltura = altura - 4;
  const resultadoMediana = new Uint8ClampedArray(novaLargura * novaAltura);

  for (let i = 0; i < novaAltura; i++) {
    for (let j = 0; j < novaLargura; j++) {
      const mediana = encontrarMedianaCinza(matriz, i, j);
      const idxResultado = i * novaLargura + j;
      resultadoMediana[idxResultado] = mediana;
    }
  }

  return { data: resultadoMediana, largura: novaLargura, altura: novaAltura };
}

export function realcarFissuraVerdeComSuavizacao() {
  const tela = document.createElement("canvas");
  tela.classList.add("styled-canva");
  const contexto = tela.getContext("2d");
  const imagem = new Image();
  imagem.src = URL.createObjectURL(curFile);

  imagem.onload = () => {
    tela.width = imagem.width;
    tela.height = imagem.height;
    contexto.drawImage(imagem, 0, 0);
    preview.appendChild(tela);

    // indicador simples de processamento
    const mostraProcessando = (mostrar) => {
      let el = document.querySelector(".processando-overlay");
      if (mostrar) {
        if (!el) {
          el = document.createElement("div");
          el.className = "processando-overlay";
          el.style.cssText = `
            position: absolute; left: 0; top: 0; right: 0; bottom: 0;
            display:flex;align-items:center;justify-content:center;
            font-size:18px;background:rgba(0,0,0,0.35);color:#fff;
            z-index:2000; pointer-events:none;
          `;
          // inserimos próximo ao preview (assume que preview é container relativo)
          preview.style.position = "relative";
          preview.appendChild(el);
        }
        el.textContent = "Processando...";
        el.style.display = "flex";
      } else {
        if (el) el.style.display = "none";
      }
    };

    function aplicarFiltroRegiaoSelecionada(regiaoSelecionada) {
      // mostra indicador e espera tela atualizar para o usuário ver o retângulo
      mostraProcessando(true);
      setTimeout(() => {
        try {
          const dadosImagem = contexto.getImageData(
            regiaoSelecionada.x,
            regiaoSelecionada.y,
            regiaoSelecionada.largura,
            regiaoSelecionada.altura
          );

          // imagem selecionada
          const dadosImagemCopia = new ImageData(
            new Uint8ClampedArray(dadosImagem.data),
            regiaoSelecionada.largura,
            regiaoSelecionada.altura
          );

          // -------------------- Convertendo o vetor extraido para escala de cinza -------------------- //
          const dadosCinza = converte_escala_de_cinza(dadosImagem);

          // -------------------- Aplicando a transformada de bottom hat ------------------------------ //
          const dadosTransformadaHat = transformadaBottomHat(
            dadosCinza,
            regiaoSelecionada.largura,
            regiaoSelecionada.altura
          );

          // -------------------- Aplicando limiarizacao a imagem ------------------------------------- //
          const dadosLimiarizados = limiarizacao_simples(
            dadosTransformadaHat,
            currentThreshold
          );

          // -------------------- Transformando a imagem original de RGB para HSV --------------------- //
          const imagemHSV = aplicarHSV(
            dadosImagemCopia,
            regiaoSelecionada.largura,
            regiaoSelecionada.altura,
            0.6,
            0.6
          );

          // -------------------- Combinando a imagem 1 (transformada de hat) e a imagem 2 (HSV) ------ //
          const imagemResultante = combinarImagens(
            dadosLimiarizados,
            imagemHSV
          );

          // -------------------- Suavizando a imagem com filtro da mediana -------------------------- //
          const {
            data: imagemSuavizada,
            largura: larguraSuavizada,
            altura: alturaSuavizada,
          } = aplicarFiltroMedianaCinza(
            imagemResultante,
            regiaoSelecionada.largura,
            regiaoSelecionada.altura
          );

          // calculo de fissura e criação RGBA
          let pixelsFissura = 0;
          const totalPixels =
            regiaoSelecionada.largura * regiaoSelecionada.altura;
          const dadosRGBA = new Uint8ClampedArray(totalPixels * 4);

          dadosRGBA.set(dadosImagem.data);

          for (let i = 0; i < alturaSuavizada; i++) {
            for (let j = 0; j < larguraSuavizada; j++) {
              const idxSuavizado = i * larguraSuavizada + j;
              if (imagemSuavizada[idxSuavizado] === 0) {
                pixelsFissura++;
                // +2 para compensar a borda removida pelo filtro 5x5
                const idxOriginal =
                  ((i + 2) * regiaoSelecionada.largura + (j + 2)) * 4;
                dadosRGBA[idxOriginal] = 0; // R
                dadosRGBA[idxOriginal + 1] = 255; // G
                dadosRGBA[idxOriginal + 2] = 0; // B
                dadosRGBA[idxOriginal + 3] = 255; // A
              }
            }
          }

          const orientacao = identificarOrientacaoFissura(
            imagemSuavizada,
            larguraSuavizada,
            alturaSuavizada
          );

          const novaImagemRegiaoSelecionada = new ImageData(
            dadosRGBA,
            regiaoSelecionada.largura,
            regiaoSelecionada.altura
          );

          contexto.putImageData(
            novaImagemRegiaoSelecionada,
            regiaoSelecionada.x,
            regiaoSelecionada.y
          );

          const containerDownload =
            document.querySelector(".download-container") || document.body;
          const infoAnterior = document.querySelector(
            ".resultado-fissura-verde"
          );
          if (infoAnterior) infoAnterior.remove();

          const divResultado = document.createElement("div");
          divResultado.classList.add("resultado-fissura-verde");
          divResultado.style.cssText = `
            position: relative;
            z-index: 1000;
            background: #bfccc2ff;
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin: 20px auto;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 6px 20px rgba(0,0,0,0.2);
            font-family: Arial, sans-serif;
            border: 3px solid #cfddd2ff;
          `;

          const porcentagem = (pixelsFissura / totalPixels) * 100;

          divResultado.innerHTML = `
            <h2 style="margin: 0 0 15px 0; font-size: 20px;">FISSURA DETECTADA NA ÁREA SELECIONADA</h2>
            <div style="font-size: 36px; font-weight: bold; margin: 15px 0; background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px;">
              ${porcentagem.toFixed(2)}%
            </div>
            <div style="font-size: 14px; margin-top: 10px;">
              <p><strong>${pixelsFissura.toLocaleString(
                "pt-BR"
              )}</strong> pixels de fissura</p>
              <p><strong>${totalPixels.toLocaleString(
                "pt-BR"
              )}</strong> pixels totais</p>
              <p><strong>Orientação:</strong> ${orientacao}</p>
            </div>
          `;

          const linkDownload = createDownloadLink(
            tela,
            "imagem_fissura_verde_destacada.png"
          );
          containerDownload.insertBefore(
            divResultado,
            containerDownload.firstChild
          );
          containerDownload.appendChild(linkDownload);
        } catch (err) {
          console.error("Erro ao processar Regiao Selecionada", err);
          alert(
            "Ocorreu um erro durante o processamento. Veja o console para detalhes."
          );
        } finally {
          mostraProcessando(false);
        }
      }, 50); // 50ms para permitir que o retangulo seja desenhado antes do processamento
    }

    // inicia selecao e faz processamento automatico ao soltar
    selecionarAreaAutomatico(
      tela,
      contexto,
      imagem,
      aplicarFiltroRegiaoSelecionada
    );
  };
}
