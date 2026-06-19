import { useRef, useState } from "react";
import { User, Shield, Zap, BarChart3, Flame, Pencil, Camera, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useMetrics, useProviders, useStreak, useModels } from "@/hooks/useMetrics";
import { ProviderLogo } from "./ProviderLogo";
import { ModelBadge } from "./ModelBadge";
import { MotionCard } from "./MotionCard";
import { extractModelName } from "@/lib/modelName";
import { getStoredProfile, setStoredProfile } from "./OnboardingPage";

export function ProfilePage() {
	const { data: metrics } = useMetrics("all");
	const { data: providers } = useProviders();
	const { data: streak } = useStreak(12);
	const { data: models } = useModels("all");

	const [profile, setProfile] = useState(() => getStoredProfile());
	const [editing, setEditing] = useState(false);
	const [draftName, setDraftName] = useState(profile.name);
	const [draftAvatar, setDraftAvatar] = useState<string | null>(profile.avatar);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const startEdit = () => {
		setDraftName(profile.name);
		setDraftAvatar(profile.avatar);
		setEditing(true);
	};

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => setDraftAvatar(ev.target?.result as string);
		reader.readAsDataURL(file);
	};

	const saveProfile = () => {
		const next = { name: draftName.trim() || "Trace User", avatar: draftAvatar };
		setStoredProfile(next);
		setProfile(next);
		setEditing(false);
		toast.success("Profile updated");
	};

	const detectedProviders = providers?.filter((p) => p.installed) || [];
	const topModels = (models || []).slice(0, 6);
	const streakDays = streak?.days || [];
	const longestStreak = streakDays.reduce(
		(acc, day) => {
			if (day.count > 0) {
				acc.current++;
				acc.longest = Math.max(acc.longest, acc.current);
			} else {
				acc.current = 0;
			}
			return acc;
		},
		{ current: 0, longest: 0 }
	).longest;

	return (
		<div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
			{/* Hero profile band */}
			<MotionCard className="app-hero relative overflow-hidden rounded-2xl p-6 sm:p-8 mb-6 lg:mb-8 text-[#fffbf7]">
				{!editing && (
					<button
						onClick={startEdit}
						className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-lg border border-[#fffbf7]/20 bg-[#fffbf7]/10 px-3 py-1.5 text-xs font-medium text-[#fffbf7] backdrop-blur-sm transition-colors hover:bg-[#fffbf7]/20"
					>
						<Pencil className="size-3.5" />
						Edit
					</button>
				)}
				<div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
					<div className="relative shrink-0">
						<div className="size-24 rounded-2xl overflow-hidden border-2 border-[#fffbf7]/20 bg-[#fffbf7]/10 flex items-center justify-center">
							{(editing ? draftAvatar : profile.avatar) ? (
								<img src={(editing ? draftAvatar : profile.avatar) as string} alt={profile.name} className="size-full object-cover" />
							) : (
								<User className="size-9 text-[#fffbf7]/80" />
							)}
						</div>
						{editing && (
							<button
								onClick={() => fileInputRef.current?.click()}
								className="absolute -bottom-2 -right-2 inline-flex items-center justify-center size-8 rounded-lg border border-[#fffbf7]/20 bg-[#171717] text-[#fffbf7] hover:bg-[#39393b] transition-colors"
								aria-label="Change photo"
							>
								<Camera className="size-4" />
							</button>
						)}
						<input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
					</div>

					<div className="min-w-0 flex-1">
						<p className="text-[11px] font-medium  tracking-[0.14em] text-[#fffbf7]/55">Your profile</p>
						{editing ? (
							<div className="mt-2 flex flex-col gap-3">
								<input
									type="text"
									value={draftName}
									onChange={(e) => setDraftName(e.target.value)}
									placeholder="Your name"
									autoFocus
									className="w-full max-w-sm rounded-lg border border-[#fffbf7]/20 bg-[#fffbf7]/10 px-3 py-2 text-lg font-medium text-[#fffbf7] placeholder:text-[#fffbf7]/40 outline-none focus:border-[#fffbf7]/40"
								/>
								<div className="flex items-center gap-2">
									<button
										onClick={saveProfile}
										className="inline-flex items-center gap-1.5 rounded-lg bg-[#fffbf7] px-3.5 py-2 text-sm font-medium text-[#171717] hover:bg-[#f5f2ef] transition-colors"
									>
										<Check className="size-4" />
										Save
									</button>
									<button
										onClick={() => setEditing(false)}
										className="inline-flex items-center gap-1.5 rounded-lg border border-[#fffbf7]/20 bg-transparent px-3.5 py-2 text-sm font-medium text-[#fffbf7] hover:bg-[#fffbf7]/10 transition-colors"
									>
										<X className="size-4" />
										Cancel
									</button>
								</div>
							</div>
						) : (
							<>
								<h1 className="font-display text-2xl sm:text-3xl lg:text-3xl leading-[1.05] tracking-tight mt-1 [overflow-wrap:anywhere]">
									{profile.name || "Trace User"}
								</h1>
								<p className="mt-2 text-sm text-[#fffbf7]/55">
									A local, private summary of your AI coding usage.
								</p>
							</>
						)}
					</div>
				</div>
			</MotionCard>

			{/* Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 lg:mb-8">
				<ProfileStat index={0} icon={<BarChart3 className="size-4 text-[var(--app-ink)]" />} label="Total Requests" value={metrics?.total_requests?.toLocaleString() || "0"} />
				<ProfileStat index={1} icon={<Zap className="size-4 text-[var(--app-ink)]" />} label="Total Tokens" value={metrics ? `${((metrics.input_tokens + metrics.output_tokens) / 1000).toFixed(1)}k` : "0"} />
				<ProfileStat index={2} icon={<Flame className="size-4 text-[var(--app-ink)]" />} label="Longest Streak" value={`${longestStreak}d`} />
				<ProfileStat index={3} icon={<Shield className="size-4 text-[var(--app-ink)]" />} label="Providers" value={detectedProviders.length.toString()} />
			</div>

			{/* Top Models */}
			<MotionCard index={4} className="bg-[var(--app-soft)] rounded-2xl border-2 border-[var(--app-hairline)] p-5 sm:p-6 mb-6 card-elevate card-depth">
				<h3 className="text-base sm:text-lg font-semibold text-[var(--app-ink)] mb-4">Most-Used Models</h3>
				{topModels.length === 0 ? (
					<p className="text-sm text-[var(--app-muted)]">No model usage yet.</p>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{topModels.map((m) => (
							<div
								key={`${m.source}-${m.model}`}
								className="flex items-center gap-3 p-3 bg-[var(--app-canvas)] rounded-lg border border-[var(--app-hairline)]"
							>
								<ModelBadge model={m.model} source={m.source} size="lg" />
								<div className="min-w-0">
									<p className="text-sm font-medium text-[var(--app-ink)] truncate">{extractModelName(m.model)}</p>
									<p className="text-[11px] text-[var(--app-muted)]">
										{m.request_count.toLocaleString()} req · ${m.cost.toFixed(2)}
									</p>
								</div>
							</div>
						))}
					</div>
				)}
			</MotionCard>

			{/* Connected Providers */}
			<MotionCard index={5} className="bg-[var(--app-soft)] rounded-2xl border-2 border-[var(--app-hairline)] p-5 sm:p-6 card-elevate card-depth">
				<h3 className="text-base sm:text-lg font-semibold text-[var(--app-ink)] mb-4">Connected Providers</h3>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{detectedProviders.length === 0 ? (
						<p className="text-sm text-[var(--app-muted)]">No providers detected yet.</p>
					) : (
						detectedProviders.map((provider) => (
							<div
								key={provider.id}
								className="flex items-center gap-3 p-3 bg-[var(--app-canvas)] rounded-lg border border-[var(--app-hairline)]"
							>
								<ProviderLogo provider={provider} size="md" />
								<div className="min-w-0">
									<p className="text-sm font-medium text-[var(--app-ink)] capitalize">{provider.name}</p>
									<p className="text-[11px] text-[var(--app-muted)] truncate">{provider.defaults[0]}</p>
								</div>
							</div>
						))
					)}
				</div>
			</MotionCard>
		</div>
	);
}

function ProfileStat({ icon, label, value, index }: { icon: React.ReactNode; label: string; value: string; index: number }) {
	return (
		<MotionCard index={index} className="bg-[var(--app-soft)] rounded-2xl border-2 border-[var(--app-hairline)] p-4 card-elevate card-depth">
			<div className="flex items-center gap-2 text-[var(--app-muted)] mb-1">
				<span className="inline-flex items-center justify-center size-7 rounded-md bg-[var(--app-canvas)] border border-[var(--app-hairline)]">
					{icon}
				</span>
				<span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide">{label}</span>
			</div>
			<p className="text-xl sm:text-2xl font-semibold text-[var(--app-ink)] mt-2">{value}</p>
		</MotionCard>
	);
}
