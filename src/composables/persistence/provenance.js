// Provenance stamped onto every newly set personal best (BRAIN-SYNC-SPEC
// §24/§26): which session set it, under which metric definition, and — for
// campaign levels — under which level definition. Lets a merge tell
// "better" from "measured differently", and tie a best back to its session.
//
// Bests recorded before this existed simply lack these fields; the merge
// engine then falls back to the game's normal comparison, so no existing
// best is ever displaced just for being unstamped.

import { METRIC_VERSIONS } from '../../constants/metricVersions.js'
import { levelVersionOf } from '../../constants/levelVersions.js'

export function bestProvenance(game, stamp, level) {
  const provenance = { sessionId: stamp.sessionId, metricVersion: METRIC_VERSIONS[game] }
  const levelVersion = levelVersionOf(game, level)
  if (levelVersion !== undefined) provenance.levelVersion = levelVersion
  return provenance
}
