import { XMLParser } from 'fast-xml-parser';
import { unzip } from 'fflate';
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

  async parse(input: Blob | ArrayBuffer | Uint8Array): Promise<DjiKmzData> {
    let bytes: Uint8Array;

    if (input instanceof Blob) {
      bytes = new Uint8Array(await input.arrayBuffer());
    } else if (input instanceof ArrayBuffer) {
      bytes = new Uint8Array(input);
    } else {
      // Correctly handles both Node.js Buffer and Uint8Array,
      // slicing only the relevant portion of the underlying ArrayBuffer
      bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }

    const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
      unzip(bytes, (err, data) => (err ? reject(err) : resolve(data)));
    });

    const templateBytes = files["wpmz/template.kml"];
    const waylinesBytes = files["wpmz/waylines.wpml"];

    if (!templateBytes || !waylinesBytes) {
      throw new Error("Invalid KMZ: Missing template.kml or waylines.wpml files");
    }

    const decoder = new TextDecoder();

    return {
      template: this.parser.parse(decoder.decode(templateBytes)),
      waylines: this.parser.parse(decoder.decode(waylinesBytes)),
    };
  }
}