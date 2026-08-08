import { useState } from "react";
import { AlertTriangle, Shield, ShieldOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../stores/appStore";
import { clsx } from "clsx";

export default function PermissionDialog() {
  const { t } = useTranslation();
  const { permissionQueue, resolvePermission } = useAppStore();
  const [remember, setRemember] = useState(false);

  const current = permissionQueue[0];
  if (!current) return null;

  const riskColors = {
    low: "text-blue-400 border-blue-800/50 bg-blue-950/30",
    medium: "text-yellow-400 border-yellow-800/50 bg-yellow-950/30",
    high: "text-red-400 border-red-800/50 bg-red-950/30",
  };

  const riskIcon = {
    low: <Shield className="w-5 h-5 text-blue-400" />,
    medium: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    high: <ShieldOff className="w-5 h-5 text-red-400" />,
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-2 border border-border-1 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className={clsx(
          "flex items-center gap-3 px-6 py-4 border-b rounded-t-2xl",
          riskColors[current.riskLevel]
        )}>
          {riskIcon[current.riskLevel]}
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              {t("security.permission_required")}
            </h2>
            <p className="text-xs text-zinc-400 capitalize">{current.riskLevel} risk operation</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-zinc-300 mb-2">
            {current.description}
          </p>

          <div className="bg-surface-1 border border-border-1 rounded-lg px-3 py-2 mt-3">
            <p className="text-xs font-mono text-zinc-400 break-all">{current.resource}</p>
          </div>

          <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 accent-arkium-500 rounded"
            />
            <span className="text-xs text-zinc-400">{t("security.remember")}</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={() => {
              resolvePermission(current.id, false, remember);
              setRemember(false);
            }}
            className="flex-1 btn-secondary justify-center"
          >
            {t("security.deny")}
          </button>
          <button
            onClick={() => {
              resolvePermission(current.id, true, remember);
              setRemember(false);
            }}
            className="flex-1 btn-primary justify-center"
          >
            {t("security.allow")}
          </button>
        </div>
      </div>
    </div>
  );
}
