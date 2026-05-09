// Camera & OCR Module
const OCR = {
  stream: null,
  videoElement: null,
  canvasElement: null,
  context: null,

  async initCamera() {
    try {
      // Show camera loading state
      const video = document.getElementById('cameraVideo');
      const hint = document.querySelector('.camera-hint');
      if (hint) hint.textContent = '正在打开摄像头...';

      // Try environment camera first (back camera on mobile), fallback to any camera
      let mediaStream = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch (envErr) {
        console.warn('Environment camera not available, trying default:', envErr);
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      this.stream = mediaStream;
      this.videoElement = video;
      this.videoElement.srcObject = this.stream;

      this.canvasElement = document.getElementById('cameraCanvas');
      this.context = this.canvasElement.getContext('2d');

      if (hint) hint.textContent = '请将血糖仪数值对准框内';
      return true;
    } catch (err) {
      console.error('Camera error:', err);
      if (hint) hint.textContent = '';
      // Return specific error for better UX
      return { error: err.name || 'CAMERA_ERROR', message: this.getCameraErrorMessage(err) };
    }
  },

  getCameraErrorMessage(err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问';
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return '未找到摄像头设备';
    }
    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      return '摄像头被其他应用占用';
    }
    if (err.name === 'OverconstrainedError') {
      return '摄像头不支持所请求的设置';
    }
    return '无法访问摄像头，请手动输入血糖值';
  },

  captureImage() {
    const video = this.videoElement;
    const canvas = this.canvasElement;
    const context = this.context;

    if (!video || !canvas || video.videoWidth === 0) {
      console.error('Camera not ready');
      return;
    }

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
    resultDiv.innerHTML = '<span class="ocr-loading">🔍 识别中，请稍候...</span>';

    // Hide confirm buttons while processing
    const captureBtn = document.getElementById('captureBtn');
    const confirmBtn = document.getElementById('confirmOCRBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    if (captureBtn) captureBtn.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';
    if (retakeBtn) retakeBtn.style.display = 'none';

    try {
      // Check if Tesseract is loaded
      if (typeof Tesseract === 'undefined') {
        throw new Error('Tesseract OCR 未加载，请检查网络连接后重试');
      }

      // Use Tesseract.js for OCR with progress feedback
      const result = await Tesseract.recognize(
        imageData,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const pct = Math.round((m.progress || 0) * 100);
              const resultDivInner = document.getElementById('ocrResult');
              if (resultDivInner) {
                resultDivInner.innerHTML = `<span class="ocr-loading">🔍 识别中... ${pct}%</span>`;
              }
            }
          }
        }
      );

      const text = result.data.text;
      console.log('OCR Raw Result:', text);

      // Extract number (glucose value) from text
      // Match common glucose meter formats: "5.4", "5,4", "54" (no decimal), etc.
      const matches = text.match(/[\d.,]+/g);
      let foundValue = null;

      if (matches && matches.length > 0) {
        for (var i = 0; i < matches.length; i++) {
          var raw = matches[i].replace(',', '.');
          var num = parseFloat(raw);
          // Valid glucose range: 2.0 - 35.0 mmol/L
          if (!isNaN(num) && num >= 2.0 && num <= 35.0) {
            foundValue = num;
            break;
          }
        }
      }

      if (foundValue !== null) {
        const ocrValue = foundValue.toFixed(1);
        document.getElementById('ocrValue').textContent = ocrValue;
        resultDiv.innerHTML = `<span>✅ 识别结果: <strong>${ocrValue}</strong> mmol/L</span>`;

        // Notify app of OCR result
        if (window.app && window.app.handleOCRResult) {
          window.app.handleOCRResult(foundValue);
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
        resultDiv.innerHTML = `<span>❌ 未找到有效血糖值（范围 2.0~35.0 mmol/L），请手动输入</span>`;
        if (captureBtn) captureBtn.style.display = 'inline-flex';
        if (retakeBtn) retakeBtn.style.display = 'inline-flex';
      }
    } catch (err) {
      console.error('OCR error:', err);
      resultDiv.innerHTML = `<span>❌ 识别出错: ${err.message || '请手动输入'}</span>`;
      if (captureBtn) captureBtn.style.display = 'inline-flex';
      if (retakeBtn) retakeBtn.style.display = 'inline-flex';
    }
  },

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
};

window.OCR = OCR;
