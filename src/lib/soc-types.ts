import type { Severity } from './types';

export type ActivityEventType =
  | 'zero_width'
  | 'homoglyph'
  | 'emoji_stego'
  | 'image_lsb'
  | 'bidi'
  | 'prompt_injection'
  | 'ai_semantic'
  | 'safe'
  | 'extension';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: ActivityEventType;
  severity: Severity;
  message: string;
  source: 'scanner' | 'extension' | 'api';
}

export interface ExtensionEvent {
  id: string;
  timestamp: string;
  emailSubject: string;
  sender: string;
  threatType: string;
  score: number;
  severity: Severity;
  action: 'allowed' | 'warned' | 'blocked';
  fingerprint: string;
  source?: 'inbound' | 'outbound';
}
