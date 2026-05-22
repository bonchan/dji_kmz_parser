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

  // GETTERS


  //SETTERS
  setAuthor(authorName: string): this {
    if (this.data.template.kml.Document) {
      this.data.template.kml.Document["wpml:author"] = authorName;
    }
    return this;
  }

  //FUNCTIONS
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

  /**
   * Returns the altitude offset (in meters) required for generating new waypoints.
   * - If EGM96/WGS84: Returns the Takeoff Reference Point altitude (Above Sea Level).
   * - If relativeToStartPoint / aboveGroundLevel: Returns 0.
   */
  getHeightOffset(): number {
    // 1. Grab the first folder (DJI routes usually define coordinate systems per folder)
    const folders = this.ensureArray(this.data.template.kml.Document.Folder);
    if (folders.length === 0) return 0;

    const folder = folders[0];

    // 2. Find the height mode. It usually lives in waylineCoordinateSysParam, 
    // but we fall back to executeHeightMode just to be perfectly safe.
    const coordSysParam = folder['wpml:waylineCoordinateSysParam'];
    const heightMode = coordSysParam?.['wpml:heightMode']
      || folder['wpml:executeHeightMode']
      || 'relativeToStartPoint';

    // 3. If it's an absolute altitude mode, extract the Z-axis from the takeoff point
    if (heightMode === 'EGM96' || heightMode === 'WGS84') {
      const missionConfig = this.data.template.kml.Document['wpml:missionConfig'];
      const takeOffRefPoint = missionConfig?.['wpml:takeOffRefPoint'];

      if (takeOffRefPoint) {
        // The format is always "longitude,latitude,altitude"
        const coords = takeOffRefPoint.split(',');
        if (coords.length === 3) {
          return Number(coords[2]) || 0;
        }
      }
    }

    // 4. For relativeToStartPoint, aboveGroundLevel, and realTimeFollowSurface, 
    // the Z-axis is relative, so no mathematical offset is needed.
    return 0;
  }

  getGeoidUndulation(): number {
    const folders = this.ensureArray(this.data.template.kml.Document.Folder);
    const folder = folders[0];
    const placemarks = this.ensureArray(folder.Placemark);
    if (placemarks.length === 0) return 0;

    const wp = placemarks[0];
    const ellipsoid = Number(wp['wpml:ellipsoidHeight']);
    const egm96 = Number(wp['wpml:height']);

    return ellipsoid - egm96;
  }


  buildTemplateBypassWp(lat: number, lon: number, relativeHeight: number, absoluteHeight: number): Waypoint {
    return {
      'wpml:index': -1,
      Point: { coordinates: `${lon},${lat}` },

      // --- TEMPLATE SPECIFIC ALTITUDE ---
      'wpml:height': relativeHeight,          // e.g., 70
      'wpml:ellipsoidHeight': absoluteHeight, // e.g., 385.91

      // --- Speed & Globals ---
      'wpml:waypointSpeed': 15,
      'wpml:useGlobalSpeed': 0,
      'wpml:isRisky': 0,
      'wpml:useGlobalHeadingParam': 1,
      'wpml:useGlobalTurnParam': 0,

      'wpml:waypointHeadingParam': {
        'wpml:waypointHeadingMode': 'followWayline',
        'wpml:waypointHeadingAngle': 0,
        'wpml:waypointPoiPoint': '0.000000,0.000000,0.000000',
        'wpml:waypointHeadingPathMode': 'followBadArc',
        'wpml:waypointHeadingPoiIndex': 0
      },
      'wpml:waypointTurnParam': {
        'wpml:waypointTurnMode': 'toPointAndPassWithContinuityCurvature',
        'wpml:waypointTurnDampingDist': 0.2
      }
    };
  }

  buildWaylineBypassWp(lat: number, lon: number, executeHeight: number): Waypoint {
    return {
      'wpml:index': -1,
      Point: { coordinates: `${lon},${lat}` },

      // --- WAYLINE SPECIFIC ALTITUDE ---
      'wpml:executeHeight': executeHeight,    // e.g., 385.91

      // --- Speed & Globals ---
      'wpml:waypointSpeed': 15,
      'wpml:useGlobalSpeed': 0,
      'wpml:isRisky': 0,
      'wpml:useGlobalHeadingParam': 1,
      'wpml:useGlobalTurnParam': 0,

      'wpml:waypointHeadingParam': {
        'wpml:waypointHeadingMode': 'followWayline',
        'wpml:waypointHeadingAngle': 0,
        'wpml:waypointPoiPoint': '0.000000,0.000000,0.000000',
        'wpml:waypointHeadingPathMode': 'followBadArc',
        'wpml:waypointHeadingPoiIndex': 0
      },
      'wpml:waypointTurnParam': {
        'wpml:waypointTurnMode': 'toPointAndPassWithContinuityCurvature',
        'wpml:waypointTurnDampingDist': 0.2
      }
    };
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