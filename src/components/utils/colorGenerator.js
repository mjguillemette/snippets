class ColorGenerator {
  constructor() {
    // Base hues for different palette families (in HSL)
    this.paletteSeeds = {
      spectrum: {
        hueRange: [0, 360],
        saturation: [65, 75],
        lightness: [50, 60]
      },
      warm: { hueRange: [0, 60], saturation: [60, 70], lightness: [45, 65] },
      cool: { hueRange: [180, 280], saturation: [60, 70], lightness: [45, 65] },
      earth: { hueRange: [20, 50], saturation: [35, 55], lightness: [35, 65] },
      ocean: {
        hueRange: [170, 220],
        saturation: [50, 70],
        lightness: [40, 60]
      },
      sunset: { hueRange: [340, 40], saturation: [65, 80], lightness: [45, 60] }
    };

    // Cache for generated palettes
    this.paletteCache = new Map();
    this.currentPalette = null;
    this.currentPaletteType = "spectrum";
  }

  /**
   * Generate an adaptive palette that works for n items
   * Uses golden ratio for small sets, even distribution for large sets
   * @param {number} count - Number of colors needed
   * @param {string} paletteType - Type of palette (spectrum, warm, cool, etc.)
   * @returns {array} Array of hex colors
   */
  generateAdaptivePalette(count, paletteType = "spectrum") {
    const cacheKey = `${paletteType}-${count}`;

    // Return cached palette if available
    if (this.paletteCache.has(cacheKey)) {
      return this.paletteCache.get(cacheKey);
    }

    const palette = [];
    const seed = this.paletteSeeds[paletteType] || this.paletteSeeds.spectrum;

    if (count <= 7) {
      // For small numbers, use golden ratio distribution for maximum distinction
      palette.push(...this.generateGoldenRatioPalette(count, seed));
    } else if (count <= 20) {
      // For medium numbers, use curated distribution with slight variations
      palette.push(...this.generateCuratedPalette(count, seed));
    } else {
      // For large numbers, use systematic generation with micro-variations
      palette.push(...this.generateSystematicPalette(count, seed));
    }

    this.paletteCache.set(cacheKey, palette);
    return palette;
  }

  /**
   * Generate palette using golden ratio for optimal visual separation
   * Best for 2-7 colors
   */
  generateGoldenRatioPalette(count, seed) {
    const palette = [];
    const goldenRatio = 0.618033988749895;
    let hue = Math.random(); // Random starting point

    const hueRange = seed.hueRange[1] - seed.hueRange[0];
    const hueStart = seed.hueRange[0];

    for (let i = 0; i < count; i++) {
      hue = (hue + goldenRatio) % 1;
      const h = hueStart + hue * hueRange;

      // Vary saturation and lightness slightly for each color
      const s = this.randomInRange(seed.saturation[0], seed.saturation[1]);
      const l = this.randomInRange(seed.lightness[0], seed.lightness[1]);

      palette.push(this.hslToHex(h, s, l));
    }

    return palette;
  }

  /**
   * Generate curated palette with controlled variations
   * Best for 8-20 colors
   */
  generateCuratedPalette(count, seed) {
    const palette = [];
    const hueRange = seed.hueRange[1] - seed.hueRange[0];
    const hueStart = seed.hueRange[0];

    // Create primary hues evenly distributed
    const primaryCount = Math.min(count, 10);
    const hueStep = hueRange / primaryCount;

    for (let i = 0; i < count; i++) {
      const primaryIndex = i % primaryCount;
      const variation = Math.floor(i / primaryCount);

      // Base hue with slight offset for variations
      const h = hueStart + primaryIndex * hueStep + variation * 5;

      // Vary saturation and lightness based on variation level
      const s =
        seed.saturation[0] +
        (seed.saturation[1] - seed.saturation[0]) * ((variation * 0.3) % 1);
      const l =
        seed.lightness[0] +
        (((seed.lightness[1] - seed.lightness[0]) *
          (i / count + variation * 0.1)) %
          1);

      palette.push(this.hslToHex(h % 360, s, l));
    }

    return this.shuffleArray(palette); // Shuffle to avoid adjacent similar colors
  }

  /**
   * Generate systematic palette for large numbers
   * Best for 20+ colors
   */
  generateSystematicPalette(count, seed) {
    const palette = [];
    const hueRange = seed.hueRange[1] - seed.hueRange[0];
    const hueStart = seed.hueRange[0];

    // Create a grid of hue, saturation, and lightness variations
    const hueSteps = Math.ceil(Math.sqrt(count * 2));
    const saturationSteps = 3;
    const lightnessSteps = Math.ceil(count / (hueSteps * saturationSteps));

    let colorIndex = 0;

    for (let h = 0; h < hueSteps && colorIndex < count; h++) {
      for (let s = 0; s < saturationSteps && colorIndex < count; s++) {
        for (let l = 0; l < lightnessSteps && colorIndex < count; l++) {
          const hue = hueStart + (h / hueSteps) * hueRange;
          const sat =
            seed.saturation[0] +
            (s / saturationSteps) * (seed.saturation[1] - seed.saturation[0]);
          const light =
            seed.lightness[0] +
            (l / lightnessSteps) * (seed.lightness[1] - seed.lightness[0]);

          palette.push(this.hslToHex(hue % 360, sat, light));
          colorIndex++;
        }
      }
    }

    return this.optimizeColorOrder(palette.slice(0, count));
  }

  /**
   * Initialize a cohesive palette for a session
   * Call this once at the beginning to set up the color scheme
   */
  initializePalette(expectedGroups, paletteType = "spectrum") {
    // Generate a bit more colors than expected to handle growth
    const bufferSize = Math.max(expectedGroups * 1.5, expectedGroups + 10);
    this.currentPalette = this.generateAdaptivePalette(
      Math.ceil(bufferSize),
      paletteType
    );
    this.currentPaletteType = paletteType;
    this.colorIndex = 0;
    this.usedColors = new Set();
    return this.currentPalette;
  }

  /**
   * Get next available color from the current palette
   */
  getNextColor() {
    if (!this.currentPalette || this.colorIndex >= this.currentPalette.length) {
      // Expand palette if we run out
      const newSize = this.currentPalette ? this.currentPalette.length * 2 : 20;
      this.currentPalette = this.generateAdaptivePalette(
        newSize,
        this.currentPaletteType
      );
    }

    const color = this.currentPalette[this.colorIndex];
    this.colorIndex++;
    this.usedColors.add(color);
    return color;
  }

  /**
   * Optimize color order to maximize visual distinction between adjacent colors
   */
  optimizeColorOrder(colors) {
    if (colors.length <= 2) return colors;

    const optimized = [colors[0]];
    const remaining = colors.slice(1);

    while (remaining.length > 0) {
      const lastColor = optimized[optimized.length - 1];
      let maxDistance = -1;
      let bestIndex = 0;

      // Find the color most different from the last one
      for (let i = 0; i < remaining.length; i++) {
        const distance = this.colorDistance(lastColor, remaining[i]);
        if (distance > maxDistance) {
          maxDistance = distance;
          bestIndex = i;
        }
      }

      optimized.push(remaining[bestIndex]);
      remaining.splice(bestIndex, 1);
    }

    return optimized;
  }

  /**
   * Calculate perceptual distance between two colors
   */
  colorDistance(hex1, hex2) {
    const rgb1 = this.hexToRGB(hex1);
    const rgb2 = this.hexToRGB(hex2);

    // Weighted Euclidean distance (red is more perceptually important)
    const rWeight = 2;
    const gWeight = 4;
    const bWeight = 3;

    return Math.sqrt(
      rWeight * Math.pow(rgb1.r - rgb2.r, 2) +
        gWeight * Math.pow(rgb1.g - rgb2.g, 2) +
        bWeight * Math.pow(rgb1.b - rgb2.b, 2)
    );
  }

  // Utility functions

  randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  hslToHex(h, s, l) {
    h = h % 360;
    s = s / 100;
    l = l / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0,
      g = 0,
      b = 0;

    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (h >= 300 && h < 360) {
      r = c;
      g = 0;
      b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return this.rgbToHex(r, g, b);
  }

  hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null;
  }

  rgbToHex(r, g, b) {
    const toHex = (c) => {
      const hex = c.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}

// ============= Integration with your data code =============

// Initialize the color generator with expected number of groups
const colorGen = new ColorGenerator();

// Choose palette type: 'spectrum', 'warm', 'cool', 'earth', 'ocean', 'sunset'
colorGen.initializePalette(50, "spectrum"); // Start with 50 colors, will auto-expand if needed

// const DataSweptDataSeries = ({
const generatedGroupByInfo = (
  dataItem,
  index,
  groupBy,
  dateAggKey,
  groupByColor
) => {
  if (groupBy) {
    // Get the data value from the data item
    const dateValue = dataItem.time;
    const dateObj = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (groupBy === GC.appDateAggregationTag) {
      // format the time value into something usable based on dateAggKey
      key = !isNaN(dateObj.getTime())
        ? formatDateKey(dateObj, dateAggKey)
        : GC.appInvalidDate;
    } else {
      // get the data to check
      key = dataItem[groupBy];
    }

    // check to see if we already have a group by for this
    if (groupBy === GC.appDateAggregationTag) {
      if (groupByColor[key.split("/")[0]]) {
        color = groupByColor[key.split("/")[0]];
      } else {
        // Get next color from the cohesive palette
        color = colorGen.getNextColor();
        groupByColor[key.split("/")[0]] = color;
      }
    } else {
      if (groupByColor[key]) {
        color = groupByColor[key];
      } else {
        // Get next color from the cohesive palette
        color = colorGen.getNextColor();
        groupByColor[key] = color;
      }
    }

    if (groupBy !== GC.appDateAggregationTag) {
      key = `${key}||${formatDate(dateObj).toISOString()}`;
    }
  } else {
    // For non-grouped data, still use the cohesive palette
    color = colorGen.getNextColor();
    key = `${dataItem.processIdentifier}||${dataItem.serialNumber}||${
      dataItem.stationId
    }||${formatDate(dataItem.time.toISOString())}`;
  }

  // append our timestamp to the key for use in the legend
  result.color = color;
  result.key = key;
  return result;
};
// });
