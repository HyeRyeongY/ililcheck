"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { ProjectCategory } from "@/lib/types";

interface CategoryContextType {
  currentCategory: ProjectCategory;
  setCurrentCategory: (category: ProjectCategory) => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [currentCategory, setCurrentCategory] = useState<ProjectCategory>("personal");

  return (
    <CategoryContext.Provider value={{ currentCategory, setCurrentCategory }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory() {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error("useCategory must be used within a CategoryProvider");
  }
  return context;
}
