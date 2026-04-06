export enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

export enum PanicDetected {
  YES = "YES",
  NO = "NO"
}

export enum PanicType {
  FLOOD = "Flood",
  HEALTH = "Health",
  GOVERNMENT = "Government",
  VIOLENCE = "Violence",
  EDUCATION = "Education",
  OTHER = "Other"
}

export enum CredibilityLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

export enum TrendingRisk {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

export enum PublicHarmRisk {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

export enum Decision {
  FLAG = "FLAG",
  SAFE = "SAFE"
}

export enum VoiceTone {
  ALERT = "ALERT",
  CAUTION = "CAUTION",
  SAFE = "SAFE"
}

export interface VoiceAlert {
  english: string;
  hindi: string;
  regional_language: string;
  language_used: string;
  voice_tone: VoiceTone;
  siren: string;
}

export interface MisinformationResult {
  language: string;
  clean_text: string;
  main_claim: string;
  misinformation_probability: number;
  panic_detected: PanicDetected;
  panic_type: PanicType;
  panic_risk: RiskLevel;
  source_type: string;
  credibility_score: number;
  credibility_level: CredibilityLevel;
  trend_probability: number;
  trending_risk: TrendingRisk;
  public_harm_type: string;
  public_harm_risk: PublicHarmRisk;
  final_risk_score: number;
  risk_level: RiskLevel;
  decision: Decision;
  corrected_message: string;
  warning_message: string;
  reason: string;
  voice_alert: VoiceAlert;
}
