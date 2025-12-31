import React from 'react';
import { FiCopy, FiZap } from 'react-icons/fi';

const IllustratedGuide = ({ t }) => (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="relative mb-8">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                <FiCopy className="w-12 h-12 text-indigo-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <FiZap className="w-4 h-4 text-green-500" />
            </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('copyMove.guideTitle')}</h3>
        <div className="space-y-3 text-left max-w-xs">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{i}</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{t(`copyMove.guideStep${i}Title`)}</p>
                        <p className="text-xs text-gray-500">{t(`copyMove.guideStep${i}Desc`)}</p>
                    </div>
                </div>
            ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">{t('copyMove.guideFooter')}</p>
    </div>
);

export default IllustratedGuide;
