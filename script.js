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
        resizeFilename: document.getElementById('resize-filename'),
        resizeFilenameExt: document.getElementById('resize-filename-ext'),
        resizeBtn: document.getElementById('resize-btn'),

        // Compress
        compressQualitySlider: document.getElementById('compress-quality-slider'),
        compressQualityVal: document.getElementById('compress-quality-val'),
        compressFormatSelect: document.getElementById('compress-format-select'),
        compressFilename: document.getElementById('compress-filename'),
        compressFilenameExt: document.getElementById('compress-filename-ext'),
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
        cropFilename: document.getElementById('crop-filename'),
        cropFilenameExt: document.getElementById('crop-filename-ext'),
        cropBtn: document.getElementById('crop-btn'),

        // Metadata
        metadataFormatSelect: document.getElementById('metadata-format-select'),
        metadataFilename: document.getElementById('metadata-filename'),
        metadataFilenameExt: document.getElementById('metadata-filename-ext'),
        metadataBtn: document.getElementById('metadata-btn'),

        // HEIC Converter
        heicDropZone: document.getElementById('heic-drop-zone'),
        heicFileInput: document.getElementById('heic-file-input'),
        heicFileListContainer: document.getElementById('heic-file-list-container'),
        heicFileList: document.getElementById('heic-file-list'),
        heicClearBtn: document.getElementById('heic-clear-btn'),
        heicFormatSelect: document.getElementById('heic-format-select'),
        heicQualitySlider: document.getElementById('heic-quality-slider'),
        heicQualityVal: document.getElementById('heic-quality-val'),
        heicConvertBtn: document.getElementById('heic-convert-btn'),

        // Bulk Rename
        bulkDropZone: document.getElementById('bulk-drop-zone'),
        bulkFileInput: document.getElementById('bulk-file-input'),
        bulkFileListContainer: document.getElementById('bulk-file-list-container'),
        bulkFileList: document.getElementById('bulk-file-list'),
        bulkFileCount: document.getElementById('bulk-file-count'),
        bulkClearBtn: document.getElementById('bulk-clear-btn'),
        bulkPattern: document.getElementById('bulk-pattern'),
        bulkStartNum: document.getElementById('bulk-start-num'),
        bulkZipFilename: document.getElementById('bulk-zip-filename'),
        bulkRenameBtn: document.getElementById('bulk-rename-btn')
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
    // FILENAME HELPERS
    // ===========================================

    /**
     * Update all filename inputs with default values based on tool
     */
    function updateFilenameDefaults() {
        const baseName = originalFileName || 'image';

        elements.resizeFilename.value = `${baseName}_resized`;
        elements.compressFilename.value = `${baseName}_compressed`;
        elements.cropFilename.value = `${baseName}_cropped`;
        elements.metadataFilename.value = `${baseName}_clean`;
    }

    /**
     * Update extension display for a given format select and extension element
     */
    function updateExtensionDisplay(formatSelect, extElement) {
        const format = formatSelect.value;
        extElement.textContent = `.${format}`;
    }

    /**
     * Get filename for download - uses custom name or falls back to default
     */
    function getDownloadFilename(filenameInput, defaultSuffix, format) {
        const customName = filenameInput.value.trim();
        const baseName = customName || `${originalFileName || 'image'}${defaultSuffix}`;
        return `${sanitizeFilename(baseName)}.${format}`;
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

        // Set default filenames for all tools
        updateFilenameDefaults();

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
                formatSelect, resizeFilenameExt, resizeBtn } = elements;

        widthInput.addEventListener('input', handleWidthChange);
        heightInput.addEventListener('input', handleHeightChange);
        lockBtn.addEventListener('click', toggleAspectLock);
        qualitySlider.addEventListener('input', () => {
            qualityVal.textContent = qualitySlider.value + '%';
        });
        formatSelect.addEventListener('change', () => {
            updateQualityVisibility(formatSelect, qualitySlider);
            updateExtensionDisplay(formatSelect, resizeFilenameExt);
        });
        resizeBtn.addEventListener('click', () => safeExecute(processResize, 'Resize'));

        updateQualityVisibility(formatSelect, qualitySlider);
        updateExtensionDisplay(formatSelect, resizeFilenameExt);
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
        const filename = getDownloadFilename(elements.resizeFilename, '_resized', format);

        canvas.toBlob(function(blob) {
            downloadBlob(blob, filename);
            cleanupCanvas(canvas);
        }, mimeType, format === 'png' ? undefined : quality);
    }

    // ===========================================
    // COMPRESS TOOL
    // ===========================================

    function initCompressTool() {
        const { compressQualitySlider, compressQualityVal, compressFormatSelect,
                compressFilenameExt, compressBtn } = elements;

        compressQualitySlider.addEventListener('input', () => {
            compressQualityVal.textContent = compressQualitySlider.value + '%';
        });
        compressFormatSelect.addEventListener('change', () => {
            updateQualityVisibility(compressFormatSelect, compressQualitySlider);
            updateExtensionDisplay(compressFormatSelect, compressFilenameExt);
        });
        compressBtn.addEventListener('click', () => safeExecute(processCompress, 'Compress'));

        updateQualityVisibility(compressFormatSelect, compressQualitySlider);
        updateExtensionDisplay(compressFormatSelect, compressFilenameExt);
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
        const filename = getDownloadFilename(elements.compressFilename, '_compressed', format);

        canvas.toBlob(function(blob) {
            downloadBlob(blob, filename);
            cleanupCanvas(canvas);
        }, mimeType, format === 'png' ? undefined : quality);
    }

    // ===========================================
    // STRIP EXIF/METADATA TOOL
    // ===========================================

    function initMetadataTool() {
        const { metadataFormatSelect, metadataFilenameExt, metadataBtn } = elements;

        metadataFormatSelect.addEventListener('change', () => {
            updateExtensionDisplay(metadataFormatSelect, metadataFilenameExt);
        });
        metadataBtn.addEventListener('click', () => safeExecute(processStripMetadata, 'Strip Metadata'));

        updateExtensionDisplay(metadataFormatSelect, metadataFilenameExt);
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
        const filename = getDownloadFilename(elements.metadataFilename, '_clean', format);

        canvas.toBlob(function(blob) {
            downloadBlob(blob, filename);
            cleanupCanvas(canvas);
        }, mimeType, format === 'png' ? undefined : quality);
    }

    // ===========================================
    // CROP TOOL (Enhanced with move/resize handles)
    // ===========================================

    // Drag modes
    const DRAG_MODE = {
        NONE: 'none',
        MOVE: 'move',
        RESIZE_NW: 'nw',
        RESIZE_NE: 'ne',
        RESIZE_SW: 'sw',
        RESIZE_SE: 'se',
        RESIZE_N: 'n',
        RESIZE_S: 's',
        RESIZE_E: 'e',
        RESIZE_W: 'w',
        NEW: 'new'
    };

    let dragMode = DRAG_MODE.NONE;
    let dragOffset = { x: 0, y: 0 };
    let originalSelection = null;
    const HANDLE_SIZE = 10; // Size of corner/edge handles in canvas pixels

    function initCropTool() {
        const { cropCanvas, aspectButtons, cropFormatSelect, cropFilenameExt, cropBtn } = elements;

        // Format change listener
        cropFormatSelect.addEventListener('change', () => {
            updateExtensionDisplay(cropFormatSelect, cropFilenameExt);
        });
        updateExtensionDisplay(cropFormatSelect, cropFilenameExt);

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

                // Adjust current selection to new aspect ratio (don't reset)
                if (originalImage && cropSelection.width > 0) {
                    adjustSelectionToAspectRatio();
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

    function adjustSelectionToAspectRatio() {
        if (!cropAspectRatio) return;

        // Keep center, adjust dimensions
        const centerX = cropSelection.x + cropSelection.width / 2;
        const centerY = cropSelection.y + cropSelection.height / 2;

        let newWidth = cropSelection.width;
        let newHeight = cropSelection.height;

        if (newWidth / newHeight > cropAspectRatio) {
            newWidth = newHeight * cropAspectRatio;
        } else {
            newHeight = newWidth / cropAspectRatio;
        }

        cropSelection.width = newWidth;
        cropSelection.height = newHeight;
        cropSelection.x = centerX - newWidth / 2;
        cropSelection.y = centerY - newHeight / 2;

        clampSelectionToBounds();
        updateCropSelectionDisplay();
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

        // Only reset selection if none exists
        if (cropSelection.width === 0 || cropSelection.height === 0) {
            resetCropSelection();
        }
        renderCropCanvas();
    }

    function resetCropSelection() {
        // Default selection: centered, 80% of image (or constrained by aspect ratio)
        let selWidth = originalWidth * 0.8;
        let selHeight = originalHeight * 0.8;

        if (cropAspectRatio) {
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

    function clampSelectionToBounds() {
        // Ensure selection stays within image bounds
        cropSelection.width = Math.max(20, Math.min(cropSelection.width, originalWidth));
        cropSelection.height = Math.max(20, Math.min(cropSelection.height, originalHeight));
        cropSelection.x = Math.max(0, Math.min(cropSelection.x, originalWidth - cropSelection.width));
        cropSelection.y = Math.max(0, Math.min(cropSelection.y, originalHeight - cropSelection.height));
    }

    function getHandleAtPoint(x, y) {
        // Convert to canvas coordinates for handle detection
        const sel = cropSelection;
        const handleRadius = HANDLE_SIZE / canvasScale / 2;

        // Corner handles (check first - they take priority)
        const corners = [
            { mode: DRAG_MODE.RESIZE_NW, x: sel.x, y: sel.y },
            { mode: DRAG_MODE.RESIZE_NE, x: sel.x + sel.width, y: sel.y },
            { mode: DRAG_MODE.RESIZE_SW, x: sel.x, y: sel.y + sel.height },
            { mode: DRAG_MODE.RESIZE_SE, x: sel.x + sel.width, y: sel.y + sel.height }
        ];

        for (const corner of corners) {
            if (Math.abs(x - corner.x) < handleRadius * 2 && Math.abs(y - corner.y) < handleRadius * 2) {
                return corner.mode;
            }
        }

        // Edge handles (midpoints)
        const edges = [
            { mode: DRAG_MODE.RESIZE_N, x: sel.x + sel.width / 2, y: sel.y },
            { mode: DRAG_MODE.RESIZE_S, x: sel.x + sel.width / 2, y: sel.y + sel.height },
            { mode: DRAG_MODE.RESIZE_W, x: sel.x, y: sel.y + sel.height / 2 },
            { mode: DRAG_MODE.RESIZE_E, x: sel.x + sel.width, y: sel.y + sel.height / 2 }
        ];

        for (const edge of edges) {
            if (Math.abs(x - edge.x) < handleRadius * 2 && Math.abs(y - edge.y) < handleRadius * 2) {
                return edge.mode;
            }
        }

        // Inside selection = move
        if (x >= sel.x && x <= sel.x + sel.width && y >= sel.y && y <= sel.y + sel.height) {
            return DRAG_MODE.MOVE;
        }

        // Outside = new selection
        return DRAG_MODE.NEW;
    }

    function getCursorForMode(mode) {
        switch (mode) {
            case DRAG_MODE.MOVE: return 'move';
            case DRAG_MODE.RESIZE_NW:
            case DRAG_MODE.RESIZE_SE: return 'nwse-resize';
            case DRAG_MODE.RESIZE_NE:
            case DRAG_MODE.RESIZE_SW: return 'nesw-resize';
            case DRAG_MODE.RESIZE_N:
            case DRAG_MODE.RESIZE_S: return 'ns-resize';
            case DRAG_MODE.RESIZE_E:
            case DRAG_MODE.RESIZE_W: return 'ew-resize';
            default: return 'crosshair';
        }
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
        const hs = HANDLE_SIZE;
        const corners = [
            [sel.x, sel.y],
            [sel.x + sel.width, sel.y],
            [sel.x, sel.y + sel.height],
            [sel.x + sel.width, sel.y + sel.height]
        ];

        corners.forEach(([cx, cy]) => {
            ctx.fillRect(cx - hs/2, cy - hs/2, hs, hs);
        });

        // Draw edge handles (midpoints)
        const edges = [
            [sel.x + sel.width / 2, sel.y],
            [sel.x + sel.width / 2, sel.y + sel.height],
            [sel.x, sel.y + sel.height / 2],
            [sel.x + sel.width, sel.y + sel.height / 2]
        ];

        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#D4A84B';
        ctx.lineWidth = 1;
        edges.forEach(([ex, ey]) => {
            ctx.beginPath();
            ctx.arc(ex, ey, hs/2 - 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // Draw rule of thirds grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;

        for (let i = 1; i < 3; i++) {
            const vx = sel.x + (sel.width * i / 3);
            ctx.beginPath();
            ctx.moveTo(vx, sel.y);
            ctx.lineTo(vx, sel.y + sel.height);
            ctx.stroke();

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

        dragMode = getHandleAtPoint(x, y);
        isDragging = true;
        dragStart = { x, y };
        dragOffset = { x: x - cropSelection.x, y: y - cropSelection.y };
        originalSelection = { ...cropSelection };

        elements.cropCanvas.setPointerCapture(e.pointerId);
        elements.cropCanvas.style.cursor = getCursorForMode(dragMode);
    }

    function handleCropPointerMove(e) {
        const rect = elements.cropCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / canvasScale;
        const y = (e.clientY - rect.top) / canvasScale;

        // Update cursor based on what's under the pointer
        if (!isDragging) {
            const mode = getHandleAtPoint(x, y);
            elements.cropCanvas.style.cursor = getCursorForMode(mode);
            return;
        }

        const dx = x - dragStart.x;
        const dy = y - dragStart.y;

        switch (dragMode) {
            case DRAG_MODE.MOVE:
                cropSelection.x = x - dragOffset.x;
                cropSelection.y = y - dragOffset.y;
                break;

            case DRAG_MODE.RESIZE_SE:
                resizeFromCorner(dx, dy, false, false);
                break;
            case DRAG_MODE.RESIZE_SW:
                resizeFromCorner(dx, dy, true, false);
                break;
            case DRAG_MODE.RESIZE_NE:
                resizeFromCorner(dx, dy, false, true);
                break;
            case DRAG_MODE.RESIZE_NW:
                resizeFromCorner(dx, dy, true, true);
                break;

            case DRAG_MODE.RESIZE_E:
                resizeFromEdge(dx, 0, 'e');
                break;
            case DRAG_MODE.RESIZE_W:
                resizeFromEdge(dx, 0, 'w');
                break;
            case DRAG_MODE.RESIZE_S:
                resizeFromEdge(0, dy, 's');
                break;
            case DRAG_MODE.RESIZE_N:
                resizeFromEdge(0, dy, 'n');
                break;

            case DRAG_MODE.NEW:
                // Create new selection from drag
                let newX = Math.min(dragStart.x, x);
                let newY = Math.min(dragStart.y, y);
                let newWidth = Math.abs(x - dragStart.x);
                let newHeight = Math.abs(y - dragStart.y);

                if (cropAspectRatio && newWidth > 10 && newHeight > 10) {
                    if (newWidth / newHeight > cropAspectRatio) {
                        newWidth = newHeight * cropAspectRatio;
                    } else {
                        newHeight = newWidth / cropAspectRatio;
                    }
                }

                cropSelection = { x: newX, y: newY, width: newWidth, height: newHeight };
                break;
        }

        clampSelectionToBounds();
        updateCropSelectionDisplay();
        renderCropCanvas();
    }

    function resizeFromCorner(dx, dy, fromLeft, fromTop) {
        let newWidth = originalSelection.width + (fromLeft ? -dx : dx);
        let newHeight = originalSelection.height + (fromTop ? -dy : dy);

        // Maintain aspect ratio if set
        if (cropAspectRatio) {
            if (Math.abs(dx) > Math.abs(dy)) {
                newHeight = newWidth / cropAspectRatio;
            } else {
                newWidth = newHeight * cropAspectRatio;
            }
        }

        // Minimum size
        newWidth = Math.max(20, newWidth);
        newHeight = Math.max(20, newHeight);

        // Update position if resizing from left or top
        if (fromLeft) {
            cropSelection.x = originalSelection.x + originalSelection.width - newWidth;
        }
        if (fromTop) {
            cropSelection.y = originalSelection.y + originalSelection.height - newHeight;
        }

        cropSelection.width = newWidth;
        cropSelection.height = newHeight;
    }

    function resizeFromEdge(dx, dy, edge) {
        switch (edge) {
            case 'e':
                cropSelection.width = Math.max(20, originalSelection.width + dx);
                if (cropAspectRatio) {
                    cropSelection.height = cropSelection.width / cropAspectRatio;
                }
                break;
            case 'w':
                const newWidthW = Math.max(20, originalSelection.width - dx);
                cropSelection.x = originalSelection.x + originalSelection.width - newWidthW;
                cropSelection.width = newWidthW;
                if (cropAspectRatio) {
                    cropSelection.height = cropSelection.width / cropAspectRatio;
                }
                break;
            case 's':
                cropSelection.height = Math.max(20, originalSelection.height + dy);
                if (cropAspectRatio) {
                    cropSelection.width = cropSelection.height * cropAspectRatio;
                }
                break;
            case 'n':
                const newHeightN = Math.max(20, originalSelection.height - dy);
                cropSelection.y = originalSelection.y + originalSelection.height - newHeightN;
                cropSelection.height = newHeightN;
                if (cropAspectRatio) {
                    cropSelection.width = cropSelection.height * cropAspectRatio;
                }
                break;
        }
    }

    function handleCropPointerUp(e) {
        if (isDragging) {
            isDragging = false;
            dragMode = DRAG_MODE.NONE;
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
        const filename = getDownloadFilename(elements.cropFilename, '_cropped', format);

        canvas.toBlob(function(blob) {
            downloadBlob(blob, filename);
            cleanupCanvas(canvas);
        }, mimeType, format === 'png' ? undefined : 0.92);
    }

    // ===========================================
    // HEIC CONVERTER TOOL
    // ===========================================

    let heicFiles = [];

    function initHeicTool() {
        const { heicDropZone, heicFileInput, heicClearBtn, heicQualitySlider,
                heicQualityVal, heicConvertBtn } = elements;

        heicDropZone.addEventListener('click', () => heicFileInput.click());
        heicDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            heicDropZone.classList.add('drag-over');
        });
        heicDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            heicDropZone.classList.remove('drag-over');
        });
        heicDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            heicDropZone.classList.remove('drag-over');
            handleHeicFiles(e.dataTransfer.files);
        });
        heicFileInput.addEventListener('change', (e) => {
            handleHeicFiles(e.target.files);
        });

        heicClearBtn.addEventListener('click', clearHeicFiles);
        heicQualitySlider.addEventListener('input', () => {
            heicQualityVal.textContent = heicQualitySlider.value + '%';
        });
        heicConvertBtn.addEventListener('click', () => safeExecute(processHeicConvert, 'HEIC Convert'));
    }

    function handleHeicFiles(fileList) {
        const files = Array.from(fileList);

        // Filter for HEIC/HEIF files
        const heicFilesNew = files.filter(f => {
            const ext = f.name.toLowerCase();
            return ext.endsWith('.heic') || ext.endsWith('.heif');
        });

        if (heicFilesNew.length === 0) {
            alert('Please select HEIC or HEIF files.');
            return;
        }

        // Check file size limit (50MB per file)
        for (const file of heicFilesNew) {
            if (file.size > 50 * 1024 * 1024) {
                alert(`File "${file.name}" is too large. Maximum size is 50MB per file.`);
                return;
            }
        }

        heicFiles = heicFiles.concat(heicFilesNew);
        renderHeicFileList();
    }

    function renderHeicFileList() {
        const { heicFileListContainer, heicFileList, heicDropZone } = elements;

        if (heicFiles.length === 0) {
            heicFileListContainer.classList.add('hidden');
            heicDropZone.classList.remove('hidden');
            return;
        }

        heicDropZone.classList.add('hidden');
        heicFileListContainer.classList.remove('hidden');
        heicFileList.innerHTML = '';

        heicFiles.forEach((file, index) => {
            const li = document.createElement('li');

            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-name';
            nameSpan.textContent = file.name;

            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'file-size';
            sizeSpan.textContent = formatFileSize(file.size);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file-btn';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
                heicFiles.splice(index, 1);
                renderHeicFileList();
            });

            li.appendChild(nameSpan);
            li.appendChild(sizeSpan);
            li.appendChild(removeBtn);
            heicFileList.appendChild(li);
        });
    }

    function clearHeicFiles() {
        heicFiles = [];
        elements.heicFileInput.value = '';
        renderHeicFileList();
    }

    async function processHeicConvert() {
        if (heicFiles.length === 0) {
            alert('Please add HEIC files first.');
            return;
        }

        const format = elements.heicFormatSelect.value;
        const quality = parseInt(elements.heicQualitySlider.value, 10) / 100;
        const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;

        // Check if heic2any is available
        if (typeof heic2any === 'undefined') {
            alert('HEIC converter library not loaded. Please refresh the page.');
            return;
        }

        elements.heicConvertBtn.disabled = true;
        elements.heicConvertBtn.querySelector('.btn-text').textContent = 'CONVERTING...';

        try {
            if (heicFiles.length === 1) {
                // Single file - download directly
                const blob = await heic2any({
                    blob: heicFiles[0],
                    toType: mimeType,
                    quality: quality
                });

                const resultBlob = Array.isArray(blob) ? blob[0] : blob;
                const baseName = heicFiles[0].name.replace(/\.(heic|heif)$/i, '');
                downloadBlob(resultBlob, `${sanitizeFilename(baseName)}.${format}`);
            } else {
                // Multiple files - create ZIP
                const zip = new JSZip();

                for (let i = 0; i < heicFiles.length; i++) {
                    try {
                        const blob = await heic2any({
                            blob: heicFiles[i],
                            toType: mimeType,
                            quality: quality
                        });

                        const resultBlob = Array.isArray(blob) ? blob[0] : blob;
                        const baseName = heicFiles[i].name.replace(/\.(heic|heif)$/i, '');
                        zip.file(`${sanitizeFilename(baseName)}.${format}`, resultBlob);
                    } catch (err) {
                        console.error(`Error converting ${heicFiles[i].name}:`, err);
                    }
                }

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(zipBlob, 'converted_images.zip');
            }

            clearHeicFiles();
        } catch (err) {
            console.error('HEIC conversion error:', err);
            alert('Error converting HEIC files. Some files may not be valid HEIC format.');
        } finally {
            elements.heicConvertBtn.disabled = false;
            elements.heicConvertBtn.querySelector('.btn-text').textContent = 'CONVERT & DOWNLOAD';
        }
    }

    // ===========================================
    // BULK RENAME TOOL
    // ===========================================

    let bulkFiles = [];
    const MAX_BULK_FILES = 100;
    const MAX_BULK_SIZE = 500 * 1024 * 1024; // 500MB total

    function initBulkTool() {
        const { bulkDropZone, bulkFileInput, bulkClearBtn, bulkRenameBtn } = elements;

        bulkDropZone.addEventListener('click', () => bulkFileInput.click());
        bulkDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            bulkDropZone.classList.add('drag-over');
        });
        bulkDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            bulkDropZone.classList.remove('drag-over');
        });
        bulkDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            bulkDropZone.classList.remove('drag-over');
            handleBulkFiles(e.dataTransfer.files);
        });
        bulkFileInput.addEventListener('change', (e) => {
            handleBulkFiles(e.target.files);
        });

        bulkClearBtn.addEventListener('click', clearBulkFiles);
        bulkRenameBtn.addEventListener('click', () => safeExecute(processBulkRename, 'Bulk Rename'));
    }

    function handleBulkFiles(fileList) {
        const files = Array.from(fileList);

        // Filter for images only
        const imageFiles = files.filter(f => f.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            alert('Please select image files.');
            return;
        }

        // Check file count limit
        if (bulkFiles.length + imageFiles.length > MAX_BULK_FILES) {
            alert(`Maximum ${MAX_BULK_FILES} files allowed. You have ${bulkFiles.length} files.`);
            return;
        }

        // Check total size limit
        const currentSize = bulkFiles.reduce((sum, f) => sum + f.size, 0);
        const newSize = imageFiles.reduce((sum, f) => sum + f.size, 0);

        if (currentSize + newSize > MAX_BULK_SIZE) {
            alert('Total file size exceeds 500MB limit.');
            return;
        }

        bulkFiles = bulkFiles.concat(imageFiles);
        renderBulkFileList();
    }

    function renderBulkFileList() {
        const { bulkFileListContainer, bulkFileList, bulkFileCount, bulkDropZone } = elements;

        if (bulkFiles.length === 0) {
            bulkFileListContainer.classList.add('hidden');
            bulkDropZone.classList.remove('hidden');
            return;
        }

        bulkDropZone.classList.add('hidden');
        bulkFileListContainer.classList.remove('hidden');
        bulkFileCount.textContent = bulkFiles.length;
        bulkFileList.innerHTML = '';

        bulkFiles.forEach((file, index) => {
            const li = document.createElement('li');

            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-name';
            nameSpan.textContent = file.name;

            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'file-size';
            sizeSpan.textContent = formatFileSize(file.size);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file-btn';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
                bulkFiles.splice(index, 1);
                renderBulkFileList();
            });

            li.appendChild(nameSpan);
            li.appendChild(sizeSpan);
            li.appendChild(removeBtn);
            bulkFileList.appendChild(li);
        });
    }

    function clearBulkFiles() {
        bulkFiles = [];
        elements.bulkFileInput.value = '';
        renderBulkFileList();
    }

    function generateFilename(pattern, index, originalName, startNum) {
        const num = startNum + index;
        const paddedNum = String(num).padStart(3, '0');
        const date = new Date().toISOString().split('T')[0];
        const baseName = originalName.replace(/\.[^/.]+$/, '');

        return pattern
            .replace(/\{n\}/gi, paddedNum)
            .replace(/\{name\}/gi, baseName)
            .replace(/\{date\}/gi, date);
    }

    async function processBulkRename() {
        if (bulkFiles.length === 0) {
            alert('Please add files first.');
            return;
        }

        const pattern = elements.bulkPattern.value.trim() || 'image_{n}';
        const startNum = validatePositiveInt(elements.bulkStartNum.value, 0, 9999) || 1;
        const zipFilename = sanitizeFilename(elements.bulkZipFilename.value.trim() || 'images');

        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            alert('ZIP library not loaded. Please refresh the page.');
            return;
        }

        elements.bulkRenameBtn.disabled = true;
        elements.bulkRenameBtn.querySelector('.btn-text').textContent = 'PROCESSING...';

        try {
            const zip = new JSZip();
            const usedNames = new Set();

            for (let i = 0; i < bulkFiles.length; i++) {
                const file = bulkFiles[i];
                const ext = file.name.split('.').pop().toLowerCase();

                let newName = generateFilename(pattern, i, file.name, startNum);
                newName = sanitizeFilename(newName);

                // Ensure unique names
                let finalName = `${newName}.${ext}`;
                let counter = 1;
                while (usedNames.has(finalName.toLowerCase())) {
                    finalName = `${newName}_${counter}.${ext}`;
                    counter++;
                }
                usedNames.add(finalName.toLowerCase());

                zip.file(finalName, file);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            downloadBlob(zipBlob, `${zipFilename}.zip`);

            clearBulkFiles();
        } catch (err) {
            console.error('Bulk rename error:', err);
            alert('Error creating ZIP file. Please try again.');
        } finally {
            elements.bulkRenameBtn.disabled = false;
            elements.bulkRenameBtn.querySelector('.btn-text').textContent = 'RENAME & DOWNLOAD ZIP';
        }
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
        initHeicTool();
        initBulkTool();
    }

    // Start the app
    init();
})();
