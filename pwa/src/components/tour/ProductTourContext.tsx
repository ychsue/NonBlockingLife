import { createContext, useContext, type ReactNode } from "react";
import type { ProductTourConfig, ProductTourStep } from "./productTourTypes";

type ProductTourContextValue = {
  activeTour: ProductTourConfig | null;
  activeStep: ProductTourStep | null;
  isRunning: boolean;
  completedTours: string[];
  tours: ProductTourConfig[];
  startTour: (tourId: string, options?: { force?: boolean }) => void;
  completeTour: (tourId: string) => void;
  nextStep: () => void;
  resetTour: () => void;
  clearCompletedTours: () => void;
};

const ProductTourContext = createContext<ProductTourContextValue | null>(null);

export function ProductTourProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ProductTourContextValue;
}) {
  return (
    <ProductTourContext.Provider value={value}>
      {children}
    </ProductTourContext.Provider>
  );
}

export function useProductTourContext() {
  const context = useContext(ProductTourContext);

  if (!context) {
    throw new Error("useProductTourContext must be used within ProductTourProvider");
  }

  return context;
}
