

export interface DjiKmlRoot {
  "?xml"?: any;
  kml: {
    "@_xmlns"?: string;
    "@_xmlns:wpml"?: string;
    Document: DjiDocument;
  };
}

export interface DjiDocument {
  // Template Only
  "wpml:author"?: string;
  "wpml:createTime"?: number;
  "wpml:updateTime"?: number;

  "wpml:missionConfig": MissionConfig;

  // Note: fast-xml-parser will turn this into an array because of our config!
  Folder: RouteFolder[];
}

export interface MissionConfig {
  "wpml:flyToWaylineMode": string;
  "wpml:finishAction": string;
  "wpml:exitOnRCLost": string;
  "wpml:executeRCLostAction": string;
  "wpml:takeOffSecurityHeight": number;
  "wpml:globalTransitionalSpeed": number;
  "wpml:globalRTHHeight": number;
  "wpml:waylineAvoidLimitAreaMode": number;

  // Template Only
  "wpml:takeOffRefPoint"?: string;
  "wpml:takeOffRefPointAGLHeight"?: number;

  "wpml:droneInfo": {
    "wpml:droneEnumValue": number;
    "wpml:droneSubEnumValue": number;
  };
  "wpml:payloadInfo": {
    "wpml:payloadEnumValue": number;
    "wpml:payloadSubEnumValue": number;
    "wpml:payloadPositionIndex": number;
  };
}

export interface RouteFolder {
  "wpml:templateId": number;
  "wpml:autoFlightSpeed": number;

  // Template Only
  "wpml:templateType"?: string;
  "wpml:globalHeight"?: number;
  "wpml:caliFlightEnable"?: number;
  "wpml:gimbalPitchMode"?: string;
  "wpml:globalUseStraightLine"?: number;
  "wpml:globalWaypointTurnMode"?: string;
  "wpml:waylineCoordinateSysParam"?: any;
  "wpml:globalWaypointHeadingParam"?: any;
  "wpml:payloadParam"?: any;

  // Waylines Only
  "wpml:waylineId"?: number;
  "wpml:distance"?: number;
  "wpml:duration"?: number;
  "wpml:executeHeightMode"?: string;
  "wpml:realTimeFollowSurfaceByFov"?: number;

  // The actual waypoints!
  Placemark: Waypoint[];
}

export interface Waypoint {
  Point: {
    coordinates: string; // "lng,lat"
  };
  "wpml:index": number;
  "wpml:waypointSpeed": number;
  "wpml:isRisky": number;
  "wpml:useStraightLine"?: number;

  // Template Heights
  "wpml:height"?: number;
  "wpml:ellipsoidHeight"?: number;
  // Waylines Heights
  "wpml:executeHeight"?: number;

  // Template "Use Global" Flags
  "wpml:useGlobalSpeed"?: number;
  "wpml:useGlobalHeadingParam"?: number;
  "wpml:useGlobalTurnParam"?: number;

  // Waylines Specifics
  "wpml:waypointWorkType"?: number;
  "wpml:waypointGimbalHeadingParam"?: {
    "wpml:waypointGimbalPitchAngle": number;
    "wpml:waypointGimbalYawAngle": number;
  };

  "wpml:waypointHeadingParam": WaypointHeadingParam;
  "wpml:waypointTurnParam": WaypointTurnParam;

  // fast-xml-parser array
  "wpml:actionGroup"?: ActionGroup[];
}

export interface WaypointHeadingParam {
  "wpml:waypointHeadingMode": string;
  "wpml:waypointHeadingAngle": number;
  "wpml:waypointPoiPoint": string;
  "wpml:waypointHeadingPathMode": string;
  "wpml:waypointHeadingPoiIndex": number;
  "wpml:waypointHeadingAngleEnable"?: number; // Waylines only
}

export interface WaypointTurnParam {
  "wpml:waypointTurnMode": string;
  "wpml:waypointTurnDampingDist": number;
}

export interface ActionGroup {
  "wpml:actionGroupId": number;
  "wpml:actionGroupStartIndex": number;
  "wpml:actionGroupEndIndex": number;
  "wpml:actionGroupMode": string;
  "wpml:actionTrigger": {
    "wpml:actionTriggerType": string;
  };
  // fast-xml-parser array
  "wpml:action": Action[];
}

export interface Action {
  "wpml:actionId": number;
  "wpml:actionActuatorFunc": string; // e.g., "rotateYaw", "gimbalRotate", "orientedShoot"
  "wpml:actionActuatorFuncParam": any; // Highly variable depending on the action!
}