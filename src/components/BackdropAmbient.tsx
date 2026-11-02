import React from 'react';

interface BackdropAmbientProps {
  backdropUrl?: string;
  enabled?: boolean;
}

export const BackdropAmbient: React.FC<BackdropAmbientProps> = ({
  backdropUrl,
  enabled = true,
}) => {
  if (!enabled || !backdropUrl) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#0c0e14] via-[#07080c] to-[#040507] pointer-events-none z-0" />
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-700 ease-out">
      {/* Dynamic blurred backdrop image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-105 filter blur-3xl opacity-30"
        style={{
          backgroundImage: `url('${backdropUrl}')`,
          transform: 'translate3d(0, 0, 0)', // GPU acceleration
        }}
      />

      {/* Cinematic dark vignettes for contrast and readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#040507] via-[#040507]/80 to-transparent w-full md:w-3/5" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#040507] via-[#040507]/70 to-transparent h-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#040507]/90 via-transparent to-[#040507]/90" />
      <div className="absolute inset-0 bg-[#040507]/40" />
    </div>
  );
};
