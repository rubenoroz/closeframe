import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    const contentDir = path.join(process.cwd(), "app/legal/content");
    const files = fs.readdirSync(contentDir).filter((file) => file.endsWith(".md"));

    return files.map((file) => ({
        slug: file.replace(".md", ""),
    }));
}

export default async function LegalDocumentPage({ params }: PageProps) {
    const { slug } = await params;
    const filePath = path.join(process.cwd(), "app/legal/content", `${slug}.md`);

    if (!fs.existsSync(filePath)) {
        notFound();
    }

    const content = fs.readFileSync(filePath, "utf-8");

    // Replace placeholders with real content
    const processedContent = content
        .replace(/\[CORREO_CONTACTO\]/g, "hola@closerlens.com")
        .replace(/\[CORREO_LEGAL\]/g, "legal@closerlens.com")
        .replace(/\[CORREO_SOPORTE\]/g, "soporte@closerlens.com")
        .replace(/\[CORREO_BILLING\]/g, "billing@closerlens.com");


    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <a href="/legal" className="text-sm text-neutral-500 hover:text-white transition flex items-center gap-2">
                    ← Volver
                </a>
                <span className="text-xs text-neutral-600 px-3 py-1 bg-neutral-900 rounded-full border border-neutral-800">
                    Documento Legal Oficial
                </span>
            </div>

            <article className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-8 md:p-12 shadow-2xl">
                <div className="prose prose-invert prose-neutral max-w-none 
                    prose-headings:font-light prose-headings:tracking-tight prose-headings:text-white
                    prose-h1:text-3xl prose-h1:mb-8 prose-h1:border-b prose-h1:border-neutral-800 prose-h1:pb-4
                    prose-h2:text-xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-emerald-400/90
                    prose-p:text-neutral-300 prose-p:leading-relaxed prose-p:text-sm md:prose-p:text-base
                    prose-strong:text-white prose-strong:font-semibold
                    prose-ul:list-disc prose-ul:pl-4 prose-li:text-neutral-300 prose-li:marker:text-neutral-600
                    prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-a:no-underline hover:prose-a:underline
                    ">
                    <ReactMarkdown>{processedContent}</ReactMarkdown>
                </div>
            </article>

            <div className="mt-8 text-center text-xs text-neutral-600 grid gap-1">
                <p>Este documento es parte de las condiciones de uso de CloserLens.</p>
                <p>© {new Date().getFullYear()} CloserLens. Todos los derechos reservados.</p>
            </div>
        </div>
    );
}
