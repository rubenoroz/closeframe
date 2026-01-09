import CloudGalleryMockup from "@/components/CloudGalleryMockup";

export default function DemoPage() {
    const isGoogleConfigured = !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== "PLACEHOLDER_ID";

    return (
        <CloudGalleryMockup googleConfigured={isGoogleConfigured} />
    );
}
