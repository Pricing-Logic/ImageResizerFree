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
    let currentPost = null; // null = list view, post id = article view

    // ===========================================
    // BLOG POSTS
    // ===========================================
    //
    // Voice: The Fed-Up Builder
    // - First person singular. "I built this" not "we launched this."
    // - PG-13 sarcasm. Dry, blunt, clearly annoyed but professional.
    // - State the problem plainly, then state what you did about it.
    // - Short paragraphs. 2-3 sentences max.
    // - Specific over vague. Name the exact broken thing.
    // - No marketing speak. No "excited to announce", no "game-changing."
    // - End posts with something practical — what the user gets, not a CTA.
    //
    // Posts ordered newest-first. First item = featured post.
    // To add a post: add an object to the TOP of this array.

    const BLOG_POSTS = [
        {
            id: 'watermark-removal-done-properly',
            title: 'Watermark Removal, Done Properly',
            date: '2026-03-10',
            readTime: '2 min read',
            excerpt: 'Gemini puts a 4-pointed star on every image it generates. Most tools want $10/month to badly clone-stamp it out.',
            body: [
                "Gemini puts a semi-transparent 4-pointed star watermark on every image it generates. Bottom-right corner. 48 pixels on small images, 96 on large ones, plus a 32-pixel margin from the edge.",
                "Most \"watermark removers\" online want $10/month to clone-stamp it. Our first attempt wasn't much better. The original algorithm copied pixels from a full patch-width away \u2014 grabbing completely unrelated content \u2014 then blended them with the watermarked pixels at the edges. The star was still there, just blurry.",
                "So I rewrote it. The new approach is called edge-propagation inpainting. Instead of copying from far away, it samples a thin strip of clean pixels from immediately above and to the left of the watermark area. It builds color profiles from those strips, then fills inward using inverse-distance interpolation.",
                "Pixels near the top edge get mostly the top strip\u2019s colors. Pixels near the left edge get mostly the left strip\u2019s colors. Pixels in the deep corner get a blend of both plus the corner sample. Then it adds a tiny amount of Gaussian noise calibrated to the texture of the surrounding area, so the result doesn\u2019t look artificially smooth.",
                "No blending with the original watermarked pixels. Every pixel in the patch is fully replaced. The patch auto-sizes to 96px for images up to 1024px, or 144px for larger images.",
                "Upload a Gemini image. The watermark is gone. You keep the full resolution. It takes about 50 milliseconds."
            ]
        },
        {
            id: 'why-we-built-this',
            title: 'Why We Built This',
            date: '2026-03-10',
            readTime: '3 min read',
            excerpt: "Every image tool on the internet follows the same playbook. Free tier with a watermark. \"Premium\" for $12/month.",
            body: [
                "Every image tool on the internet follows the same playbook. Free tier that watermarks your output or limits you to three images a day. \"Premium\" tier for $12/month. Enterprise pricing if you ask nicely.",
                "Resizing a JPEG is not a premium feature. It\u2019s a canvas element and two lines of JavaScript. Stripping EXIF data is reading bytes and writing fewer bytes. Compressing an image is literally what the browser\u2019s built-in encoder already does.",
                "These aren\u2019t hard problems. They were solved decades ago. The tools that charge for them aren\u2019t selling technology \u2014 they\u2019re selling convenience with a padlock on it.",
                "I built iresized.com because I got tired of it. Every tool here runs entirely in your browser. Your images never leave your machine. There\u2019s no server, no account, no upload queue, no daily limit. The code is open source.",
                "There\u2019s no catch. No freemium upsell. No \"pro\" tier coming next quarter. The tools work, they\u2019re free, and they\u2019ll stay that way.",
                "If a resize tool can be built in 45 seconds by an AI coding assistant, it has no business costing $12 a month. That\u2019s the whole thesis."
            ]
        }
    ];

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
        mainDivider: document.getElementById('main-divider'),
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
        bulkRenameBtn: document.getElementById('bulk-rename-btn'),

        // Background Remover
        bgDropZone: document.getElementById('bg-drop-zone'),
        bgFileInput: document.getElementById('bg-file-input'),
        bgPreviewContainer: document.getElementById('bg-preview-container'),
        bgPreviewCanvas: document.getElementById('bg-preview-canvas'),
        bgLoading: document.getElementById('bg-loading'),
        bgClearBtn: document.getElementById('bg-clear-btn'),
        bgFormatSelect: document.getElementById('bg-format-select'),
        bgFilename: document.getElementById('bg-filename'),
        bgFilenameExt: document.getElementById('bg-filename-ext'),
        bgDownloadBtn: document.getElementById('bg-download-btn'),

        // Advanced Background Remover
        advbgDropZone: document.getElementById('advbg-drop-zone'),
        advbgFileInput: document.getElementById('advbg-file-input'),
        advbgPreviewContainer: document.getElementById('advbg-preview-container'),
        advbgPreviewCanvas: document.getElementById('advbg-preview-canvas'),
        advbgLoading: document.getElementById('advbg-loading'),
        advbgLoadingText: document.getElementById('advbg-loading-text'),
        advbgProgress: document.getElementById('advbg-progress'),
        advbgProgressFill: document.getElementById('advbg-progress-fill'),
        advbgProgressText: document.getElementById('advbg-progress-text'),
        advbgClearBtn: document.getElementById('advbg-clear-btn'),
        advbgFormatSelect: document.getElementById('advbg-format-select'),
        advbgFilename: document.getElementById('advbg-filename'),
        advbgFilenameExt: document.getElementById('advbg-filename-ext'),
        advbgDownloadBtn: document.getElementById('advbg-download-btn'),
        advbgInfoBox: document.getElementById('advbg-info-box'),

        // Watermark Removal
        watermarkPatchSlider: document.getElementById('watermark-patch-slider'),
        watermarkPatchVal: document.getElementById('watermark-patch-val'),
        watermarkQualitySlider: document.getElementById('watermark-quality-slider'),
        watermarkQualityVal: document.getElementById('watermark-quality-val'),
        watermarkFormatSelect: document.getElementById('watermark-format-select'),
        watermarkFilename: document.getElementById('watermark-filename'),
        watermarkFilenameExt: document.getElementById('watermark-filename-ext'),
        watermarkBtn: document.getElementById('watermark-btn')
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
        elements.watermarkFilename.value = `${baseName}_nowm`;
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

        // Tools with their own upload zones (HEIC, Bulk, Background, Advanced BG)
        const hasOwnUploadZone = (tool === 'convert' || tool === 'bulk' || tool === 'background' || tool === 'advancedbg');

        if (hasOwnUploadZone) {
            // Hide shared upload zone and divider for multi-file tools
            elements.dropZone.classList.add('hidden');
            elements.previewArea.classList.add('hidden');
            elements.cropCanvasContainer.classList.add('hidden');
            elements.mainDivider.classList.add('hidden');
        } else if (tool === 'crop' && originalImage) {
            // Crop tool uses canvas
            elements.dropZone.classList.add('hidden');
            elements.previewArea.classList.add('hidden');
            elements.cropCanvasContainer.classList.remove('hidden');
            elements.mainDivider.classList.remove('hidden');
            initCropCanvas();
        } else if (originalImage) {
            // Other single-image tools show preview
            elements.dropZone.classList.add('hidden');
            elements.cropCanvasContainer.classList.add('hidden');
            elements.previewArea.classList.remove('hidden');
            elements.mainDivider.classList.remove('hidden');
        } else {
            // No image loaded - show shared upload zone
            elements.dropZone.classList.remove('hidden');
            elements.previewArea.classList.add('hidden');
            elements.cropCanvasContainer.classList.add('hidden');
            elements.mainDivider.classList.remove('hidden');
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

        // Auto-size watermark patch slider based on image dimensions
        if (originalWidth > 0 && originalHeight > 0) {
            var recommended = computePatchSize(originalWidth, originalHeight);
            elements.watermarkPatchSlider.value = recommended;
            elements.watermarkPatchVal.textContent = recommended + 'px';
        }

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
    // BACKGROUND REMOVER TOOL
    // ===========================================

    let bgImage = null;
    let bgResultBlob = null;
    let selfieSegmentation = null;
    const MAX_BG_DIMENSION = 2048;
    const BG_TIMEOUT = 30000; // 30 seconds

    function initBackgroundTool() {
        const { bgDropZone, bgFileInput, bgClearBtn, bgFormatSelect,
                bgFilenameExt, bgDownloadBtn } = elements;

        bgDropZone.addEventListener('click', () => bgFileInput.click());
        bgDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            bgDropZone.classList.add('drag-over');
        });
        bgDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            bgDropZone.classList.remove('drag-over');
        });
        bgDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            bgDropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                handleBgFile(e.dataTransfer.files[0]);
            }
        });
        bgFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleBgFile(e.target.files[0]);
            }
        });

        bgClearBtn.addEventListener('click', clearBgImage);
        bgFormatSelect.addEventListener('change', () => {
            updateExtensionDisplay(bgFormatSelect, bgFilenameExt);
        });
        bgDownloadBtn.addEventListener('click', () => safeExecute(downloadBgResult, 'Background Download'));

        updateExtensionDisplay(bgFormatSelect, bgFilenameExt);
    }

    function handleBgFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            alert('File too large. Maximum size is 50MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Check dimensions
                if (img.naturalWidth > MAX_BG_DIMENSION || img.naturalHeight > MAX_BG_DIMENSION) {
                    alert(`Image too large. Maximum dimensions: ${MAX_BG_DIMENSION}x${MAX_BG_DIMENSION}px`);
                    return;
                }

                bgImage = img;

                // Set default filename
                const baseName = file.name.replace(/\.[^/.]+$/, '');
                elements.bgFilename.value = `${baseName}_nobg`;

                // Show preview container, hide drop zone
                elements.bgDropZone.classList.add('hidden');
                elements.bgPreviewContainer.classList.remove('hidden');

                // Process the image
                processBackgroundRemoval();
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

    function clearBgImage() {
        bgImage = null;
        bgResultBlob = null;
        elements.bgFileInput.value = '';
        elements.bgPreviewContainer.classList.add('hidden');
        elements.bgDropZone.classList.remove('hidden');
        elements.bgDownloadBtn.disabled = true;

        // Clear canvas
        const canvas = elements.bgPreviewCanvas;
        canvas.width = 0;
        canvas.height = 0;
    }

    async function initSelfieSegmentation() {
        if (selfieSegmentation) return selfieSegmentation;

        // Check if SelfieSegmentation is available
        if (typeof SelfieSegmentation === 'undefined') {
            throw new Error('MediaPipe library not loaded. Please refresh the page.');
        }

        selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => `libs/mediapipe/${file}`
        });

        selfieSegmentation.setOptions({
            modelSelection: 1, // 0 = general, 1 = landscape (better for full body)
            selfieMode: false
        });

        await selfieSegmentation.initialize();
        return selfieSegmentation;
    }

    async function processBackgroundRemoval() {
        if (!bgImage) return;

        const { bgPreviewCanvas, bgLoading, bgDownloadBtn } = elements;

        // Show loading
        bgLoading.classList.remove('hidden');
        bgDownloadBtn.disabled = true;

        try {
            // Initialize segmentation if needed
            const segmenter = await initSelfieSegmentation();

            // Create a promise with timeout
            const processPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Processing timeout. Try a smaller image.'));
                }, BG_TIMEOUT);

                segmenter.onResults((results) => {
                    clearTimeout(timeout);
                    resolve(results);
                });

                // Send image for processing
                segmenter.send({ image: bgImage });
            });

            const results = await processPromise;

            // Draw result with transparent background
            bgPreviewCanvas.width = bgImage.naturalWidth;
            bgPreviewCanvas.height = bgImage.naturalHeight;
            const ctx = bgPreviewCanvas.getContext('2d');

            // Draw original image
            ctx.drawImage(bgImage, 0, 0);

            // Get image data
            const imageData = ctx.getImageData(0, 0, bgPreviewCanvas.width, bgPreviewCanvas.height);
            const pixels = imageData.data;

            // Get mask data with edge feathering for smoother results
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = bgImage.naturalWidth;
            maskCanvas.height = bgImage.naturalHeight;
            const maskCtx = maskCanvas.getContext('2d');
            // Apply blur for feathered edges (smoother hair/fine details)
            maskCtx.filter = 'blur(1.5px)';
            maskCtx.drawImage(results.segmentationMask, 0, 0, maskCanvas.width, maskCanvas.height);
            maskCtx.filter = 'none';
            const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
            const maskPixels = maskData.data;

            // Apply mask to alpha channel (mask is grayscale, use R channel)
            for (let i = 0; i < pixels.length; i += 4) {
                const maskValue = maskPixels[i]; // R channel of mask (0-255)
                pixels[i + 3] = maskValue; // Set alpha
            }

            ctx.putImageData(imageData, 0, 0);

            // Clean up mask canvas
            maskCanvas.width = 0;
            maskCanvas.height = 0;

            // Generate result blob
            const format = elements.bgFormatSelect.value;
            const mimeType = `image/${format}`;

            bgResultBlob = await new Promise(resolve => {
                bgPreviewCanvas.toBlob(resolve, mimeType);
            });

            bgDownloadBtn.disabled = false;

        } catch (err) {
            console.error('Background removal error:', err);
            alert('Error processing image: ' + err.message);
            clearBgImage();
        } finally {
            bgLoading.classList.add('hidden');
        }
    }

    function downloadBgResult() {
        if (!bgResultBlob) {
            alert('No processed image available.');
            return;
        }

        const format = elements.bgFormatSelect.value;
        const filename = getDownloadFilename(elements.bgFilename, '_nobg', format);
        downloadBlob(bgResultBlob, filename);
    }

    // ===========================================
    // ADVANCED BACKGROUND REMOVER TOOL (RMBG-1.4)
    // ===========================================

    let advbgImage = null;
    let advbgResultBlob = null;
    let transformersLoaded = false;
    const ADVBG_TIMEOUT = 120000; // 2 minutes for model download + processing

    function initAdvancedBgTool() {
        const { advbgDropZone, advbgFileInput, advbgClearBtn, advbgFormatSelect,
                advbgFilenameExt, advbgDownloadBtn } = elements;

        advbgDropZone.addEventListener('click', () => advbgFileInput.click());
        advbgDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            advbgDropZone.classList.add('drag-over');
        });
        advbgDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            advbgDropZone.classList.remove('drag-over');
        });
        advbgDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            advbgDropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                handleAdvbgFile(e.dataTransfer.files[0]);
            }
        });
        advbgFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleAdvbgFile(e.target.files[0]);
            }
        });

        advbgClearBtn.addEventListener('click', clearAdvbgImage);
        advbgFormatSelect.addEventListener('change', () => {
            updateExtensionDisplay(advbgFormatSelect, advbgFilenameExt);
        });
        advbgDownloadBtn.addEventListener('click', () => safeExecute(downloadAdvbgResult, 'Advanced BG Download'));

        updateExtensionDisplay(advbgFormatSelect, advbgFilenameExt);
    }

    function handleAdvbgFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            alert('File too large. Maximum size is 50MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                advbgImage = img;

                // Set default filename
                const baseName = file.name.replace(/\.[^/.]+$/, '');
                elements.advbgFilename.value = `${baseName}_nobg`;

                // Show preview container, hide drop zone
                elements.advbgDropZone.classList.add('hidden');
                elements.advbgPreviewContainer.classList.remove('hidden');

                // Process the image
                processAdvancedBackgroundRemoval();
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

    function clearAdvbgImage() {
        advbgImage = null;
        advbgResultBlob = null;
        elements.advbgFileInput.value = '';
        elements.advbgPreviewContainer.classList.add('hidden');
        elements.advbgDropZone.classList.remove('hidden');
        elements.advbgDownloadBtn.disabled = true;
        elements.advbgProgress.classList.add('hidden');

        // Clear canvas
        const canvas = elements.advbgPreviewCanvas;
        canvas.width = 0;
        canvas.height = 0;
    }

    let rmbgModel = null;
    let rmbgProcessor = null;
    let RawImage = null;

    async function loadTransformers() {
        if (transformersLoaded) return;

        // Show progress UI
        elements.advbgProgress.classList.remove('hidden');
        elements.advbgProgressText.textContent = 'Loading AI library...';
        elements.advbgProgressFill.style.width = '10%';

        try {
            // Dynamically import Transformers.js v3
            const transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.2');
            const { AutoModel, AutoProcessor, env } = transformers;
            RawImage = transformers.RawImage;

            // Configure for browser use
            env.allowLocalModels = false;

            elements.advbgProgressText.textContent = 'Loading AI model (~40MB)...';
            elements.advbgProgressFill.style.width = '20%';

            // Load model and processor with progress tracking
            const modelId = 'briaai/RMBG-1.4';

            // Load processor first (smaller)
            elements.advbgProgressText.textContent = 'Loading processor...';
            rmbgProcessor = await AutoProcessor.from_pretrained(modelId, {
                progress_callback: (progress) => {
                    if (progress.status === 'progress' && progress.total) {
                        const pct = Math.round((progress.loaded / progress.total) * 100);
                        elements.advbgProgressFill.style.width = `${20 + pct * 0.1}%`;
                    }
                }
            });

            elements.advbgProgressText.textContent = 'Loading AI model...';
            elements.advbgProgressFill.style.width = '30%';

            // Load the model (larger download)
            rmbgModel = await AutoModel.from_pretrained(modelId, {
                progress_callback: (progress) => {
                    if (progress.status === 'progress' && progress.total) {
                        const pct = Math.round((progress.loaded / progress.total) * 100);
                        elements.advbgProgressText.textContent = `Downloading model: ${pct}%`;
                        elements.advbgProgressFill.style.width = `${30 + pct * 0.65}%`;
                    }
                }
            });

            transformersLoaded = true;
            elements.advbgProgressFill.style.width = '100%';
            elements.advbgProgressText.textContent = 'Model ready!';

            // Hide info box after model loads
            elements.advbgInfoBox.style.display = 'none';

        } catch (err) {
            console.error('Failed to load Transformers.js:', err);
            throw new Error('Failed to load AI model: ' + err.message);
        }
    }

    async function processAdvancedBackgroundRemoval() {
        if (!advbgImage) return;

        const { advbgPreviewCanvas, advbgLoading, advbgLoadingText, advbgDownloadBtn, advbgProgress } = elements;

        // Show loading
        advbgLoading.classList.remove('hidden');
        advbgLoadingText.textContent = 'Initializing...';
        advbgDownloadBtn.disabled = true;

        try {
            // Load Transformers.js and model if not already loaded
            await loadTransformers();

            advbgLoadingText.textContent = 'Processing image...';
            advbgProgress.classList.add('hidden');

            // Convert image to data URL for RawImage
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = advbgImage.naturalWidth;
            tempCanvas.height = advbgImage.naturalHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(advbgImage, 0, 0);
            const imageDataUrl = tempCanvas.toDataURL('image/png');

            // Load image using RawImage
            const image = await RawImage.fromURL(imageDataUrl);

            // Preprocess the image
            const { pixel_values } = await rmbgProcessor(image);

            // Run inference
            const { output } = await rmbgModel({ input: pixel_values });

            // Convert output mask to RawImage and resize to original dimensions
            const maskData = output[0].mul(255).to('uint8').data;
            const maskWidth = output.dims[3];
            const maskHeight = output.dims[2];

            // Create mask RawImage
            const mask = new RawImage(maskData, maskWidth, maskHeight, 1);
            const resizedMask = await mask.resize(advbgImage.naturalWidth, advbgImage.naturalHeight);

            // Set up canvas
            advbgPreviewCanvas.width = advbgImage.naturalWidth;
            advbgPreviewCanvas.height = advbgImage.naturalHeight;
            const ctx = advbgPreviewCanvas.getContext('2d');

            // Draw original image
            ctx.drawImage(advbgImage, 0, 0);

            // Get image data and apply mask to alpha channel
            const imageData = ctx.getImageData(0, 0, advbgPreviewCanvas.width, advbgPreviewCanvas.height);
            const pixels = imageData.data;

            // Apply mask to alpha channel
            for (let i = 0; i < resizedMask.data.length; i++) {
                pixels[i * 4 + 3] = resizedMask.data[i]; // Set alpha from mask
            }

            ctx.putImageData(imageData, 0, 0);

            // Clean up temp canvas
            tempCanvas.width = 0;
            tempCanvas.height = 0;

            // Generate result blob
            const format = elements.advbgFormatSelect.value;
            const mimeType = `image/${format}`;

            advbgResultBlob = await new Promise(resolve => {
                advbgPreviewCanvas.toBlob(resolve, mimeType);
            });

            advbgDownloadBtn.disabled = false;

        } catch (err) {
            console.error('Advanced background removal error:', err);
            alert('Error processing image: ' + err.message);
            clearAdvbgImage();
        } finally {
            advbgLoading.classList.add('hidden');
        }
    }

    function downloadAdvbgResult() {
        if (!advbgResultBlob) {
            alert('No processed image available.');
            return;
        }

        const format = elements.advbgFormatSelect.value;
        const filename = getDownloadFilename(elements.advbgFilename, '_nobg', format);
        downloadBlob(advbgResultBlob, filename);
    }

    // ===========================================
    // WATERMARK REMOVAL TOOL
    // ===========================================

    function initWatermarkTool() {
        const { watermarkPatchSlider, watermarkPatchVal, watermarkQualitySlider,
                watermarkQualityVal, watermarkFormatSelect, watermarkFilenameExt,
                watermarkBtn } = elements;

        watermarkPatchSlider.addEventListener('input', () => {
            watermarkPatchVal.textContent = watermarkPatchSlider.value + 'px';
        });
        watermarkQualitySlider.addEventListener('input', () => {
            watermarkQualityVal.textContent = watermarkQualitySlider.value + '%';
        });
        watermarkFormatSelect.addEventListener('change', () => {
            updateQualityVisibility(watermarkFormatSelect, watermarkQualitySlider);
            updateExtensionDisplay(watermarkFormatSelect, watermarkFilenameExt);
        });
        watermarkBtn.addEventListener('click', () => safeExecute(processWatermarkRemoval, 'Watermark Removal'));

        updateQualityVisibility(watermarkFormatSelect, watermarkQualitySlider);
        updateExtensionDisplay(watermarkFormatSelect, watermarkFilenameExt);
    }

    /**
     * Box-Muller transform: returns a Gaussian random number (mean=0, stddev=1)
     */
    function gaussianNoise() {
        var u1 = Math.random();
        var u2 = Math.random();
        // Avoid log(0)
        if (u1 < 1e-10) u1 = 1e-10;
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    /**
     * Compute per-channel stddev of pixel data against a profile.
     * stripData: Uint8ClampedArray from getImageData (RGBA)
     * profile: array of [r,g,b] averaged values indexed by profileAxis
     * width, height: dimensions of the strip
     * profileAxis: 'x' to index profile by column, 'y' to index by row
     * Returns average stddev across R, G, B channels.
     */
    function computeStripVariance(stripData, profile, width, height, profileAxis) {
        var sumSqR = 0, sumSqG = 0, sumSqB = 0;
        var count = 0;
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                var idx = (y * width + x) * 4;
                var pi = profile[profileAxis === 'x' ? x : y];
                if (!pi) continue;
                var dr = stripData[idx] - pi[0];
                var dg = stripData[idx + 1] - pi[1];
                var db = stripData[idx + 2] - pi[2];
                sumSqR += dr * dr;
                sumSqG += dg * dg;
                sumSqB += db * db;
                count++;
            }
        }
        if (count === 0) return 0;
        var varR = sumSqR / count;
        var varG = sumSqG / count;
        var varB = sumSqB / count;
        return Math.sqrt((varR + varG + varB) / 3);
    }

    /**
     * Compute recommended patch size based on image dimensions.
     * Returns 96 for images ≤1024px, 144 for larger, clamped to 25% of min dimension.
     */
    function computePatchSize(imgW, imgH) {
        var minDim = Math.min(imgW, imgH);
        var base = minDim <= 1024 ? 96 : 144;
        return Math.min(base, Math.floor(minDim * 0.25));
    }

    /**
     * Edge-propagation inpaint the bottom-right corner of the canvas.
     * Samples clean border pixels above and left of the patch, then
     * fills via inverse-distance interpolation + calibrated noise.
     */
    function inpaintBottomRightCorner(ctx, imgW, imgH, patchSize) {
        patchSize = Math.min(patchSize, imgW, imgH);

        var STRIP_DEPTH = 6; // px deep for border sampling
        var EPS = 0.001;

        // Patch region: bottom-right corner
        var patchX = imgW - patchSize;
        var patchY = imgH - patchSize;

        // Ensure we have room for border strips
        var topStripY = Math.max(0, patchY - STRIP_DEPTH);
        var topStripH = patchY - topStripY;
        var leftStripX = Math.max(0, patchX - STRIP_DEPTH);
        var leftStripW = patchX - leftStripX;

        // --- Sample top border strip (immediately above patch) ---
        var topProfile = []; // topProfile[x] = [r, g, b]
        var topStripData = null;
        if (topStripH > 0) {
            topStripData = ctx.getImageData(patchX, topStripY, patchSize, topStripH).data;
            for (var x = 0; x < patchSize; x++) {
                var sr = 0, sg = 0, sb = 0;
                for (var sy = 0; sy < topStripH; sy++) {
                    var si = (sy * patchSize + x) * 4;
                    sr += topStripData[si];
                    sg += topStripData[si + 1];
                    sb += topStripData[si + 2];
                }
                topProfile[x] = [sr / topStripH, sg / topStripH, sb / topStripH];
            }
        } else {
            // Fallback: no room for top strip, use first row of patch
            var fallbackData = ctx.getImageData(patchX, patchY, patchSize, 1).data;
            for (var x = 0; x < patchSize; x++) {
                var si = x * 4;
                topProfile[x] = [fallbackData[si], fallbackData[si + 1], fallbackData[si + 2]];
            }
        }

        // --- Sample left border strip (immediately left of patch) ---
        var leftProfile = []; // leftProfile[y] = [r, g, b]
        var leftStripData = null;
        if (leftStripW > 0) {
            leftStripData = ctx.getImageData(leftStripX, patchY, leftStripW, patchSize).data;
            for (var y = 0; y < patchSize; y++) {
                var sr = 0, sg = 0, sb = 0;
                for (var sx = 0; sx < leftStripW; sx++) {
                    var si = (y * leftStripW + sx) * 4;
                    sr += leftStripData[si];
                    sg += leftStripData[si + 1];
                    sb += leftStripData[si + 2];
                }
                leftProfile[y] = [sr / leftStripW, sg / leftStripW, sb / leftStripW];
            }
        } else {
            // Fallback: no room for left strip, use first column of patch
            var fallbackData = ctx.getImageData(patchX, patchY, 1, patchSize).data;
            for (var y = 0; y < patchSize; y++) {
                var si = y * 4;
                leftProfile[y] = [fallbackData[si], fallbackData[si + 1], fallbackData[si + 2]];
            }
        }

        // --- Corner color: average of top-left area of the border samples ---
        var cornerR = (topProfile[0][0] + leftProfile[0][0]) / 2;
        var cornerG = (topProfile[0][1] + leftProfile[0][1]) / 2;
        var cornerB = (topProfile[0][2] + leftProfile[0][2]) / 2;

        // --- Measure noise from border strips ---
        var noiseStdDev = 0;
        if (topStripData && topStripH > 0) {
            noiseStdDev = computeStripVariance(topStripData, topProfile, patchSize, topStripH, 'x');
        }
        if (leftStripData && leftStripW > 0) {
            var leftVar = computeStripVariance(leftStripData, leftProfile, leftStripW, patchSize, 'y');
            noiseStdDev = noiseStdDev > 0 ? (noiseStdDev + leftVar) / 2 : leftVar;
        }

        // --- Build output patch via inverse-distance interpolation ---
        var patchData = ctx.getImageData(patchX, patchY, patchSize, patchSize);
        var pixels = patchData.data;
        var SQRT2 = Math.sqrt(2);

        for (var y = 0; y < patchSize; y++) {
            for (var x = 0; x < patchSize; x++) {
                var dTop = (y + 1) / patchSize;      // 0 near top edge, 1 at bottom
                var dLeft = (x + 1) / patchSize;     // 0 near left edge, 1 at right
                var dCorner = Math.sqrt(dTop * dTop + dLeft * dLeft) / SQRT2;

                var wTop = 1 / (dTop + EPS);
                var wLeft = 1 / (dLeft + EPS);
                var wCorner = 1 / (dCorner + EPS);
                var wSum = wTop + wLeft + wCorner;
                wTop /= wSum;
                wLeft /= wSum;
                wCorner /= wSum;

                var tp = topProfile[x];
                var lp = leftProfile[y];

                var r = tp[0] * wTop + lp[0] * wLeft + cornerR * wCorner;
                var g = tp[1] * wTop + lp[1] * wLeft + cornerG * wCorner;
                var b = tp[2] * wTop + lp[2] * wLeft + cornerB * wCorner;

                // Add calibrated noise (50% of measured stddev)
                if (noiseStdDev > 0) {
                    r += gaussianNoise() * noiseStdDev * 0.5;
                    g += gaussianNoise() * noiseStdDev * 0.5;
                    b += gaussianNoise() * noiseStdDev * 0.5;
                }

                var idx = (y * patchSize + x) * 4;
                pixels[idx]     = Math.max(0, Math.min(255, Math.round(r)));
                pixels[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
                pixels[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
                pixels[idx + 3] = 255; // fully opaque
            }
        }

        ctx.putImageData(patchData, patchX, patchY);
    }

    function processWatermarkRemoval() {
        if (!originalImage) {
            alert('Please upload an image first.');
            return;
        }

        var patchSize = parseInt(elements.watermarkPatchSlider.value, 10) || computePatchSize(originalWidth, originalHeight);

        // Warn if patch is too large relative to image
        var minDim = Math.min(originalWidth, originalHeight);
        if (patchSize > minDim * 0.4) {
            if (!confirm('Patch size is large relative to this image and may affect visible content. Continue?')) {
                return;
            }
        }

        // Clamp
        patchSize = Math.min(patchSize, originalWidth, originalHeight);

        var format = elements.watermarkFormatSelect.value;
        var quality = parseInt(elements.watermarkQualitySlider.value, 10) / 100;

        var canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0);

        // Run inpaint
        inpaintBottomRightCorner(ctx, originalWidth, originalHeight, patchSize);

        var mimeType = 'image/' + (format === 'jpg' ? 'jpeg' : format);
        var filename = getDownloadFilename(elements.watermarkFilename, '_nowm', format);

        canvas.toBlob(function(blob) {
            downloadBlob(blob, filename);
            cleanupCanvas(canvas);
        }, mimeType, format === 'png' ? undefined : quality);
    }

    // ===========================================
    // BLOG PANEL
    // ===========================================

    function renderBlogPanel() {
        var container = document.getElementById('blog-content');
        if (!container) return;

        if (currentPost) {
            var post = BLOG_POSTS.find(function(p) { return p.id === currentPost; });
            if (!post) { currentPost = null; renderBlogPanel(); return; }

            var bodyHtml = post.body.map(function(p) { return '<p>' + p + '</p>'; }).join('');
            container.innerHTML =
                '<button class="blog-back-btn" id="blog-back-btn">&larr; Back</button>' +
                '<div class="blog-article-title">' + post.title + '</div>' +
                '<div class="blog-article-meta">' + post.date + ' &middot; ' + post.readTime + '</div>' +
                '<div class="blog-article-body">' + bodyHtml + '</div>';

            document.getElementById('blog-back-btn').addEventListener('click', function() {
                currentPost = null;
                renderBlogPanel();
            });
        } else {
            var featured = BLOG_POSTS[0];
            var html = '';

            if (featured) {
                html += '<div class="blog-featured">' +
                    '<div class="blog-featured-title">' + featured.title + '</div>' +
                    '<div class="blog-featured-meta">' + featured.date + ' &middot; ' + featured.readTime + '</div>' +
                    '<div class="blog-featured-excerpt">' + featured.excerpt + '</div>' +
                    '<button class="blog-read-more" data-id="' + featured.id + '">Continue reading &rarr;</button>' +
                    '</div>';
            }

            if (BLOG_POSTS.length > 1) {
                html += '<hr class="blog-archive-divider">' +
                    '<div class="blog-archive-heading">OLDER POSTS</div>';
                for (var i = 1; i < BLOG_POSTS.length; i++) {
                    html += '<button class="blog-archive-link" data-id="' + BLOG_POSTS[i].id + '">&rarr; ' + BLOG_POSTS[i].title + '</button>';
                }
            }

            container.innerHTML = html;

            var links = container.querySelectorAll('[data-id]');
            links.forEach(function(link) {
                link.addEventListener('click', function() {
                    currentPost = this.getAttribute('data-id');
                    renderBlogPanel();
                    var panel = document.getElementById('blog-panel');
                    if (panel) panel.scrollTop = 0;
                });
            });
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
        initBackgroundTool();
        initAdvancedBgTool();
        initWatermarkTool();
        renderBlogPanel();
    }

    // Start the app
    init();
})();
