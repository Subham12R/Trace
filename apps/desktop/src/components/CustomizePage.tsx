import { useState, useRef } from "react";
import { Camera, Moon, Sun, Monitor, Save } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";
import { getStoredProfile } from "./OnboardingPage";
import { toast } from "sonner";

const USER_NAME_KEY = "trace-user-name";
const USER_AVATAR_KEY = "trace-user-avatar";
const USER_MEMORY_KEY = "trace-user-memory";

const THEMES = [
	{ id: "light" as const, label: "Light", icon: Sun, gradient: "from-[#fffbf7] to-[#f5f2ef]" },
	{ id: "dark" as const, label: "Dark", icon: Moon, gradient: "from-[#1a1a1a] to-[#0a0a0a]" },
	{ id: "system" as const, label: "System", icon: Monitor, gradient: "from-[#e5e2df] to-[#171717]" },
];

const ACCENT_BACKGROUNDS = [
	{ id: "ink", gradient: "bg-gradient-to-br from-[#171717] to-[#2a2a2a]" },
	{ id: "rose", gradient: "bg-gradient-to-br from-rose-300 to-orange-300" },
	{ id: "sky", gradient: "bg-gradient-to-br from-sky-300 to-indigo-300" },
	{ id: "emerald", gradient: "bg-gradient-to-br from-emerald-300 to-teal-300" },
	{ id: "violet", gradient: "bg-gradient-to-br from-violet-300 to-fuchsia-300" },
	{ id: "amber", gradient: "bg-gradient-to-br from-amber-300 to-yellow-200" },
	{ id: "slate", gradient: "bg-gradient-to-br from-slate-300 to-zinc-400" },
	{ id: "ocean", gradient: "bg-gradient-to-br from-cyan-300 to-blue-500" },
];

export function CustomizePage() {
	const { mode, setMode, accent, setAccent } = useThemeStore();
	const profile = getStoredProfile();

	const [name, setName] = useState(profile.name || "");
	const [avatar, setAvatar] = useState<string | null>(profile.avatar);
	const [memory, setMemory] = useState(localStorage.getItem(USER_MEMORY_KEY) === "true");
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => setAvatar(ev.target?.result as string);
		reader.readAsDataURL(file);
	};

	const handleSave = () => {
		localStorage.setItem(USER_NAME_KEY, name.trim() || "Trace User");
		if (avatar) localStorage.setItem(USER_AVATAR_KEY, avatar);
		else localStorage.removeItem(USER_AVATAR_KEY);
		localStorage.setItem(USER_MEMORY_KEY, String(memory));
		localStorage.setItem("trace-accent-bg", accent);
		toast.success("Preferences saved");
	};

	const initials = name
		? name
		.split(" ")
		.map((n) => n[0])
		.slice(0, 2)
		.join("")
		.toUpperCase()
		: "T";

	return (
		<div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
			<div className="mb-8">
				<h1 className="text-2xl sm:text-3xl font-semibold text-[var(--app-ink)] tracking-tight">Customize</h1>
				<p className="text-sm text-[var(--app-muted)] mt-1">Personalize how Trace looks and behaves.</p>
			</div>

			<div className="space-y-6">
				{/* Theme */}
				<section className="bg-[var(--app-soft)] rounded-[18px] border border-[var(--app-hairline)] p-5 sm:p-6">
					<div className="mb-5">
						<h2 className="text-base font-semibold text-[var(--app-ink)]">Appearance</h2>
						<p className="text-xs text-[var(--app-muted)] mt-0.5">Choose your preferred color scheme.</p>
					</div>
					<div className="flex gap-3">
						{THEMES.map((t) => {
							const Icon = t.icon;
							const active = mode === t.id;
							return (
								<button
									key={t.id}
									onClick={() => setMode(t.id)}
									className={`flex-1 rounded-xl border p-3 text-left transition-all ${
										active
											? "border-[var(--app-ink)] bg-[var(--app-canvas)] ring-1 ring-[var(--app-ink)]"
											: "border-[var(--app-hairline)] hover:border-[var(--app-muted)]/40"
									}`}
								>
									<div className={`w-full h-10 rounded-lg bg-gradient-to-br ${t.gradient} mb-3 border border-[var(--app-hairline)]`} />
									<div className="flex items-center gap-2">
										<Icon className="size-4 text-[var(--app-muted)]" />
										<span className="text-sm font-medium text-[var(--app-ink)]">{t.label}</span>
									</div>
								</button>
							);
						})}
					</div>
				</section>

				{/* Accent background */}
				<section className="bg-[var(--app-soft)] rounded-[18px] border border-[var(--app-hairline)] p-5 sm:p-6">
					<div className="mb-4">
						<h2 className="text-base font-semibold text-[var(--app-ink)]">Dashboard accent</h2>
						<p className="text-xs text-[var(--app-muted)] mt-0.5">Pick a backdrop tone for cards and highlights.</p>
					</div>
					<div className="flex flex-wrap gap-3">
						{ACCENT_BACKGROUNDS.map((bg) => (
							<button
								key={bg.id}
								onClick={() => setAccent(bg.id)}
								className={`size-10 rounded-full ${bg.gradient} border-2 transition-all ${
									accent === bg.id ? "border-[var(--app-ink)] scale-110" : "border-transparent hover:scale-105"
								}`}
								aria-label={`Select ${bg.id} accent`}
							/>
						))}
					</div>
				</section>

				{/* Profile */}
				<section className="bg-[var(--app-soft)] rounded-[18px] border border-[var(--app-hairline)] p-5 sm:p-6">
					<div className="mb-5">
						<h2 className="text-base font-semibold text-[var(--app-ink)]">Profile</h2>
						<p className="text-xs text-[var(--app-muted)] mt-0.5">How Trace addresses you across the app.</p>
					</div>

					<div className="flex items-center gap-4 mb-6">
						<button
							onClick={() => fileInputRef.current?.click()}
							className="group relative size-20 rounded-full border border-[var(--app-hairline)] bg-[var(--app-canvas)] overflow-hidden flex items-center justify-center transition-colors hover:border-[var(--app-ink)]"
						>
							{avatar ? (
								<img src={avatar} alt="Profile" className="size-full object-cover" />
							) : (
								<span className="text-2xl font-semibold text-[var(--app-ink)]">{initials}</span>
							)}
							<div className="absolute inset-0 bg-[var(--app-ink)]/0 group-hover:bg-[var(--app-ink)]/10 transition-colors flex items-center justify-center">
								<Camera className="size-5 text-[var(--app-ink)] opacity-0 group-hover:opacity-100 transition-opacity" />
							</div>
						</button>
						<input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
						<div>
							<p className="text-sm font-medium text-[var(--app-ink)]">Profile photo</p>
							<p className="text-xs text-[var(--app-muted)]">Tap to upload a new image</p>
						</div>
					</div>

					<div className="space-y-4">
						<div>
							<label className="block text-xs font-medium text-[var(--app-muted)] uppercase tracking-wide mb-1.5">Nickname</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="What should Trace call you?"
								className="w-full px-4 py-2.5 rounded-[12px] border border-[var(--app-hairline)] bg-[var(--app-canvas)] text-[var(--app-ink)] placeholder:text-[var(--app-muted)]/60 focus:outline-none focus:border-[var(--app-ink)] transition-colors"
							/>
						</div>
					</div>
				</section>

				{/* Memory */}
				<section className="bg-[var(--app-soft)] rounded-[18px] border border-[var(--app-hairline)] p-5 sm:p-6">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-base font-semibold text-[var(--app-ink)]">Memory</h2>
							<p className="text-xs text-[var(--app-muted)] mt-0.5">Remember preferences across sessions.</p>
						</div>
						<button
							onClick={() => setMemory((m) => !m)}
							className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
								memory ? "bg-[var(--app-ink)]" : "bg-[var(--app-hairline)]"
							}`}
						>
							<span
								className={`inline-block size-4 rounded-full bg-[var(--app-canvas)] transition-transform ${
									memory ? "translate-x-6" : "translate-x-1"
								}`}
							/>
						</button>
					</div>
				</section>

				{/* Save */}
				<div className="flex justify-end pt-2">
					<button
						onClick={handleSave}
						className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--app-ink)] text-[var(--app-canvas)] text-sm font-medium hover:opacity-90 transition-opacity"
					>
						<Save className="size-4" />
						Save preferences
					</button>
				</div>
			</div>
		</div>
	);
}
