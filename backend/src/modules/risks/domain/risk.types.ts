import type { RiskCategoryLevel, RiskLevel } from "../../../shared/domain/common.types.js";

export interface RiskCategory {
  code: string;
  name: string;
  level: RiskCategoryLevel;
  message: string;
}

export interface RiskAnalysis {
  categories: RiskCategory[];
  level: RiskLevel;
  score: number;
}
