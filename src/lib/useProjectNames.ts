import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export function useProjectNames(): string[] {
  const [projectNames, setProjectNames] = useState<string[]>([]);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'tasks'), (snap) => {
      const names = [
        ...new Set(
          snap.docs
            .map((d) => d.data().drawing_name as string)
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, 'vi'));
      setProjectNames(names);
    });
    return () => unsub();
  }, []);

  return projectNames;
}
