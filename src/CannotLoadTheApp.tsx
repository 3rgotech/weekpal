import { Alert } from '@nextui-org/react';
import React from 'react'
import Logo from './components/Logo';

interface CannotLoadTheAppProps {
    reason: 'indexeddb_unavailable' | null;
}

const CannotLoadTheApp: React.FC<CannotLoadTheAppProps> = ({ reason }) => {
    const messages = [];
    if (reason === 'indexeddb_unavailable') {
        messages.push(
            "Your browser does not support IndexedDB, which is required for this application.",
            "Please use a modern browser that supports IndexedDB."
        )
    }
    else {
        messages.push(
            "An unknown error occurred while loading the application.",
            "Please try again later."
        )
    }

    // Default error message
    return (
        <div className="h-screen w-screen flex items-center justify-center">
            <div className="flex flex-col justify-center gap-y-4 w-full max-w-xl">
                <Logo large />
                <Alert
                    color="danger"
                    title={`Cannot load the application`}
                    description={<>
                        {messages.map((message, index) => (
                            <p key={index}>{message}</p>
                        ))}
                    </>}
                />
            </div>
        </div>
    )
}

export default CannotLoadTheApp