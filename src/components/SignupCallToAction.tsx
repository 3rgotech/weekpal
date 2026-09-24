import React from "react";
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
 * the only filled control in the top bar: everything else there is a bare glyph, which is what
 * makes a filled, labelled button read as the way out of the demo without having to pulse.
 */
const SignupCallToAction: React.FC<SignupCallToActionProps> = ({ signupUrl, loginUrl }) => {
    const { t } = useTranslation();

    return (
        <div className="flex shrink-0 items-center gap-2">
            {loginUrl && (
                <a
                    href={loginUrl}
                    className="rounded-lg px-3 py-2 text-[13px] font-semibold text-wp-fg-secondary transition-colors hover:bg-wp-track hover:text-wp-fg motion-reduce:transition-none"
                >
                    {t("actions.log_in")}
                </a>
            )}

            <a
                href={signupUrl}
                className="inline-flex items-center gap-1.5 rounded-lg bg-wp-accent px-3.5 py-2 text-[13px] font-bold text-wp-on-accent transition hover:brightness-110 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wp-accent"
            >
                {t("actions.sign_up")}
            </a>
        </div>
    );
};

export default SignupCallToAction;
