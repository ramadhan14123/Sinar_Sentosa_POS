import { useCallback, useState } from "react";

export function useActionGuard() {
  const [saving, setSaving] = useState(false);

  const guard = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | undefined> => {
      if (saving) return;
      setSaving(true);
      try {
        return await action();
      } finally {
        setSaving(false);
      }
    },
    [saving],
  );

  return { saving, guard };
}
