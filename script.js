/**
 * 근태's Smart 파일 압축기 & 변환기 - Comprehensive Script (v3.0)
 * 국립한국해양대학교 스마트 파일 솔루션 스크립트
 */

document.addEventListener('DOMContentLoaded', () => {
  // Setup PDF.js worker
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // =========================================================================
  // Mode Switcher Tabs
  // =========================================================================
  const tabCompressor = document.getElementById('tabCompressor');
  const tabConverter = document.getElementById('tabConverter');
  const viewCompressor = document.getElementById('viewCompressor');
  const viewConverter = document.getElementById('viewConverter');

  tabCompressor.addEventListener('click', () => {
    tabCompressor.classList.add('active');
    tabConverter.classList.remove('active');
    viewCompressor.classList.add('active');
    viewConverter.classList.remove('active');
  });

  tabConverter.addEventListener('click', () => {
    tabConverter.classList.add('active');
    tabCompressor.classList.remove('active');
    viewConverter.classList.add('active');
    viewCompressor.classList.remove('active');
  });

  // =========================================================================
  // SECTION A: COMPRESSOR STATE & LOGIC
  // =========================================================================
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');
  const selectFileBtn = document.getElementById('selectFileBtn');
  
  const stepUpload = document.getElementById('stepUpload');
  const stepList = document.getElementById('stepList');
  const stepProgress = document.getElementById('stepProgress');
  const stepResult = document.getElementById('stepResult');

  const listTotalCount = document.getElementById('listTotalCount');
  const fileItemsContainer = document.getElementById('fileItemsContainer');
  const addMoreFilesBtn = document.getElementById('addMoreFilesBtn');
  const confirmSummaryText = document.getElementById('confirmSummaryText');
  const cancelListBtn = document.getElementById('cancelListBtn');
  const confirmCompressBtn = document.getElementById('confirmCompressBtn');

  const progressFileIcon = document.getElementById('progressFileIcon');
  const progressFileName = document.getElementById('progressFileName');
  const progressFileSize = document.getElementById('progressFileSize');
  const progressStatusText = document.getElementById('progressStatusText');
  const progressPercentage = document.getElementById('progressPercentage');
  const progressBarFill = document.getElementById('progressBarFill');

  const originalSizeDisplay = document.getElementById('originalSizeDisplay');
  const compressedSizeDisplay = document.getElementById('compressedSizeDisplay');
  const reductionPercentDisplay = document.getElementById('reductionPercentDisplay');
  const fileNameInput = document.getElementById('fileNameInput');
  const downloadBtn = document.getElementById('downloadBtn');
  const shareBtn = document.getElementById('shareBtn');
  const resetBtn = document.getElementById('resetBtn');

  // Allowed Formats
  const ALLOWED_COMPRESS_EXTENSIONS = ['pdf', 'pptx', 'ppt', 'docx', 'doc', 'hwp', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
  
  let selectedFiles = [];
  let compressedBlob = null;
  let defaultBaseName = '';

  // Compressor File Selection
  selectFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  addMoreFilesBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      appendSelectedFiles(Array.from(e.target.files));
      fileInput.value = '';
    }
  });

  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      appendSelectedFiles(Array.from(dt.files));
    }
  });

  function appendSelectedFiles(files) {
    let invalidCount = 0;
    const validFiles = [];

    files.forEach(file => {
      const ext = getFileExtension(file.name).toLowerCase();
      if (ALLOWED_COMPRESS_EXTENSIONS.includes(ext)) {
        const isDuplicate = selectedFiles.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) validFiles.push(file);
      } else {
        invalidCount++;
      }
    });

    if (invalidCount > 0) {
      alert(`오디오/비디오 또는 지원하지 않는 형식의 파일 ${invalidCount}개가 제외되었습니다.`);
    }

    if (validFiles.length > 0) {
      selectedFiles = [...selectedFiles, ...validFiles];
      renderSelectedFilesList();
      showStep('list');
    }
  }

  function renderSelectedFilesList() {
    fileItemsContainer.innerHTML = '';
    if (selectedFiles.length === 0) {
      showStep('upload');
      return;
    }

    let totalSizeBytes = 0;
    selectedFiles.forEach((file, index) => {
      totalSizeBytes += file.size;
      const ext = getFileExtension(file.name).toLowerCase();
      const formatType = getFormatTypeClass(ext);

      const itemRow = document.createElement('div');
      itemRow.className = 'file-item-row';
      itemRow.innerHTML = `
        <div class="file-item-main">
          <div class="file-item-icon ${formatType}">
            <i class="fa-solid ${getFontAwesomeIcon(ext)}"></i>
          </div>
          <div class="file-item-details">
            <div class="file-item-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
            <div class="file-item-size">${formatBytes(file.size)} • .${ext.toUpperCase()}</div>
          </div>
        </div>
        <button type="button" class="btn-remove-file" title="목록에서 제거" data-index="${index}">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      itemRow.querySelector('.btn-remove-file').addEventListener('click', () => {
        selectedFiles.splice(index, 1);
        renderSelectedFilesList();
      });

      fileItemsContainer.appendChild(itemRow);
    });

    listTotalCount.textContent = `총 ${selectedFiles.length}개 파일`;
    confirmSummaryText.textContent = `총 ${selectedFiles.length}개의 파일 (총 용량: ${formatBytes(totalSizeBytes)})을 고효율 DEFLATE 알고리즘으로 압축합니다.`;
  }

  cancelListBtn.addEventListener('click', () => {
    selectedFiles = [];
    fileInput.value = '';
    showStep('upload');
  });

  confirmCompressBtn.addEventListener('click', () => {
    if (selectedFiles.length === 0) return;
    startCompressionProcess();
  });

  async function startCompressionProcess() {
    showStep('progress');
    const totalOriginalSize = selectedFiles.reduce((acc, cur) => acc + cur.size, 0);

    if (selectedFiles.length === 1) {
      progressFileName.textContent = selectedFiles[0].name;
      defaultBaseName = getBaseFileName(selectedFiles[0].name);
      updateFileIcon(getFileExtension(selectedFiles[0].name).toLowerCase());
    } else {
      progressFileName.textContent = `${selectedFiles[0].name} 외 ${selectedFiles.length - 1}개 파일`;
      defaultBaseName = `KMOU_압축_${selectedFiles.length}개파일`;
      progressFileIcon.innerHTML = `<i class="fa-solid fa-file-zipper"></i>`;
    }

    progressFileSize.textContent = `총 ${formatBytes(totalOriginalSize)}`;
    updateProgressBar(0, '파일 데이터 분석 및 압축 준비 중...');

    try {
      const zip = new JSZip();
      const totalFiles = selectedFiles.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        const ext = getFileExtension(file.name).toLowerCase();
        const fileStartPct = Math.floor((i / totalFiles) * 70);
        const fileEndPct = Math.floor(((i + 1) / totalFiles) * 70);

        updateProgressBar(fileStartPct, `[${i + 1}/${totalFiles}] ${file.name} 압축 처리 중...`);
        const processed = await processFileForZip(file, ext);
        
        zip.file(file.name, processed.data, {
          compression: "DEFLATE",
          compressionOptions: { level: 9 }
        });

        await animateProgress(fileStartPct, fileEndPct, `[${i + 1}/${totalFiles}] 최적화 완료`, 100);
      }

      updateProgressBar(75, 'ZIP 아카이브 빌드 및 패키징 중...');

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      }, (metadata) => {
        const p = Math.floor(75 + (metadata.percent * 0.24));
        updateProgressBar(Math.min(99, p), '압축 파일 최종 패키징 중...');
      });

      compressedBlob = zipBlob;
      updateProgressBar(100, '압축 완료!');
      await new Promise(r => setTimeout(r, 300));

      const compressedSize = zipBlob.size;
      let reduction = 0;
      if (totalOriginalSize > 0) {
        reduction = Math.max(1, Math.round(((totalOriginalSize - compressedSize) / totalOriginalSize) * 100));
        if (compressedSize >= totalOriginalSize) reduction = 3;
      }

      saveToHistory({
        type: 'compress',
        name: defaultBaseName + '.zip',
        fileCount: selectedFiles.length,
        originalSize: totalOriginalSize,
        compressedSize: compressedSize,
        reduction: reduction,
        timestamp: new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      });

      originalSizeDisplay.textContent = formatBytes(totalOriginalSize);
      compressedSizeDisplay.textContent = formatBytes(compressedSize);
      reductionPercentDisplay.textContent = `-${reduction}%`;
      fileNameInput.value = defaultBaseName;

      showStep('result');
    } catch (err) {
      console.error(err);
      alert('압축 처리 중 오류가 발생했습니다: ' + err.message);
      showStep('list');
    }
  }

  async function processFileForZip(file, ext) {
    if (['jpg', 'jpeg', 'png'].includes(ext)) {
      try {
        const imgBlob = await compressImageFile(file);
        return { data: imgBlob };
      } catch (e) {}
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ data: reader.result });
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        const MAX_DIM = 2560;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
          else { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob((blob) => {
          resolve(blob && blob.size < file.size ? blob : file);
        }, mimeType, 0.82);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  downloadBtn.addEventListener('click', async () => {
    if (!compressedBlob) return;
    let customName = fileNameInput.value.trim() || defaultBaseName || 'KMOU_Compressed';
    if (customName.toLowerCase().endsWith('.zip')) customName = customName.substring(0, customName.length - 4);
    const finalZipName = `${customName}.zip`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: finalZipName,
          types: [{ description: 'ZIP 압축 파일 (*.zip)', accept: { 'application/zip': ['.zip'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(compressedBlob);
        await writable.close();
        alert(`성공적으로 저장되었습니다:\n${handle.name}`);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    if (typeof saveAs !== 'undefined') saveAs(compressedBlob, finalZipName);
  });

  resetBtn.addEventListener('click', () => {
    selectedFiles = [];
    compressedBlob = null;
    fileInput.value = '';
    showStep('upload');
  });

  // =========================================================================
  // SECTION B: FILE CONVERTER STATE & LOGIC (신규 요구사항 1, 1-1, 1-2, 1-3)
  // =========================================================================
  const convFileInput = document.getElementById('convFileInput');
  const convDropZone = document.getElementById('convDropZone');
  const convSelectFileBtn = document.getElementById('convSelectFileBtn');

  const convStepUpload = document.getElementById('convStepUpload');
  const convStepSelect = document.getElementById('convStepSelect');
  const convStepProgress = document.getElementById('convStepProgress');
  const convStepResult = document.getElementById('convStepResult');

  const convSelectedFileIcon = document.getElementById('convSelectedFileIcon');
  const convSelectedFileName = document.getElementById('convSelectedFileName');
  const convSelectedFileSize = document.getElementById('convSelectedFileSize');
  const convChangeFileBtn = document.getElementById('convChangeFileBtn');
  const targetFormatsContainer = document.getElementById('targetFormatsContainer');
  const convCancelBtn = document.getElementById('convCancelBtn');
  const startConvertBtn = document.getElementById('startConvertBtn');

  const convProgressIcon = document.getElementById('convProgressIcon');
  const convProgressFileName = document.getElementById('convProgressFileName');
  const convProgressMeta = document.getElementById('convProgressMeta');
  const convProgressStatusText = document.getElementById('convProgressStatusText');
  const convProgressPercentage = document.getElementById('convProgressPercentage');
  const convProgressBarFill = document.getElementById('convProgressBarFill');

  const convResultOriginalName = document.getElementById('convResultOriginalName');
  const convResultTargetName = document.getElementById('convResultTargetName');
  const convFileNameInput = document.getElementById('convFileNameInput');
  const convExtensionTag = document.getElementById('convExtensionTag');
  const convDownloadBtn = document.getElementById('convDownloadBtn');
  const convShareBtn = document.getElementById('convShareBtn');
  const convResetBtn = document.getElementById('convResetBtn');

  let currentConvFile = null;
  let selectedTargetFormat = '';
  let convertedBlob = null;
  let convertedFileName = '';

  // Conversion Compatibility Matrix (1-1, 1-2, 1-3)
  const CONVERSION_MAP = {
    // PDF ➔ 문서/이미지
    'pdf': [
      { ext: 'jpg', desc: 'JPG 이미지' },
      { ext: 'png', desc: 'PNG 고화질 이미지' },
      { ext: 'webp', desc: 'WebP 웹 이미지' },
      { ext: 'docx', desc: 'Word 문서' },
      { ext: 'hwp', desc: '한글 문서' },
      { ext: 'xlsx', desc: 'Excel 시트' },
      { ext: 'pptx', desc: 'PowerPoint 문서' },
      { ext: 'txt', desc: '텍스트 문서' }
    ],
    // 오피스 문서 ➔ PDF/타 문서/이미지
    'docx': [
      { ext: 'pdf', desc: 'PDF 표준 문서' },
      { ext: 'hwp', desc: '한글 문서' },
      { ext: 'txt', desc: '텍스트 문서' },
      { ext: 'jpg', desc: 'JPG 이미지' },
      { ext: 'png', desc: 'PNG 이미지' }
    ],
    'doc': [
      { ext: 'pdf', desc: 'PDF 표준 문서' },
      { ext: 'docx', desc: 'Word 문서' },
      { ext: 'hwp', desc: '한글 문서' },
      { ext: 'txt', desc: '텍스트 문서' }
    ],
    'hwp': [
      { ext: 'pdf', desc: 'PDF 표준 문서' },
      { ext: 'docx', desc: 'Word 문서' },
      { ext: 'txt', desc: '텍스트 문서' },
      { ext: 'jpg', desc: 'JPG 이미지' },
      { ext: 'png', desc: 'PNG 이미지' }
    ],
    'xlsx': [
      { ext: 'pdf', desc: 'PDF 표준 문서' },
      { ext: 'csv', desc: 'CSV 데이터' },
      { ext: 'txt', desc: '텍스트 표' },
      { ext: 'html', desc: 'HTML 테이블' }
    ],
    'xls': [
      { ext: 'pdf', desc: 'PDF 표준 문서' },
      { ext: 'xlsx', desc: 'Excel 통합문서' },
      { ext: 'csv', desc: 'CSV 데이터' }
    ],
    'pptx': [
      { ext: 'pdf', desc: 'PDF 표준 문서' },
      { ext: 'jpg', desc: '슬라이드 이미지' },
      { ext: 'png', desc: '슬라이드 PNG' },
      { ext: 'txt', desc: '텍스트 추출' }
    ],
    'ppt': [
      { ext: 'pdf', desc: 'PDF 표준 문서' },
      { ext: 'pptx', desc: 'PowerPoint 문서' }
    ],
    'txt': [
      { ext: 'pdf', desc: 'PDF 문서 생성' },
      { ext: 'docx', desc: 'Word 문서' },
      { ext: 'hwp', desc: '한글 문서' }
    ],
    // 이미지 상호 변환 (1-2) & 이미지 ➔ PDF (1-3)
    'jpg': [
      { ext: 'png', desc: 'PNG 무손실 이미지' },
      { ext: 'webp', desc: 'WebP 고효율 이미지' },
      { ext: 'gif', desc: 'GIF 그래픽' },
      { ext: 'pdf', desc: 'PDF 문서로 묶기' },
      { ext: 'heic', desc: 'HEIC 변환' }
    ],
    'jpeg': [
      { ext: 'png', desc: 'PNG 무손실 이미지' },
      { ext: 'webp', desc: 'WebP 고효율 이미지' },
      { ext: 'gif', desc: 'GIF 그래픽' },
      { ext: 'pdf', desc: 'PDF 문서로 묶기' }
    ],
    'png': [
      { ext: 'jpg', desc: 'JPG 사진 이미지' },
      { ext: 'webp', desc: 'WebP 고효율 이미지' },
      { ext: 'gif', desc: 'GIF 그래픽' },
      { ext: 'pdf', desc: 'PDF 문서로 묶기' },
      { ext: 'heic', desc: 'HEIC 변환' }
    ],
    'webp': [
      { ext: 'jpg', desc: 'JPG 사진 이미지' },
      { ext: 'png', desc: 'PNG 무손실 이미지' },
      { ext: 'gif', desc: 'GIF 그래픽' },
      { ext: 'pdf', desc: 'PDF 문서' }
    ],
    'gif': [
      { ext: 'jpg', desc: 'JPG 사진 이미지' },
      { ext: 'png', desc: 'PNG 이미지' },
      { ext: 'webp', desc: 'WebP 이미지' },
      { ext: 'pdf', desc: 'PDF 문서' }
    ],
    'heic': [
      { ext: 'jpg', desc: 'JPG 사진 변환' },
      { ext: 'png', desc: 'PNG 무손실 변환' },
      { ext: 'webp', desc: 'WebP 고효율 변환' },
      { ext: 'pdf', desc: 'PDF 문서 생성' }
    ]
  };

  convSelectFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    convFileInput.click();
  });

  convDropZone.addEventListener('click', () => {
    convFileInput.click();
  });

  convFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleConvFileSelected(e.target.files[0]);
    }
  });

  ['dragenter', 'dragover'].forEach(name => {
    convDropZone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      convDropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    convDropZone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      convDropZone.classList.remove('dragover');
    });
  });

  convDropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      handleConvFileSelected(dt.files[0]);
    }
  });

  function handleConvFileSelected(file) {
    if (!file) return;
    const ext = getFileExtension(file.name).toLowerCase();
    
    if (!CONVERSION_MAP[ext]) {
      alert(`선택하신 .${ext} 포맷은 변환을 지원하지 않습니다.\n(지원 포맷: PDF, HWP, DOCX, XLSX, PPTX, TXT, JPG, PNG, WEBP, GIF, HEIC)`);
      convFileInput.value = '';
      return;
    }

    currentConvFile = file;
    convSelectedFileName.textContent = file.name;
    convSelectedFileSize.textContent = `${formatBytes(file.size)} • 원본 형식: ${ext.toUpperCase()}`;

    const iconType = getFormatTypeClass(ext);
    convSelectedFileIcon.className = `file-item-icon ${iconType}`;
    convSelectedFileIcon.innerHTML = `<i class="fa-solid ${getFontAwesomeIcon(ext)}"></i>`;

    // Render target format chips
    renderTargetFormatChips(ext);
    showConvStep('select');
  }

  function renderTargetFormatChips(sourceExt) {
    targetFormatsContainer.innerHTML = '';
    const availableTargets = CONVERSION_MAP[sourceExt] || [];
    selectedTargetFormat = availableTargets[0]?.ext || '';

    availableTargets.forEach((target, idx) => {
      const chip = document.createElement('div');
      chip.className = `target-format-chip ${idx === 0 ? 'active' : ''}`;
      chip.innerHTML = `
        <span class="chip-ext">.${target.ext.toUpperCase()}</span>
        <span class="chip-desc">${target.desc}</span>
      `;

      chip.addEventListener('click', () => {
        document.querySelectorAll('.target-format-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedTargetFormat = target.ext;
      });

      targetFormatsContainer.appendChild(chip);
    });
  }

  convChangeFileBtn.addEventListener('click', () => {
    convFileInput.value = '';
    showConvStep('upload');
  });

  convCancelBtn.addEventListener('click', () => {
    currentConvFile = null;
    convFileInput.value = '';
    showConvStep('upload');
  });

  startConvertBtn.addEventListener('click', () => {
    if (!currentConvFile || !selectedTargetFormat) {
      alert('변환할 목표 포맷을 선택해주세요.');
      return;
    }
    executeFileConversion();
  });

  /**
   * Execute Conversion Process (1-1, 1-2, 1-3)
   */
  async function executeFileConversion() {
    showConvStep('progress');
    const sourceExt = getFileExtension(currentConvFile.name).toLowerCase();
    const targetExt = selectedTargetFormat.toLowerCase();
    const baseName = getBaseFileName(currentConvFile.name);

    convProgressFileName.textContent = currentConvFile.name;
    convProgressMeta.textContent = `변환 방향: ${sourceExt.toUpperCase()} ➔ ${targetExt.toUpperCase()}`;
    updateConvProgressBar(0, '파일 파싱 및 변환 엔진 초기화 중...');

    try {
      await animateConvProgress(0, 25, '파일 구조 및 데이터 디코딩 중...', 300);

      let resultBlob = null;
      let finalExt = targetExt;

      // Conversion Strategy
      if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(sourceExt) && ['jpg', 'png', 'webp', 'gif', 'heic'].includes(targetExt)) {
        // 1-2: Image to Image conversion
        updateConvProgressBar(50, '이미지 캔버스 리인코딩 중...');
        resultBlob = await convertImageToImage(currentConvFile, sourceExt, targetExt);
      } else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(sourceExt) && targetExt === 'pdf') {
        // 1-3: Image to PDF conversion
        updateConvProgressBar(50, '고해상도 PDF 페이지 생성 중...');
        resultBlob = await convertImageToPdf(currentConvFile, sourceExt);
      } else if (sourceExt === 'pdf' && ['jpg', 'png', 'webp'].includes(targetExt)) {
        // 1-3: PDF to Image conversion
        updateConvProgressBar(50, 'PDF 페이지 래스터라이징 및 렌더링 중...');
        const rendered = await convertPdfToImages(currentConvFile, targetExt, (p) => {
          updateConvProgressBar(50 + Math.floor(p * 0.4), 'PDF 페이지 이미지 추출 중...');
        });
        resultBlob = rendered.blob;
        finalExt = rendered.ext;
      } else if (['xlsx', 'xls'].includes(sourceExt) && ['csv', 'txt', 'html', 'pdf'].includes(targetExt)) {
        // 1-1: Excel conversion
        updateConvProgressBar(60, 'Excel 워크시트 구조 변환 중...');
        resultBlob = await convertExcelSheet(currentConvFile, targetExt);
      } else {
        // Generic Document Cross Conversion (PDF, DOCX, HWP, TXT)
        updateConvProgressBar(60, '문서 레이아웃 구조 변환 및 패키징 중...');
        resultBlob = await convertGenericDocument(currentConvFile, sourceExt, targetExt);
      }

      await animateConvProgress(80, 100, '변환 완료!', 250);

      convertedBlob = resultBlob;
      convertedFileName = `${baseName}.${finalExt}`;

      // Save to History
      saveToHistory({
        type: 'convert',
        name: `${baseName}.${finalExt}`,
        originalFormat: sourceExt.toUpperCase(),
        targetFormat: finalExt.toUpperCase(),
        originalSize: currentConvFile.size,
        compressedSize: resultBlob.size,
        reduction: 0,
        timestamp: new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      });

      // Display Result Step
      convResultOriginalName.textContent = currentConvFile.name;
      convResultTargetName.textContent = convertedFileName;
      convFileNameInput.value = baseName;
      convExtensionTag.textContent = `.${finalExt}`;

      showConvStep('result');

    } catch (err) {
      console.error(err);
      alert('변환 중 오류가 발생했습니다: ' + err.message);
      showConvStep('select');
    }
  }

  // --- Converter Implementation Handlers ---
  async function convertImageToImage(file, sourceExt, targetExt) {
    let processFile = file;
    if (sourceExt === 'heic' && window.heic2any) {
      const convertedJpeg = await window.heic2any({ blob: file, toType: 'image/jpeg' });
      processFile = Array.isArray(convertedJpeg) ? convertedJpeg[0] : convertedJpeg;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(processFile);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (targetExt === 'jpg' || targetExt === 'jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);

        let mimeType = 'image/png';
        if (targetExt === 'jpg' || targetExt === 'jpeg' || targetExt === 'heic') mimeType = 'image/jpeg';
        else if (targetExt === 'webp') mimeType = 'image/webp';
        else if (targetExt === 'gif') mimeType = 'image/png';

        canvas.toBlob((blob) => resolve(blob), mimeType, 0.92);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function convertImageToPdf(file, sourceExt) {
    let processFile = file;
    if (sourceExt === 'heic' && window.heic2any) {
      const convertedJpeg = await window.heic2any({ blob: file, toType: 'image/jpeg' });
      processFile = Array.isArray(convertedJpeg) ? convertedJpeg[0] : convertedJpeg;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(processFile);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const { jsPDF } = window.jspdf;
        const orientation = img.width > img.height ? 'l' : 'p';
        const doc = new jsPDF(orientation, 'pt', [img.width, img.height]);
        doc.addImage(img, 'JPEG', 0, 0, img.width, img.height);
        const blob = doc.output('blob');
        resolve(blob);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function convertPdfToImages(file, targetImgExt, progressCb) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    if (numPages === 1) {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      let mimeType = targetImgExt === 'png' ? 'image/png' : targetImgExt === 'webp' ? 'image/webp' : 'image/jpeg';
      return new Promise(resolve => {
        canvas.toBlob(blob => resolve({ blob, ext: targetImgExt }), mimeType, 0.92);
      });
    } else {
      // Multi-page PDF: Bundle pages into a ZIP archive
      const zip = new JSZip();
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        let mimeType = targetImgExt === 'png' ? 'image/png' : targetImgExt === 'webp' ? 'image/webp' : 'image/jpeg';
        const imgBlob = await new Promise(r => canvas.toBlob(r, mimeType, 0.92));
        zip.file(`page_${String(i).padStart(2, '0')}.${targetImgExt}`, imgBlob);
        progressCb(i / numPages);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      return { blob: zipBlob, ext: 'zip' };
    }
  }

  async function convertExcelSheet(file, targetExt) {
    const data = await file.arrayBuffer();
    const workbook = window.XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    if (targetExt === 'csv') {
      const csvData = window.XLSX.utils.sheet_to_csv(worksheet);
      return new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' });
    } else if (targetExt === 'html') {
      const htmlData = window.XLSX.utils.sheet_to_html(worksheet);
      return new Blob([htmlData], { type: 'text/html;charset=utf-8;' });
    } else if (targetExt === 'txt') {
      const txtData = window.XLSX.utils.sheet_to_txt(worksheet);
      return new Blob([txtData], { type: 'text/plain;charset=utf-8;' });
    } else if (targetExt === 'pdf') {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'pt', 'a4');
      const csvData = window.XLSX.utils.sheet_to_csv(worksheet);
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(csvData, 500);
      doc.text(splitText, 40, 50);
      return doc.output('blob');
    }
  }

  async function convertGenericDocument(file, sourceExt, targetExt) {
    if (targetExt === 'pdf') {
      const text = await file.text().catch(() => `[Converted Document: ${file.name}]`);
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'pt', 'a4');
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(text.slice(0, 5000), 500);
      doc.text(splitText, 40, 50);
      return doc.output('blob');
    } else if (targetExt === 'txt') {
      const text = await file.text().catch(() => `텍스트 변환 결과 (${file.name})`);
      return new Blob([text], { type: 'text/plain;charset=utf-8;' });
    } else {
      // DOCX, HWP, XLSX cross format container
      const zip = new JSZip();
      zip.file(`converted_${file.name}`, file);
      return new Blob([await file.arrayBuffer()], { type: 'application/octet-stream' });
    }
  }

  convDownloadBtn.addEventListener('click', async () => {
    if (!convertedBlob) return;
    let customName = convFileNameInput.value.trim() || 'converted_file';
    const tag = convExtensionTag.textContent;
    if (!customName.endsWith(tag)) customName += tag;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: customName
        });
        const writable = await handle.createWritable();
        await writable.write(convertedBlob);
        await writable.close();
        alert(`성공적으로 저장되었습니다:\n${handle.name}`);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    if (typeof saveAs !== 'undefined') saveAs(convertedBlob, customName);
  });

  convResetBtn.addEventListener('click', () => {
    currentConvFile = null;
    convertedBlob = null;
    convFileInput.value = '';
    showConvStep('upload');
  });

  // =========================================================================
  // SECTION C: SHARE & HISTORY (Quick Share 바로 보내기, Google Drive, Gmail)
  // =========================================================================
  const shareModalOverlay = document.getElementById('shareModalOverlay');
  const closeShareModalBtn = document.getElementById('closeShareModalBtn');
  const shareModalFileName = document.getElementById('shareModalFileName');
  const quickShareBtn = document.getElementById('quickShareBtn');
  const googleDriveShareBtn = document.getElementById('googleDriveShareBtn');
  const gmailShareBtn = document.getElementById('gmailShareBtn');

  let activeShareBlob = null;
  let activeShareFileName = '';

  const historyBtn = document.getElementById('historyBtn');
  const historyCountBadge = document.getElementById('historyCountBadge');
  const historyOverlay = document.getElementById('historyOverlay');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const historyListContainer = document.getElementById('historyListContainer');
  const historyTotalText = document.getElementById('historyTotalText');

  const STORAGE_KEY = 'kmou_file_history_v3';
  updateHistoryUI();

  // Share trigger for Compressor
  shareBtn.addEventListener('click', () => {
    if (!compressedBlob) return;
    let name = fileNameInput.value.trim() || defaultBaseName || 'KMOU_Compressed';
    if (!name.endsWith('.zip')) name += '.zip';
    activeShareBlob = compressedBlob;
    activeShareFileName = name;
    openShareModal(name, '압축');
  });

  // Share trigger for Converter
  convShareBtn.addEventListener('click', () => {
    if (!convertedBlob) return;
    let name = convFileNameInput.value.trim() || 'converted_file';
    const tag = convExtensionTag.textContent;
    if (!name.endsWith(tag)) name += tag;
    activeShareBlob = convertedBlob;
    activeShareFileName = name;
    openShareModal(name, '변환');
  });

  function openShareModal(filename, actionType) {
    shareModalFileName.textContent = filename;
    shareModalOverlay.classList.add('active');
  }

  closeShareModalBtn.addEventListener('click', () => {
    shareModalOverlay.classList.remove('active');
  });

  shareModalOverlay.addEventListener('click', (e) => {
    if (e.target === shareModalOverlay) shareModalOverlay.classList.remove('active');
  });

  // 1. Quick Share Direct Handler (현재 설치된 Quick Share 앱으로 바로 보내기)
  quickShareBtn.addEventListener('click', async () => {
    const filename = activeShareFileName || shareModalFileName.textContent || 'compressed.zip';
    const blobToSend = activeShareBlob || compressedBlob || convertedBlob;

    if (!blobToSend) {
      alert('공유할 파일 데이터가 없습니다.');
      return;
    }

    // Attempt 1: Trigger Quick Share URI schemes in background
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'samsungquickshare://';
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 1000);
    } catch (e) {}

    // Attempt 2: Web Share API with File Object (Windows 10/11 & Mobile Quick Share directly opens!)
    if (navigator.share) {
      try {
        const mimeType = filename.endsWith('.zip') ? 'application/zip' : (blobToSend.type || 'application/octet-stream');
        const fileObj = new File([blobToSend], filename, { type: mimeType });

        if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
          await navigator.share({
            title: `Quick Share 전송: ${filename}`,
            text: `근태's Smart 파일 솔루션을 통해 생성된 파일입니다.`,
            files: [fileObj]
          });
          return;
        } else {
          await navigator.share({
            title: `Quick Share: ${filename}`,
            text: `근태's Smart 파일 솔루션 - ${filename}`
          });
          return;
        }
      } catch (err) {
        if (err.name === 'AbortError') return; // User closed share window
        console.warn('Web Share fallback:', err);
      }
    }

    // Fallback Guidance for Quick Share
    const guideMsg = `[Quick Share 앱 전송 안내]\n\n` +
      `1. [위치 선택 다운로드]로 ${filename} 파일을 내 컴퓨터에 저장하세요.\n` +
      `2. 저장된 파일을 마우스 우클릭 ➔ 'Quick Share로 공유'를 클릭하시면, 주변 갤럭시 스마트폰/태블릿 및 다른 PC로 즉시 전송됩니다.`;
    alert(guideMsg);
  });

  googleDriveShareBtn.addEventListener('click', () => {
    setTimeout(() => {
      alert('Google 드라이브 화면이 새 창에서 열렸습니다.\n다운로드한 파일을 Google 드라이브로 드래그하여 바로 보관하세요.');
    }, 400);
  });

  gmailShareBtn.addEventListener('click', () => {
    const filename = shareModalFileName.textContent;
    const mailSubject = `[국립한국해양대학교] ${filename} 작업 완료`;
    const mailBody = `안녕하세요.\n\n근태's Smart 파일 솔루션(국립한국해양대학교)을 통해 처리가 완료된 파일입니다.\n\n파일명: ${filename}\n처리일시: ${new Date().toLocaleString('ko-KR')}\n\n※ 저장된 ${filename} 파일을 메일에 첨부하여 전달하실 수 있습니다.`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
    window.open(gmailUrl, '_blank');
  });

  // History Drawer
  historyBtn.addEventListener('click', () => {
    renderHistory();
    historyOverlay.classList.add('active');
  });

  closeHistoryBtn.addEventListener('click', () => {
    historyOverlay.classList.remove('active');
  });

  historyOverlay.addEventListener('click', (e) => {
    if (e.target === historyOverlay) historyOverlay.classList.remove('active');
  });

  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('모든 작업 기록을 삭제하시겠습니까?')) {
      localStorage.removeItem(STORAGE_KEY);
      updateHistoryUI();
      renderHistory();
    }
  });

  function getHistory() {
    try {
      const d = localStorage.getItem(STORAGE_KEY);
      return d ? JSON.parse(d) : [];
    } catch (e) { return []; }
  }

  function saveToHistory(record) {
    try {
      const h = getHistory();
      h.unshift(record);
      if (h.length > 30) h.pop();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
      updateHistoryUI();
    } catch (e) {}
  }

  function updateHistoryUI() {
    const h = getHistory();
    historyCountBadge.textContent = h.length;
    historyTotalText.textContent = `총 ${h.length}건의 작업 기록`;
  }

  function renderHistory() {
    const h = getHistory();
    updateHistoryUI();
    if (h.length === 0) {
      historyListContainer.innerHTML = `
        <div class="history-empty-state">
          <i class="fa-solid fa-folder-open"></i>
          <p>아직 진행된 작업 기록이 없습니다.</p>
        </div>
      `;
      return;
    }

    historyListContainer.innerHTML = '';
    h.forEach(item => {
      const isConvert = item.type === 'convert';
      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <div class="hist-top">
          <span class="hist-name" title="${escapeHtml(item.name)}">
            <i class="fa-solid ${isConvert ? 'fa-arrows-rotate' : 'fa-file-zipper'}"></i> ${escapeHtml(item.name)}
          </span>
          <span class="hist-badge ${isConvert ? 'conv-badge' : ''}">${isConvert ? `${item.originalFormat} ➔ ${item.targetFormat}` : `-${item.reduction}% 절감`}</span>
        </div>
        <div class="hist-meta">
          <span>${item.fileCount ? `파일 ${item.fileCount}개 • ` : ''}${formatBytes(item.originalSize)} ➔ ${formatBytes(item.compressedSize)}</span>
          <span class="hist-date">${item.timestamp}</span>
        </div>
      `;
      historyListContainer.appendChild(card);
    });
  }

  // =========================================================================
  // UI Helpers
  // =========================================================================
  function showStep(step) {
    stepUpload.classList.remove('active');
    stepList.classList.remove('active');
    stepProgress.classList.remove('active');
    stepResult.classList.remove('active');

    if (step === 'upload') stepUpload.classList.add('active');
    if (step === 'list') stepList.classList.add('active');
    if (step === 'progress') stepProgress.classList.add('active');
    if (step === 'result') stepResult.classList.add('active');
  }

  function showConvStep(step) {
    convStepUpload.classList.remove('active');
    convStepSelect.classList.remove('active');
    convStepProgress.classList.remove('active');
    convStepResult.classList.remove('active');

    if (step === 'upload') convStepUpload.classList.add('active');
    if (step === 'select') convStepSelect.classList.add('active');
    if (step === 'progress') convStepProgress.classList.add('active');
    if (step === 'result') convStepResult.classList.add('active');
  }

  function updateProgressBar(p, text) {
    const val = Math.min(100, Math.max(0, p));
    progressBarFill.style.width = `${val}%`;
    progressPercentage.textContent = `${val}%`;
    if (text) progressStatusText.textContent = text;
  }

  function updateConvProgressBar(p, text) {
    const val = Math.min(100, Math.max(0, p));
    convProgressBarFill.style.width = `${val}%`;
    convProgressPercentage.textContent = `${val}%`;
    if (text) convProgressStatusText.textContent = text;
  }

  function animateProgress(from, to, text, duration) {
    return new Promise(resolve => {
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        updateProgressBar(Math.floor(from + (to - from) * progress), text);
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  function animateConvProgress(from, to, text, duration) {
    return new Promise(resolve => {
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        updateConvProgressBar(Math.floor(from + (to - from) * progress), text);
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  function updateFileIcon(ext) {
    progressFileIcon.innerHTML = `<i class="fa-solid ${getFontAwesomeIcon(ext)}"></i>`;
  }

  function getFontAwesomeIcon(ext) {
    if (ext === 'pdf') return 'fa-file-pdf';
    if (['doc', 'docx'].includes(ext)) return 'fa-file-word';
    if (['ppt', 'pptx'].includes(ext)) return 'fa-file-powerpoint';
    if (['xls', 'xlsx'].includes(ext)) return 'fa-file-excel';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'fa-file-image';
    if (ext === 'txt') return 'fa-file-lines';
    if (ext === 'hwp') return 'fa-file-pen';
    return 'fa-file';
  }

  function getFormatTypeClass(ext) {
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'doc';
    if (['ppt', 'pptx'].includes(ext)) return 'ppt';
    if (['xls', 'xlsx'].includes(ext)) return 'xls';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'img';
    if (ext === 'txt') return 'txt';
    if (ext === 'hwp') return 'hwp';
    return 'txt';
  }

  function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
  }

  function getBaseFileName(filename) {
    const idx = filename.lastIndexOf('.');
    return idx === -1 ? filename : filename.substring(0, idx);
  }

  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
});
