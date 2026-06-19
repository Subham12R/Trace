import type { SessionSummary } from "@/types/metrics";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface SessionTableProps {
	data: SessionSummary[] | undefined;
}

export function SessionTable({ data }: SessionTableProps) {
	if (!data || data.length === 0) {
		return (
			<div className="bg-card border border-border rounded-xl p-6 text-muted-foreground text-sm">
				No sessions found for this time range.
			</div>
		);
	}

	return (
		<div className="bg-card border border-border rounded-xl overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="border-b border-border hover:bg-transparent">
						<TableHead className="text-muted-foreground">Source</TableHead>
						<TableHead className="text-muted-foreground">Session</TableHead>
						<TableHead className="text-muted-foreground">Model</TableHead>
						<TableHead className="text-muted-foreground text-right">Requests</TableHead>
						<TableHead className="text-muted-foreground text-right">Input</TableHead>
						<TableHead className="text-muted-foreground text-right">Output</TableHead>
						<TableHead className="text-muted-foreground text-right">Cost</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.map((session) => (
						<TableRow
							key={`${session.source}-${session.session_id}`}
							className="border-b border-border/50 hover:bg-muted/50 transition-colors"
						>
							<TableCell className="text-foreground capitalize font-medium">{session.source}</TableCell>
							<TableCell className="text-foreground font-mono text-xs truncate max-w-[200px]">
								{session.session_id}
							</TableCell>
							<TableCell className="text-muted-foreground">{session.model ?? "-"}</TableCell>
							<TableCell className="text-right text-foreground">{session.request_count}</TableCell>
							<TableCell className="text-right text-muted-foreground">{session.input_tokens.toLocaleString()}</TableCell>
							<TableCell className="text-right text-muted-foreground">{session.output_tokens.toLocaleString()}</TableCell>
							<TableCell className="text-right text-accent font-medium">
								${session.cost.toFixed(2)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
