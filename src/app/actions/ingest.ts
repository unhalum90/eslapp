"use server";

import PDFParser from "pdf2json";

export async function parsePdf(formData: FormData): Promise<string> {
    const file = formData.get("file") as File;
    if (!file) {
        throw new Error("No file provided");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1); // 1 = text content only

        pdfParser.on("pdfParser_dataError", (errData: any) => {
            console.error("PDF Parser Error:", errData.parserError);
            reject(new Error("Failed to parse PDF"));
        });

        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            try {
                // pdf2json returns purely raw URL-decoded text in 'R' objects.
                // We need to extract and join it.
                // This is a rough extraction.
                const text = pdfParser.getRawTextContent();
                resolve(text);
            } catch (e) {
                reject(new Error("Failed to extract text from PDF data"));
            }
        });

        pdfParser.parseBuffer(buffer);
    });
}
