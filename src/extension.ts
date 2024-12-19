import * as vscode from 'vscode';
import axios from 'axios';

const API_URL_JAVA_TO_CS = 'https://7bfc-34-141-244-228.ngrok-free.app/translate_java_to_cs';
const API_URL_CS_TO_JAVA = 'https://7bfc-34-141-244-228.ngrok-free.app/translate_cs_to_java';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "codeTranslator" is now active!');

    // Command: Translasi Java ke C#
    let disposableJavaToCSharp = vscode.commands.registerCommand('extension.translateJavaToCSharp', async () => {
        console.log('Command extension.translateJavaToCSharp dipanggil.');
        await executeTranslationCommand(
            'Java ke C#',
            API_URL_JAVA_TO_CS
        );
    });

    // Command: Translasi C# ke Java
    let disposableCSharpToJava = vscode.commands.registerCommand('extension.translateCSharpToJava', async () => {
        console.log('Command extension.translateCSharpToJava dipanggil.');
        await executeTranslationCommand(
            'C# ke Java',
            API_URL_CS_TO_JAVA
        );
    });

    context.subscriptions.push(disposableJavaToCSharp);
    context.subscriptions.push(disposableCSharpToJava);
}

async function executeTranslationCommand(title: string, apiUrl: string) {
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
            title: `Translating ${title}...`,
            cancellable: false
        }, async () => {
            try {
                const result = await callTranslationAPI(apiUrl, selectedText);
                return result;
            } catch (error) {
                console.error(`Error saat translasi ${title}:`, error);
                vscode.window.showErrorMessage(`Terjadi kesalahan saat translasi ${title}.`);
                return `// Error: translasi ${title} gagal.`;
            }
        });

        // Edit editor hanya jika hasil translasi valid
        editor.edit(editBuilder => {
            if (!translatedCode || translatedCode.startsWith('// Error:')) {
                vscode.window.showErrorMessage(`Translasi ${title} gagal atau tidak valid. Kode asli tidak diubah.`);
                return;
            }

            console.log(`Hasil translasi ${title}:`, translatedCode);
            editBuilder.replace(editor.selection, translatedCode);
        });

    } catch (error) {
        console.error(`Error pada command ${title}:`, error);
        vscode.window.showErrorMessage(`Command gagal dijalankan untuk ${title}.`);
    }
}

async function callTranslationAPI(apiUrl: string, code: string): Promise<string> {
    console.log("Input ke API:", code);
    console.log("Menggunakan URL API:", apiUrl);

    try {
        const payload = { code };
        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response dari API:', response.data);

        if (response.status !== 200 || !response.data || !response.data.translated_code) {
            console.error('Respons API tidak valid:', response);
            vscode.window.showErrorMessage(`API Error: ${response.status} - ${response.statusText}`);
            return `// Error: API tidak mengembalikan hasil translasi yang valid.`;
        }

        const rawTranslatedCode = response.data.translated_code;

        const formattedCode = formatCode(rawTranslatedCode);

        console.log('Kode setelah diformat:', formattedCode);
        return formattedCode;
    } catch (error) {
        console.error('Error saat mengakses API:', error);
        vscode.window.showErrorMessage('Gagal mengakses API! Periksa koneksi atau server API.');
        return '// Error: Gagal mengakses API.';
    }
}

function formatCode(code: string): string {
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