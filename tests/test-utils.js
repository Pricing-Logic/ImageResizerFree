/**
 * Test Utilities for iresized.com
 * Provides assertion helpers and test infrastructure
 */

const TestUtils = (function() {
    'use strict';

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let currentSuite = '';
    let results = [];

    /**
     * Start a new test suite
     */
    function suite(name) {
        currentSuite = name;
        log(`\n=== ${name} ===`, 'suite');
    }

    /**
     * Run a single test
     */
    function test(name, fn) {
        totalTests++;
        try {
            fn();
            passedTests++;
            log(`  ✓ ${name}`, 'pass');
            results.push({ suite: currentSuite, name, status: 'pass' });
        } catch (err) {
            failedTests++;
            log(`  ✗ ${name}: ${err.message}`, 'fail');
            results.push({ suite: currentSuite, name, status: 'fail', error: err.message });
        }
    }

    /**
     * Async test runner
     */
    async function testAsync(name, fn) {
        totalTests++;
        try {
            await fn();
            passedTests++;
            log(`  ✓ ${name}`, 'pass');
            results.push({ suite: currentSuite, name, status: 'pass' });
        } catch (err) {
            failedTests++;
            log(`  ✗ ${name}: ${err.message}`, 'fail');
            results.push({ suite: currentSuite, name, status: 'fail', error: err.message });
        }
    }

    /**
     * Assertions
     */
    function assertEqual(actual, expected, msg = '') {
        if (actual !== expected) {
            throw new Error(`${msg} Expected "${expected}", got "${actual}"`);
        }
    }

    function assertNotEqual(actual, expected, msg = '') {
        if (actual === expected) {
            throw new Error(`${msg} Expected value to not equal "${expected}"`);
        }
    }

    function assertTrue(value, msg = '') {
        if (value !== true) {
            throw new Error(`${msg} Expected true, got "${value}"`);
        }
    }

    function assertFalse(value, msg = '') {
        if (value !== false) {
            throw new Error(`${msg} Expected false, got "${value}"`);
        }
    }

    function assertNull(value, msg = '') {
        if (value !== null) {
            throw new Error(`${msg} Expected null, got "${value}"`);
        }
    }

    function assertNotNull(value, msg = '') {
        if (value === null || value === undefined) {
            throw new Error(`${msg} Expected non-null value`);
        }
    }

    function assertThrows(fn, msg = '') {
        let threw = false;
        try {
            fn();
        } catch (e) {
            threw = true;
        }
        if (!threw) {
            throw new Error(`${msg} Expected function to throw`);
        }
    }

    function assertContains(str, substring, msg = '') {
        if (!str.includes(substring)) {
            throw new Error(`${msg} Expected "${str}" to contain "${substring}"`);
        }
    }

    function assertNotContains(str, substring, msg = '') {
        if (str.includes(substring)) {
            throw new Error(`${msg} Expected "${str}" to not contain "${substring}"`);
        }
    }

    function assertGreaterThan(actual, expected, msg = '') {
        if (actual <= expected) {
            throw new Error(`${msg} Expected ${actual} to be greater than ${expected}`);
        }
    }

    function assertLessThan(actual, expected, msg = '') {
        if (actual >= expected) {
            throw new Error(`${msg} Expected ${actual} to be less than ${expected}`);
        }
    }

    function assertInstanceOf(obj, constructor, msg = '') {
        if (!(obj instanceof constructor)) {
            throw new Error(`${msg} Expected instance of ${constructor.name}`);
        }
    }

    /**
     * Log to both console and DOM
     */
    function log(message, type = 'info') {
        console.log(message);

        const output = document.getElementById('test-output');
        if (output) {
            const div = document.createElement('div');
            div.className = `test-${type}`;
            div.textContent = message;
            output.appendChild(div);
        }
    }

    /**
     * Print summary
     */
    function summary() {
        log('\n=== SUMMARY ===', 'suite');
        log(`Total: ${totalTests}`, 'info');
        log(`Passed: ${passedTests}`, 'pass');
        log(`Failed: ${failedTests}`, failedTests > 0 ? 'fail' : 'pass');

        // Update summary element if exists
        const summaryEl = document.getElementById('test-summary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <strong>Total:</strong> ${totalTests} |
                <strong style="color: green;">Passed:</strong> ${passedTests} |
                <strong style="color: ${failedTests > 0 ? 'red' : 'green'};">Failed:</strong> ${failedTests}
            `;
        }

        return { total: totalTests, passed: passedTests, failed: failedTests, results };
    }

    /**
     * Reset test state
     */
    function reset() {
        totalTests = 0;
        passedTests = 0;
        failedTests = 0;
        currentSuite = '';
        results = [];

        const output = document.getElementById('test-output');
        if (output) output.innerHTML = '';
    }

    /**
     * Create a test image as a Blob
     */
    function createTestImageBlob(width = 100, height = 100, color = '#ff0000') {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, width, height);

            // Add some variation to make it a real image
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(10, 10, 20, 20);

            canvas.toBlob(resolve, 'image/png');
        });
    }

    /**
     * Create a test image as a File
     */
    async function createTestImageFile(name = 'test.png', width = 100, height = 100) {
        const blob = await createTestImageBlob(width, height);
        return new File([blob], name, { type: 'image/png' });
    }

    /**
     * Create multiple test image files
     */
    async function createTestImageFiles(count, prefix = 'image') {
        const files = [];
        for (let i = 0; i < count; i++) {
            const file = await createTestImageFile(`${prefix}_${i + 1}.png`, 50 + i * 10, 50 + i * 10);
            files.push(file);
        }
        return files;
    }

    /**
     * Load an Image from blob/file
     */
    function loadImage(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }

    /**
     * Get EXIF data from an image blob (simplified check)
     * Returns true if EXIF markers are found
     */
    async function hasExifData(blob) {
        const buffer = await blob.arrayBuffer();
        const view = new DataView(buffer);

        // Check for JPEG
        if (view.getUint16(0) !== 0xFFD8) return false;

        // Look for APP1 marker (EXIF)
        let offset = 2;
        while (offset < view.byteLength - 2) {
            const marker = view.getUint16(offset);
            if (marker === 0xFFE1) {
                // Found APP1 (EXIF) marker
                return true;
            }
            if ((marker & 0xFF00) !== 0xFF00) break;

            // Skip to next marker
            if (marker === 0xFFD8 || marker === 0xFFD9) {
                offset += 2;
            } else {
                const length = view.getUint16(offset + 2);
                offset += 2 + length;
            }
        }
        return false;
    }

    return {
        suite,
        test,
        testAsync,
        assertEqual,
        assertNotEqual,
        assertTrue,
        assertFalse,
        assertNull,
        assertNotNull,
        assertThrows,
        assertContains,
        assertNotContains,
        assertGreaterThan,
        assertLessThan,
        assertInstanceOf,
        log,
        summary,
        reset,
        createTestImageBlob,
        createTestImageFile,
        createTestImageFiles,
        loadImage,
        hasExifData
    };
})();
