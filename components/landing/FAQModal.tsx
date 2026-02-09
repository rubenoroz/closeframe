
"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export function FAQModal() {
    const faqs = [
        {
            question: "¿Qué es CloserLens?",
            answer: "CloserLens es una plataforma que transforma tu almacenamiento en la nube (Google Drive, OneDrive, Dropbox) en galerías profesionales para entregar fotos y videos a tus clientes. Sin subir archivos dos veces.",
        },
        {
            question: "¿Necesito mover mis archivos?",
            answer: "No. Simplemente conectas tu cuenta de nube y seleccionas la carpeta que quieres convertir en galería. Nosotros solo leemos los archivos para mostrarlos, pero permanecen seguros en tu almacenamiento original.",
        },
        {
            question: "¿Puedo usar mi propia marca?",
            answer: "Sí. En los planes Pro y Studio puedes personalizar el logotipo, colores, tipografía e incluso usar tu propio dominio (ej. galerias.tuempresa.com).",
        },
        {
            question: "¿Cómo funcionan las reservas?",
            answer: "Incluimos un sistema de agenda donde puedes definir tu disponibilidad. Tus clientes pueden reservar sesiones contigo y se sincroniza automáticamente con tu calendario.",
        },
        {
            question: "¿Qué pasa si dejo de pagar?",
            answer: "Tus galerías dejarán de estar visibles públicamente, pero tus archivos siempre permanecerán seguros en tu nube personal. Nunca secuestramos tu contenido.",
        },
    ];

    return (
        <Dialog>
            <DialogTrigger className="text-sm font-medium hover:text-[#cdb8e1] transition-colors text-left">
                Preguntas Frecuentes
            </DialogTrigger>
            <DialogContent className="bg-black/95 border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-light tracking-tight mb-4 flex items-center gap-2">
                        <HelpCircle className="w-6 h-6 text-[#cdb8e1]" />
                        Preguntas Frecuentes
                    </DialogTitle>
                </DialogHeader>
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`} className="border-white/10">
                            <AccordionTrigger className="text-left hover:text-[#cdb8e1] transition-colors">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-white/60 leading-relaxed">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </DialogContent>
        </Dialog>
    );
}
