import React, { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { CloudOff, Clock, LockKeyhole, TriangleAlert } from 'lucide-react';
import { SyncHealth, subscribeToSyncHealth } from '../utils/syncStatus';
import { probe, subscribeToConnectivity } from '../utils/connectivity';

interface SyncStatusIndicatorProps {
    className?: string;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ className = '' }) => {
    const { taskStore, categoryStore } = useData();
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [pendingChanges, setPendingChanges] = useState<number>(0);
    const [health, setHealth] = useState<SyncHealth>('ok');

    useEffect(() => subscribeToSyncHealth(setHealth), []);

    // Track connectivity, which is the machine's own answer *and* whether the API responded.
    // Watching `navigator.onLine` alone is what let this show a healthy board while every
    // request was failing behind a captive portal.
    useEffect(() => {
        const unsubscribe = subscribeToConnectivity(setIsOnline);

        // The browser's events are the prompt to re-check, not the answer.
        const recheck = () => { void probe(); };
        window.addEventListener('online', recheck);
        window.addEventListener('offline', recheck);

        // One probe on mount, so the first render is not just the optimistic default.
        recheck();

        return () => {
            unsubscribe();
            window.removeEventListener('online', recheck);
            window.removeEventListener('offline', recheck);
        };
    }, []);

    // Update pending changes count
    useEffect(() => {
        // One queue, so one count. Summing the two stores used to double-count every entry —
        // and did it inconsistently, because each store held its own stale copy of the queue.
        const updatePendingChanges = () => {
            const store = taskStore ?? categoryStore;
            if (!store) {
                setPendingChanges(0);
                return;
            }

            store.getPendingChangesCount().then(setPendingChanges).catch(() => setPendingChanges(0));
        };

        // Initial update
        updatePendingChanges();

        // Set up interval to check for changes
        const interval = setInterval(updatePendingChanges, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [taskStore, categoryStore]);

    // If everything is synced and online, don't show anything
    if (isOnline && pendingChanges === 0 && health === 'ok') {
        return null;
    }

    return (
        <div className={`flex items-center gap-2 text-xs p-1 px-2 bg-black/5 rounded ${className}`}>
            {/*
              * An expired token is the common case now that board tokens are short-lived, and
              * reloading is the actual fix: /app mints a fresh one server-side on every render.
              * Nothing queued is lost — the writes wait for a session that can send them.
              */}
            {health === 'unauthorized' && (
                <div className="flex items-center gap-1.5">
                    <LockKeyhole size={14} className="text-red-500" />
                    <span className="text-gray-600">
                        Session expired — reload the page to keep saving
                    </span>
                </div>
            )}

            {/* The retention gate: this week is further back than the plan allows. */}
            {health === 'forbidden' && (
                <div className="flex items-center gap-1.5">
                    <TriangleAlert size={14} className="text-amber-500" />
                    <span className="text-gray-600">
                        This week is outside your plan&rsquo;s history
                    </span>
                </div>
            )}

            {!isOnline && (
                <div className="flex items-center gap-1.5">
                    <CloudOff size={14} className="text-red-500" />
                    <span className="text-gray-600">Offline</span>
                </div>
            )}

            {pendingChanges > 0 && (
                <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-500" />
                    <span className="text-gray-600">
                        {pendingChanges} change{pendingChanges !== 1 ? 's' : ''} pending
                    </span>
                </div>
            )}
        </div>
    );
};

export default SyncStatusIndicator;