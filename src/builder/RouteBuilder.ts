// src/builder/RouteBuilder.ts
import JSZip from 'jszip';
import XMLBuilder from 'fast-xml-builder';
import type { DjiKmzData } from '@/parser/DjiParser.js';


export class RouteBuilder {
  // We use the EXACT same configuration as the parser so the XML matches perfectly
  private builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true // Keeps the XML clean by removing empty tags
  });

  /**
   * Converts the DjiKmzData object back into a universal KMZ zip binary
   */
  async buildKmz(data: DjiKmzData): Promise<Uint8Array> {
    // 1. Convert the JS Objects back to XML Strings
    const templateXml = this.builder.build(data.template);
    const waylinesXml = this.builder.build(data.waylines);

    // 2. Create a new Zip archive
    const zip = new JSZip();

    // 3. Recreate the specific folder structure DJI expects
    const wpmzFolder = zip.folder("wpmz");
    if (!wpmzFolder) {
      throw new Error("Failed to create wpmz folder in zip");
    }

    wpmzFolder.file("template.kml", templateXml);
    wpmzFolder.file("waylines.wpml", waylinesXml);

    // 4. Generate the KMZ binary!
    // Using 'uint8array' makes this output universally compatible (Node.js & Browser)
    const kmzBinary = await zip.generateAsync({ type: "uint8array" });

    return kmzBinary;
  }
}