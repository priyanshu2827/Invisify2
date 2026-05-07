import { NextResponse } from 'next/server';
import archiver from 'archiver';
import { Readable } from 'stream';

export async function GET() {
    try {
        // Create a ZIP archive
        const archive = archiver('zip', { zlib: { level: 9 } });

        // Files to include in the extension
        const extensionFiles = [
            // New extension scaffold path
            { path: 'extensions/browser-extension/manifest.json', name: 'manifest.json' },
            { path: 'extensions/browser-extension/background.js', name: 'background.js' },
            { path: 'extensions/browser-extension/content-script.js', name: 'content-script.js' },
            { path: 'extensions/browser-extension/popup.html', name: 'popup.html' },
            { path: 'extensions/browser-extension/popup.js', name: 'popup.js' },
            { path: 'extensions/browser-extension/search-guard.js', name: 'search-guard.js' },
            // Backward compatibility with existing directory
            { path: 'extension/manifest.json', name: 'manifest.json' },
            { path: 'extension/background.js', name: 'background.js' },
            { path: 'extension/content.js', name: 'content.js' },
            { path: 'extension/content.css', name: 'content.css' },
            { path: 'extension/popup.html', name: 'popup.html' },
            { path: 'extension/popup.js', name: 'popup.js' },
            { path: 'extension/search-guard.js', name: 'search-guard.js' },
        ];

        // Add files to the archive
        const fs = require('fs');
        const path = require('path');

        const addedNames = new Set<string>();
        extensionFiles.forEach(file => {
            const filePath = path.join(process.cwd(), file.path);
            if (fs.existsSync(filePath) && !addedNames.has(file.name)) {
                archive.file(filePath, { name: file.name });
                addedNames.add(file.name);
            }
        });

        // Add icons directory
        const iconsPath = path.join(process.cwd(), 'extension/icons');
        if (fs.existsSync(iconsPath)) {
            archive.directory(iconsPath, 'icons');
        }

        // Finalize the archive
        archive.finalize();

        // Convert archive to buffer
        const chunks: Buffer[] = [];
        archive.on('data', (chunk: Buffer) => chunks.push(chunk));

        await new Promise<void>((resolve, reject) => {
            archive.on('end', () => resolve());
            archive.on('error', (err: Error) => reject(err));
        });

        const buffer = Buffer.concat(chunks);

        // Return the ZIP file
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="sentinel-prime-extension.zip"',
            },
        });
    } catch (error) {
        console.error('Extension download error:', error);
        return NextResponse.json(
            { error: 'Failed to generate extension package' },
            { status: 500 }
        );
    }
}
