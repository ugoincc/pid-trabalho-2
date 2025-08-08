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

// VERSÕES CORRIGIDAS - Para imagens binárias onde 0=fissura, 255=fundo

// Dilatação corrigida para fissuras (expande pixels pretos)
function aplicarDilatacaoMelhorada(imagemBinaria, largura, altura, tamanhoKernel = 3, iteracoes = 1) {
  let resultado = new Uint8ClampedArray(imagemBinaria);
  
  for (let iter = 0; iter < iteracoes; iter++) {
    const temp = new Uint8ClampedArray(resultado);
    const offset = Math.floor(tamanhoKernel / 2);
    
    for (let y = offset; y < altura - offset; y++) {
      for (let x = offset; x < largura - offset; x++) {
        const indiceAtual = y * largura + x;
        
        // Se o pixel atual é fundo (255), verifica se deve virar fissura
        if (resultado[indiceAtual] === 255) {
          let temFissuraVizinha = false;
          
          // Percorre o elemento estruturante
          for (let dy = -offset; dy <= offset && !temFissuraVizinha; dy++) {
            for (let dx = -offset; dx <= offset && !temFissuraVizinha; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              const indice = ny * largura + nx;
              
              // Se encontrar uma fissura (0) na vizinhança, dilata
              if (resultado[indice] === 0) {
                temFissuraVizinha = true;
              }
            }
          }
          
          if (temFissuraVizinha) {
            temp[indiceAtual] = 0; // Transforma em fissura
          }
        }
      }
    }
    
    resultado = temp;
  }
  
  return resultado;
}

// Erosão corrigida para fissuras (encolhe pixels pretos)
function aplicarErosaoMelhorada(imagemBinaria, largura, altura, tamanhoKernel = 3, iteracoes = 1) {
  let resultado = new Uint8ClampedArray(imagemBinaria);
  
  for (let iter = 0; iter < iteracoes; iter++) {
    const temp = new Uint8ClampedArray(resultado);
    const offset = Math.floor(tamanhoKernel / 2);
    
    for (let y = offset; y < altura - offset; y++) {
      for (let x = offset; x < largura - offset; x++) {
        const indiceAtual = y * largura + x;
        
        // Se o pixel atual é fissura (0), verifica se deve continuar sendo
        if (resultado[indiceAtual] === 0) {
          let todoVizinhosFissura = true;
          
          // Percorre o elemento estruturante
          for (let dy = -offset; dy <= offset && todoVizinhosFissura; dy++) {
            for (let dx = -offset; dx <= offset && todoVizinhosFissura; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              const indice = ny * largura + nx;
              
              // Se encontrar fundo (255) na vizinhança, erode
              if (resultado[indice] === 255) {
                todoVizinhosFissura = false;
              }
            }
          }
          
          if (!todoVizinhosFissura) {
            temp[indiceAtual] = 255; // Transforma em fundo
          }
        }
      }
    }
    
    resultado = temp;
  }
  
  return resultado;
}

// Fechamento corrigido (dilatação + erosão)
function aplicarFechamento(imagemBinaria, largura, altura, tamanhoKernel = 3, iteracoes = 1) {
  // Primeiro dilata para preencher lacunas
  const imagemDilatada = aplicarDilatacaoMelhorada(imagemBinaria, largura, altura, tamanhoKernel, iteracoes);
  
  // Depois erode para voltar ao tamanho aproximado original
  const imagemFechada = aplicarErosaoMelhorada(imagemDilatada, largura, altura, tamanhoKernel, iteracoes);
  
  return imagemFechada;
}


// CORREÇÃO PRINCIPAL: Conectar componentes com RETURN
function conectarComponentes(imagemBinaria, largura, altura) {
  const resultado = new Uint8ClampedArray(imagemBinaria); // Copia a imagem original
  
  for (let y = 1; y < altura - 1; y++) {
    for (let x = 1; x < largura - 1; x++) {
      const indiceAtual = y * largura + x;
      const pixelAtual = imagemBinaria[indiceAtual];
      
      // Se é fundo (255), verifica se deve conectar fissuras
      if (pixelAtual === 255) {
        // Verifica vizinhança em cruz
        const cima = imagemBinaria[(y-1) * largura + x];
        const baixo = imagemBinaria[(y+1) * largura + x];
        const esquerda = imagemBinaria[y * largura + (x-1)];
        const direita = imagemBinaria[y * largura + (x+1)];
        
        // Se tem fissuras opostas, conecta
        if ((cima === 0 && baixo === 0) || (esquerda === 0 && direita === 0)) {
          resultado[indiceAtual] = 0; // Conecta as fissuras
        }
        
        // Se tem pelo menos 3 vizinhos com fissura, preenche
        const fissuraVizinhos = [cima, baixo, esquerda, direita].filter(v => v === 0).length;
        if (fissuraVizinhos >= 3) {
          resultado[indiceAtual] = 0;
        }
      }
    }
  }
  
  return resultado; // CORREÇÃO: retorna o resultado!
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
export function transformadaBottomHat(dadosCinza, largura, altura) {
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

export function combinarImagens(dadosLimiarizados, imagemHSV) {
  const resultado = new Uint8ClampedArray(dadosLimiarizados.length);

  for (let i = 0; i < dadosLimiarizados.length; i++) {
    // AND logico invertido para mascaras com 0 = fissura
    resultado[i] = dadosLimiarizados[i] === 0 && imagemHSV[i] === 0 ? 0 : 255;
  }

  return resultado;
}

// Versão que remove pixels isolados especificamente
function removerPixelsIsolados(imagemBinaria, largura, altura) {
  const resultado = new Uint8ClampedArray(imagemBinaria);
  let pixelsRemovidos = 0;
  
  for (let y = 1; y < altura - 1; y++) {
    for (let x = 1; x < largura - 1; x++) {
      const indice = y * largura + x;
      
      if (imagemBinaria[indice] === 0) { // Se é pixel preto
        // Conta vizinhos pretos imediatos (8-conectividade)
        let vizinhosPretos = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            const indiceViz = ny * largura + nx;
            
            if (imagemBinaria[indiceViz] === 0) {
              vizinhosPretos++;
            }
          }
        }
        
        // Se não tem vizinhos pretos, é um pixel isolado
        if (vizinhosPretos === 0) {
          resultado[indice] = 255;
          pixelsRemovidos++;
        }
        // Se tem muito poucos vizinhos, também remove
        else if (vizinhosPretos <= 1) {
          resultado[indice] = 255;
          pixelsRemovidos++;
        }
      }
    }
  }
  
  console.log(`🎯 Pixels isolados removidos: ${pixelsRemovidos}`);
  return resultado;
}

// Realca a fissura atraves da transformada de hat combinada com HSV
export function realcarFissuraAprimorada() {
  const tela = document.createElement("canvas");
  tela.classList.add("styled-canva");
  const contexto = tela.getContext("2d");
  const imagem = new Image();
  imagem.src = URL.createObjectURL(curFile);

  imagem.onload = () => {
    tela.width = imagem.width;
    tela.height = imagem.height;
    const largura = tela.width;
    const altura = tela.height;
    contexto.drawImage(imagem, 0, 0);

    const dadosImagem = contexto.getImageData(0, 0, tela.width, tela.height);
    const dadosImagemCopia = new ImageData(
      new Uint8ClampedArray(dadosImagem.data),
      largura,
      altura
    );

    // -------------------- Processamento existente -------------------- //
    const dadosCinza = converte_escala_de_cinza(dadosImagem);
    const dadosTransformadaHat = transformadaBottomHat(dadosCinza, largura, altura);
    const dadosLimiarizados = limiarizacao_simples(dadosTransformadaHat, currentThreshold);
    const imagemHSV = aplicarHSV(dadosImagemCopia, largura, altura, 0.6, 0.6);
    let imagemResultante = combinarImagens(dadosLimiarizados, imagemHSV);

    console.log("Imagem inicial - pixels pretos:", imagemResultante.filter(p => p === 0).length);

    // -------------------- MELHORIAS MORFOLÓGICAS (versão conservadora) -------------------- //
    
    imagemResultante = removerPixelsIsolados(imagemResultante, largura, altura);

    
    // 3. Fecha lacunas pequenas
    imagemResultante = aplicarFechamento(imagemResultante, largura, altura, 3, 1);

    // 4. Dilatação leve para engrossar
    imagemResultante = aplicarDilatacaoMelhorada(imagemResultante, largura, altura, 3, 1);
    
    
    // 2. Conecta fissuras próxima

    // -------------------- Conversão final para RGBA -------------------- //
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
    const linkDownload = createDownloadLink(tela, "imagem_fissura_aprimorada.png");
    containerDownload.appendChild(linkDownload);
  };
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
    const largura = tela.width;
    const altura = tela.height;
    contexto.drawImage(imagem, 0, 0);

    const dadosImagem = contexto.getImageData(0, 0, tela.width, tela.height);
    const dadosImagemCopia = new ImageData(
      new Uint8ClampedArray(dadosImagem.data),
      largura,
      altura
    );

    // -------------------- Processamento existente -------------------- //
    const dadosCinza = converte_escala_de_cinza(dadosImagem);
    const dadosTransformadaHat = transformadaBottomHat(dadosCinza, largura, altura);
    const dadosLimiarizados = limiarizacao_simples(dadosTransformadaHat, currentThreshold);
    const imagemHSV = aplicarHSV(dadosImagemCopia, largura, altura, 0.6, 0.6);
    let imagemResultante = combinarImagens(dadosLimiarizados, imagemHSV);

    console.log("Imagem inicial - pixels pretos:", imagemResultante.filter(p => p === 0).length);

    // -------------------- MELHORIAS MORFOLÓGICAS (versão conservadora) -------------------- //
    
    imagemResultante = removerPixelsIsolados(imagemResultante, largura, altura);
    
    // 3. Fecha lacunas pequenas
    imagemResultante = aplicarFechamento(imagemResultante, largura, altura, 3, 1);
    
    // 4. Dilatação leve para engrossar
    imagemResultante = aplicarDilatacaoMelhorada(imagemResultante, largura, altura, 3, 1);
    
    // 2. Conecta fissuras próxima

    // -------------------- Conversão final para RGBA -------------------- //
    const dadosRGBA = new Uint8ClampedArray(largura * altura * 4);

  // Usar dados da imagem original para o fundo
  for (let i = 0; i < imagemResultante.length; i++) {
    const indiceRGBA = i * 4;
    
    if (imagemResultante[i] === 0) {
      // Pixel é FISSURA - destacar em VERDE BRILHANTE
      dadosRGBA[indiceRGBA + 0] = 0;   // Vermelho = 0
      dadosRGBA[indiceRGBA + 1] = 255; // Verde = 255 (máximo)
      dadosRGBA[indiceRGBA + 2] = 0;   // Azul = 0
      dadosRGBA[indiceRGBA + 3] = 255; // Alpha = 255 (opaco)
    } else {
      // Pixel é FUNDO - manter cor original da imagem
      dadosRGBA[indiceRGBA + 0] = dadosImagem.data[indiceRGBA + 0]; // R original
      dadosRGBA[indiceRGBA + 1] = dadosImagem.data[indiceRGBA + 1]; // G original  
      dadosRGBA[indiceRGBA + 2] = dadosImagem.data[indiceRGBA + 2]; // B original
      dadosRGBA[indiceRGBA + 3] = 255; // Alpha = 255 (opaco)
    }
  }

  const novaImagem = new ImageData(dadosRGBA, tela.width, tela.height);
  contexto.putImageData(novaImagem, 0, 0);
  preview.appendChild(tela);

  const containerDownload = document.querySelector(".download-container");
  containerDownload.innerHTML = "";
  const linkDownload = createDownloadLink(tela, "imagem_fissura_verde_destacada.png");
  containerDownload.appendChild(linkDownload);
  };
}

