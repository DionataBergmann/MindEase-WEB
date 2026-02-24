"use client";

import { useEffect } from "react";
import { getPreferences, applyPreferencesToDocument } from "@/lib/preferences";

export function PreferencesApply() {
  useEffect(() => {
    const prefs = getPreferences();
    applyPreferencesToDocument(prefs);
  }, []);
  return null;
}
