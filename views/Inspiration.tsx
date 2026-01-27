import React from 'react';
import { useNavigate } from 'react-router-dom';

const Inspiration: React.FC = () => {
    const navigate = useNavigate();

    const inspirations = [
        { title: 'Inverno em Bariloche', tag: 'Aventura', img: 'https://images.unsplash.com/photo-1549419137-0104642ae7a8?auto=format&fit=crop&w=800&q=80', description: 'Explore as montanhas nevadas e a culinária argentina.' },
        { title: 'Vilas de Mykonos', tag: 'Relax', img: 'https://images.unsplash.com/photo-1518459031451-79b57c614b91?auto=format&fit=crop&w=800&q=80', description: 'Casas brancas, mar azul e pôr do sol inesquecível.' },
        { title: 'Safári na África', tag: 'Natureza', img: 'https://images.unsplash.com/photo-1516422317943-2182c02517df?auto=format&fit=crop&w=800&q=80', description: 'Encontre a vida selvagem em seu habitat natural.' },
        { title: 'Tóquio Futurista', tag: 'Cultura', img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80', description: 'Luzes neon, tecnologia e tradição milenar.' },
    ];

    return (
        <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-20">
            <header className="px-6 pt-14 pb-6 sticky top-0 z-30 bg-warm-cream/95 backdrop-blur-md border-b border-terracotta-100 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-white border border-terracotta-100 flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                >
                    <span className="material-symbols-outlined text-sunset-dark">arrow_back</span>
                </button>
                <h1 className="text-2xl font-black text-sunset-dark">Inspiração</h1>
            </header>

            <main className="flex-1 px-6 py-8 space-y-8 overflow-y-auto">
                <p className="text-sm text-sunset-muted px-2">
                    Descubra destinos incríveis para sua próxima aventura em grupo.
                </p>

                <div className="grid grid-cols-1 gap-6">
                    {inspirations.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-[32px] overflow-hidden border border-terracotta-100 shadow-sm group active:scale-[0.99] transition-all">
                            <div className="h-48 overflow-hidden relative">
                                <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-terracotta-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20">
                                    {item.tag}
                                </span>
                            </div>
                            <div className="p-6">
                                <h2 className="text-xl font-black text-sunset-dark mb-2">{item.title}</h2>
                                <p className="text-xs text-sunset-muted leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <section className="bg-sunset-dark rounded-[40px] p-8 text-white text-center space-y-4">
                    <span className="material-symbols-outlined text-4xl text-terracotta-500">auto_awesome</span>
                    <h3 className="text-xl font-bold">Quer mais sugestões?</h3>
                    <p className="text-xs opacity-70">
                        Nossa IA pode criar um roteiro personalizado baseado nos seus interesses.
                    </p>
                    <button className="px-6 py-3 bg-terracotta-500 text-white font-bold rounded-2xl text-sm active:scale-95 transition-all w-full">
                        Pedir sugestão IA
                    </button>
                </section>
            </main>
        </div>
    );
};

export default Inspiration;
