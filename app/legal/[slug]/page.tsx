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
        <article className="prose prose-invert prose-neutral max-w-none prose-headings:text-white prose-a:text-blue-400 hover:prose-a:text-blue-300">
            <ReactMarkdown>{processedContent}</ReactMarkdown>
        </article>
    );
}
