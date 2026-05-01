import { Circle, G, Line, Polyline, Svg, Text as SvgText, View, Text } from "@react-pdf/renderer";
import type { AgeDistributionDto } from "@/types/location-analysis";
import {
  AGE_BUCKETS,
  AGE_CHART_DIMENSIONS,
  buildAgeChartModel,
} from "@/components/analysis/ageChart";
import { pdfStyles } from "./pdfStyles";

interface Props {
  iris: AgeDistributionDto;
  commune: AgeDistributionDto | null;
  france: AgeDistributionDto | null;
  showCommune: boolean;
}

export function AgeChartPdf({ iris, commune, france, showCommune }: Props) {
  const { series, yTicks, x, y } = buildAgeChartModel({ iris, commune, france, showCommune });
  const { W, H, padL, padR, padB } = AGE_CHART_DIMENSIONS;

  return (
    <View>
      <Svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 180 }}>
        {yTicks.map((t) => (
          <G key={`g-${t}`}>
            <Line
              x1={padL}
              x2={W - padR}
              y1={y(t)}
              y2={y(t)}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <SvgText
              x={padL - 4}
              y={y(t) + 3}
              fill="#6b7280"
              style={{ fontSize: 9, textAnchor: "end" }}
            >
              {`${t}%`}
            </SvgText>
          </G>
        ))}
        {AGE_BUCKETS.map((b, i) => (
          <SvgText
            key={b.label}
            x={x(i)}
            y={H - padB + 14}
            fill="#6b7280"
            style={{ fontSize: 9, textAnchor: "middle" }}
          >
            {b.label}
          </SvgText>
        ))}
        {series.map((s) => {
          const points = AGE_BUCKETS.map((b, i) => `${x(i)},${y(s.data[b.key])}`).join(" ");
          return (
            <G key={s.name} opacity={s.opacity}>
              <Polyline
                points={points}
                stroke={s.color}
                strokeWidth={s.strokeWidth}
                fill="none"
              />
              {AGE_BUCKETS.map((b, i) => (
                <Circle
                  key={b.label}
                  cx={x(i)}
                  cy={y(s.data[b.key])}
                  r={s.dotRadius}
                  fill={s.color}
                />
              ))}
            </G>
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 4, justifyContent: "center" }}>
        {series.map((s) => (
          <View key={s.name} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: 8,
                height: 8,
                backgroundColor: s.color,
                borderRadius: 4,
              }}
            />
            <Text style={pdfStyles.small}>{s.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
