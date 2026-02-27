/**
 * Formatos aceitos pela OpenAI Vision: jpeg, png, gif, webp.
 * HEIC (iPhone) e outros não são suportados — convertemos para JPEG.
 */
const SUPPORTED_IMAGE_TYPES = /^data:image\/(jpeg|png|gif|webp);base64,/i;

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.82;

/**
 * Redimensiona e comprime a imagem para caber no limite do body da API (evita erro de payload grande).
 */
export function compressImageForApi(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
          if (w > h) {
            h = Math.round((h * MAX_DIMENSION) / w);
            w = MAX_DIMENSION;
          } else {
            w = Math.round((w * MAX_DIMENSION) / h);
            h = MAX_DIMENSION;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas não disponível."));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const jpeg = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        resolve(jpeg);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Não foi possível processar a imagem."));
    img.src = dataUrl;
  });
}

/**
 * Converte no cliente quando possível; senão devolve o data URL para o servidor converter (ex.: HEIC da câmera).
 */
export function imageDataUrlToSupported(dataUrl: string): Promise<string> {
  if (SUPPORTED_IMAGE_TYPES.test(dataUrl)) {
    return Promise.resolve(dataUrl);
  }
  return dataUrlToJpeg(dataUrl).catch(() => dataUrl);
}

function dataUrlToJpeg(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas não disponível."));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const jpeg = canvas.toDataURL("image/jpeg", 0.9);
        resolve(jpeg);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Não foi possível processar a imagem. Tente usar JPEG ou PNG."));
    img.src = dataUrl;
  });
}
