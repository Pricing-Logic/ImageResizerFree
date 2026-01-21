// Image Resizer - Main Application Script

(function() {
    'use strict';

    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewArea = document.getElementById('preview-area');
    const imagePreview = document.getElementById('image-preview');
    const removeBtn = document.getElementById('remove-btn');
    const originalDims = document.getElementById('original-dims');
    const fileName = document.getElementById('file-name');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const lockBtn = document.getElementById('lock-btn');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityVal = document.getElementById('quality-val');
    const formatSelect = document.getElementById('format-select');
    const downloadBtn = document.getElementById('download-btn');

    // State
    let originalImage = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let aspectRatio = 1;
    let isAspectLocked = true;
    let originalFileName = '';

    // Initialize
    function init() {
        setupEventListeners();
        updateQualityVisibility();
    }

    function setupEventListeners() {
        // Upload events
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileSelect);

        // Remove image
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetState();
        });

        // Dimension inputs
        widthInput.addEventListener('input', handleWidthChange);
        heightInput.addEventListener('input', handleHeightChange);

        // Aspect ratio lock
        lockBtn.addEventListener('click', toggleAspectLock);

        // Quality slider
        qualitySlider.addEventListener('input', handleQualityChange);

        // Format selection
        formatSelect.addEventListener('change', updateQualityVisibility);

        // Download button
        downloadBtn.addEventListener('click', processAndDownload);
    }

    // Drag and Drop Handlers
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');

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

    // File Processing
    function handleFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        // Store original filename (without extension)
        originalFileName = file.name.replace(/\.[^/.]+$/, '');

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                originalImage = img;
                originalWidth = img.naturalWidth;
                originalHeight = img.naturalHeight;
                aspectRatio = originalWidth / originalHeight;

                // Update UI
                showPreview(e.target.result, file);
            };
            img.onerror = function() {
                alert('Error loading image. Please try another file.');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function showPreview(dataUrl, file) {
        imagePreview.src = dataUrl;

        // Show original dimensions and file info
        originalDims.textContent = `${originalWidth} × ${originalHeight}px`;
        fileName.textContent = formatFileSize(file.size) + ' | ' + file.name;

        // Set dimension inputs
        widthInput.value = originalWidth;
        heightInput.value = originalHeight;

        // Show preview, hide upload zone
        dropZone.classList.add('hidden');
        previewArea.classList.remove('hidden');
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    // Dimension Handling
    function handleWidthChange() {
        const newWidth = parseInt(widthInput.value) || 0;
        if (isAspectLocked && newWidth > 0) {
            const newHeight = Math.round(newWidth / aspectRatio);
            heightInput.value = newHeight;
        }
    }

    function handleHeightChange() {
        const newHeight = parseInt(heightInput.value) || 0;
        if (isAspectLocked && newHeight > 0) {
            const newWidth = Math.round(newHeight * aspectRatio);
            widthInput.value = newWidth;
        }
    }

    function toggleAspectLock() {
        isAspectLocked = !isAspectLocked;
        lockBtn.classList.toggle('active', isAspectLocked);
        lockBtn.title = isAspectLocked ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio';
    }

    // Quality Handling
    function handleQualityChange() {
        qualityVal.textContent = qualitySlider.value + '%';
    }

    function updateQualityVisibility() {
        const format = formatSelect.value;
        const qualityGroup = qualitySlider.closest('.control-group');

        // PNG doesn't use quality setting
        if (format === 'png') {
            qualityGroup.style.opacity = '0.5';
            qualityGroup.style.pointerEvents = 'none';
        } else {
            qualityGroup.style.opacity = '1';
            qualityGroup.style.pointerEvents = 'auto';
        }
    }

    // Process and Download
    function processAndDownload() {
        if (!originalImage) {
            alert('Please upload an image first.');
            return;
        }

        const targetWidth = parseInt(widthInput.value) || originalWidth;
        const targetHeight = parseInt(heightInput.value) || originalHeight;

        // Validate dimensions
        if (targetWidth <= 0 || targetHeight <= 0) {
            alert('Please enter valid dimensions greater than 0.');
            return;
        }

        // Warn about very large output
        if (targetWidth > 10000 || targetHeight > 10000) {
            if (!confirm('Very large dimensions may cause performance issues. Continue?')) {
                return;
            }
        }

        const format = formatSelect.value;
        const quality = parseInt(qualitySlider.value) / 100;

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(originalImage, 0, 0, targetWidth, targetHeight);

        // Get MIME type
        const mimeTypes = {
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp'
        };
        const mimeType = mimeTypes[format];

        // Convert to blob and download
        canvas.toBlob(function(blob) {
            if (!blob) {
                alert('Error processing image. Please try a different format.');
                return;
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = sanitizeFilename(originalFileName) + '.' + format;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, mimeType, format === 'png' ? undefined : quality);
    }

    function sanitizeFilename(name) {
        // Remove or replace invalid characters
        return name
            .replace(/[<>:"/\\|?*]/g, '-')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim() || 'image';
    }

    // Reset State
    function resetState() {
        originalImage = null;
        originalWidth = 0;
        originalHeight = 0;
        aspectRatio = 1;
        originalFileName = '';

        // Reset inputs
        widthInput.value = '';
        heightInput.value = '';
        fileInput.value = '';

        // Reset UI
        previewArea.classList.add('hidden');
        dropZone.classList.remove('hidden');
    }

    // Start the app
    init();
})();
