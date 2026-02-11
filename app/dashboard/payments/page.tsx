
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { CreditCard, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { CreatePaymentLink } from "@/components/stripe/CreatePaymentLink";
import { DisconnectButton } from "@/components/stripe/DisconnectButton";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { stripeConnectAccount: true },
    });

    const sp = await searchParams;
    let account = user?.stripeConnectAccount;

    // [New] Soft Lock: Check if user has access to payments
    const { canUseFeature } = await import("@/lib/features/service");
    const canAccessPayments = await canUseFeature(session.user.id, 'bookingPayments');

    if (!canAccessPayments) {
        return (
            <div className="max-w-4xl mx-auto py-16 px-4 text-center">
                <div className="w-20 h-20 bg-neutral-900 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-neutral-800">
                    <CreditCard className="w-10 h-10 text-neutral-600" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">Pagos e Ingresos</h1>
                <p className="text-neutral-400 max-w-lg mx-auto mb-8 text-lg">
                    Acepta pagos con tarjeta de crédito/débito directamente en tus reservas y recibe el dinero en tu cuenta bancaria.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/dashboard/billing"
                        className="px-8 py-3 bg-white text-black font-medium rounded-full hover:bg-neutral-200 transition"
                    >
                        Ver Planes Disponibles
                    </Link>
                    <Link
                        href="/dashboard"
                        className="px-8 py-3 text-neutral-400 hover:text-white transition"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    // Check real-time status if we have an account ID locally
    let chargesEnabled = account?.chargesEnabled;
    let detailsSubmitted = false;

    if (account?.stripeAccountId) {
        try {
            // We need to import stripe instance or fetch via API, but for server component we can verify directly
            // However, to keep it simple, we'll assume the local DB status is stale and we might trust it OR 
            // we rely on the user to click "Complete Setup" if things fail. 
            // Ideally: fetch latest status from Stripe here or in a separate call.
            // For now, let's trust the user experience: If they are here, they might need to complete setup.
            // But to be precise, let's fetch the latest status to show the right UI.
            const Stripe = require("stripe");
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
            const stripeAcct = await stripe.accounts.retrieve(account.stripeAccountId);
            chargesEnabled = stripeAcct.charges_enabled;
            detailsSubmitted = stripeAcct.details_submitted;
        } catch (e) {
            console.error("Failed to fetch fresh stripe status", e);
        }
    }

    const isConnected = !!account?.stripeAccountId;
    const isPending = !!account?.stripeAccountId && (!detailsSubmitted || !chargesEnabled);

    const success = sp?.success === "connected";
    const error = sp?.error;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <h1 className="text-3xl font-light text-white mb-2 flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-emerald-500" />
                Pagos e Ingresos
            </h1>
            <p className="text-neutral-400 mb-8">
                Gestiona tus cobros, conecta tu cuenta bancaria y recibe pagos directos de clientes.
            </p>

            {/* Notifications */}
            {success && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <div>
                        <p className="font-medium">¡Cuenta conectada con éxito!</p>
                        <p className="text-sm opacity-90">Ahora puedes crear enlaces de pago y recibir dinero.</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                        <p className="font-medium">Error en la conexión</p>
                        <p className="text-sm opacity-90">
                            {typeof error === "string" ? error : "Hubo un problema al conectar con Stripe."}
                        </p>
                    </div>
                </div>
            )}

            {/* Status Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-800 rounded-lg">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-medium text-white mb-2">Estado de la cuenta</h2>
                            {isConnected ? (
                                <div className="space-y-1">
                                    <div className={`flex items-center gap-2 font-medium ${isPending ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${isPending ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                        {isPending ? 'Activa (Modo Test / Faltan datos)' : 'Activa y conectada'}
                                    </div>
                                    <p className="text-sm text-neutral-500">
                                        ID: <span className="font-mono text-neutral-400 bg-neutral-800 px-1 py-0.5 rounded">{account.stripeAccountId}</span>
                                    </p>
                                </div>
                            ) : (
                                <p className="text-neutral-400">No conectada</p>
                            )}
                        </div>
                    </div>
                </div>

                {isConnected ? (
                    <div className="flex items-center gap-3">
                        {/* We always allow dashboard access */}
                        <Link
                            href="https://dashboard.stripe.com/"
                            target="_blank"
                            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition text-sm border border-neutral-700 flex items-center gap-2"
                        >
                            <ExternalLink className="w-3 h-3" /> Dashboard
                        </Link>
                        {/* Optional Setup button if really needed, but not blocking */}
                        {isPending && (
                            <a
                                href="/api/stripe/connect/onboarding"
                                className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition text-sm border border-amber-500/20 text-center"
                            >
                                (Opcional) Completar datos
                            </a>
                        )}
                        <DisconnectButton />
                    </div>
                ) : (
                    <a
                        href="/api/stripe/connect/oauth"
                        className="flex items-center gap-2 px-6 py-3 bg-[#635BFF] hover:bg-[#5851E3] text-white rounded-xl transition font-medium shadow-lg shadow-[#635BFF]/20"
                    >
                        <span>Conectar con</span>
                        <span className="font-bold">Stripe</span>
                    </a>
                )}
            </div>

            {/* Checkout Link Builder - ALWAYS SHOWN if Connected (even if pending) */}
            {isConnected && (
                <div className="mt-8 border-t border-neutral-800 pt-6">
                    <h3 className="text-lg font-medium text-white mb-4">Acciones de Cobro</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <CreatePaymentLink />


                        {/* Payment History */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-neutral-800">
                                <h3 className="font-medium text-neutral-300">Historial Reciente</h3>
                            </div>
                            <div className="divide-y divide-neutral-800">
                                {(await prisma.payment.findMany({
                                    where: { connectAccountId: account.id },
                                    orderBy: { createdAt: 'desc' },
                                    take: 5
                                })).length > 0 ? (
                                    (await prisma.payment.findMany({
                                        where: { connectAccountId: account.id },
                                        orderBy: { createdAt: 'desc' },
                                        take: 5
                                    })).map((payment) => (
                                        <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-neutral-800/50 transition">
                                            <div>
                                                <p className="text-white font-medium">{payment.description || "Pago sin descripción"}</p>
                                                <p className="text-xs text-neutral-500">{new Date(payment.createdAt).toLocaleDateString()} · {payment.stripePaymentIntentId ? "Tarjeta" : "Pendiente"}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-medium">
                                                    {(payment.amount / 100).toLocaleString('en-US', { style: 'currency', currency: payment.currency })}
                                                </p>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${payment.status === 'succeeded' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    payment.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                                        'bg-red-500/10 text-red-500'
                                                    }`}>
                                                    {payment.status === 'succeeded' ? 'Pagado' : payment.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center">
                                        <p className="text-neutral-500 text-sm">No hay transacciones todavía.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
