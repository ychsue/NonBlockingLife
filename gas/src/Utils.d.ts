declare const Utils: {
    calculateDuration: (start: number, end: number) => string;
    getNextOccurrence: (cronExpr: string, baseDate?: Date) => Date | null;
    generateId: (prefix: string) => string;
};
export default Utils;