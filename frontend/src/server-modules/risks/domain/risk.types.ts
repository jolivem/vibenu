import type { RiskCategoryLevel, RiskLevel } from "../../../server-shared/domain/common.types";

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
