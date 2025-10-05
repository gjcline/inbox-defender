// Later we will replace mock data with API:
// GET /api/reports/weekly
// GET /api/messages/blocked?limit=50
// POST /api/settings (strictness, digest_frequency)
// POST /api/gmail/label/restore { gmail_msg_id }

import { useState, useEffect } from 'react';

export type Strictness = 'LOW' | 'MEDIUM' | 'HIGH';
export type DigestFrequency = 'weekly' | 'monthly';

const STRICTNESS_KEY = 'id_strictness';
const DIGEST_KEY = 'id_digest_frequency';

export const useStrictness = () => {
  const [strictness, setStrictnessState] = useState<Strictness>(() => {
    const stored = localStorage.getItem(STRICTNESS_KEY);
    return (stored as Strictness) || 'MEDIUM';
  });

  const [digestFrequency, setDigestFrequencyState] = useState<DigestFrequency>(() => {
    const stored = localStorage.getItem(DIGEST_KEY);
    return (stored as DigestFrequency) || 'weekly';
  });

  const setStrictness = (value: Strictness) => {
    setStrictnessState(value);
    localStorage.setItem(STRICTNESS_KEY, value);
  };

  const setDigestFrequency = (value: DigestFrequency) => {
    setDigestFrequencyState(value);
    localStorage.setItem(DIGEST_KEY, value);
  };

  const getMultiplier = (): number => {
    switch (strictness) {
      case 'LOW':
        return 0.75;
      case 'MEDIUM':
        return 1.0;
      case 'HIGH':
        return 1.25;
    }
  };

  const getScoreThreshold = (): number => {
    switch (strictness) {
      case 'LOW':
        return 0.80;
      case 'MEDIUM':
        return 0.70;
      case 'HIGH':
        return 0.60;
    }
  };

  const getFalsePositiveRate = (): number => {
    switch (strictness) {
      case 'LOW':
        return 0.005;
      case 'MEDIUM':
        return 0.015;
      case 'HIGH':
        return 0.03;
    }
  };

  const getHelperText = (): string => {
    switch (strictness) {
      case 'LOW':
        return 'Catches obvious outreach; minimal risk';
      case 'MEDIUM':
        return 'Balanced filtering (recommended)';
      case 'HIGH':
        return 'Most aggressive; review digests recommended';
    }
  };

  return {
    strictness,
    setStrictness,
    digestFrequency,
    setDigestFrequency,
    multiplier: getMultiplier(),
    scoreThreshold: getScoreThreshold(),
    falsePositiveRate: getFalsePositiveRate(),
    helperText: getHelperText(),
  };
};
