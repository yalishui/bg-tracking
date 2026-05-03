// Camera & OCR Module
const OCR = {
  stream: null,
  videoElement: null,
  canvasElement: null,
  context: null,

  async initCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      this.videoElement = document.getElementById('cameraVideo');
      this.videoElement.srcObject = this.stream;
      
      this.canvasElement = document.getElementById('cameraCanvas');
      this.context = this.canvasElement.getContext('2d');
      
      return true;
    } catch (err) {
      console.error('Camera error:', err);
      return false;
    }
  },

  captureImage() {
    const video = this.videoElement;
    const canvas = this.canvasElement;
    const context = this.context;
    
    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageData = canvas.toDataURL('image/jpeg');
    
    // Process with OCR
    this.processImage(imageData);
  },

  async processImage(imageData) {
    const resultDiv = document.getElementById('ocrResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<span>识别中...</span>';
    
    try {
      // Use Tesseract.js for OCR
      const result = await Tesseract.recognize(
        imageData,
        'eng',
        { logger: m => console.log(m) }
      );
      
      const text = result.data.text;
      console.log('OCR Result:', text);
      
      // Extract number (glucose value) from text
      const matches = text.match(/[\d\.]+/g);
      if (matches && matches.length > 0) {
        // Find the most likely glucose value (3.0-30.0 range)
        const value = matches.find(m => parseFloat(m) >= 3.0 && parseFloat(m) <= 30.0);
        
        if (value) {
          const ocrValue = parseFloat(value).toFixed(1);
          document.getElementById('ocrValue').textContent = ocrValue;

          // Notify app of OCR result (updates UI: show confirm/retake buttons)
          if (window.app && window.app.handleOCRResult) {
            window.app.handleOCRResult(parseFloat(ocrValue));
          }

          // Also fill glucose input if modal is open (fallback)
          const glucoseInput = document.getElementById('glucoseInput');
          if (glucoseInput) {
            glucoseInput.value = ocrValue;
            if (window.app && window.app.updateGlucosePreview) {
              window.app.updateGlucosePreview();
            }
          }
        } else {
          resultDiv.innerHTML = '<span>未找到有效血糖值，请手动输入</span>';
        }
      } else {
        resultDiv.innerHTML = '<span>识别失败，请手动输入</span>';
      }
    } catch (err) {
      console.error('OCR error:', err);
      resultDiv.innerHTML = '<span>识别出错，请手动输入</span>';
    }
  },

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
};

window.OCR = OCR;
