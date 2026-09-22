// Curated, explicit flag-confusion clusters (SPEC §9 tier 4 — "strong
// confusion-set choices... plausible alternatives, not random nonsense").
// Hand-picked from real-world well-known mix-ups, not derived from
// patternTag, so this deliberately overlaps with (and sharpens) tier 3's
// pattern-similarity matches for the handful of countries notorious enough
// to deserve a dedicated cluster. Every code here must exist in
// COUNTRIES — enforced by dataset.test.js.
export const CONFUSION_CLUSTERS = [
  ['ro', 'td', 'ad', 'md'], // Romania / Chad / Andorra / Moldova — near-identical vertical tricolors
  ['id', 'mc', 'pl', 'sg'], // Indonesia / Monaco / Poland / Singapore — red-white bicolors
  ['ie', 'ci'], // Ireland / Cote d'Ivoire — mirrored green-white-orange
  ['nl', 'lu'], // Netherlands / Luxembourg — near-identical horizontal tricolors
  ['au', 'nz'], // Australia / New Zealand — Union Jack + Southern Cross
  ['ve', 'co', 'ec'], // Venezuela / Colombia / Ecuador — yellow-blue-red family
  ['ml', 'sn', 'gn'], // Mali / Senegal / Guinea — green-yellow-red vertical tricolors
  ['no', 'is'], // Norway / Iceland — Nordic cross, red-on-blue vs blue-on-red
  ['si', 'sk', 'ru'], // Slovenia / Slovakia / Russia — white-blue-red horizontal bands
  ['bh', 'qa'], // Bahrain / Qatar — white field + maroon/red serrated band
  ['lu', 'ht'], // Luxembourg / Haiti — near-identical blue-red-adjacent tricolor mixups
  ['sd', 'sy', 'ye', 'ps'], // Sudan / Syria / Yemen / Palestine — pan-Arab color family
  ['sn', 'ml', 'gn', 'cm'], // Senegal / Mali / Guinea / Cameroon — green-yellow-red variants
  ['ee', 'lv'], // Estonia / Latvia — pale horizontal bands, blue/black vs maroon
  ['co', 've'], // Colombia / Venezuela — yellow-blue-red, band-width differs
  ['pe', 'ca'], // Peru / Canada — red-white-red vertical bands (differ only in center emblem)
  ['bd', 'jp'], // Bangladesh / Japan — solid field with centered disc
  ['tn', 'tr'], // Tunisia / Turkey — red field, white disc/crescent-star
  ['gh', 'bo', 'et'], // Ghana / Bolivia / Ethiopia-adjacent horizontal tricolor family (red-yellow-green order variants)
]
