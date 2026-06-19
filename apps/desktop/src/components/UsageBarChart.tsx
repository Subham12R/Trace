import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import type { TrendPoint } from "@/types/metrics";

interface UsageBarChartProps {
	data: TrendPoint[] | undefined;
	showCost: boolean;
}

export function UsageBarChart({ data, showCost }: UsageBarChartProps) {
	if (!data || data.length === 0) {
		return (
			<div className="bg-card border border-border rounded-xl p-6 h-64 flex items-center justify-center text-muted-foreground">
				No data available for this time range
			</div>
		);
	}

	const sources = Array.from(new Set(data.map((d) => d.source)));
	const buckets = Array.from(new Set(data.map((d) => d.bucket)));

	const chartData = buckets.map((bucket) => {
		const row: Record<string, number | string> = { bucket };
		sources.forEach((source) => {
			const point = data.find((d) => d.bucket === bucket && d.source === source);
			row[source] = showCost
				? point?.cost ?? 0
				: (point?.input_tokens ?? 0) + (point?.output_tokens ?? 0);
		});
		return row;
	});

	const colors = ["#8b7355", "#a08060", "#6b8e6b", "#b89a7a", "#7a9a9a", "#c4a882"];

	return (
		<div className="bg-card border border-border rounded-xl p-4">
			<h3 className="text-sm font-medium text-muted-foreground mb-4 font-serif">
				{showCost ? "Cost Trends" : "Token Usage Trends"}
			</h3>
			<ResponsiveContainer width="100%" height={280}>
				<BarChart data={chartData}>
					<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
					<XAxis dataKey="bucket" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
					<YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
					<Tooltip
						contentStyle={{
							backgroundColor: "hsl(var(--card))",
							border: "1px solid hsl(var(--border))",
							borderRadius: "8px",
							color: "hsl(var(--foreground))",
						}}
					/>
					<Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))" }} />
					{sources.map((source, i) => (
						<Bar
							key={source}
							dataKey={source}
							fill={colors[i % colors.length]}
							radius={[4, 4, 0, 0]}
						/>
					))}
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
