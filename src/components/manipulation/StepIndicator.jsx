import React from 'react';
import { FiCheck } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';

const StepIndicator = ({ currentStep, steps, onStepClick, canNavigate }) => {
    const { t } = useLanguage();

    return (
        <div className="flex items-center justify-center gap-2">
            {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                const isClickable = canNavigate(index);

                return (
                    <React.Fragment key={step}>
                        {index > 0 && (
                            <div className={`h-0.5 w-8 transition-colors ${isCompleted ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        )}
                        <button
                            onClick={() => isClickable && onStepClick(index)}
                            disabled={!isClickable}
                            type="button"
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive
                                ? 'bg-emerald-600 text-white shadow-lg'
                                : isCompleted
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200'
                                    : isClickable
                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-white/20' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-gray-300 dark:bg-gray-600'
                                }`}>
                                {isCompleted ? <FiCheck size={12} /> : index + 1}
                            </span>
                            <span className="hidden sm:inline">{t(`manipulation.step.${step}`)}</span>
                        </button>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default StepIndicator;
