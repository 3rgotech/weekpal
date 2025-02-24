import React from 'react';

interface LogoProps {
    large?: boolean;
}

const Logo: React.FC<LogoProps> = ({ large = false }) => {
    return (
        <div className="flex justify-center items-center">
            <img src="./logo192.png" alt="Logo" className={large ? "w-20 h-20" : "w-10 h-10"} />
        </div>
    );
};

export default Logo;