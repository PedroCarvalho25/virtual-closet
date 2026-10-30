import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/stores/auth';
import { closetCache, useClosetCache } from '@/stores/cache';
import { friendlyError } from '@/lib/errors';
import { PAGE_SIZE } from '@/types/domain';

export function usePagedData<T extends { id: string }>(
  load: (page: number) => Promise<T[]>,
  cached: T[] = [],
) {
  const { online, session } = useAuth();
  const { revision } = useClosetCache();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const page = useRef(0);
  const sequence = useRef(0);
  const busy = useRef(false);
  const refresh = useCallback(
    async (append = false) => {
      if (!session?.user.id || closetCache.store.getState().revision !== revision) return;
      if (append && busy.current) return;
      const request = ++sequence.current;
      if (!online) {
        setLoading(false);
        setHasMore(false);
        setError(null);
        return;
      }
      busy.current = true;
      setLoading(true);
      setError(null);
      try {
        const nextPage = append ? page.current + 1 : 0;
        const rows = await load(nextPage);
        if (sequence.current !== request) return;
        setData((previous) =>
          append ? [...new Map([...previous, ...rows].map((row) => [row.id, row])).values()] : rows,
        );
        page.current = nextPage;
        setHasMore(rows.length === PAGE_SIZE);
      } catch (e) {
        if (sequence.current === request) setError(friendlyError(e));
      } finally {
        if (sequence.current === request) {
          setLoading(false);
          busy.current = false;
        }
      }
      // Cache writes must not trigger fresh network requests.
    },
    [online, load, revision, session?.user.id],
  );
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        sequence.current++;
        busy.current = false;
      };
    }, [refresh]),
  );
  return {
    data: online ? data : cached,
    loading: online && loading,
    error: online ? error : null,
    hasMore: online && hasMore,
    refresh: () => refresh(),
    more: () => {
      if (hasMore && !loading) void refresh(true);
    },
  };
}

export function useData<T>(load: () => Promise<T>, cached: T | null = null) {
  const { online, session } = useAuth();
  const { revision } = useClosetCache();
  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!session?.user.id || closetCache.store.getState().revision !== revision) return;
    const request = ++sequence.current;
    if (!online) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await load();
      if (sequence.current === request) setData(result);
    } catch (e) {
      if (sequence.current === request) setError(friendlyError(e));
    } finally {
      if (sequence.current === request) setLoading(false);
    }
  }, [online, load, revision, session?.user.id]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        sequence.current++;
      };
    }, [refresh]),
  );
  return {
    data: online ? data : cached,
    loading: online && loading,
    error: online ? error : null,
    refresh,
  };
}

export function useTask() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const locked = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function run<T>(action: () => Promise<T>, done?: (result: T) => void) {
    if (locked.current) return;
    const owner = useAuth.getState().session?.user.id;
    locked.current = true;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await action();
      if (alive.current && useAuth.getState().session?.user.id === owner) done?.(result);
    } catch (e) {
      if (alive.current && useAuth.getState().session?.user.id === owner)
        setError(friendlyError(e));
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return { busy, error, success, setError, setSuccess, run };
}
