import React from 'react';
import { FiShield, FiZap } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';

const IllustratedGuide = () => {
    const { t } = useLanguage();

    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="relative mb-8">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
                    <FiShield className="w-12 h-12 text-emerald-500" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <FiZap className="w-4 h-4 text-green-500" />
                </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('manipulation.guideTitle')}</h3>
            <div className="space-y-3 text-left max-w-xs">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{i}</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{t(`manipulation.guideStep${i}Title`)}</p>
                            <p className="text-xs text-gray-500">{t(`manipulation.guideStep${i}Desc`)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IllustratedGuide;
