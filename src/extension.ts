import * as vscode from 'vscode';
import axios from 'axios';

const API_URL = 'https://016c-34-32-219-39.ngrok-free.app/translate';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "codetransjava2csharp" is now active!');

    let disposable = vscode.commands.registerCommand('extension.translateJavaToCSharp', async () => {
        console.log('Command extension.translateJavaToCSharp dipanggil.');
        try {
            const editor = vscode.window.activeTextEditor;

            if (!editor) {
                vscode.window.showErrorMessage('Tidak ada editor yang aktif.');
                return;
            }

            const selectedText = editor.document.getText(editor.selection);
            if (!selectedText) {
                vscode.window.showWarningMessage('Tidak ada teks yang dipilih.');
                return;
            }

            const translatedCode = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Translating Java to C#...",
                cancellable: false
            }, async () => {
                try {
                    const result = await translateJavaToCSharp(selectedText);
                    return result;
                } catch (error) {
                    console.error('Error saat translasi:', error);
                    vscode.window.showErrorMessage('Terjadi kesalahan saat translasi.');
                    return '// Error: translasi gagal.';
                }
            });

            // Edit editor hanya jika hasil translasi valid
            editor.edit(editBuilder => {
                if (!translatedCode || translatedCode.startsWith('// Error:')) {
                    vscode.window.showErrorMessage('Translasi gagal atau tidak valid. Kode asli tidak diubah.');
                    console.log('Hasil translasi tidak valid:', translatedCode);
                    return;
                }

                if (editor.selection.isEmpty) {
                    vscode.window.showErrorMessage('Tidak ada teks yang dipilih untuk diubah.');
                    return;
                }

                console.log('Hasil translasi berhasil:', translatedCode);
                editBuilder.replace(editor.selection, translatedCode);
            });

        } catch (error) {
            console.error('Error pada command translateToCSharp:', error);
            vscode.window.showErrorMessage('Command gagal dijalankan.');
        }
    });

    context.subscriptions.push(disposable);
}

async function translateJavaToCSharp(javaCode: string): Promise<string> {
    console.log("Input ke API:", javaCode);
    console.log("Menggunakan URL API:", API_URL);

    try {
        // Membentuk payload JSON
        const payload = {
            code: javaCode
        };

        // Mengirimkan payload ke API
        const response = await axios.post(API_URL, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response dari API:', response.data);

        if (response.status !== 200 || !response.data || !response.data.translated_code) {
            console.error('Respons API tidak valid:', response);
            vscode.window.showErrorMessage(`API Error: ${response.status} - ${response.statusText}`);
            return '// Error: API tidak mengembalikan hasil translasi yang valid.';
        }

        const rawTranslatedCode = response.data.translated_code;

        const formattedCode = formatCSharpCode(rawTranslatedCode);

        console.log('Kode setelah diformat:', formattedCode);
        return formattedCode;
    } catch (error) {
        console.error('Error saat mengakses API:', error);
        vscode.window.showErrorMessage('Gagal mengakses API! Periksa koneksi atau server API.');
        return '// Error: Gagal mengakses API.';
    }
}

function formatCSharpCode(code: string): string {
    let indentLevel = 0; // Menyimpan level indentasi
    const indentSize = 4; // Jumlah spasi untuk setiap level indentasi

    const lines = code
        .replace(/;\s*/g, ';\n') // Tambahkan newline setelah semicolon
        .replace(/{\s*/g, '{\n') // Tambahkan newline setelah opening brace
        .replace(/}\s*/g, '}\n') // Tambahkan newline setelah closing brace
        .replace(/\)\s*{/g, ') {\n') // Tambahkan newline sebelum opening brace
        .replace(/\n\s*\n/g, '\n') // Hilangkan newline ganda
        .split('\n'); // Pisahkan per baris untuk diproses

    const formattedLines = lines.map(line => {
        // Trim spasi di awal/akhir baris
        const trimmedLine = line.trim();

        if (trimmedLine === '}') {
            // Jika menemukan '}', kurangi indentasi terlebih dahulu
            indentLevel = Math.max(0, indentLevel - 1);
        }

        // Tambahkan indentasi sesuai level saat ini
        const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmedLine;

        if (trimmedLine.endsWith('{')) {
            // Jika baris berakhir dengan '{', tingkatkan indentasi
            indentLevel++;
        }

        return indentedLine;
    });

    return formattedLines.join('\n').trim(); // Gabungkan kembali menjadi string
}

export function deactivate() {}