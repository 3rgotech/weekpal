import React from "react";
import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SignupCallToActionProps {
    signupUrl: string;
    loginUrl?: string;
}

/**
 * What the demo board shows where a real board shows the account button.
 *
 * A demo visitor has no account, so the button used to hide itself entirely — leaving the one
 * place they would look for "how do I keep this" empty. This offers the account instead, and is
 * the only deliberately loud control in the top bar: everything else there is a muted icon,
 * which is what makes a filled, labelled button read as the way out of the demo.
 *
 * The halo is a slow `animate-ping` ring behind the button rather than animation on the button
 * itself, so the label never moves or blurs under it. It is hidden outright under
 * `prefers-reduced-motion` — an endlessly pulsing element in a fixed toolbar is exactly the kind
 * of thing that preference exists to stop.
 */
const SignupCallToAction: React.FC<SignupCallToActionProps> = ({ signupUrl, loginUrl }) => {
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-3 px-4 border-l border-slate-300 dark:border-sky-900">
            <span className="relative inline-flex">
                {/* `pointer-events-none` is load-bearing: `animate-ping` scales this layer to
                    twice the button's size, so without it the halo reaches across the toolbar and
                    swallows clicks on whatever sits beside it — the settings button, in practice.
                    It is decoration, and decoration should not be clickable. */}
                <span
                    className="absolute inset-0 rounded-full opacity-75 bg-sky-400 animate-ping motion-reduce:hidden pointer-events-none"
                    aria-hidden="true"
                />
                <a
                    href={signupUrl}
                    className="relative inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition rounded-full shadow-xs bg-sky-600 hover:bg-sky-700 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                    <UserPlus size={16} aria-hidden="true" />
                    {t("actions.sign_up")}
                </a>
            </span>

            {loginUrl && (
                <a
                    href={loginUrl}
                    className="text-sm underline transition text-slate-600 dark:text-slate-300 underline-offset-4 hover:text-sky-700 dark:hover:text-sky-300 motion-reduce:transition-none"
                >
                    {t("actions.log_in")}
                </a>
            )}
        </div>
    );
};

export default SignupCallToAction;
