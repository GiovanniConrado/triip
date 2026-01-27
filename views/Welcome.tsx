
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden max-w-[480px] mx-auto bg-warm-cream">
      <div className="relative flex-[1.4] w-full overflow-hidden">
        <img
          alt="Sunset Travel"
          className="absolute inset-0 w-full h-full object-cover"
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-terracotta-500/40"></div>
        <div className="absolute top-14 left-0 right-0 flex justify-center z-20">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-xl border border-white/30 shadow-lg rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-4xl fill">explore</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-warm-cream via-warm-cream/80 to-transparent z-10"></div>
      </div>

      <div className="relative z-20 px-8 pb-8 -mt-12 bg-warm-cream">
        <div className="text-center space-y-5 mb-10">
          <h1 className="text-4xl font-bold text-sunset-dark tracking-tight mb-3">
            Viagens em grupo,<br />sem estresse
          </h1>
          <div className="flex flex-col items-center gap-2">
            <p className="text-sunset-muted text-lg font-normal leading-relaxed">
              Organize gastos e roteiros de forma simples e transparente.
            </p>
            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-center gap-1.5 text-terracotta-500/80">
                <span className="material-symbols-outlined text-[18px]">payments</span>
                <span className="text-xs font-semibold uppercase tracking-wider">Gastos</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-sunset-muted/30"></div>
              <div className="flex items-center gap-1.5 text-terracotta-500/80">
                <span className="material-symbols-outlined text-[18px]">map</span>
                <span className="text-xs font-semibold uppercase tracking-wider">Roteiros</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-5">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-3 w-full h-14 rounded-full bg-terracotta-500 text-white font-semibold text-base shadow-lg shadow-terracotta-500/40 hover:bg-terracotta-600 active:scale-[0.98] transition-all"
          >
            Começar agora
          </button>
          <button
            onClick={() => navigate('/login')}
            className="text-sunset-muted font-semibold text-sm hover:text-terracotta-600 transition-colors"
          >
            Já tenho uma conta
          </button>
        </div>

        <div className="flex justify-center gap-2.5 mt-10">
          <div className="w-6 h-2 rounded-full bg-terracotta-500"></div>
          <div className="w-2 h-2 rounded-full bg-terracotta-200"></div>
          <div className="w-2 h-2 rounded-full bg-terracotta-200"></div>
        </div>
      </div>

      <div className="pb-8 px-10 text-center bg-warm-cream">
        <p className="text-[11px] text-sunset-muted/60 leading-relaxed max-w-[280px] mx-auto">
          Planeje com segurança. Ao continuar, você concorda com nossos <a className="underline hover:text-terracotta-600" href="#">Termos de Uso</a>.
        </p>
      </div>
    </div>
  );
};

export default Welcome;
