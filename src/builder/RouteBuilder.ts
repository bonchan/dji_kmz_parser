import XMLBuilder from 'fast-xml-builder';
import { zip } from 'fflate';
import type { DjiKmzData } from '@/parser/DjiParser.js';

export class RouteBuilder {
  private builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true,
  });

  async buildKmz(data: DjiKmzData): Promise<Uint8Array> {
    // 1. Convert JS objects back to XML strings
    const templateXml = this.builder.build(data.template);
    const waylinesXml = this.builder.build(data.waylines);

    // 2. Encode strings to Uint8Array
    const encoder = new TextEncoder();

    // 3. Build the zip with fflate — keys are the file paths inside the zip
    const kmzBinary = await new Promise<Uint8Array>((resolve, reject) => {
      zip(
        {
          "wpmz/template.kml": encoder.encode(templateXml),
          "wpmz/waylines.wpml": encoder.encode(waylinesXml),
        },
        (err, data) => err ? reject(err) : resolve(data)
      );
    });

    return kmzBinary;
  }
}