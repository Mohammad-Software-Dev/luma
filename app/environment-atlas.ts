// Alpha-isolated scenery frames, source pixel coordinates.
export const terrainFrames = [[0,0,744,315],[768,0,735,329],[0,360,736,269],[768,360,739,270],[0,720,756,307],[768,720,720,302]] as const;
export const propFrames = [[0,0,583,507],[640,0,258,504],[1280,0,451,527],[0,540,321,502],[640,540,537,489],[1280,540,453,485]] as const;
// Walkable crown position measured inside each terrain crop; foliage stays decorative.
export const terrainTops = [76,122,35,44,55,42] as const;
