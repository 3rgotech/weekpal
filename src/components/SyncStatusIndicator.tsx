import React, { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { CloudOff, Clock } from 'lucide-react';

interface SyncStatusIndicatorProps {
    className?: string;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ className = '' }) => {
    const { taskStore, categoryStore } = useData();
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
    const [pendingChanges, setPendingChanges] = useState<number>(0);

    // Track online status
    useEffect(() => {
        const handleOnlineStatusChange = () => {
            setIsOnline(navigator.onLine);
        };

        window.addEventListener('online', handleOnlineStatusChange);
        window.addEventListener('offline', handleOnlineStatusChange);

        return () => {
            window.removeEventListener('online', handleOnlineStatusChange);
            window.removeEventListener('offline', handleOnlineStatusChange);
        };
    }, []);

    // Update pending changes count
    useEffect(() => {
        const updatePendingChanges = () => {
            const taskPending = taskStore?.getPendingChangesCount() || 0;
            const categoryPending = categoryStore?.getPendingChangesCount() || 0;
            setPendingChanges(taskPending + categoryPending);
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
    if (isOnline && pendingChanges === 0) {
        return null;
    }

    return (
        <div className={`flex items-center gap-2 text-xs p-1 px-2 bg-black/5 rounded ${className}`}>
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