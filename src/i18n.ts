import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./lang/en.json";
import fr from "./lang/fr.json";
import { deviceLanguage } from "./utils/settings";

const resources = {
    en: {
        translation: en
    },
    fr: {
        translation: fr
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        // The settings decide from here on (`SettingsContext` switches to `settings.language`);
        // this only spares the first render a flash of English on a French device. It was a
        // hard-coded "en", which overrode the detector this used to load and started every new
        // visitor in English.
        lng: deviceLanguage(),
        fallbackLng: "en",

        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;