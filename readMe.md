# Detector de Fissuras em Estruturas (PID)
Este projeto é uma ferramenta web para Processamento de Imagens Digitais (PID), desenvolvida como um trabalho acadêmico para a UNIOSTE. O foco principal é a implementação de técnicas de visão computacional para a detecção e reconhecimento de fissuras em estruturas civis (concreto, alvenaria, etc.), baseando-se em uma abordagem de artigo científico.

#### Autores:
- [Hugo Cordeiro](https://github.com/ugoincc)
- [Kelyton Lacerda](https://github.com/Kelyton21)
- [Renan Batalha](https://github.com/renanBatalha)

#### Abordagem Científica
O método implementado é baseado no artigo Health Monitoring of Civil Structures with Integrated UAV and Image Processing System, conforme resumido no documento Resumo-Artigo-PID.pdf.

Técnicas simples de detecção de borda (como Sobel ou Canny) são muitas vezes imprecisas para esta tarefa, pois detectam não apenas as fissuras, mas também as bordas estruturais da imagem (janelas, cantos, etc.).

Para solucionar isso, o projeto implementa um pipeline de filtro duplo para isolar com mais precisão as fissuras:


### Filtro 1: Transformada Bottom-Hat

A imagem é convertida para escala de cinza. Aplica-se a transformada morfológica "Bottom-Hat", que é excelente para destacar elementos pequenos e escuros sobre um fundo claro (exatamente como uma fissura). Uma limiarização (Thresholding) é aplicada para criar uma máscara binária.

### Filtro 2: Limiarização HSV

A imagem original é convertida para o espaço de cores HSV (Hue, Saturation, Value). Aplica-se uma limiarização para detectar regiões de baixa saturação (S) e baixo valor (V), características comuns de sombras e fissuras. A imagem final de fissura detectada é o resultado da combinação (AND lógico) das duas máscaras binárias, aumentando significativamente a precisão.

## Funcionalidades Implementadas
#### A interface permite ao usuário carregar uma imagem e aplicar três operações distintas:

Escala de Cinza - Uma conversão básica para escala de cinza (luma).

Destacar Fissura - Implementa o pipeline duplo (Bottom-Hat + HSV) descrito acima  usando JavaScript puro.

O resultado é a máscara binária final que mostra as fissuras detectadas em branco (ou preto, dependendo da lógica de limiarização).

### Reconhecer Fissuras (com OpenCV.js)

Esta é a funcionalidade mais avançada. Primeiro, ela gera a mesma máscara binária da função anterior. Em seguida, carrega dinamicamente o OpenCV.js para analisar essa máscara. Utiliza cv.findContours para identificar cada região de fissura individualmente. Filtra os contornos por propriedades (como área mínima, perímetro) para reduzir ruído. Desenha um retângulo (Bounding Box) e um rótulo (ex: "F1", "F2") sobre a imagem original para cada fissura validada.

## Tecnologias Utilizadas
<b>HTML5 / CSS3:</b> Estrutura e estilo da interface.

<b>JavaScript (ES Modules):</b> Manipulação do DOM e implementação pura dos algoritmos de pré-processamento (preProcessamento.js).

<b>OpenCV.js:</b> Biblioteca de visão computacional (carregada dinamicamente) para análise de contornos, formas e desenho dos resultados (reconhecimentoDeFissura.js).

## Como Executar
<b>Atenção!</b> Este projeto não funciona abrindo o index.html diretamente do navegador (via file://).

Devido às políticas de segurança do navegador (CORS), o JavaScript não consegue carregar os módulos ou a imagem no canvas. Você precisa rodar o projeto a partir de um servidor HTTP local.

A forma mais fácil de fazer isso é usando Python (se você o tiver instalado):

Navegue até a pasta do projeto no seu terminal.

Execute o comando:

```
### Para Python 3
python3 -m http.server 8000
```

Abra o navegador e acesse: http://localhost:8000

Alternativamente, se você usa Node.js, pode usar o pacote serve:
```
### Instale (apenas uma vez)
npm install -g serve

### Rode na pasta do projeto
npx serve .
```
