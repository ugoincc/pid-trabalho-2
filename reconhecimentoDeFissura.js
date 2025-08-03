import { curFile, preview, createDownloadLink } from "./common.js";
import { 
  converte_escala_de_cinza, 
  transformadaBottomHat, 
  limiarizacao_simples, 
  aplicarHSV, 
  combinarImagens 
} from "./preProcessamento.js";

// Função para carregar OpenCV.js
export function carregarOpenCV() {
  return new Promise((resolve, reject) => {
    if (typeof cv !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
    script.async = true;
    
    script.onload = () => {
      const verificarOpenCV = () => {
        if (typeof cv !== 'undefined' && cv.Mat) {
          resolve();
        } else {
          setTimeout(verificarOpenCV, 100);
        }
      };
      verificarOpenCV();
    };
    
    script.onerror = () => reject(new Error('Erro ao carregar OpenCV.js'));
    document.head.appendChild(script);
  });
}

// Função principal para reconhecimento de fissuras usando OpenCV
export function reconhecerFissuras(imagemOriginal, imagemBinaria, opcoes = {}) {
  if (typeof cv === 'undefined') {
    console.error('OpenCV.js não está carregado');
    throw new Error('OpenCV não está disponível');
  }

  const config = {
    areaMinima: opcoes.areaMinima || 30,
    perimetroMinimo: opcoes.perimetroMinimo || 20,
    aspectRatioMinimo: opcoes.aspectRatioMinimo || 2.0,
    desenharContornos: opcoes.desenharContornos !== false,
    desenharNumeros: opcoes.desenharNumeros !== false,
    desenharEstatisticas: opcoes.desenharEstatisticas !== false,
    ...opcoes
  };

  try {
    // Converte imagens para matrizes OpenCV
    let matOriginal, matBinaria;
    
    // Processa imagem original
    if (imagemOriginal instanceof HTMLCanvasElement) {
      matOriginal = cv.imread(imagemOriginal);
    } else if (imagemOriginal instanceof ImageData) {
      matOriginal = cv.matFromImageData(imagemOriginal);
    } else {
      matOriginal = imagemOriginal.clone();
    }

    // Processa imagem binária
    if (imagemBinaria instanceof HTMLCanvasElement) {
      matBinaria = cv.imread(imagemBinaria);
      if (matBinaria.channels() > 1) {
        cv.cvtColor(matBinaria, matBinaria, cv.COLOR_RGBA2GRAY);
      }
    } else if (imagemBinaria instanceof ImageData) {
      matBinaria = cv.matFromImageData(imagemBinaria);
      if (matBinaria.channels() > 1) {
        cv.cvtColor(matBinaria, matBinaria, cv.COLOR_RGBA2GRAY);
      }
    } else if (imagemBinaria instanceof Uint8ClampedArray) {
      // Converte array para Mat
      const largura = Math.sqrt(imagemBinaria.length / 4);
      const altura = largura;
      matBinaria = new cv.Mat(altura, largura, cv.CV_8UC1);
      for (let i = 0; i < imagemBinaria.length; i += 4) {
        matBinaria.data[i / 4] = imagemBinaria[i];
      }
    } else {
      matBinaria = imagemBinaria.clone();
    }

    // Aplicar morfologia para limpar a imagem binária
    const imagemLimpa = aplicarMorfologia(matBinaria);

    // Encontrar contornos
    const contornos = new cv.MatVector();
    const hierarquia = new cv.Mat();
    cv.findContours(imagemLimpa, contornos, hierarquia, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // Analisar e filtrar contornos
    const fissuras = analisarContornos(contornos, config);

    // Criar imagem resultado
    const resultado = matOriginal.clone();
    
    if (config.desenharContornos) {
      desenharFissuras(resultado, fissuras, config);
    }

    // Preparar dados de retorno
    const dadosRetorno = {
      imagem: resultado,
      fissuras: fissuras,
      parametros: config
    };

    // Limpeza de memória
    matBinaria.delete();
    imagemLimpa.delete();
    contornos.delete();
    hierarquia.delete();

    return dadosRetorno;

  } catch (error) {
    console.error('Erro no reconhecimento de fissuras:', error);
    throw error;
  }
}

// Função para aplicar operações morfológicas na imagem binária
function aplicarMorfologia(imagemBinaria) {
  const imagemLimpa = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
  
  // Abertura: erosão seguida de dilatação (remove ruído pequeno)
  cv.morphologyEx(imagemBinaria, imagemLimpa, cv.MORPH_OPEN, kernel);
  
  // Fechamento: dilatação seguida de erosão (conecta partes próximas)
  cv.morphologyEx(imagemLimpa, imagemLimpa, cv.MORPH_CLOSE, kernel);
  
  kernel.delete();
  return imagemLimpa;
}

// Função para analisar contornos e identificar fissuras
function analisarContornos(contornos, config) {
  const fissuras = [];

  for (let i = 0; i < contornos.size(); i++) {
    const contorno = contornos.get(i);
    
    // Calcular propriedades do contorno
    const area = cv.contourArea(contorno);
    const perimetro = cv.arcLength(contorno, true);
    const boundingRect = cv.boundingRect(contorno);
    
    // Calcular aspect ratio
    const aspectRatio = Math.max(boundingRect.width, boundingRect.height) / 
                       Math.min(boundingRect.width, boundingRect.height);
    
    // Calcular extent (razão entre área do contorno e área do bounding rect)
    const extent = area / (boundingRect.width * boundingRect.height);
    
    // Calcular solidez (razão entre área do contorno e área do hull convexo)
    const hull = new cv.Mat();
    cv.convexHull(contorno, hull);
    const hullArea = cv.contourArea(hull);
    const solidez = area / Math.max(hullArea, 1);
    
    // Calcular momentos para encontrar centroide
    const momentos = cv.moments(contorno);
    const centroX = momentos.m00 !== 0 ? Math.round(momentos.m10 / momentos.m00) : boundingRect.x + boundingRect.width / 2;
    const centroY = momentos.m00 !== 0 ? Math.round(momentos.m01 / momentos.m00) : boundingRect.y + boundingRect.height / 2;

    // Critérios para classificar como fissura
    const ehFissura = (
      area >= config.areaMinima &&
      perimetro >= config.perimetroMinimo &&
      aspectRatio >= config.aspectRatioMinimo &&
      extent < 0.5 &&  // Fissuras não preenchem completamente o bounding rect
      solidez > 0.5    // Fissuras têm forma relativamente sólida
    );

    if (ehFissura) {
      fissuras.push({
        id: fissuras.length + 1,
        contorno: contorno,
        area: Math.round(area),
        perimetro: Math.round(perimetro),
        aspectRatio: Math.round(aspectRatio * 100) / 100,
        extent: Math.round(extent * 100) / 100,
        solidez: Math.round(solidez * 100) / 100,
        boundingRect: boundingRect,
        centroX: centroX,
        centroY: centroY,
        comprimento: Math.max(boundingRect.width, boundingRect.height),
        largura: Math.min(boundingRect.width, boundingRect.height)
      });
    }

    hull.delete();
  }

  return fissuras;
}

// Função para desenhar fissuras identificadas
function desenharFissuras(imagem, fissuras, config) {
  const cores = [
    new cv.Scalar(0, 255, 0),    // Verde
    new cv.Scalar(255, 0, 0),    // Azul
    new cv.Scalar(0, 0, 255),    // Vermelho
    new cv.Scalar(0, 255, 255),  // Amarelo
    new cv.Scalar(255, 0, 255),  // Magenta
    new cv.Scalar(255, 255, 0),  // Ciano
    new cv.Scalar(128, 255, 0),  // Verde-amarelo
    new cv.Scalar(255, 128, 0)   // Laranja
  ];

  fissuras.forEach((fissura, index) => {
    const cor = cores[index % cores.length];
    
    // Desenhar contorno da fissura
    const contornoVector = new cv.MatVector();
    contornoVector.push_back(fissura.contorno);
    cv.drawContours(imagem, contornoVector, -1, cor, 2);
    
    // Desenhar bounding rectangle
    const topLeft = new cv.Point(fissura.boundingRect.x, fissura.boundingRect.y);
    const bottomRight = new cv.Point(
      fissura.boundingRect.x + fissura.boundingRect.width,
      fissura.boundingRect.y + fissura.boundingRect.height
    );
    cv.rectangle(imagem, topLeft, bottomRight, cor, 1);
    
    if (config.desenharNumeros) {
      // Desenhar número da fissura
      const posicaoTexto = new cv.Point(fissura.centroX - 8, fissura.centroY + 5);
      cv.putText(imagem, `F${fissura.id}`, posicaoTexto,
                cv.FONT_HERSHEY_SIMPLEX, 0.6, cor, 2);
    }
    
    contornoVector.delete();
  });
}

// Função para desenhar informações básicas na imagem
function desenharInformacoes(imagem, fissuras) {
  const texto = `Fissuras detectadas: ${fissuras.length}`;
  
  // Desenhar fundo semitransparente
  const rect1 = new cv.Point(5, 5);
  const rect2 = new cv.Point(250, 40);
  cv.rectangle(imagem, rect1, rect2, new cv.Scalar(0, 0, 0), -1);

  // Desenhar texto
  const posicao = new cv.Point(10, 25);
  cv.putText(imagem, texto, posicao,
            cv.FONT_HERSHEY_SIMPLEX, 0.6, new cv.Scalar(255, 255, 255), 2);
}

// Função para calcular estatísticas das fissuras
function calcularEstatisticas(fissuras) {
  const stats = {
    quantidade: fissuras.length,
    areaTotal: 0,
    comprimentoTotal: 0,
    perimetroTotal: 0,
    maiorArea: 0,
    menorArea: Infinity,
    areaMedia: 0,
    fissurasMaiores: 0, // Fissuras com área > média
    distribuicaoTamanhos: {
      pequenas: 0,  // < 100 px²
      medias: 0,    // 100-500 px²
      grandes: 0    // > 500 px²
    }
  };

  if (fissuras.length === 0) {
    stats.menorArea = 0;
    return stats;
  }

  // Calcular totais
  fissuras.forEach(fissura => {
    stats.areaTotal += fissura.area;
    stats.comprimentoTotal += fissura.comprimento;
    stats.perimetroTotal += fissura.perimetro;
    stats.maiorArea = Math.max(stats.maiorArea, fissura.area);
    stats.menorArea = Math.min(stats.menorArea, fissura.area);

    // Classificar por tamanho
    if (fissura.area < 100) {
      stats.distribuicaoTamanhos.pequenas++;
    } else if (fissura.area <= 500) {
      stats.distribuicaoTamanhos.medias++;
    } else {
      stats.distribuicaoTamanhos.grandes++;
    }
  });

  stats.areaMedia = Math.round(stats.areaTotal / fissuras.length);
  stats.fissurasMaiores = fissuras.filter(f => f.area > stats.areaMedia).length;

  return stats;
}

// Função principal que integra com o preprocessamento
export function reconhecimentoCompleto(opcoes = {}) {
  if (!curFile) {
    throw new Error('Nenhuma imagem carregada');
  }

  const tela = document.createElement("canvas");
  tela.classList.add("styled-canva");
  const contexto = tela.getContext("2d");
  const imagem = new Image();
  imagem.src = URL.createObjectURL(curFile);

  return new Promise((resolve, reject) => {
    imagem.onload = () => {
      try {
        tela.width = imagem.width;
        tela.height = imagem.height;
        const largura = tela.width;
        const altura = tela.height;
        contexto.drawImage(imagem, 0, 0);

        // Salvar imagem original
        const imagemOriginal = contexto.getImageData(0, 0, largura, altura);

        // ========== PIPELINE DE PREPROCESSAMENTO ==========
        const dadosImagem = contexto.getImageData(0, 0, largura, altura);
        const dadosImagemCopia = new ImageData(
          new Uint8ClampedArray(dadosImagem.data), largura, altura);

        // Converter para escala de cinza
        const dadosCinza = converte_escala_de_cinza(dadosImagem);

        // Aplicar transformada Bottom Hat
        const dadosTransformadaHat = transformadaBottomHat(dadosCinza, largura, altura);

        // Aplicar limiarização
        const dadosLimiarizados = limiarizacao_simples(dadosTransformadaHat);

        // Aplicar filtro HSV
        const imagemHSV = aplicarHSV(dadosImagemCopia, largura, altura, 0.5, 0.5);

        // Combinar imagens
        const imagemResultante = combinarImagens(dadosLimiarizados, imagemHSV);

        // Converter para ImageData
        const dadosBinarios = new Uint8ClampedArray(largura * altura * 4);
        for (let i = 0; i < imagemResultante.length; i++) {
          const valor = imagemResultante[i];
          dadosBinarios[i * 4 + 0] = valor;
          dadosBinarios[i * 4 + 1] = valor;
          dadosBinarios[i * 4 + 2] = valor;
          dadosBinarios[i * 4 + 3] = 255;
        }
        const imagemBinaria = new ImageData(dadosBinarios, largura, altura);

        // ========== RECONHECIMENTO COM OPENCV ==========
        const resultado = reconhecerFissuras(imagemOriginal, imagemBinaria, opcoes);

        // Exibir resultado
        cv.imshow(tela, resultado.imagem);
        preview.appendChild(tela);

        // Criar link de download
        const containerDownload = document.querySelector(".download-container");
        containerDownload.innerHTML = "";
        const linkDownload = createDownloadLink(tela, "fissuras_reconhecidas.png");
        containerDownload.appendChild(linkDownload);

        // Log básico
        console.log('=== FISSURAS DETECTADAS ===');
        console.log(`Total: ${resultado.fissuras.length} fissuras`);
        if (resultado.fissuras.length > 0) {
          console.log('Detalhes:', resultado.fissuras.map(f => `F${f.id}: ${f.area}px²`));
        }

        // Limpar memória
        resultado.imagem.delete();

        resolve(resultado);

      } catch (error) {
        console.error('Erro no reconhecimento completo:', error);
        reject(error);
      }
    };

    imagem.onerror = () => reject(new Error('Erro ao carregar imagem'));
  });
}

// Função utilitária para converter dados do preprocessamento
export function criarImagemBinaria(dadosProcessados, largura, altura) {
  const dadosBinarios = new Uint8ClampedArray(largura * altura * 4);
  
  for (let i = 0; i < dadosProcessados.length; i++) {
    const valor = dadosProcessados[i];
    dadosBinarios[i * 4 + 0] = valor;
    dadosBinarios[i * 4 + 1] = valor;
    dadosBinarios[i * 4 + 2] = valor;
    dadosBinarios[i * 4 + 3] = 255;
  }
  
  return new ImageData(dadosBinarios, largura, altura);
}
