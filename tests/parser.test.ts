// tests/parser.test.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DjiParser } from '@/parser/DjiParser.js';

import { RouteBuilder } from '@/builder/RouteBuilder.js';

import type { ActionGroup, Waypoint, RouteFolder } from '@/types/kmz.js';

describe('DjiParser', () => {

  it('should successfully extract the XML string from a raw KMZ Buffer', async () => {
    // 1. Setup: Read the real KMZ file from your hard drive into a Buffer
    const kmzPath = path.join(__dirname, 'fixtures', 'sample-route.kmz');
    const kmzBuffer = fs.readFileSync(kmzPath);

    // 2. Execute: Pass the Buffer to your parser
    const parser = new DjiParser();
    const result = await parser.parse(kmzBuffer);

    console.log(result)

    expect(result.template).toBeTypeOf('object');
    expect(result.template.kml).toBeDefined();
    expect(result.template.kml.Document).toBeDefined();
    expect(result.template.kml['@_xmlns:wpml']).toContain('http://www.dji.com/wpmz/');

    expect(result.waylines).toBeTypeOf('object');
    expect(result.waylines.kml).toBeDefined();
    expect(result.waylines.kml.Document).toBeDefined();
    expect(result.waylines.kml['@_xmlns:wpml']).toContain('http://www.dji.com/wpmz/');
  });

  it.only('PLAYGROUND: Iterate through waypoints', async () => {
    const kmzPath = path.join(__dirname, 'fixtures', 'sample-route.kmz');
    const kmzBuffer = fs.readFileSync(kmzPath);

    const parser = new DjiParser();
    const result = await parser.parse(kmzBuffer);

    // 1. Drill down into the Document
    const document = result.waylines.kml.Document;

    // 2. Find the Folder that contains the Waypoints 
    // (DJI usually puts waypoints in a Folder)
    const folders = document.Folder || [];

    // 3. Iterate!
    folders.forEach((folder: any) => {
      console.log(`\n📁 Found Folder: ${folder['wpml:templateId'] || 'Unknown'}`);

      const placemarks = folder.Placemark || [];

      placemarks.forEach((placemark: any) => {
        // Look for the index attribute
        const wpIndex = placemark['wpml:index'];

        // If it has an index, it's a waypoint!
        if (wpIndex !== undefined) {
          const coords = placemark.Point?.coordinates;
          const height = placemark['wpml:executeHeight'];
          const speed = placemark['wpml:waypointSpeed'];

          console.log(`  📍 Waypoint ${wpIndex}:`);
          console.log(`     Coordinates: ${coords}`);
          console.log(`     Height: ${height}m`);
          console.log(`     Speed: ${speed}m/s`);
        } else {
          // If it doesn't have an index, it's probably the overall route LineString
          console.log(`  〰️ Route LineString found.`);
        }
      });
    });

    // We just put a dummy expect here so the test passes
    expect(true).toBe(true);
  });

  it('should read, modify, and successfully build a new KMZ file', async () => {
    // 1. Read the original file
    const kmzPath = path.join(__dirname, 'fixtures', 'sample-route.kmz');
    const kmzBuffer = fs.readFileSync(kmzPath);

    const parser = new DjiParser();
    const parsedData = await parser.parse(kmzBuffer);

    // 2. Modify the data! Let's change the author.
    const originalAuthor = parsedData.template.kml.Document["wpml:author"];
    console.log(`Original Author: ${originalAuthor}`);

    parsedData.template.kml.Document["wpml:author"] = "My Awesome TS Library";

    const indexesToRemove = [2]; // You can put multiple here! e.g., [2, 4]

    // Helper function to filter and completely re-index a file's folders
    const removeAndReindex = (folders: RouteFolder[]) => {
      folders.forEach((folder) => {
        if (!folder.Placemark) return;

        // 1. Remove the bad placemarks
        folder.Placemark = folder.Placemark.filter(
          (placemark: any) => !indexesToRemove.includes(placemark['wpml:index'])
        );

        // 2. Re-index everything that is left
        folder.Placemark.forEach((placemark: Waypoint, newIndex: number) => {
          // Update the main waypoint index
          placemark['wpml:index'] = newIndex;

          // Update the action groups if they exist on this waypoint
          if (placemark['wpml:actionGroup']) {
            placemark['wpml:actionGroup'].forEach((actionGroup: ActionGroup) => {
              actionGroup['wpml:actionGroupId'] = newIndex;
              actionGroup['wpml:actionGroupStartIndex'] = newIndex;
              actionGroup['wpml:actionGroupEndIndex'] = newIndex;
            });
          }
        });
      });
    };

    // Run the helper on both files to keep them perfectly in sync!
    removeAndReindex(parsedData.template.kml.Document.Folder);
    removeAndReindex(parsedData.waylines.kml.Document.Folder);

    // 3. Build it back into a KMZ
    const builder = new RouteBuilder();
    const newKmzBinary = await builder.buildKmz(parsedData);

    // 4. Write it to disk so you can inspect it manually
    const outputPath = path.join(__dirname, 'fixtures', 'modified-route.kmz');
    fs.writeFileSync(outputPath, newKmzBinary);

    // 5. Assert it wrote successfully
    expect(fs.existsSync(outputPath)).toBe(true);
    console.log(`Successfully created new KMZ at: ${outputPath}`);
  });


});