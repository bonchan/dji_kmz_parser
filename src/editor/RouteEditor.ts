import type { DjiKmzData } from '@/parser/DjiParser.js';
import type { ActionGroup, Waypoint, RouteFolder } from '@/types/kmz.js'; // Assuming you renamed the file to kmz.js

export class RouteEditor {
  private data: DjiKmzData;

  constructor(data: DjiKmzData) {
    this.data = structuredClone(data);
  }

  getData(): DjiKmzData {
    return this.data;
  }

  setAuthor(authorName: string): this {
    if (this.data.template.kml.Document) {
      this.data.template.kml.Document["wpml:author"] = authorName;
    }
    return this;
  }

  removeWaypoint(index: number): this {
    const removeAndReindex = (folders: RouteFolder[]) => {
      this.ensureArray(folders).forEach((folder: any) => {
        if (!folder.Placemark) return;

        // 1. Filter out the targeted waypoint
        folder.Placemark = this.ensureArray(folder.Placemark).filter(
          (placemark: any) => placemark['wpml:index'] !== index
        );

        // 2. Re-index everything that survived
        this.reIndex(folder);
      });
    };

    // Apply the fix to both files synchronously
    if (this.data.template.kml.Document.Folder) {
      removeAndReindex(this.data.template.kml.Document.Folder);
    }
    if (this.data.waylines.kml.Document.Folder) {
      removeAndReindex(this.data.waylines.kml.Document.Folder);
    }

    return this;
  }

  /**
   * Inserts a new waypoint at the specified index.
   * Requires both the template version and wayline version of the data.
   */
  addWaypoint(index: number, templateWaypoint: Waypoint, waylineWaypoint: Waypoint): this {
    const insertAndReindex = (folders: RouteFolder[], mark: Waypoint) => {
      this.ensureArray(folders).forEach((folder: any) => {
        // Initialize the array if it doesn't exist at all
        if (!folder.Placemark) folder.Placemark = [];
        
        const placemarks = this.ensureArray(folder.Placemark);

        // Splice inserts the item directly into the array at `indexTo`
        // without deleting anything (the '0' argument)
        placemarks.splice(index, 0, mark);
        folder.Placemark = placemarks;

        // Automatically fix all the indexes!
        this.reIndex(folder);
      });
    };

    if (this.data.template.kml.Document.Folder) {
      insertAndReindex(this.data.template.kml.Document.Folder, templateWaypoint);
    }
    if (this.data.waylines.kml.Document.Folder) {
      insertAndReindex(this.data.waylines.kml.Document.Folder, waylineWaypoint);
    }

    return this;
  }

  // --- Private Helpers ---

  private reIndex(folder: RouteFolder) {
    this.ensureArray(folder.Placemark).forEach((placemark: Waypoint, newIndex: number) => {
      placemark['wpml:index'] = newIndex;

      if (placemark['wpml:actionGroup']) {
        this.ensureArray(placemark['wpml:actionGroup']).forEach((actionGroup: ActionGroup) => {
          actionGroup['wpml:actionGroupId'] = newIndex;
          actionGroup['wpml:actionGroupStartIndex'] = newIndex;
          actionGroup['wpml:actionGroupEndIndex'] = newIndex;
        });
      }
    });
  }

  private ensureArray(item: any): any[] {
    if (item === undefined || item === null) return [];
    if (Array.isArray(item)) return item;
    return [item];
  }
}