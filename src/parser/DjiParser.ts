// src/parser/DjiParser.ts
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

import type { DjiKmlRoot } from '@/types/kmz.js';

export interface DjiKmzData {
  template: DjiKmlRoot;
  waylines: DjiKmlRoot;
}

export class DjiParser {
  private parser = new XMLParser({
    ignoreAttributes: false,

    isArray: (name) => {
      const alwaysArray = ['Placemark', 'Folder', 'wpml:actionGroup', 'wpml:action'];
      return alwaysArray.includes(name);
    }
  });

  /**
   * Unzips the KMZ and parses both the template and waylines XML into JS objects
   */
  async parse(input: Buffer | Blob | ArrayBuffer | Uint8Array): Promise<DjiKmzData> {
    const zip = await JSZip.loadAsync(input);
    const templateFile = zip.file("wpmz/template.kml");
    const waylinesFile = zip.file("wpmz/waylines.wpml");

    if (!templateFile || !waylinesFile) {
      throw new Error("Invalid KMZ: Missing template.kml or waylines.wpml files");
    }

    const [templateKml, waylinesWpml] = await Promise.all([
      templateFile.async('string'),
      waylinesFile.async('string')
    ]);

    return {
      template: this.parser.parse(templateKml),
      waylines: this.parser.parse(waylinesWpml)
    };
  }
}