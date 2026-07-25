export interface SilenceRange {
  start: number;
  end: number;
  duration: number;
}

export interface DetectionSettings {
  thresholdDb: number;
  minimumDurationSeconds: number;
  paddingSeconds: number;
}

export interface DetectionSummary {
  rawSilenceCount: number;
  removableRangeCount: number;
  rawSilenceDuration: number;
  removableDuration: number;
  estimatedFinalDuration: number;
  percentageRemoved: number;
}

export interface DetectionResult {
  inputFile: string;
  mediaDuration: number;
  settings: DetectionSettings;
  summary: DetectionSummary;
  rawRanges: SilenceRange[];
  removableRanges: SilenceRange[];
}

export interface FolderFailure {
  inputFile: string;
  error: string;
}

export interface FolderReport {
  inputFolder: string;
  generatedAt: string;
  successfulFiles: number;
  failedFiles: number;
  totals: {
    durationAnalyzed: number;
    silenceSectionsDetected: number;
    rawSilenceDuration: number;
    removableDuration: number;
  };
  results: DetectionResult[];
  failures: FolderFailure[];
}
