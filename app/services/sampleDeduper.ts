import type { PacePoint } from "../utils/pace";

const MAX_SEEN_SAMPLE_KEYS = 80;

export class SampleDeduper {
  private seenSampleKeys: string[] = [];
  private seenSampleKeySet = new Set<string>();

  reset() {
    this.seenSampleKeys = [];
    this.seenSampleKeySet.clear();
  }

  hasSeen(point: PacePoint): boolean {
    const key = `${point.timestamp}:${point.latitude}:${point.longitude}`;

    if (this.seenSampleKeySet.has(key)) {
      return true;
    }

    this.seenSampleKeySet.add(key);
    this.seenSampleKeys.push(key);

    if (this.seenSampleKeys.length > MAX_SEEN_SAMPLE_KEYS) {
      const oldestKey = this.seenSampleKeys.shift();
      if (oldestKey != null) {
        this.seenSampleKeySet.delete(oldestKey);
      }
    }

    return false;
  }
}
