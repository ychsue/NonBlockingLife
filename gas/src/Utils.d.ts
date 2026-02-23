declare const Utils: {
    calculateDuration: (start: number, end: number) => number;
    getNextOccurrence: (cronExpr: string, baseDate?: Date) => Date | null;
    generateId: (prefix: string) => string;
};
export default Utils;