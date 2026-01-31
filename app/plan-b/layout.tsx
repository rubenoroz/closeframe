import type { Metadata } from "next";
import { Spline_Sans } from "next/font/google";

const splineSans = Spline_Sans({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-spline",
});

export const metadata: Metadata = {
    title: "CloserLens Hybrid | Premium Photography SaaS",
    description: "Tu nube, tu galería.",
};

export default function PlanBLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className={`${splineSans.className} antialiased`}>
            {/* Load Material Symbols from Google Fonts */}
            <link
                href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
                rel="stylesheet"
            />
            {children}
        </div>
    );
}
