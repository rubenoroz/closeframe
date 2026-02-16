import Link from "next/link";
import { Scale } from "lucide-react";

export default function LegalPage() {
    return (
        <div className="prose prose-invert max-w-none">
            <h1>Centro Legal de CloserLens</h1>
            <p className="lead text-lg text-neutral-300">
                En esta sección encontrarás toda la documentación legal relacionada con el uso de nuestros servicios.
                Nos comprometemos a ser transparentes sobre cómo manejamos tus datos y cuáles son nuestras condiciones de servicio.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose mt-8">
                <Link
                    href="/legal/terminos_y_condiciones_closerlens"
                    className="p-6 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition flex items-start gap-4 group"
                >
                    <div className="p-3 rounded-lg bg-neutral-800 text-neutral-300 group-hover:text-white transition">
                        <Scale size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white mb-2 group-hover:text-blue-400 transition">Términos y Condiciones</h3>
                        <p className="text-sm text-neutral-400">Las reglas que rigen el uso de nuestra plataforma y servicios.</p>
                    </div>
                </Link>

                <Link
                    href="/legal/politica_de_privacidad_closerlens"
                    className="p-6 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition flex items-start gap-4 group"
                >
                    <div className="p-3 rounded-lg bg-neutral-800 text-neutral-300 group-hover:text-white transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white mb-2 group-hover:text-blue-400 transition">Política de Privacidad</h3>
                        <p className="text-sm text-neutral-400">Cómo recopilamos, usamos y protegemos tu información personal.</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
