// iresized.com - Multi-Tool Image Processing Suite
// Security-focused, client-side only

(function() {
    'use strict';

    // ===========================================
    // SHARED STATE
    // ===========================================
    let originalImage = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let aspectRatio = 1;
    let originalFileName = '';
    let originalFileSize = 0;
    let currentTool = 'resize';

    // Crop-specific state
    let cropSelection = { x: 0, y: 0, width: 0, height: 0 };
    let cropAspectRatio = null; // null = free
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let canvasScale = 1;

    // ===========================================
    // DOM ELEMENTS
    // ===========================================
    const elements = {
        // Tabs
        tabButtons: document.querySelectorAll('.tab-btn'),
        toolPanels: document.querySelectorAll('.tool-panel'),

        // Shared
        dropZone: document.getElementById('drop-zone'),
        fileInput: document.getElementById('file-input'),
        previewArea: document.getElementById('preview-area'),
        imagePreview: document.getElementById('image-preview'),
        removeBtn: document.getElementById('remove-btn'),
        originalDims: document.getElementById('original-dims'),
        fileName: document.getElementById('file-name'),

        // Resize
        widthInput: document.getElementById('width'),
        heightInput: document.getElementById('height'),
        lockBtn: document.getElementById('lock-btn'),
        qualitySlider: document.getElementById('quality-slider'),
        qualityVal: document.getElementById('quality-val'),
        formatSelect: document.getElementById('format-select'),
        resizeBtn: document.getElementById('resize-btn'),

        // Compress
        compressQualitySlider: document.getElementById('compress-quality-slider'),
        compressQualityVal: document.getElementById('compress-quality-val'),
        compressFormatSelect: document.getElementById('compress-format-select'),
        compressBtn: document.getElementById('compress-btn'),

        // Crop
        cropCanvasContainer: document.getElementById('crop-canvas-container'),
        cropCanvas: document.getElementById('crop-canvas'),
        cropRemoveBtn: document.getElementById('crop-remove-btn'),
        cropDims: document.getElementById('crop-dims'),
        cropFileName: document.getElementById('crop-file-name'),
        aspectButtons: document.querySelectorAll('.aspect-btn'),
        cropSelectionDims: document.getElementById('crop-selection-dims'),
        cropFormatSelect: document.getElementById('crop-format-select'),
        cropBtn: document.getElementById('crop-btn'),

        // Metadata
        metadataFormatSelect: document.getElementById('metadata-format-select'),
        metadataBtn: document.getElementById('metadata-btn')
    };

    // ===========================================
    // SECURITY UTILITIES
    // ===========================================

    /**
     * Validate positive integer within bounds
     * Security: Prevents NaN, Infinity, negative, and overflow attacks
     */
    function validatePositiveInt(value, min = 1, max = 10000) {
        const num = parseInt(value, 10);
        if (!Number.isFinite(num) || num < min || num > max) {
            return null;
        }
        return num;
    }

    /**
     * Sanitize filename - prevents path traversal and injection
     * Security: Blocks ../, ..\, <, >, etc.
     */
    function sanitizeFilename(name) {
        if (typeof name !== 'string') return 'image';

        return name
            // Remove path traversal attempts
            .replace(/\.\./g, '')
            .replace(/[/\\]/g, '')
            // Remove dangerous characters
            .replace(/[<>:"|?*\x00-\x1f]/g, '-')
            // Normalize spaces and dashes
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            // Remove leading dots (hidden files)
            .replace(/^\.+/, '')
            // Limit length
            .substring(0, 200)
            .trim() || 'image';
    }

    /**
     * Format file size for display
     * Security: Uses textContent, safe from XSS
     */
    function formatFileSize(bytes) {
        if (typeof bytes !== 'number' || bytes < 0) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    /**
     * Download blob with sanitized filename
     */
    function downloadBlob(blob, filename) {
        if (!blob) {
            alert('Error processing image. Please try again.');
            return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sanitizeFilename(filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up memory
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /**
     * Clean up canvas memory
     * Security: Prevents memory exhaustion attacks
     */
    function cleanupCanvas(canvas) {
        if (canvas) {
            canvas.width = 0;
            canvas.height = 0;
        }
    }

    /**
     * Safe tool execution wrapper
     * Security: Isolates errors per tool
     */
    function safeExecute(fn, toolName) {
        try {
            fn();
        } catch (err) {
            console.error(`${toolName} error:`, err);
            alert(`${toolName} encountered an error. Please try again.`);
        }
    }

    // ===========================================
    // TAB NAVIGATION
    // ===========================================

    function initTabs() {
        elements.tabButtons.forEach(tab => {
            tab.addEventListener('click', () => {
                const tool = tab.dataset.tool;
                switchTool(tool);
            });
        });
    }

    function switchTool(tool) {
        currentTool = tool;

        // Update tab states
        elements.tabButtons.forEach(t => {
            const isActive = t.dataset.tool === tool;
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        // Update panel visibility
        elements.toolPanels.forEach(p => {
            p.classList.toggle('active', p.id === `${tool}-panel`);
        });

        // Handle crop canvas visibility
        if (tool === 'crop' && originalImage) {
            elements.previewArea.classList.add('hidden');
            elements.cropCanvasContainer.classList.remove('hidden');
            initCropCanvas();
        } else if (originalImage) {
            elements.cropCanvasContainer.classList.add('hidden');
            elements.previewArea.classList.remove('hidden');
        }
    }

    // ===========================================
    // SHARED UPLOAD FUNCTIONALITY
    // ===========================================

    function initUpload() {
        const { dropZone, fileInput, removeBtn, cropRemoveBtn } = elements;

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileSelect);

        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetState();
        });

        cropRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetState();
        });
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    function handleFile(file) {
        // Security: Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        // Security: Check file size (max 100MB)
        if (file.size > 100 * 1024 * 1024) {
            alert('File too large. Maximum size is 100MB.');
            return;
        }

        originalFileName = file.name.replace(/\.[^/.]+$/, '');
        originalFileSize = file.size;

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                originalImage = img;
                originalWidth = img.naturalWidth;
                originalHeight = img.naturalHeight;
                aspectRatio = originalWidth / originalHeight;

                showPreview(e.target.result, file);
            };
            img.onerror = function() {
                alert('Error loading image. The file may be corrupted.');
            };
            img.src = e.target.result;
        };
        reader.onerror = function() {
            alert('Error reading file. Please try again.');
        };
        reader.readAsDataURL(file);
    }

    function showPreview(dataUrl, file) {
        const { imagePreview, originalDims, fileName, dropZone, previewArea,
                cropCanvasContainer, cropDims, cropFileName, widthInput, heightInput } = elements;

        // Update standard preview
        imagePreview.src = dataUrl;
        originalDims.textContent = `${originalWidth} × ${originalHeight}px`;
        fileName.textContent = formatFileSize(file.size) + ' | ' + file.name;

        // Update crop preview info
        cropDims.textContent = `${originalWidth} × ${originalHeight}px`;
        cropFileName.textContent = formatFileSize(file.size) + ' | ' + file.name;

        // Set resize dimension inputs
        widthInput.value = originalWidth;
        heightInput.value = originalHeight;

        // Show appropriate preview based on current tool
        dropZone.classList.add('hidden');

        if (currentTool === 'crop') {
            previewArea.classList.add('hidden');
            cropCanvasContainer.classList.remove('hidden');
            initCropCanvas();
        } else {
            cropCanvasContainer.classList.add('hidden');
            previewArea.classList.remove('hidden');
        }
    }

    function resetState() {
        originalImage = null;
        originalWidth = 0;
        originalHeight = 0;
        aspectRatio = 1;
        originalFileName = '';
        originalFileSize = 0;

        // Reset crop state
        cropSelection = { x: 0, y: 0, width: 0, height: 0 };

        // Reset inputs
        elements.widthInput.value = '';
        elements.heightInput.value = '';
        elements.fileInput.value = '';
        elements.cropSelectionDims.textContent = 'Select area on image';

        // Reset UI
        elements.previewArea.classList.add('hidden');
        elements.cropCanvasContainer.classList.add('hidden');
        elements.dropZone.classList.remove('hidden');

        // Clean up canvas memory
        cleanupCanvas(elements.cropCanvas);
    }

    // ===========================================
    // RESIZE TOOL
    // ===========================================

    let isAspectLocked = true;

    function initResizeTool() {
        const { widthInput, heightInput, lockBtn, qualitySlider, qualityVal,
                formatSelect, resizeBtn } = elements;

        widthInput.addEventListener('input', handleWidthChange);
        heightInput.addEventListener('input', handleHeightChange);
        lockBtn.addEventListener('click', toggleAspectLock);
        qualitySlider.addEventListener('input', () => {
            qualityVal.textContent = qualitySlider.value + '%';
        });
        formatSelect.addEventListener('change', () => updateQualityVisibility(formatSelect, qualitySlider));
        resizeBtn.addEventListener('click', () => safeExecute(processResize, 'Resize'));

        updateQualityVisibility(formatSelect, qualitySlider);
    }

    function handleWidthChange() {
        const newWidth = validatePositiveInt(elements.widthInput.value, 1, 20000);
        if (isAspectLocked && newWidth && aspectRatio) {
            const newHeight = Math.round(newWidth / aspectRatio);
            elements.heightInput.value = newHeight;
        }
    }

    function handleHeightChange() {
        const newHeight = validatePositiveInt(elements.heightInput.value, 1, 20000);
        if (isAspectLocked && newHeight && aspectRatio) {
            const newWidth = Math.round(newHeight * aspectRatio);
            elements.widthInput.value = newWidth;
        }
    }

    function toggleAspectLock() {
        isAspectLocked = !isAspectLocked;
        elements.lockBtn.classList.toggle('active', isAspectLocked);
        elements.lockBtn.title = isAspectLocked ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio';
    }

    function updateQualityVisibility(formatSelect, qualitySlider) {
        const format = formatSelect.value;
        const qualityGroup = qualitySlider.closest('.control-group');

        if (format === 'png') {
            qualityGroup.style.opacity = '0.5';
            qualityGroup.style.pointerEvents = 'none';
        } else {
            qualityGroup.style.opacity = '1';
            qualityGroup.style.pointerEvents = 'auto';
        }
    }

    function processResize() {
        if (!originalImage) {
            alert('Please upload an image first.');
            return;
        }

        const targetWidth = validatePositiveInt(elements.widthInput.value, 1, 20000) || originalWidth;
        const targetHeight = validatePositiveInt(elements.heightInput.value, 1, 20000) || originalHeight;

        if (!targetWidth || !targetHeight) {
            alert('Please enter valid dimensions (1-20000 pixels).');
            return;
        }

        if (targetWidth > 10000 || targetHeight > 10000) {
            if (!confirm('Large dimensions may cause performance issues. Continue?')) {
                return;
            }
        }

        const format = elements.formatSelect.value;
        const quality = parseInt(elements.qualitySlider.value, 10) / 100;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(originalImage, 0, 0, targetWidth, targetHeight);

        const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;

        canvas.toBlob(function(blob) {
            downloadBlob(blob, `${originalFileName}_resized.${format}`);
            cleanupCanvas(canvas);
        }, mimeType, format === 'png' ? undefined : quality);
    }

    // ===========================================
    // COMPRESS TOOL
    // ===========================================

    function initCompressTool() {
        const { compressQualitySlider, compressQualityVal, compressFormatSelect, compressBtn } = elements;

        compressQualitySlider.addEventListener('input', () => {
            compressQualityVal.textContent = compressQualitySlider.value + '%';
        });
        compressFormatSelect.addEventListener('change', () => {
            updateQualityVisibility(compressFormatSelect, compressQualitySlider);
        });
        compressBtn.addEventListener('click', () => safeExecute(processCompress, 'Compress'));

        updateQualityVisibility(compressFormatSelect, compressQualitySlider);
    }

    function processCompress() {
        if (!originalImage) {
            alert('Please upload an image first.');
            return;
        }

        const format = elements.compressFormatSelect.value;
        const quality = parseInt(elements.compressQualitySlider.value, 10) / 100;

        const canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0);

        const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;

        canvas.toBlob(function(blob) {
            downloadBlob(blob, `${originalFileName}_compressed.${format}`);
            cleanupCanvas(canvas);
        }, mimeType, format === 'png' ? undefined : quality);
    }

    // ===========================================
    // STRIP EXIF/METADATA TOOL
    // ===========================================

    function initMetadataTool() {
        elements.metadataBtn.addEventListener('click', () => safeExecute(processStripMetadata, 'Strip Metadata'));
    }

    function processStripMetadata() {
        if (!originalImage) {
            alert('Please upload an image first.');
            return;
        }

        const format = elements.metadataFormatSelect.value;

        // Canvas naturally strips all EXIF/metadata when re-encoding
        const canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0);

        const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;
        // Use high quality since we're not trying to compress
        const quality = 0.95;

        canvas.toBlob(function(blob) {
            downloadBlob(blob, `${originalFileName}_clean.${format}`);
            cleanupCanvas(canvas);
        }, mimeType, format === 'png' ? undefined : quality);
    }

    // ===========================================
    // CROP TOOL
    // ===========================================

    function initCropTool() {
        const { cropCanvas, aspectButtons, cropBtn } = elements;

        // Aspect ratio buttons
        aspectButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                aspectButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const ratio = btn.dataset.ratio;
                if (ratio === 'free') {
                    cropAspectRatio = null;
                } else {
                    const [w, h] = ratio.split(':').map(Number);
                    cropAspectRatio = w / h;
                }

                // Reset selection with new aspect ratio
                if (originalImage) {
                    resetCropSelection();
                    renderCropCanvas();
                }
            });
        });

        // Canvas interaction
        cropCanvas.addEventListener('pointerdown', handleCropPointerDown);
        cropCanvas.addEventListener('pointermove', handleCropPointerMove);
        cropCanvas.addEventListener('pointerup', handleCropPointerUp);
        cropCanvas.addEventListener('pointerleave', handleCropPointerUp);

        cropBtn.addEventListener('click', () => safeExecute(processCrop, 'Crop'));
    }

    function initCropCanvas() {
        if (!originalImage) return;

        const canvas = elements.cropCanvas;
        const container = elements.cropCanvasContainer;

        // Calculate display size (max 500px width)
        const maxWidth = Math.min(500, container.clientWidth - 40);
        canvasScale = maxWidth / originalWidth;

        if (canvasScale > 1) canvasScale = 1;

        canvas.width = Math.round(originalWidth * canvasScale);
        canvas.height = Math.round(originalHeight * canvasScale);

        resetCropSelection();
        renderCropCanvas();
    }

    function resetCropSelection() {
        // Default selection: centered, 80% of image (or constrained by aspect ratio)
        let selWidth = originalWidth * 0.8;
        let selHeight = originalHeight * 0.8;

        if (cropAspectRatio) {
            // Constrain to aspect ratio
            if (selWidth / selHeight > cropAspectRatio) {
                selWidth = selHeight * cropAspectRatio;
            } else {
                selHeight = selWidth / cropAspectRatio;
            }
        }

        cropSelection = {
            x: (originalWidth - selWidth) / 2,
            y: (originalHeight - selHeight) / 2,
            width: selWidth,
            height: selHeight
        };

        updateCropSelectionDisplay();
    }

    function renderCropCanvas() {
        const canvas = elements.cropCanvas;
        const ctx = canvas.getContext('2d');

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw image
        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

        // Draw dark overlay outside selection
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

        const sel = {
            x: cropSelection.x * canvasScale,
            y: cropSelection.y * canvasScale,
            width: cropSelection.width * canvasScale,
            height: cropSelection.height * canvasScale
        };

        // Top
        ctx.fillRect(0, 0, canvas.width, sel.y);
        // Bottom
        ctx.fillRect(0, sel.y + sel.height, canvas.width, canvas.height - sel.y - sel.height);
        // Left
        ctx.fillRect(0, sel.y, sel.x, sel.height);
        // Right
        ctx.fillRect(sel.x + sel.width, sel.y, canvas.width - sel.x - sel.width, sel.height);

        // Draw selection border
        ctx.strokeStyle = '#D4A84B';
        ctx.lineWidth = 2;
        ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);

        // Draw corner handles
        ctx.fillStyle = '#D4A84B';
        const handleSize = 8;
        const corners = [
            [sel.x, sel.y],
            [sel.x + sel.width, sel.y],
            [sel.x, sel.y + sel.height],
            [sel.x + sel.width, sel.y + sel.height]
        ];

        corners.forEach(([cx, cy]) => {
            ctx.fillRect(cx - handleSize/2, cy - handleSize/2, handleSize, handleSize);
        });

        // Draw rule of thirds grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;

        for (let i = 1; i < 3; i++) {
            // Vertical lines
            const vx = sel.x + (sel.width * i / 3);
            ctx.beginPath();
            ctx.moveTo(vx, sel.y);
            ctx.lineTo(vx, sel.y + sel.height);
            ctx.stroke();

            // Horizontal lines
            const hy = sel.y + (sel.height * i / 3);
            ctx.beginPath();
            ctx.moveTo(sel.x, hy);
            ctx.lineTo(sel.x + sel.width, hy);
            ctx.stroke();
        }
    }

    function handleCropPointerDown(e) {
        const rect = elements.cropCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / canvasScale;
        const y = (e.clientY - rect.top) / canvasScale;

        isDragging = true;
        dragStart = { x, y };

        elements.cropCanvas.setPointerCapture(e.pointerId);
    }

    function handleCropPointerMove(e) {
        if (!isDragging) return;

        const rect = elements.cropCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / canvasScale;
        const y = (e.clientY - rect.top) / canvasScale;

        // Calculate new selection from drag
        let newX = Math.min(dragStart.x, x);
        let newY = Math.min(dragStart.y, y);
        let newWidth = Math.abs(x - dragStart.x);
        let newHeight = Math.abs(y - dragStart.y);

        // Constrain to aspect ratio if set
        if (cropAspectRatio) {
            if (newWidth / newHeight > cropAspectRatio) {
                newWidth = newHeight * cropAspectRatio;
            } else {
                newHeight = newWidth / cropAspectRatio;
            }
        }

        // Clamp to image bounds
        newX = Math.max(0, Math.min(newX, originalWidth - newWidth));
        newY = Math.max(0, Math.min(newY, originalHeight - newHeight));
        newWidth = Math.max(10, Math.min(newWidth, originalWidth - newX));
        newHeight = Math.max(10, Math.min(newHeight, originalHeight - newY));

        cropSelection = { x: newX, y: newY, width: newWidth, height: newHeight };

        updateCropSelectionDisplay();
        renderCropCanvas();
    }

    function handleCropPointerUp(e) {
        if (isDragging) {
            isDragging = false;
            elements.cropCanvas.releasePointerCapture(e.pointerId);
        }
    }

    function updateCropSelectionDisplay() {
        const w = Math.round(cropSelection.width);
        const h = Math.round(cropSelection.height);
        elements.cropSelectionDims.textContent = `${w} × ${h}px`;
    }

    function processCrop() {
        if (!originalImage) {
            alert('Please upload an image first.');
            return;
        }

        // Validate crop region
        const x = Math.max(0, Math.round(cropSelection.x));
        const y = Math.max(0, Math.round(cropSelection.y));
        const width = Math.max(1, Math.min(Math.round(cropSelection.width), originalWidth - x));
        const height = Math.max(1, Math.min(Math.round(cropSelection.height), originalHeight - y));

        if (width < 1 || height < 1) {
            alert('Please select a valid crop area.');
            return;
        }

        const format = elements.cropFormatSelect.value;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(originalImage, x, y, width, height, 0, 0, width, height);

        const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;

        canvas.toBlob(function(blob) {
            downloadBlob(blob, `${originalFileName}_cropped.${format}`);
            cleanupCanvas(canvas);
        }, mimeType, format === 'png' ? undefined : 0.92);
    }

    // ===========================================
    // INITIALIZATION
    // ===========================================

    function init() {
        initTabs();
        initUpload();
        initResizeTool();
        initCompressTool();
        initMetadataTool();
        initCropTool();
    }

    // Start the app
    init();
})();
