const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const faceapi = require('face-api.js');
const { Canvas, Image } = require('canvas');
const fs = require('fs');

// Configurações do Express
const app = express();
const port = 3000;

// Servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static('public'));

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Função para carregar modelos da face-api.js
async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
  await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
  await faceapi.nets.faceExpressionNet.loadFromDisk('./models');
}

// Endpoint para upload e processamento de imagem
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    // Carregar a imagem enviada
    const imagePath = req.file.path;
    const image = await sharp(imagePath).resize(500, 500).toBuffer();
    
    // Processar a imagem com face-api.js
    const img = new Image();
    img.src = image;
    const canvas = new Canvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Detectar rosto e pontos de referência
    const detections = await faceapi.detectAllFaces(canvas)
      .withFaceLandmarks()
      .withFaceExpressions();

    // Exemplo de transformação simples - aumente o nariz (caricatura)
    if (detections.length > 0) {
      detections.forEach(detection => {
        const landmarks = detection.landmarks;
        const nose = landmarks.getNose();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        ctx.save();
        ctx.translate(nose[0].x, nose[0].y);
        ctx.scale(1, 1.5);  // Exemplo de caricatura
        ctx.drawImage(img, -nose[0].x, -nose[0].y, img.width, img.height);
        ctx.restore();
      });
    }

    // Desenhar corações e rosas ao redor
    drawHeartsAndRoses(ctx, img.width, img.height);

    // Salvar a imagem processada
    const processedImagePath = `uploads/processed-${Date.now()}.png`;
    const out = fs.createWriteStream(processedImagePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => res.sendFile(path.resolve(processedImagePath)));
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao processar a imagem');
  }
});

// Função para desenhar corações e rosas no canvas
function drawHeartsAndRoses(ctx, width, height) {
  const heartCount = 15;
  const roseCount = 10;

  function drawHeart(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size / 2, -size / 2, -size, size / 3, 0, size);
    ctx.bezierCurveTo(size, size / 3, size / 2, -size / 2, 0, 0);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.restore();
  }

  function drawRose(x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'pink';
    ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < heartCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    drawHeart(x, y, 20);
  }

  for (let i = 0; i < roseCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    drawRose(x, y, 15);
  }
}

// Iniciar o servidor e carregar os modelos
loadModels().then(() => {
  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
});
