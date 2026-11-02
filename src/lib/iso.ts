/**
 * world-atlas identifies countries by ISO 3166-1 numeric codes (as strings).
 * The dataset uses alpha-3. Only the markets in data.json need a mapping;
 * anything else on the map is "no data" by design.
 */
export const ISO_NUMERIC_TO_ALPHA3: Readonly<Record<string, string>> = {
  "840": "USA",
  "124": "CAN",
  "276": "DEU",
  "826": "GBR",
  "250": "FRA",
  "380": "ITA",
  "724": "ESP",
  "392": "JPN",
  "156": "CHN",
  "356": "IND",
  "036": "AUS",
  "076": "BRA",
  "484": "MEX",
};
